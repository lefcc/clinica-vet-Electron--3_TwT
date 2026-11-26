import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { formatarCentavos, formatarData } from '../../lib/formatadores.js';
import { dinheiroParaCentavos } from '../../lib/mascaras.js';
import { perfilAtual } from '../../lib/sessao.js';
import type { ItemOrcamento, Orcamento, Pagina, Servico } from '../../lib/tipos.js';
import {
  abrirModal,
  criarAbas,
  criarBotao,
  criarBotaoIcone,
  criarBusca,
  criarCabecalhoPagina,
  criarFormulario,
  criarInput,
  criarSelect,
  criarTabela,
  mostrarToast,
  type Aba,
} from '../../components/ui/index.js';
import { criarPaginaCrud, type ConfigCrud } from '../comum/crud.js';
import { ligarClienteAnimal, opcoesMedicamentos } from '../comum/seletores.js';
import { FORMAS_PAGAMENTO } from '../comum/util.js';

// catálogo de serviços (preço sugerido no orçamento)
const CONFIG_SERVICOS: ConfigCrud<Servico> = {
  canal: 'servicos',
  titulo: 'Catálogo de serviços',
  singular: 'serviço',
  textoNovo: 'Novo serviço',
  textoBusca: 'Buscar serviço...',
  podeEscrever: (p) => p === 'MASTER',
  nomeDoItem: (s) => s.nome,
  colunas: [
    { chave: 'nome', titulo: 'Serviço' },
    { chave: 'valor_centavos', titulo: 'Valor', render: (s) => formatarCentavos(s.valor_centavos) },
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome do serviço', obrigatorio: true, largura: 'inteira' },
    { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'dinheiro', obrigatorio: true, placeholder: '0,00', dica: 'Digite só números: 15000 vira 150,00.' },
  ],
  paraFormulario: (s) => ({ nome: s.nome, valor: String(s.valor_centavos) }),
  // dinheiro em centavos (inteiro), nunca decimal
  paraEnvio: (v) => ({ nome: v['nome'], valor_centavos: dinheiroParaCentavos(v['valor'] ?? '') }),
};

// item em edição
interface ItemEditor {
  tipo: ItemOrcamento['tipo'];
  item_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario_centavos: number;
}

