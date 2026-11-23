import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { formatarCentavos, formatarData, formatarDia } from '../../lib/formatadores.js';
import {
  criarAbas,
  criarBotao,
  criarCabecalhoPagina,
  criarCartao,
  criarSelect,
  criarTabela,
  mostrarToast,
  type Aba,
  type Coluna,
} from '../../components/ui/index.js';
import { baixarArquivo } from '../comum/util.js';

// formato das linhas de cada relatório (o que o back-end devolve)
interface Cobranca {
  numero: number;
  data: string;
  cliente_nome: string;
  forma_pagamento: string;
  total_centavos: number;
}
interface LinhaValidade {
  medicamento_nome: string;
  numero: string;
  validade: string;
  saldo: number;
}
interface LinhaCompra {
  medicamento_nome: string;
  unidade: string;
  saldo: number;
  sugerido: number;
}

/** molde de relatório: tabela + exportar csv + imprimir */
function abaRelatorio<T>(canal: string, colunas: Coluna<T>[], paraCsv: (l: T) => (string | number)[], cabecalhoCsv: string[], nomeArquivo: string, vazio: string, rodape?: (linhas: T[]) => string): HTMLElement {
  const tabela = criarTabela<T>({ colunas, textoVazio: vazio, onPagina: () => undefined });
  const resumo = el('p', 'relatorio__resumo');
  let linhasAtuais: T[] = [];

  void api.invoke<T[]>(canal).then((r) => {
    if (!r.ok) return tabela.atualizar({ linhas: [], total: 0, pagina: 1, tamanho: 1, erro: r.erro.mensagem });
    linhasAtuais = r.dados;
    tabela.atualizar({ linhas: r.dados, total: r.dados.length, pagina: 1, tamanho: Math.max(r.dados.length, 1) });
    if (rodape) resumo.textContent = rodape(r.dados);
  });
  tabela.atualizar({ linhas: [], total: 0, pagina: 1, tamanho: 1, carregando: true });

  // csv com ";" (o excel brasileiro entende)
  const exportar = (): void => {
    if (linhasAtuais.length === 0) return mostrarToast('aviso', 'Não há dados para exportar.');
    const linhas = [cabecalhoCsv, ...linhasAtuais.map(paraCsv)].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'));
    baixarArquivo(nomeArquivo, linhas.join('\n'));
  };

  return el('div', 'stack', [
    el('div', 'barra barra--direita', [criarBotao({ texto: 'Exportar CSV', icone: 'baixar', variante: 'secundario', onClick: exportar }), criarBotao({ texto: 'Imprimir / PDF', icone: 'pdf', variante: 'secundario', onClick: () => window.print() })]),
    resumo,
    tabela.elemento,
  ]);
}

// cobranças (com o total faturado)
function abaCobrancas(): HTMLElement {
  return abaRelatorio<Cobranca>(
    'relatorios:cobrancas',
    [
      { chave: 'numero', titulo: 'Nº', render: (c) => String(c.numero).padStart(4, '0') },
      { chave: 'data', titulo: 'Data', render: (c) => formatarData(c.data) },
      { chave: 'cliente_nome', titulo: 'Cliente' },
      { chave: 'forma_pagamento', titulo: 'Pagamento' },
      { chave: 'total_centavos', titulo: 'Total', render: (c) => formatarCentavos(c.total_centavos) },
    ],
    (c) => [c.numero, formatarData(c.data), c.cliente_nome, c.forma_pagamento, (c.total_centavos / 100).toFixed(2).replace('.', ',')],
    ['Número', 'Data', 'Cliente', 'Pagamento', 'Total (R$)'],
    'cobrancas.csv',
    'Nenhuma cobrança no período.',
    (linhas) => `Total faturado: ${formatarCentavos(linhas.reduce((t, l) => t + l.total_centavos, 0))} em ${linhas.length} orçamento(s).`,
  );
}

