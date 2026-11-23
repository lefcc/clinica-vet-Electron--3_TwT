import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { diasAte, formatarDia } from '../../lib/formatadores.js';
import { perfilAtual } from '../../lib/sessao.js';
import type { AlertaEstoque, Lote, Pagina, SaldoEstoque } from '../../lib/tipos.js';
import {
  abrirModal,
  criarBadge,
  criarBotao,
  criarBotaoIcone,
  criarBusca,
  criarCabecalhoPagina,
  criarEstadoVazio,
  criarFormulario,
  criarSpinner,
  criarTabela,
  mostrarToast,
  type Tom,
} from '../../components/ui/index.js';
import { opcoesMedicamentos } from '../comum/seletores.js';
import { opcional } from '../comum/util.js';

// situação do estoque (calculada pelo back-end)
const STATUS: Record<string, { texto: string; tom: Tom }> = {
  OK: { texto: 'Em dia', tom: 'sucesso' },
  ATENCAO: { texto: 'Atenção', tom: 'aviso' },
  CRITICO: { texto: 'Crítico', tom: 'erro' },
};

// número no jeito brasileiro (vírgula)
const num = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// lotes com validade (os que vencem primeiro vêm antes: FEFO)
async function abrirLotes(s: SaldoEstoque): Promise<void> {
  const corpo = el('div', 'stack', [criarSpinner()]);
  const modal = abrirModal({
    titulo: `Lotes de ${s.medicamento_nome}`,
    conteudo: corpo,
    acoes: [criarBotao({ texto: 'Fechar', variante: 'secundario', onClick: () => modal.fechar() })],
  });
  const r = await api.invoke<Lote[]>('estoque:lotes', { medicamento_id: s.medicamento_id });
  corpo.replaceChildren();
  if (!r.ok) {
    corpo.append(criarEstadoVazio({ icone: 'aviso', titulo: 'Não foi possível carregar', descricao: r.erro.mensagem }));
    return;
  }
  const tabela = criarTabela<Lote>({
    textoVazio: 'Nenhum lote com saldo.',
    onPagina: () => undefined,
    colunas: [
      { chave: 'numero', titulo: 'Lote' },
      {
        chave: 'validade',
        titulo: 'Validade',
        render: (l) => {
          const dias = diasAte(l.validade);
          return el('span', '', [formatarDia(l.validade), ' ', criarBadge(dias < 0 ? 'Vencido' : dias <= 30 ? `Vence em ${dias} dias` : 'No prazo', dias < 0 ? 'erro' : dias <= 30 ? 'aviso' : 'sucesso')]);
        },
      },
      { chave: 'saldo', titulo: `Saldo (${s.unidade})`, render: (l) => num(l.saldo) },
    ],
  });
  tabela.atualizar({ linhas: r.dados, total: r.dados.length, pagina: 1, tamanho: Math.max(r.dados.length, 1) });
  corpo.append(el('p', 'campo__dica', ['Os lotes mais próximos do vencimento aparecem primeiro e são usados antes (FEFO).']), tabela.elemento);
}

// registra entrada, saída ou ajuste (saldo = soma das movimentações)
function abrirMovimentacao(aoSalvar: () => void, medicamentoId?: string): void {
  const form = criarFormulario([
    { nome: 'medicamento_id', rotulo: 'Medicamento', tipo: 'select', obrigatorio: true, largura: 'inteira' },
    {
      nome: 'tipo',
      rotulo: 'Tipo de movimentação',
      tipo: 'select',
      obrigatorio: true,
      opcoes: [
        { valor: 'ENTRADA', texto: 'Entrada (compra / recebimento)' },
        { valor: 'SAIDA', texto: 'Saída (uso / perda)' },
        { valor: 'AJUSTE', texto: 'Ajuste de inventário' },
      ],
    },
    { nome: 'quantidade', rotulo: 'Quantidade', tipo: 'numero', min: 0.01, passo: '0.01', obrigatorio: true },
    // lote e validade só são obrigatórios na entrada
    { nome: 'lote_numero', rotulo: 'Lote', dica: 'Obrigatório nas entradas.', validar: (v, t) => (t['tipo'] === 'ENTRADA' && !v ? 'Informe o lote da entrada.' : undefined) },
    { nome: 'validade', rotulo: 'Validade do lote', tipo: 'data', dica: 'Obrigatória nas entradas.', validar: (v, t) => (t['tipo'] === 'ENTRADA' && !v ? 'Informe a validade.' : undefined) },
    { nome: 'observacao', rotulo: 'Observação', tipo: 'area', largura: 'inteira' },
  ]);
  void opcoesMedicamentos().then((ops) => {
    form.definirOpcoes('medicamento_id', ops);
    if (medicamentoId) form.definirValores({ medicamento_id: medicamentoId });
  });

  let salvando = false;
  const botao = criarBotao({ texto: 'Registrar', icone: 'sucesso', onClick: () => void salvar() });
  const modal = abrirModal({
    titulo: 'Movimentar estoque',
    largo: true,
    conteudo: form.elemento,
    acoes: [criarBotao({ texto: 'Cancelar', variante: 'secundario', onClick: () => modal.fechar() }), botao],
  });
  async function salvar(): Promise<void> {
    if (salvando || !form.validar()) return;
    salvando = true;
    botao.disabled = true;
    const v = form.obterValores();
    const r = await api.invoke('estoque:movimentar', {
      medicamento_id: v['medicamento_id'],
      tipo: v['tipo'],
      quantidade: Number(v['quantidade']),
      lote_numero: opcional(v['lote_numero']),
      validade: opcional(v['validade']),
      observacao: opcional(v['observacao']),
    });
    salvando = false;
    botao.disabled = false;
    if (!r.ok) {
      if (r.erro.codigo === 'ESTOQUE_INSUFICIENTE') form.definirErro('quantidade', r.erro.mensagem);
      else mostrarToast('erro', r.erro.mensagem);
      return;
    }
    mostrarToast('sucesso', 'Movimentação registrada.');
    modal.fechar();
    aoSalvar();
  }
  form.aoEnviar(() => void salvar());
}