/** janela de novo orçamento (o back-end recalcula o total) */
function abrirNovoOrcamento(aoSalvar: () => void): void {
  const form = criarFormulario([
    { nome: 'cliente_id', rotulo: 'Cliente', tipo: 'select', obrigatorio: true },
    { nome: 'animal_id', rotulo: 'Animal (opcional)', tipo: 'select' },
    { nome: 'forma_pagamento', rotulo: 'Forma de pagamento', tipo: 'select', obrigatorio: true, opcoes: FORMAS_PAGAMENTO.map((f) => ({ valor: f, texto: f })) },
    { nome: 'desconto', rotulo: 'Desconto (R$)', tipo: 'dinheiro', placeholder: '0,00', dica: 'Digite só números: 2000 vira 20,00.' },
  ]);
  void ligarClienteAnimal(form, 'cliente_id', 'animal_id');

  let servicos: Servico[] = [];
  let medicamentos: { valor: string; texto: string }[] = [];
  const pronto = Promise.all([
    api.invoke<Pagina<Servico>>('servicos:listar', { pagina: 1, tamanho: 100 }).then((r) => (servicos = r.ok ? r.dados.itens : [])),
    opcoesMedicamentos().then((m) => (medicamentos = m)),
  ]);

  const itens: ItemEditor[] = [];
  const corpoItens = el('div', 'orcamento__itens');
  const totalEl = el('strong', 'orcamento__total');
  const subtotalEl = el('span', '');

  // subtotal e desconto, em centavos
  const subtotal = (): number => itens.reduce((t, i) => t + i.quantidade * i.valor_unitario_centavos, 0);
  const desconto = (): number => dinheiroParaCentavos(form.obterValores()['desconto'] ?? '');
  function atualizarTotais(): void {
    subtotalEl.textContent = `Subtotal: ${formatarCentavos(subtotal())}`;
    totalEl.textContent = `Total: ${formatarCentavos(Math.max(0, subtotal() - desconto()))}`;
  }
  form.controle('desconto').addEventListener('input', atualizarTotais);

  // adiciona uma linha de item
  function adicionarItem(): void {
    const item: ItemEditor = { tipo: 'SERVICO', item_id: '', descricao: '', quantidade: 1, valor_unitario_centavos: 0 };
    itens.push(item);
    const tipo = criarSelect([{ valor: 'SERVICO', texto: 'Serviço' }, { valor: 'MEDICAMENTO', texto: 'Medicamento' }]);
    tipo.setAttribute('aria-label', 'Tipo do item');
    const escolha = criarSelect([], { placeholder: 'Escolha o item...' });
    escolha.setAttribute('aria-label', 'Item');
    const quantidade = criarInput({ tipo: 'number' });
    quantidade.min = '1';
    quantidade.value = '1';
    quantidade.setAttribute('aria-label', 'Quantidade');
    const valor = criarInput({ mascara: 'dinheiro', placeholder: '0,00' });
    valor.setAttribute('aria-label', 'Valor unitário (R$)');
    const subtotalLinha = el('span', 'orcamento__subtotal', ['R$ 0,00']);

    const preencherOpcoes = async (): Promise<void> => {
      await pronto;
      const base = tipo.value === 'SERVICO' ? servicos.map((s) => ({ valor: s.id, texto: s.nome })) : medicamentos;
      escolha.replaceChildren(el('option', '', ['Escolha o item...'], { value: '' }), ...base.map((o) => el('option', '', [o.texto], { value: o.valor })));
      item.tipo = tipo.value as ItemEditor['tipo'];
      item.item_id = '';
      item.descricao = '';
    };
    const recalcular = (): void => {
      item.quantidade = Math.max(1, Number(quantidade.value) || 1);
      item.valor_unitario_centavos = dinheiroParaCentavos(valor.value);
      subtotalLinha.textContent = formatarCentavos(item.quantidade * item.valor_unitario_centavos);
      atualizarTotais();
    };
    tipo.addEventListener('change', () => void preencherOpcoes());
    escolha.addEventListener('change', () => {
      item.item_id = escolha.value;
      item.descricao = escolha.selectedOptions[0]?.textContent ?? '';
      // serviço sugere o preço do catálogo (dá pra ajustar)
      const servico = item.tipo === 'SERVICO' ? servicos.find((s) => s.id === escolha.value) : undefined;
      if (servico) {
        valor.value = String(servico.valor_centavos);
        valor.dispatchEvent(new Event('input'));
      }
      recalcular();
    });
    quantidade.addEventListener('input', recalcular);
    valor.addEventListener('input', recalcular);

    const linha = el('div', 'orcamento__linha', [
      tipo,
      escolha,
      quantidade,
      valor,
      subtotalLinha,
      criarBotaoIcone(
        'inativar',
        'Remover item',
        () => {
          itens.splice(itens.indexOf(item), 1);
          linha.remove();
          atualizarTotais();
        },
        true,
      ),
    ]);
    corpoItens.append(linha);
    void preencherOpcoes();
  }
  adicionarItem();
  atualizarTotais();

  let salvando = false;
  const botao = criarBotao({ texto: 'Salvar orçamento', icone: 'sucesso', onClick: () => void salvar() });
  const modal = abrirModal({
    titulo: 'Novo orçamento',
    largo: true,
    conteudo: el('div', 'stack', [
      form.elemento,
      el('div', 'orcamento', [
        el('h3', 'prescricoes__titulo', ['Itens do orçamento']),
        corpoItens,
        criarBotao({ texto: 'Adicionar item', icone: 'mais', variante: 'fantasma', onClick: adicionarItem }),
        el('div', 'orcamento__resumo', [subtotalEl, totalEl]),
        el('p', 'campo__dica', ['Documento sem valor fiscal.']),
      ]),
    ]),
    acoes: [criarBotao({ texto: 'Cancelar', variante: 'secundario', onClick: () => modal.fechar() }), botao],
  });

  async function salvar(): Promise<void> {
    if (salvando || !form.validar()) return;
    const validos = itens.filter((i) => i.item_id);
    if (validos.length === 0) return mostrarToast('aviso', 'Adicione pelo menos um item ao orçamento.');
    salvando = true;
    botao.disabled = true;
    const v = form.obterValores();
    const r = await api.invoke<Orcamento>('orcamentos:criar', {
      cliente_id: v['cliente_id'],
      animal_id: v['animal_id'] || undefined,
      forma_pagamento: v['forma_pagamento'],
      desconto_centavos: desconto(),
      itens: validos,
    });
    salvando = false;
    botao.disabled = false;
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    mostrarToast('sucesso', `Orçamento nº ${r.dados.numero} salvo.`);
    modal.fechar();
    aoSalvar();
  }
  form.aoEnviar(() => void salvar());
}

