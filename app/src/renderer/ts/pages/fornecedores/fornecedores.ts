import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { formatarCentavos, formatarData, formatarDataHora, formatarMoeda } from '../../lib/formatadores.js';
import { dinheiroParaCentavos, formatarTelefone } from '../../lib/mascaras.js';
import type { Cotacao, Fornecedor, Pagina, PrecoFornecedor } from '../../lib/tipos.js';
import {
  abrirModal,
  confirmar,
  criarAbas,
  criarBadge,
  criarBotao,
  criarBotaoIcone,
  criarCabecalhoPagina,
  criarCartao,
  criarEstadoVazio,
  criarFormulario,
  criarSelect,
  criarTabela,
  mostrarToast,
  type Aba,
} from '../../components/ui/index.js';
import { criarPaginaCrud, type ConfigCrud } from '../comum/crud.js';
import { opcoesMedicamentos } from '../comum/seletores.js';
import { opcional, soNumeros } from '../comum/util.js';

/** cotação do dólar (sem internet, mostra a última salva) */
async function cartaoDolar(): Promise<HTMLElement> {
  const r = await api.invoke<Cotacao>('dolar:atual');
  if (!r.ok) {
    return criarCartao({ titulo: 'Cotação do dólar', filhos: [el('p', '', ['Cotação indisponível no momento.'])] });
  }
  const c = r.dados;
  return criarCartao({
    titulo: 'Cotação do dólar',
    subtitulo: 'Usada para comparar o custo de insumos importados.',
    filhos: [
      el('div', 'dolar', [
        el('strong', 'dolar__valor', [formatarCentavos(c.valor_centavos)]),
        el('span', 'dolar__detalhe', [`Atualizada em ${formatarDataHora(c.atualizado_em)}`]),
        criarBadge(c.origem === 'API' ? 'Cotação atual' : 'Última cotação salva (sem internet)', c.origem === 'API' ? 'sucesso' : 'aviso'),
      ]),
    ],
  });
}

