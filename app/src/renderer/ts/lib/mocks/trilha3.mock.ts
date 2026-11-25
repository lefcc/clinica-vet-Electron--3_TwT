import type { IPCResponse } from '../api.js';
import { hojeEmSaoPaulo } from '../formatadores.js';
import type {
  AlertaEstoque,
  Cotacao,
  EntradaListagem,
  Fornecedor,
  Lote,
  Medicamento,
  Pagina,
  PrecoFornecedor,
  SaldoEstoque,
  StatusEstoque,
} from '../tipos.js';

/** Erro de regra de negócio simulado pelos handlers em memória da Trilha 3 */
export class ErroMockTrilha3 extends Error {
  constructor(
    public readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroMockTrilha3';
  }
}

export type HandlerMockTrilha3 = (dados?: unknown) => unknown;

export interface RegistroPrecoMock {
  id: string;
  medicamento_id: string;
  fornecedor_id: string;
  moeda: 'BRL' | 'USD';
  preco_centavos: number;
  atualizado_em: string;
  ativo: boolean;
}

export interface MovimentacaoEstoqueMock {
  id: string;
  medicamento_id: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  lote_numero?: string;
  validade?: string;
  observacao?: string;
  criado_em: string;
}

// Remove acentos e normaliza para minúsculas para busca e comparação de unicidade
function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// Soma dias a uma data YYYY-MM-DD em UTC
function somarDiasData(baseIsoDate: string, dias: number): string {
  const ms = Date.parse(`${baseIsoDate.slice(0, 10)}T00:00:00Z`) + dias * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

// Soma dias ao instante atual e retorna ISO UTC
function somarDiasIsoUtc(dias: number, horas = 9): string {
  const data = somarDiasData(hojeEmSaoPaulo(), dias);
  const hh = String(horas).padStart(2, '0');
  return new Date(`${data}T${hh}:00:00-03:00`).toISOString();
}

let sequenciaId = 100;
function gerarIdMock(prefixo: string): string {
  sequenciaId += 1;
  return `${prefixo}-mock-${sequenciaId}`;
}

function criarMedicamentosIniciais(): Medicamento[] {
  return [
    {
      id: 'm1',
      nome: 'Dipirona',
      principio_ativo: 'Dipirona sódica',
      unidade: 'ml',
      dias_alerta: 3,
      consumo_inicial_diario: 20,
      ativo: true,
    },
    {
      id: 'm2',
      nome: 'Amoxicilina 250mg',
      principio_ativo: 'Amoxicilina',
      unidade: 'comprimido',
      dias_alerta: 5,
      consumo_inicial_diario: 12,
      ativo: true,
    },
    {
      id: 'm3',
      nome: 'Meloxicam',
      principio_ativo: 'Meloxicam',
      unidade: 'ml',
      dias_alerta: 3,
      consumo_inicial_diario: 8,
      ativo: true,
    },
    {
      id: 'm4',
      nome: 'Vermífugo Plus',
      principio_ativo: 'Praziquantel',
      unidade: 'comprimido',
      dias_alerta: 7,
      consumo_inicial_diario: 6,
      ativo: true,
    },
    {
      id: 'm5',
      nome: 'Vacina V10',
      principio_ativo: 'Vacina polivalente canina',
      unidade: 'dose',
      dias_alerta: 7,
      consumo_inicial_diario: 4,
      ativo: true,
    },
    {
      id: 'm6',
      nome: 'Soro fisiológico',
      principio_ativo: 'Cloreto de sódio 0,9%',
      unidade: 'bolsa',
      dias_alerta: 3,
      consumo_inicial_diario: 2,
      ativo: true,
    },
  ];
}

function criarFornecedoresIniciais(): Fornecedor[] {
  return [
    {
      id: 'f1',
      nome: 'VetDistribuidora Campinas',
      tipo: 'NACIONAL',
      contato: 'Sandra',
      telefone: '1933445566',
      email: 'vendas@vetdist.exemplo.com',
      ativo: true,
    },
    {
      id: 'f2',
      nome: 'PetFarma Sul',
      tipo: 'NACIONAL',
      contato: 'Jorge',
      telefone: '1140028922',
      email: 'contato@petfarmasul.exemplo.com',
      ativo: true,
    },
    {
      id: 'f3',
      nome: 'Global Vet Supplies',
      tipo: 'IMPORTADO',
      contato: 'Ana Souza',
      telefone: '11987654321',
      email: 'ana@globalvet.exemplo.com',
      ativo: true,
    },
    {
      id: 'f4',
      nome: 'EuroPharma Animal',
      tipo: 'IMPORTADO',
      contato: 'Carlos Klein',
      telefone: '11912345678',
      email: 'comercial@europharma.exemplo.com',
      ativo: true,
    },
  ];
}

function criarPrecosIniciais(): RegistroPrecoMock[] {
  const agora = somarDiasIsoUtc(-1, 14);
  return [
    // Dipirona (m1): Nacional vs Importado em USD
    {
      id: 'pf1',
      medicamento_id: 'm1',
      fornecedor_id: 'f1',
      moeda: 'BRL',
      preco_centavos: 1850,
      atualizado_em: agora,
      ativo: true,
    },
    {
      id: 'pf2',
      medicamento_id: 'm1',
      fornecedor_id: 'f2',
      moeda: 'BRL',
      preco_centavos: 1990,
      atualizado_em: agora,
      ativo: true,
    },
    {
      id: 'pf3',
      medicamento_id: 'm1',
      fornecedor_id: 'f3',
      moeda: 'USD',
      preco_centavos: 320, // US$ 3,20 * R$ 5,45 = R$ 17,44 (1744 centavos -> mais barato)
      atualizado_em: agora,
      ativo: true,
    },
    // Amoxicilina 250mg (m2)
    {
      id: 'pf4',
      medicamento_id: 'm2',
      fornecedor_id: 'f1',
      moeda: 'BRL',
      preco_centavos: 240,
      atualizado_em: agora,
      ativo: true,
    },
    {
      id: 'pf5',
      medicamento_id: 'm2',
      fornecedor_id: 'f4',
      moeda: 'USD',
      preco_centavos: 50, // US$ 0,50 * R$ 5,45 = R$ 2,73 (273 centavos)
      atualizado_em: agora,
      ativo: true,
    },
    // Vacina V10 (m5)
    {
      id: 'pf6',
      medicamento_id: 'm5',
      fornecedor_id: 'f3',
      moeda: 'USD',
      preco_centavos: 850, // US$ 8,50 * R$ 5,45 = R$ 46,33 (4633 centavos)
      atualizado_em: agora,
      ativo: true,
    },
    {
      id: 'pf7',
      medicamento_id: 'm5',
      fornecedor_id: 'f2',
      moeda: 'BRL',
      preco_centavos: 5200,
      atualizado_em: agora,
      ativo: true,
    },
  ];
}

function criarLotesIniciais(): Record<string, Lote[]> {
  const hoje = hojeEmSaoPaulo();
  return {
    m1: [{ id: 'l1', numero: 'DP-2291', validade: somarDiasData(hoje, 200), saldo: 420 }],
    // m2 com dois lotes em ordens de validade diferentes para demonstrar FEFO
    m2: [
      { id: 'l3', numero: 'AM-1190', validade: somarDiasData(hoje, 310), saldo: 20 },
      { id: 'l2', numero: 'AM-1044', validade: somarDiasData(hoje, 20), saldo: 8 },
    ],
    m3: [{ id: 'l4', numero: 'ME-771', validade: somarDiasData(hoje, 150), saldo: 40 }],
    m4: [{ id: 'l5', numero: 'VP-310', validade: somarDiasData(hoje, 400), saldo: 150 }],
    m5: [{ id: 'l6', numero: 'V10-88', validade: somarDiasData(hoje, 60), saldo: 9 }],
    m6: [{ id: 'l7', numero: 'SF-5', validade: somarDiasData(hoje, 500), saldo: 60 }],
  };
}

function criarMovimentacoesIniciais(): MovimentacaoEstoqueMock[] {
  return [
    // m1: saldo 420 (450 entrada - 30 saída em < 7 dias -> usa consumo_inicial_diario = 20 -> 21 dias -> OK)
    {
      id: 'mov1',
      medicamento_id: 'm1',
      tipo: 'ENTRADA',
      quantidade: 450,
      lote_numero: 'DP-2291',
      validade: somarDiasData(hojeEmSaoPaulo(), 200),
      criado_em: somarDiasIsoUtc(-5),
    },
    {
      id: 'mov2',
      medicamento_id: 'm1',
      tipo: 'SAIDA',
      quantidade: 30,
      criado_em: somarDiasIsoUtc(-2),
    },
    // m2: saldo 28 (358 entrada - 330 saída ao longo de >= 7 dias -> consumo médio = 330/30 = 11/dia -> floor(28/11) = 2 dias <= dias_alerta(5) -> CRITICO)
    {
      id: 'mov3',
      medicamento_id: 'm2',
      tipo: 'ENTRADA',
      quantidade: 358,
      lote_numero: 'AM-1044',
      validade: somarDiasData(hojeEmSaoPaulo(), 20),
      criado_em: somarDiasIsoUtc(-25),
    },
    {
      id: 'mov4',
      medicamento_id: 'm2',
      tipo: 'SAIDA',
      quantidade: 200,
      criado_em: somarDiasIsoUtc(-15),
    },
    {
      id: 'mov5',
      medicamento_id: 'm2',
      tipo: 'SAIDA',
      quantidade: 130,
      criado_em: somarDiasIsoUtc(-3),
    },
    // m3: saldo 40 (< 7 dias -> usa consumo_inicial_diario = 8 -> floor(40/8) = 5 dias; dias_alerta = 3, 5 <= 6 -> ATENCAO)
    {
      id: 'mov6',
      medicamento_id: 'm3',
      tipo: 'ENTRADA',
      quantidade: 40,
      lote_numero: 'ME-771',
      validade: somarDiasData(hojeEmSaoPaulo(), 150),
      criado_em: somarDiasIsoUtc(-4),
    },
    // m4: saldo 150 (< 7 dias -> usa consumo_inicial_diario = 6 -> 25 dias -> OK)
    {
      id: 'mov7',
      medicamento_id: 'm4',
      tipo: 'ENTRADA',
      quantidade: 150,
      lote_numero: 'VP-310',
      validade: somarDiasData(hojeEmSaoPaulo(), 400),
      criado_em: somarDiasIsoUtc(-4),
    },
    // m5: saldo 9 (< 7 dias -> usa consumo_inicial_diario = 4 -> floor(9/4) = 2 dias <= dias_alerta(7) -> CRITICO)
    {
      id: 'mov8',
      medicamento_id: 'm5',
      tipo: 'ENTRADA',
      quantidade: 9,
      lote_numero: 'V10-88',
      validade: somarDiasData(hojeEmSaoPaulo(), 60),
      criado_em: somarDiasIsoUtc(-2),
    },
    // m6: saldo 60 (< 7 dias -> usa consumo_inicial_diario = 2 -> 30 dias -> OK)
    {
      id: 'mov9',
      medicamento_id: 'm6',
      tipo: 'ENTRADA',
      quantidade: 60,
      lote_numero: 'SF-5',
      validade: somarDiasData(hojeEmSaoPaulo(), 500),
      criado_em: somarDiasIsoUtc(-3),
    },
  ];
}

// Estado em memória da Trilha 3
let medicamentosMock: Medicamento[] = criarMedicamentosIniciais();
let fornecedoresMock: Fornecedor[] = criarFornecedoresIniciais();
let precosMock: RegistroPrecoMock[] = criarPrecosIniciais();
let lotesPorMedicamentoMock: Record<string, Lote[]> = criarLotesIniciais();
let movimentacoesMock: MovimentacaoEstoqueMock[] = criarMovimentacoesIniciais();
let cotacaoDolarMock: Cotacao = {
  valor_centavos: 545, // R$ 5,45
  atualizado_em: somarDiasIsoUtc(0, 9),
  origem: 'API',
};

/** Restaura o estado inicial em memória dos mocks da Trilha 3 (útil para testes) */
export function resetarTrilha3Mock(): void {
  sequenciaId = 100;
  medicamentosMock = criarMedicamentosIniciais();
  fornecedoresMock = criarFornecedoresIniciais();
  precosMock = criarPrecosIniciais();
  lotesPorMedicamentoMock = criarLotesIniciais();
  movimentacoesMock = criarMovimentacoesIniciais();
  cotacaoDolarMock = {
    valor_centavos: 545,
    atualizado_em: somarDiasIsoUtc(0, 9),
    origem: 'API',
  };
}

/** Permite alterar a cotação mockada do dólar (ex.: simular modo offline 'CACHE' ou variação cambial) */
export function definirCotacaoDolarMock(parcial: Partial<Cotacao>): Cotacao {
  cotacaoDolarMock = {
    ...cotacaoDolarMock,
    ...parcial,
  };
  return { ...cotacaoDolarMock };
}

function paginar<T>(itens: T[], entrada?: Partial<EntradaListagem>): Pagina<T> {
  const pagina = Math.max(1, Number(entrada?.pagina) || 1);
  const tamanho = Math.max(1, Number(entrada?.tamanho) || 10);
  const inicio = (pagina - 1) * tamanho;
  return {
    itens: itens.slice(inicio, inicio + tamanho),
    total: itens.length,
    pagina,
    tamanho,
  };
}

function filtrarPorBusca<T>(itens: T[], busca: string | undefined, extrairCampos: (item: T) => (string | undefined)[]): T[] {
  const termo = normalizarTexto(busca ?? '');
  if (!termo) return itens;
  return itens.filter((item) =>
    extrairCampos(item).some((campo) => normalizarTexto(campo ?? '').includes(termo)),
  );
}

function validarUnicidadeMedicamento(nome: string, unidade: string, ignorarId?: string): void {
  const nomeNorm = normalizarTexto(nome);
  const unidadeNorm = normalizarTexto(unidade);
  const duplicado = medicamentosMock.some(
    (m) =>
      m.ativo &&
      m.id !== ignorarId &&
      normalizarTexto(m.nome) === nomeNorm &&
      normalizarTexto(m.unidade) === unidadeNorm,
  );
  if (duplicado) {
    throw new ErroMockTrilha3('MEDICAMENTO_DUPLICADO', 'Já existe um medicamento ativo com este nome e unidade.');
  }
}

/**
 * Calcula o saldo append-only (soma das movimentações), consumo médio diário,
 * dias restantes e status de estoque para um medicamento.
 */
export function calcularSaldoMedicamentoMock(medicamento: Medicamento): SaldoEstoque {
  const movs = movimentacoesMock.filter((m) => m.medicamento_id === medicamento.id);

  // Saldo = soma algébrica de todas as movimentações (append-only)
  const saldoBruto = movs.reduce((acc, m) => {
    if (m.tipo === 'ENTRADA') return acc + m.quantidade;
    if (m.tipo === 'SAIDA') return acc - m.quantidade;
    // Em AJUSTE, m.quantidade já representa a diferença gravada (pode ser positiva ou negativa)
    return acc + m.quantidade;
  }, 0);
  const saldo = Math.max(0, Math.round(saldoBruto * 100) / 100);

  const agoraMs = Date.now();
  const seteDiasMs = 7 * 86400000;
  const trintaDiasMs = 30 * 86400000;

  const saidas = movs.filter((m) => m.tipo === 'SAIDA');
  const temSeteDiasDeHistorico = saidas.some((m) => agoraMs - Date.parse(m.criado_em) >= seteDiasMs);

  let consumoMedioDiario = 0;
  if (temSeteDiasDeHistorico) {
    const somaSaidas30d = saidas
      .filter((m) => agoraMs - Date.parse(m.criado_em) <= trintaDiasMs)
      .reduce((acc, m) => acc + m.quantidade, 0);
    consumoMedioDiario = Math.round((somaSaidas30d / 30) * 100) / 100;
  } else if (medicamento.consumo_inicial_diario != null && medicamento.consumo_inicial_diario > 0) {
    consumoMedioDiario = medicamento.consumo_inicial_diario;
  }

  const diasRestantes = consumoMedioDiario > 0 ? Math.floor(saldo / consumoMedioDiario) : null;

  let status: StatusEstoque = 'OK';
  if (diasRestantes !== null && diasRestantes <= medicamento.dias_alerta) {
    status = 'CRITICO';
  } else if (diasRestantes !== null && diasRestantes <= medicamento.dias_alerta * 2) {
    status = 'ATENCAO';
  }

  return {
    medicamento_id: medicamento.id,
    medicamento_nome: medicamento.nome,
    unidade: medicamento.unidade,
    saldo,
    consumo_medio_diario: consumoMedioDiario,
    dias_restantes: diasRestantes,
    dias_alerta: medicamento.dias_alerta,
    status,
  };
}

function listarLotesFefo(medicamentoId: string): Lote[] {
  const lotes = lotesPorMedicamentoMock[medicamentoId] ?? [];
  return lotes
    .filter((l) => l.saldo > 0)
    .map((l) => ({ ...l }))
    .sort((a, b) => a.validade.localeCompare(b.validade));
}

function consumirLotesFefo(medicamentoId: string, quantidadeSaida: number): void {
  const lotes = lotesPorMedicamentoMock[medicamentoId] ?? [];
  const lotesOrdenados = [...lotes]
    .filter((l) => l.saldo > 0)
    .sort((a, b) => a.validade.localeCompare(b.validade));

  let restante = quantidadeSaida;
  for (const lote of lotesOrdenados) {
    if (restante <= 0) break;
    const abatido = Math.min(lote.saldo, restante);
    lote.saldo = Math.round((lote.saldo - abatido) * 100) / 100;
    restante = Math.round((restante - abatido) * 100) / 100;
  }
}

function ajustarLotesInventario(medicamentoId: string, diferenca: number): void {
  if (diferenca === 0) return;
  if (diferenca < 0) {
    consumirLotesFefo(medicamentoId, Math.abs(diferenca));
    return;
  }
  const lotes = (lotesPorMedicamentoMock[medicamentoId] ??= []);
  const ordenados = [...lotes].sort((a, b) => b.validade.localeCompare(a.validade));
  if (ordenados[0]) {
    ordenados[0].saldo = Math.round((ordenados[0].saldo + diferenca) * 100) / 100;
  } else {
    lotes.push({
      id: gerarIdMock('lote'),
      numero: 'AJUSTE-INV',
      validade: somarDiasData(hojeEmSaoPaulo(), 365),
      saldo: diferenca,
    });
  }
}

function calcularComparativoPrecos(medicamentoId: string): PrecoFornecedor[] {
  const registros = precosMock.filter((p) => p.ativo && p.medicamento_id === medicamentoId);
  const convertidos = registros
    .map((reg) => {
      const fornecedor = fornecedoresMock.find((f) => f.id === reg.fornecedor_id && f.ativo);
      if (!fornecedor) return null;
      const precoReaisCentavos =
        reg.moeda === 'USD'
          ? Math.round((reg.preco_centavos * cotacaoDolarMock.valor_centavos) / 100)
          : reg.preco_centavos;
      return {
        id: reg.id,
        fornecedor_id: fornecedor.id,
        fornecedor_nome: fornecedor.nome,
        fornecedor_tipo: fornecedor.tipo,
        moeda: reg.moeda,
        preco_centavos: reg.preco_centavos,
        preco_reais_centavos: precoReaisCentavos,
        atualizado_em: reg.atualizado_em,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.preco_reais_centavos - b.preco_reais_centavos);

  const menorPreco = convertidos[0]?.preco_reais_centavos ?? 0;

  return convertidos.map((item, indice) => {
    const maisBarato = indice === 0;
    const diferencaPercentual =
      maisBarato || menorPreco <= 0
        ? 0
        : Math.round(((item.preco_reais_centavos - menorPreco) / menorPreco) * 1000) / 10;
    return {
      ...item,
      diferenca_percentual: diferencaPercentual,
      mais_barato: maisBarato,
    };
  });
}

function listarAlertasCriticos(): AlertaEstoque[] {
  return medicamentosMock
    .filter((m) => m.ativo)
    .map(calcularSaldoMedicamentoMock)
    .filter((s) => s.status === 'CRITICO')
    .map((s) => ({
      id: `alerta-${s.medicamento_id}`,
      medicamento_nome: s.medicamento_nome,
      dias_restantes: s.dias_restantes ?? 0,
      saldo: s.saldo,
      unidade: s.unidade,
    }));
}

/** Mapa de handlers em memória para todos os canais IPC da Trilha 3 */
export const handlersTrilha3Mock: Record<string, HandlerMockTrilha3> = {
  // --- Medicamentos ---
  'medicamentos:listar': (raw) => {
    const entrada = (raw ?? {}) as Partial<EntradaListagem>;
    const ativos = medicamentosMock.filter((m) => m.ativo);
    const filtrados = filtrarPorBusca(ativos, entrada.busca, (m) => [m.nome, m.principio_ativo, m.unidade]);
    return paginar(
      filtrados.map((m) => ({ ...m })),
      entrada,
    );
  },

  'medicamentos:obter': (raw) => {
    const { id } = (raw ?? {}) as { id?: string };
    const med = medicamentosMock.find((m) => m.id === id && m.ativo);
    if (!med) throw new ErroMockTrilha3('NAO_ENCONTRADO', 'Medicamento não encontrado.');
    return { ...med };
  },

  'medicamentos:criar': (raw) => {
    const dados = (raw ?? {}) as Partial<Medicamento>;
    const nome = String(dados.nome ?? '').trim();
    const unidade = String(dados.unidade ?? '').trim();
    if (!nome || !unidade) {
      throw new ErroMockTrilha3('DADOS_INVALIDOS', 'Nome e unidade do medicamento são obrigatórios.');
    }
    validarUnicidadeMedicamento(nome, unidade);

    const diasAlerta = Math.min(60, Math.max(1, Number(dados.dias_alerta) || 3));
    const consumoInicial =
      dados.consumo_inicial_diario != null && dados.consumo_inicial_diario !== undefined
        ? Number(dados.consumo_inicial_diario)
        : null;

    const novo: Medicamento = {
      id: gerarIdMock('med'),
      nome,
      principio_ativo: dados.principio_ativo ? String(dados.principio_ativo).trim() : undefined,
      unidade,
      dias_alerta: diasAlerta,
      consumo_inicial_diario: consumoInicial,
      ativo: true,
    };
    medicamentosMock.push(novo);
    lotesPorMedicamentoMock[novo.id] = [];
    return { ...novo };
  },

  'medicamentos:atualizar': (raw) => {
    const dados = (raw ?? {}) as Partial<Medicamento> & { id?: string };
    const med = medicamentosMock.find((m) => m.id === dados.id && m.ativo);
    if (!med) throw new ErroMockTrilha3('NAO_ENCONTRADO', 'Medicamento não encontrado.');

    const nome = dados.nome !== undefined ? String(dados.nome).trim() : med.nome;
    const unidade = dados.unidade !== undefined ? String(dados.unidade).trim() : med.unidade;
    validarUnicidadeMedicamento(nome, unidade, med.id);

    med.nome = nome;
    med.unidade = unidade;
    med.principio_ativo = dados.principio_ativo ? String(dados.principio_ativo).trim() : undefined;
    if (dados.dias_alerta !== undefined) {
      med.dias_alerta = Math.min(60, Math.max(1, Number(dados.dias_alerta) || 3));
    }
    if ('consumo_inicial_diario' in dados) {
      med.consumo_inicial_diario =
        dados.consumo_inicial_diario != null ? Number(dados.consumo_inicial_diario) : null;
    }
    return { ...med };
  },

  'medicamentos:inativar': (raw) => {
    const { id } = (raw ?? {}) as { id?: string };
    const med = medicamentosMock.find((m) => m.id === id && m.ativo);
    if (!med) throw new ErroMockTrilha3('NAO_ENCONTRADO', 'Medicamento não encontrado.');
    med.ativo = false;
    return { id: med.id };
  },

  // --- Fornecedores e Comparativo de Preços ---
  'fornecedores:listar': (raw) => {
    const entrada = (raw ?? {}) as Partial<EntradaListagem> & { tipo?: string };
    let ativos = fornecedoresMock.filter((f) => f.ativo);
    if (entrada.tipo === 'NACIONAL' || entrada.tipo === 'IMPORTADO') {
      ativos = ativos.filter((f) => f.tipo === entrada.tipo);
    }
    const filtrados = filtrarPorBusca(ativos, entrada.busca, (f) => [f.nome, f.contato, f.email]);
    return paginar(
      filtrados.map((f) => ({ ...f })),
      entrada,
    );
  },

  'fornecedores:obter': (raw) => {
    const { id } = (raw ?? {}) as { id?: string };
    const forn = fornecedoresMock.find((f) => f.id === id && f.ativo);
    if (!forn) throw new ErroMockTrilha3('NAO_ENCONTRADO', 'Fornecedor não encontrado.');
    return { ...forn };
  },

  'fornecedores:criar': (raw) => {
    const dados = (raw ?? {}) as Partial<Fornecedor>;
    const nome = String(dados.nome ?? '').trim();
    if (!nome) throw new ErroMockTrilha3('DADOS_INVALIDOS', 'Informe o nome do fornecedor.');
    const tipo = dados.tipo === 'IMPORTADO' ? 'IMPORTADO' : 'NACIONAL';

    const novo: Fornecedor = {
      id: gerarIdMock('forn'),
      nome,
      tipo,
      contato: dados.contato ? String(dados.contato).trim() : undefined,
      telefone: dados.telefone ? String(dados.telefone).replace(/\D/g, '') : undefined,
      email: dados.email ? String(dados.email).trim() : undefined,
      ativo: true,
    };
    fornecedoresMock.push(novo);
    return { ...novo };
  },

  'fornecedores:atualizar': (raw) => {
    const dados = (raw ?? {}) as Partial<Fornecedor> & { id?: string };
    const forn = fornecedoresMock.find((f) => f.id === dados.id && f.ativo);
    if (!forn) throw new ErroMockTrilha3('NAO_ENCONTRADO', 'Fornecedor não encontrado.');

    if (dados.nome !== undefined) forn.nome = String(dados.nome).trim();
    if (dados.tipo === 'NACIONAL' || dados.tipo === 'IMPORTADO') forn.tipo = dados.tipo;
    forn.contato = dados.contato ? String(dados.contato).trim() : undefined;
    forn.telefone = dados.telefone ? String(dados.telefone).replace(/\D/g, '') : undefined;
    forn.email = dados.email ? String(dados.email).trim() : undefined;
    return { ...forn };
  },

  'fornecedores:inativar': (raw) => {
    const { id } = (raw ?? {}) as { id?: string };
    const forn = fornecedoresMock.find((f) => f.id === id && f.ativo);
    if (!forn) throw new ErroMockTrilha3('NAO_ENCONTRADO', 'Fornecedor não encontrado.');
    forn.ativo = false;
    return { id: forn.id };
  },

  'fornecedores:precos_listar': (raw) => {
    const { medicamento_id } = (raw ?? {}) as { medicamento_id?: string };
    if (!medicamento_id) return [];
    return calcularComparativoPrecos(medicamento_id);
  },

  'fornecedores:precos_salvar': (raw) => {
    const dados = (raw ?? {}) as {
      medicamento_id?: string;
      fornecedor_id?: string;
      moeda?: 'BRL' | 'USD';
      preco_centavos?: number;
    };
    const medicamentoId = String(dados.medicamento_id ?? '');
    const fornecedorId = String(dados.fornecedor_id ?? '');
    const moeda = dados.moeda === 'USD' ? 'USD' : 'BRL';
    const precoCentavos = Math.round(Number(dados.preco_centavos) || 0);

    if (!medicamentoId || !fornecedorId || precoCentavos <= 0) {
      throw new ErroMockTrilha3('DADOS_INVALIDOS', 'Informe fornecedor, moeda e um preço válido em centavos.');
    }

    const existente = precosMock.find(
      (p) => p.medicamento_id === medicamentoId && p.fornecedor_id === fornecedorId,
    );
    const agora = new Date().toISOString();

    if (existente) {
      existente.moeda = moeda;
      existente.preco_centavos = precoCentavos;
      existente.atualizado_em = agora;
      existente.ativo = true;
    } else {
      precosMock.push({
        id: gerarIdMock('pf'),
        medicamento_id: medicamentoId,
        fornecedor_id: fornecedorId,
        moeda,
        preco_centavos: precoCentavos,
        atualizado_em: agora,
        ativo: true,
      });
    }

    return calcularComparativoPrecos(medicamentoId);
  },

  'fornecedores:precos_inativar': (raw) => {
    const { id } = (raw ?? {}) as { id?: string };
    const reg = precosMock.find((p) => p.id === id && p.ativo);
    if (!reg) throw new ErroMockTrilha3('NAO_ENCONTRADO', 'Preço não encontrado.');
    reg.ativo = false;
    return { id: reg.id };
  },

  // --- Dólar ---
  'dolar:atual': () => ({ ...cotacaoDolarMock }),

  // --- Estoque (Append-Only + FEFO) ---
  'estoque:saldos': (raw) => {
    const entrada = (raw ?? {}) as Partial<EntradaListagem>;
    const saldos = medicamentosMock
      .filter((m) => m.ativo)
      .map(calcularSaldoMedicamentoMock);
    const filtrados = filtrarPorBusca(saldos, entrada.busca, (s) => [s.medicamento_nome]);
    return paginar(filtrados, entrada);
  },

  'estoque:lotes': (raw) => {
    const { medicamento_id } = (raw ?? {}) as { medicamento_id?: string };
    if (!medicamento_id) return [];
    return listarLotesFefo(medicamento_id);
  },

  'estoque:movimentar': (raw) => {
    const dados = (raw ?? {}) as {
      medicamento_id?: string;
      tipo?: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
      quantidade?: number;
      lote_numero?: string;
      validade?: string;
      observacao?: string;
    };

    const med = medicamentosMock.find((m) => m.id === dados.medicamento_id && m.ativo);
    if (!med) throw new ErroMockTrilha3('NAO_ENCONTRADO', 'Medicamento não encontrado.');

    const tipo = dados.tipo;
    const quantidadeInformada = Number(dados.quantidade);
    if (!tipo || Number.isNaN(quantidadeInformada) || (tipo !== 'AJUSTE' && quantidadeInformada <= 0) || (tipo === 'AJUSTE' && quantidadeInformada < 0)) {
      throw new ErroMockTrilha3('DADOS_INVALIDOS', 'Informe um tipo e uma quantidade válida para a movimentação.');
    }

    const saldoAtual = calcularSaldoMedicamentoMock(med).saldo;
    const agora = new Date().toISOString();

    if (tipo === 'ENTRADA') {
      const loteNumero = String(dados.lote_numero ?? '').trim();
      const validade = String(dados.validade ?? '').trim();
      if (!loteNumero || !validade) {
        throw new ErroMockTrilha3('DADOS_INVALIDOS', 'Informe o lote e a validade para registrar a entrada.');
      }

      movimentacoesMock.push({
        id: gerarIdMock('mov'),
        medicamento_id: med.id,
        tipo: 'ENTRADA',
        quantidade: quantidadeInformada,
        lote_numero: loteNumero,
        validade,
        observacao: dados.observacao,
        criado_em: agora,
      });

      const lotes = (lotesPorMedicamentoMock[med.id] ??= []);
      const loteExistente = lotes.find((l) => l.numero === loteNumero && l.validade === validade);
      if (loteExistente) {
        loteExistente.saldo = Math.round((loteExistente.saldo + quantidadeInformada) * 100) / 100;
      } else {
        lotes.push({
          id: gerarIdMock('lote'),
          numero: loteNumero,
          validade,
          saldo: quantidadeInformada,
        });
      }
    } else if (tipo === 'SAIDA') {
      if (quantidadeInformada > saldoAtual) {
        throw new ErroMockTrilha3(
          'ESTOQUE_INSUFICIENTE',
          `Saldo insuficiente em estoque (disponível: ${saldoAtual} ${med.unidade}).`,
        );
      }

      movimentacoesMock.push({
        id: gerarIdMock('mov'),
        medicamento_id: med.id,
        tipo: 'SAIDA',
        quantidade: quantidadeInformada,
        observacao: dados.observacao,
        criado_em: agora,
      });

      consumirLotesFefo(med.id, quantidadeInformada);
    } else if (tipo === 'AJUSTE') {
      // Em AJUSTE o front envia a quantidade contada no inventário; grava-se a diferença como nova movimentação
      const diferenca = Math.round((quantidadeInformada - saldoAtual) * 100) / 100;
      movimentacoesMock.push({
        id: gerarIdMock('mov'),
        medicamento_id: med.id,
        tipo: 'AJUSTE',
        quantidade: diferenca,
        observacao: dados.observacao,
        criado_em: agora,
      });
      ajustarLotesInventario(med.id, diferenca);
    }

    return calcularSaldoMedicamentoMock(med);
  },

  // --- Alertas ---
  'alertas:listar': () => listarAlertasCriticos(),

  'alertas:contar': () => ({ total: listarAlertasCriticos().length }),
};

/** Verifica se um canal IPC pertence ao conjunto de mocks da Trilha 3 */
export function ehCanalTrilha3Mock(canal: string): boolean {
  return Object.prototype.hasOwnProperty.call(handlersTrilha3Mock, canal);
}

/**
 * Invoca um canal da Trilha 3 em memória devolvendo o envelope padrão `{ ok: true, dados }`
 * ou `{ ok: false, erro: { codigo, mensagem } }`.
 */
export async function invocarTrilha3Mock<T = unknown>(canal: string, dados?: unknown): Promise<IPCResponse<T>> {
  const handler = handlersTrilha3Mock[canal];
  if (!handler) {
    return {
      ok: false,
      erro: {
        codigo: 'CANAL_NAO_IMPLEMENTADO',
        mensagem: `Canal não registrado no mock da Trilha 3 (${canal}).`,
      },
    };
  }
  try {
    const resultado = (await Promise.resolve(handler(dados))) as T;
    return { ok: true, dados: resultado };
  } catch (erro) {
    if (erro instanceof ErroMockTrilha3) {
      return {
        ok: false,
        erro: { codigo: erro.codigo, mensagem: erro.message },
      };
    }
    return {
      ok: false,
      erro: {
        codigo: 'ERRO_INTERNO',
        mensagem: erro instanceof Error ? erro.message : 'Erro interno no mock da Trilha 3.',
      },
    };
  }
}

/**
 * Registra os handlers da Trilha 3 em `window.api` quando o aplicativo roda sem o preload
 * do Electron (ou encadeia como fallback nos canais da Trilha 3), sem modificar `api.ts`.
 */
export function instalarTrilha3MockNoWindow(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { api?: { invoke: (canal: string, dados?: unknown) => Promise<unknown> } };
  const anterior = w.api?.invoke;
  w.api = {
    invoke: async (canal: string, dados?: unknown): Promise<unknown> => {
      if (ehCanalTrilha3Mock(canal)) {
        return invocarTrilha3Mock(canal, dados);
      }
      if (anterior) {
        return anterior(canal, dados);
      }
      return {
        ok: false,
        erro: {
          codigo: 'CANAL_NAO_IMPLEMENTADO',
          mensagem: `O back-end ainda não implementou esta função (${canal}).`,
        },
      };
    },
  };
}