// o main gera o pdf (printToPDF)
async function gerarPdf(o: Orcamento): Promise<void> {
  const r = await api.invoke<{ caminho: string }>('orcamentos:pdf', { id: o.id });
  // cancelar o "salvar como" não é erro
  if (!r.ok) return mostrarToast(r.erro.codigo === 'PDF_CANCELADO' ? 'info' : 'erro', r.erro.mensagem);
  mostrarToast('sucesso', `PDF do orçamento nº ${o.numero} salvo.`);
}

// aba com a lista de orçamentos
function abaOrcamentos(): HTMLElement {
  const estado = { pagina: 1, tamanho: 10, busca: '' };
  const tabela = criarTabela<Orcamento>({
    textoVazio: 'Nenhum orçamento criado.',
    onPagina: (p) => {
      estado.pagina = p;
      void carregar();
    },
    colunas: [
      { chave: 'numero', titulo: 'Nº', render: (o) => String(o.numero).padStart(4, '0') },
      { chave: 'criado_em', titulo: 'Data', render: (o) => formatarData(o.criado_em) },
      { chave: 'cliente_nome', titulo: 'Cliente' },
      { chave: 'animal_nome', titulo: 'Animal', render: (o) => o.animal_nome ?? '—' },
      { chave: 'forma_pagamento', titulo: 'Pagamento' },
      { chave: 'total_centavos', titulo: 'Total', render: (o) => formatarCentavos(o.total_centavos) },
      { chave: 'acoes', titulo: 'Ações', render: (o) => el('div', 'acoes', [criarBotaoIcone('pdf', 'Gerar PDF (sem valor fiscal)', () => void gerarPdf(o))]) },
    ],
  });
  async function carregar(): Promise<void> {
    tabela.atualizar({ linhas: [], total: 0, pagina: estado.pagina, tamanho: estado.tamanho, carregando: true });
    const r = await api.invoke<Pagina<Orcamento>>('orcamentos:listar', { pagina: estado.pagina, tamanho: estado.tamanho, busca: estado.busca || undefined });
    if (!r.ok) return tabela.atualizar({ linhas: [], total: 0, pagina: estado.pagina, tamanho: estado.tamanho, erro: r.erro.mensagem });
    tabela.atualizar({ linhas: r.dados.itens, total: r.dados.total, pagina: r.dados.pagina, tamanho: r.dados.tamanho });
  }
  void carregar();
  return el('div', 'stack', [
    el('div', 'barra', [
      criarBusca({
        placeholder: 'Buscar por cliente ou animal...',
        aoBuscar: (t) => {
          estado.busca = t;
          estado.pagina = 1;
          void carregar();
        },
      }),
    ]),
    tabela.elemento,
  ]);
}

// tela de orçamentos (catálogo de serviços só pro administrador)
export function paginaOrcamentos(): HTMLElement {
  const abas: Aba[] = [{ id: 'orcamentos', titulo: 'Orçamentos', renderizar: abaOrcamentos }];
  if (perfilAtual() === 'MASTER') abas.push({ id: 'servicos', titulo: 'Catálogo de serviços', renderizar: () => criarPaginaCrud(CONFIG_SERVICOS) });

  const conteudo = el('div', '', [criarAbas(abas)]);
  return el('section', 'pagina', [
    criarCabecalhoPagina({
      titulo: 'Orçamentos',
      subtitulo: 'Demonstrativos de valores para os tutores, sem valor fiscal.',
      acoes: [criarBotao({ texto: 'Novo orçamento', icone: 'mais', onClick: () => abrirNovoOrcamento(() => window.dispatchEvent(new HashChangeEvent('hashchange'))) })],
    }),
    conteudo,
  ]);
}