// tela de estoque (só o administrador movimenta)
export function paginaEstoque(): HTMLElement {
  const podeMovimentar = perfilAtual() === 'MASTER';
  const estado = { pagina: 1, tamanho: 10, busca: '' };
  const areaAlertas = el('div', 'pagina__topo');

  const tabela = criarTabela<SaldoEstoque>({
    textoVazio: 'Nenhum medicamento em estoque.',
    onPagina: (p) => {
      estado.pagina = p;
      void carregar();
    },
    colunas: [
      { chave: 'medicamento_nome', titulo: 'Medicamento' },
      { chave: 'saldo', titulo: 'Saldo', render: (s) => `${num(s.saldo)} ${s.unidade}` },
      { chave: 'consumo_medio_diario', titulo: 'Consumo médio/dia', render: (s) => `${num(s.consumo_medio_diario)} ${s.unidade}` },
      { chave: 'dias_restantes', titulo: 'Dura ainda', render: (s) => (s.dias_restantes === null ? '—' : `${s.dias_restantes} dias`) },
      { chave: 'status', titulo: 'Situação', render: (s) => criarBadge(STATUS[s.status]?.texto ?? s.status, STATUS[s.status]?.tom ?? 'neutro') },
      {
        chave: 'acoes',
        titulo: 'Ações',
        render: (s) =>
          el('div', 'acoes', [
            criarBotaoIcone('estoque', 'Ver lotes e validades', () => void abrirLotes(s)),
            podeMovimentar ? criarBotaoIcone('mais', 'Movimentar este medicamento', () => abrirMovimentacao(() => void carregar(), s.medicamento_id)) : null,
          ]),
      },
    ],
  });

  // faixa vermelha com os críticos (some se não houver)
  async function carregarAlertas(): Promise<void> {
    const r = await api.invoke<AlertaEstoque[]>('alertas:listar');
    areaAlertas.replaceChildren();
    if (!r.ok || r.dados.length === 0) return;
    areaAlertas.append(
      el('div', 'alerta alerta--erro', [
        el('strong', '', [`${r.dados.length} ${r.dados.length === 1 ? 'medicamento está' : 'medicamentos estão'} com estoque crítico`]),
        el('ul', '', r.dados.map((a) => el('li', '', [`${a.medicamento_nome}: restam ${a.saldo} ${a.unidade} (cerca de ${a.dias_restantes} dias)`]))),
      ]),
    );
  }

  async function carregar(): Promise<void> {
    void carregarAlertas();
    tabela.atualizar({ linhas: [], total: 0, pagina: estado.pagina, tamanho: estado.tamanho, carregando: true });
    const r = await api.invoke<Pagina<SaldoEstoque>>('estoque:saldos', { pagina: estado.pagina, tamanho: estado.tamanho, busca: estado.busca || undefined });
    if (!r.ok) return tabela.atualizar({ linhas: [], total: 0, pagina: estado.pagina, tamanho: estado.tamanho, erro: r.erro.mensagem });
    tabela.atualizar({ linhas: r.dados.itens, total: r.dados.total, pagina: r.dados.pagina, tamanho: r.dados.tamanho });
  }

  const raiz = el('section', 'pagina', [
    criarCabecalhoPagina({
      titulo: 'Estoque',
      subtitulo: 'Saldo = soma das movimentações. O alerta usa o consumo médio dos últimos 30 dias.',
      acoes: podeMovimentar ? [criarBotao({ texto: 'Movimentar estoque', icone: 'mais', onClick: () => abrirMovimentacao(() => void carregar()) })] : [],
    }),
    perfilAtual() === 'MASTER' ? null : el('p', 'aviso-leitura', ['Seu perfil tem acesso somente para consulta. A baixa de medicamentos é feita na consulta.']),
    areaAlertas,
    el('div', 'barra', [
      criarBusca({
        placeholder: 'Buscar medicamento...',
        aoBuscar: (t) => {
          estado.busca = t;
          estado.pagina = 1;
          void carregar();
        },
      }),
    ]),
    tabela.elemento,
  ]);
  void carregar();
  return raiz;
}