// estoque e validade (lotes por vencimento)
function abaValidade(): HTMLElement {
  return abaRelatorio<LinhaValidade>(
    'relatorios:estoque_validade',
    [
      { chave: 'medicamento_nome', titulo: 'Medicamento' },
      { chave: 'numero', titulo: 'Lote' },
      { chave: 'validade', titulo: 'Validade', render: (l) => formatarDia(l.validade) },
      { chave: 'saldo', titulo: 'Saldo' },
    ],
    (l) => [l.medicamento_nome, l.numero, formatarDia(l.validade), l.saldo],
    ['Medicamento', 'Lote', 'Validade', 'Saldo'],
    'estoque-validade.csv',
    'Nenhum lote em estoque.',
  );
}

// lista de compras: o que está acabando e quanto comprar
function abaCompras(): HTMLElement {
  return abaRelatorio<LinhaCompra>(
    'relatorios:lista_compras',
    [
      { chave: 'medicamento_nome', titulo: 'Medicamento' },
      { chave: 'saldo', titulo: 'Saldo atual', render: (l) => `${l.saldo} ${l.unidade}` },
      { chave: 'sugerido', titulo: 'Comprar (cobre 30 dias)', render: (l) => `${l.sugerido} ${l.unidade}` },
    ],
    (l) => [l.medicamento_nome, l.saldo, l.sugerido, l.unidade],
    ['Medicamento', 'Saldo atual', 'Quantidade sugerida', 'Unidade'],
    'lista-de-compras.csv',
    'Nenhuma compra necessária no momento.',
  );
}

// importar e exportar csv (clientes e animais)
function abaCsv(): HTMLElement {
  const entidade = criarSelect(
    [
      { valor: 'clientes', texto: 'Clientes' },
      { valor: 'animais', texto: 'Animais' },
    ],
    { valor: 'clientes' },
  );
  entidade.setAttribute('aria-label', 'Dados');
  const arquivo = el('input', 'input', [], { type: 'file', accept: '.csv,text/csv', 'aria-label': 'Arquivo CSV' });

  async function exportar(): Promise<void> {
    const r = await api.invoke<{ nome_arquivo: string; conteudo: string }>('csv:exportar', { entidade: entidade.value });
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    baixarArquivo(r.dados.nome_arquivo, r.dados.conteudo);
    mostrarToast('sucesso', 'Arquivo exportado.');
  }
  async function importar(): Promise<void> {
    const f = arquivo.files?.[0];
    if (!f) return mostrarToast('aviso', 'Escolha um arquivo CSV primeiro.');
    const conteudo = await f.text();
    const r = await api.invoke<{ importados: number; ignorados: number }>('csv:importar', { entidade: entidade.value, conteudo });
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    mostrarToast('sucesso', `${r.dados.importados} registro(s) importado(s); ${r.dados.ignorados} ignorado(s).`);
    arquivo.value = '';
  }

  return el('div', 'stack', [
    criarCartao({
      titulo: 'Exportar',
      subtitulo: 'Gera um arquivo CSV que abre no Excel.',
      filhos: [el('div', 'barra', [entidade, criarBotao({ texto: 'Exportar CSV', icone: 'baixar', onClick: () => void exportar() })])],
    }),
    criarCartao({
      titulo: 'Importar',
      subtitulo: 'Use para trazer clientes e animais da planilha antiga. Registros repetidos (mesmo CPF) são ignorados.',
      filhos: [el('div', 'barra', [arquivo, criarBotao({ texto: 'Importar CSV', icone: 'enviar', onClick: () => void importar() })])],
    }),
  ]);
}

// relatórios (só o administrador)
export function paginaRelatorios(): HTMLElement {
  const abas: Aba[] = [
    { id: 'cobrancas', titulo: 'Cobranças', renderizar: abaCobrancas },
    { id: 'validade', titulo: 'Estoque e validade', renderizar: abaValidade },
    { id: 'compras', titulo: 'Lista de compras', renderizar: abaCompras },
    { id: 'csv', titulo: 'Importar / exportar', renderizar: abaCsv },
  ];
  return el('section', 'pagina', [criarCabecalhoPagina({ titulo: 'Relatórios', subtitulo: 'Faturamento, validade, compras sugeridas e troca de dados por CSV.' }), criarAbas(abas)]);
}