// cadastro de fornecedores (só o administrador)
const CONFIG_FORNECEDORES: ConfigCrud<Fornecedor> = {
  canal: 'fornecedores',
  titulo: 'Cadastro de fornecedores',
  subtitulo: 'Fornecedores nacionais e importados.',
  singular: 'fornecedor',
  textoNovo: 'Novo fornecedor',
  textoBusca: 'Buscar por nome ou contato...',
  podeEscrever: (p) => p === 'MASTER',
  nomeDoItem: (f) => f.nome,
  topo: cartaoDolar,
  filtros: [
    {
      nome: 'tipo',
      rotulo: 'Tipo',
      opcoes: [
        { valor: 'NACIONAL', texto: 'Nacional' },
        { valor: 'IMPORTADO', texto: 'Importado' },
      ],
    },
  ],
  colunas: [
    { chave: 'nome', titulo: 'Nome' },
    { chave: 'tipo', titulo: 'Tipo', render: (f) => criarBadge(f.tipo === 'NACIONAL' ? 'Nacional' : 'Importado', f.tipo === 'NACIONAL' ? 'sucesso' : 'info') },
    { chave: 'contato', titulo: 'Contato', render: (f) => f.contato ?? '—' },
    { chave: 'telefone', titulo: 'Telefone', render: (f) => (f.telefone ? formatarTelefone(f.telefone) : '—') },
    { chave: 'email', titulo: 'E-mail', render: (f) => f.email ?? '—' },
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome do fornecedor', obrigatorio: true, largura: 'inteira' },
    {
      nome: 'tipo',
      rotulo: 'Tipo',
      tipo: 'select',
      obrigatorio: true,
      opcoes: [
        { valor: 'NACIONAL', texto: 'Nacional' },
        { valor: 'IMPORTADO', texto: 'Importado' },
      ],
    },
    { nome: 'contato', rotulo: 'Pessoa de contato' },
    { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
  ],
  paraFormulario: (f) => ({ nome: f.nome, tipo: f.tipo, contato: f.contato ?? '', telefone: f.telefone ?? '', email: f.email ?? '' }),
  paraEnvio: (v) => ({ nome: v['nome'], tipo: v['tipo'], contato: opcional(v['contato']), telefone: soNumeros(v['telefone']), email: opcional(v['email']) }),
};

// janela pra cadastrar (ou corrigir) o preço de um medicamento num fornecedor
function abrirPreco(medicamentoId: string, item: PrecoFornecedor | undefined, aoSalvar: () => void): void {
  const form = criarFormulario([
    { nome: 'fornecedor_id', rotulo: 'Fornecedor', tipo: 'select', obrigatorio: true, largura: 'inteira' },
    {
      nome: 'moeda',
      rotulo: 'Moeda',
      tipo: 'select',
      obrigatorio: true,
      opcoes: [
        { valor: 'BRL', texto: 'Real (R$)' },
        { valor: 'USD', texto: 'Dólar (US$)' },
      ],
    },
    {
      nome: 'preco',
      rotulo: 'Preço por unidade',
      tipo: 'dinheiro',
      obrigatorio: true,
      placeholder: '0,00',
      dica: 'Digite só números: 1250 vira 12,50.',
      validar: (v) => (dinheiroParaCentavos(v) <= 0 ? 'Informe um valor maior que zero.' : undefined),
    },
  ]);
  void api.invoke<Pagina<Fornecedor>>('fornecedores:listar', { pagina: 1, tamanho: 200 }).then((r) => {
    if (r.ok) form.definirOpcoes('fornecedor_id', r.dados.itens.map((f) => ({ valor: f.id, texto: `${f.nome} (${f.tipo === 'NACIONAL' ? 'nacional' : 'importado'})` })));
    if (item) form.definirValores({ fornecedor_id: item.fornecedor_id });
  });
  if (item) {
    form.definirValores({ moeda: item.moeda, preco: String(item.preco_centavos) });
    form.controle('fornecedor_id').disabled = true; // na edição o fornecedor não muda
  }

  let salvando = false;
  const botao = criarBotao({ texto: 'Salvar', icone: 'sucesso', onClick: () => void salvar() });
  const modal = abrirModal({
    titulo: item ? 'Corrigir preço' : 'Adicionar preço',
    conteudo: form.elemento,
    acoes: [criarBotao({ texto: 'Cancelar', variante: 'secundario', onClick: () => modal.fechar() }), botao],
  });

  async function salvar(): Promise<void> {
    if (salvando || !form.validar()) return;
    salvando = true;
    botao.disabled = true;
    const v = form.obterValores();
    const r = await api.invoke('fornecedores:precos_salvar', {
      medicamento_id: medicamentoId,
      fornecedor_id: v['fornecedor_id'],
      moeda: v['moeda'],
      preco_centavos: dinheiroParaCentavos(v['preco'] ?? ''),
    });
    salvando = false;
    botao.disabled = false;
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    mostrarToast('sucesso', 'Preço salvo.');
    modal.fechar();
    aoSalvar();
  }
  form.aoEnviar(() => void salvar());
}

// compara quanto cada fornecedor cobra por um medicamento. o back-end já converte o dólar
// pela cotação do dia e diz quem é o mais barato (o front só mostra)
function abaComparativo(): HTMLElement {
  let medicamentoId = '';
  const select = criarSelect([], { placeholder: 'Escolha um medicamento...' });
  select.setAttribute('aria-label', 'Medicamento');
  void opcoesMedicamentos().then((ops) => {
    for (const o of ops) select.append(el('option', '', [o.texto], { value: o.valor }));
  });

  const area = el('div');
  const botaoNovo = criarBotao({ texto: 'Adicionar preço', icone: 'mais', desabilitado: true, onClick: () => abrirPreco(medicamentoId, undefined, () => void carregar()) });

  const tabela = criarTabela<PrecoFornecedor>({
    textoVazio: 'Nenhum fornecedor com preço para este medicamento.',
    onPagina: () => undefined,
    colunas: [
      { chave: 'fornecedor_nome', titulo: 'Fornecedor' },
      { chave: 'fornecedor_tipo', titulo: 'Tipo', render: (p) => criarBadge(p.fornecedor_tipo === 'NACIONAL' ? 'Nacional' : 'Importado', p.fornecedor_tipo === 'NACIONAL' ? 'sucesso' : 'info') },
      { chave: 'preco_centavos', titulo: 'Preço', render: (p) => formatarMoeda(p.preco_centavos, p.moeda) },
      { chave: 'preco_reais_centavos', titulo: 'Em reais', render: (p) => formatarCentavos(p.preco_reais_centavos) },
      {
        chave: 'diferenca_percentual',
        titulo: 'Comparação',
        render: (p) => (p.mais_barato ? criarBadge('Mais barato', 'sucesso') : criarBadge(`+${p.diferenca_percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, 'aviso')),
      },
      { chave: 'atualizado_em', titulo: 'Atualizado em', render: (p) => formatarData(p.atualizado_em) },
      {
        chave: 'acoes',
        titulo: 'Ações',
        render: (p) =>
          el('div', 'acoes', [
            criarBotaoIcone('editar', 'Corrigir preço', () => abrirPreco(medicamentoId, p, () => void carregar())),
            criarBotaoIcone(
              'inativar',
              'Remover preço',
              () =>
                void confirmar({ titulo: 'Remover preço', mensagem: `Remover o preço de ${p.fornecedor_nome} deste medicamento?`, textoConfirmar: 'Remover', perigo: true }).then(async (sim) => {
                  if (!sim) return;
                  const r = await api.invoke('fornecedores:precos_inativar', { id: p.id });
                  if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
                  mostrarToast('sucesso', 'Preço removido.');
                  void carregar();
                }),
              true,
            ),
          ]),
      },
    ],
  });

  // desenha a tabela do medicamento escolhido (ou a dica pra escolher um)
  async function carregar(): Promise<void> {
    if (!medicamentoId) {
      area.replaceChildren(criarEstadoVazio({ icone: 'fornecedores', titulo: 'Escolha um medicamento', descricao: 'Veja quanto cada fornecedor cobra e qual compensa mais.' }));
      return;
    }
    area.replaceChildren(tabela.elemento);
    tabela.atualizar({ linhas: [], total: 0, pagina: 1, tamanho: 1, carregando: true });
    const r = await api.invoke<PrecoFornecedor[]>('fornecedores:precos_listar', { medicamento_id: medicamentoId });
    if (!r.ok) return tabela.atualizar({ linhas: [], total: 0, pagina: 1, tamanho: 1, erro: r.erro.mensagem });
    tabela.atualizar({ linhas: r.dados, total: r.dados.length, pagina: 1, tamanho: Math.max(r.dados.length, 1) });
  }

  select.addEventListener('change', () => {
    medicamentoId = select.value;
    botaoNovo.disabled = !medicamentoId;
    void carregar();
  });

  const raiz = el('div', 'stack', [el('div', 'pagina__topo'), el('div', 'barra', [select, botaoNovo]), area]);
  void cartaoDolar().then((c) => raiz.querySelector('.pagina__topo')?.append(c));
  void carregar();
  return raiz;
}

// tela de fornecedores: cadastro e comparativo de preços
export function paginaFornecedores(): HTMLElement {
  const abas: Aba[] = [
    { id: 'cadastro', titulo: 'Cadastro', renderizar: () => criarPaginaCrud(CONFIG_FORNECEDORES) },
    { id: 'comparativo', titulo: 'Comparativo de preços', renderizar: abaComparativo },
  ];
  return el('section', 'pagina', [criarCabecalhoPagina({ titulo: 'Fornecedores', subtitulo: 'Cadastro e comparação de preços entre fornecedores nacionais e importados.' }), criarAbas(abas)]);
}
