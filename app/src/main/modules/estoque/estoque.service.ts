import { z } from 'zod';
import { ErroNegocio } from '../../erros/erro-negocio';
import type {
  LoteDto,
  MedicamentoEstoqueInfo,
  MovimentacaoEstoqueRegistro,
  RepositorioEstoque,
  StatusEstoqueDto,
} from './estoque.repository';

export interface SaldoEstoqueDto {
  medicamento_id: string;
  medicamento_nome: string;
  unidade: string;
  saldo: number;
  consumo_medio_diario: number;
  dias_restantes: number | null;
  dias_alerta: number;
  status: StatusEstoqueDto;
}

export interface PaginaSaldosEstoqueDto {
  itens: SaldoEstoqueDto[];
  total: number;
  pagina: number;
  tamanho: number;
}

export const ListarSaldosEstoqueSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(200).default(10),
  busca: z.string().optional(),
});

export const ListarLotesEstoqueSchema = z.object({
  medicamento_id: z.string().trim().min(1, 'Informe o medicamento.'),
});

export const MovimentarEstoqueSchema = z.object({
  medicamento_id: z.string().trim().min(1, 'Informe o medicamento.'),
  tipo: z.enum(['ENTRADA', 'SAIDA', 'AJUSTE']),
  quantidade: z.coerce.number().min(0, 'A quantidade não pode ser negativa.'),
  lote_numero: z.string().trim().optional(),
  validade: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'A validade deve estar no formato AAAA-MM-DD.')
    .optional(),
  observacao: z.string().trim().max(500).optional(),
});

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function arredondar2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function paraMs(timestamp: number): number {
  return timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
}

/**
 * Função pura que calcula saldo append-only, consumo médio diário,
 * dias restantes e status de estoque de um medicamento.
 */
export function calcularDiasRestantes(
  medicamento: MedicamentoEstoqueInfo,
  movimentacoes: MovimentacaoEstoqueRegistro[],
  agoraMs: number = Date.now(),
): SaldoEstoqueDto {
  // Saldo = soma das movimentações (append-only)
  const somaMovimentacoes = movimentacoes.reduce((acc, mov) => {
    if (mov.tipo === 'ENTRADA') return acc + Math.abs(mov.quantidade);
    if (mov.tipo === 'SAIDA') return acc - Math.abs(mov.quantidade);
    return acc + mov.quantidade; // Em AJUSTE, quantidade já é a diferença com sinal
  }, 0);
  const saldo = Math.max(0, arredondar2(somaMovimentacoes));

  const seteDiasMs = 7 * 86400 * 1000;
  const trintaDiasMs = 30 * 86400 * 1000;

  let primeiraMovMs: number | null = null;
  for (const mov of movimentacoes) {
    const ms = paraMs(mov.criado_em);
    if (primeiraMovMs === null || ms < primeiraMovMs) {
      primeiraMovMs = ms;
    }
  }

  const temSeteDiasDeHistorico = primeiraMovMs !== null && agoraMs - primeiraMovMs >= seteDiasMs;
  const saidasUltimos30d = movimentacoes
    .filter((m) => m.tipo === 'SAIDA' && agoraMs - paraMs(m.criado_em) <= trintaDiasMs)
    .reduce((acc, m) => acc + Math.abs(m.quantidade), 0);

  let consumoMedioDiario = 0;
  if (temSeteDiasDeHistorico && saidasUltimos30d > 0) {
    consumoMedioDiario = arredondar2(saidasUltimos30d / 30);
  } else if (medicamento.consumo_inicial_diario !== null && medicamento.consumo_inicial_diario > 0) {
    consumoMedioDiario = arredondar2(medicamento.consumo_inicial_diario);
  }

  const diasRestantes = consumoMedioDiario > 0 ? Math.floor(saldo / consumoMedioDiario) : null;

  let status: StatusEstoqueDto = 'OK';
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

export class EstoqueService {
  constructor(private readonly repositorio: RepositorioEstoque) {}

  calcularTodosSaldos(agoraMs: number = Date.now()): SaldoEstoqueDto[] {
    const medicamentos = this.repositorio.listarMedicamentosAtivos();
    return medicamentos.map((med) => {
      const movs = this.repositorio.listarMovimentacoesPorMedicamento(med.id);
      return calcularDiasRestantes(med, movs, agoraMs);
    });
  }

  saldos(entrada: unknown = {}): PaginaSaldosEstoqueDto {
    const validado = ListarSaldosEstoqueSchema.safeParse(entrada ?? {});
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Parâmetros de listagem de saldos de estoque inválidos.');
    }

    const { pagina, tamanho, busca } = validado.data;
    const todos = this.calcularTodosSaldos();
    const termo = normalizarTexto(busca ?? '');

    const filtrados = termo
      ? todos.filter((s) => normalizarTexto(s.medicamento_nome).includes(termo))
      : todos;

    const inicio = (pagina - 1) * tamanho;
    return {
      itens: filtrados.slice(inicio, inicio + tamanho),
      total: filtrados.length,
      pagina,
      tamanho,
    };
  }

  lotes(entrada: unknown): LoteDto[] {
    const validado = ListarLotesEstoqueSchema.safeParse(entrada);
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Informe o medicamento para consultar os lotes.');
    }

    return this.repositorio.listarLotesComSaldoFefo(validado.data.medicamento_id);
  }

  movimentar(entrada: unknown): SaldoEstoqueDto {
    const validado = MovimentarEstoqueSchema.safeParse(entrada);
    if (!validado.success) {
      const mensagem = validado.error.issues[0]?.message ?? 'Dados inválidos para movimentação de estoque.';
      throw new ErroNegocio('DADOS_INVALIDOS', mensagem);
    }

    const dados = validado.data;
    const medicamento = this.repositorio.obterMedicamentoAtivo(dados.medicamento_id);
    if (!medicamento) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Medicamento não encontrado.');
    }

    const movsAtuais = this.repositorio.listarMovimentacoesPorMedicamento(medicamento.id);
    const saldoAtual = calcularDiasRestantes(medicamento, movsAtuais).saldo;

    if (dados.tipo === 'ENTRADA') {
      if (dados.quantidade <= 0) {
        throw new ErroNegocio('DADOS_INVALIDOS', 'A quantidade de entrada deve ser maior que zero.');
      }
      if (!dados.lote_numero || !dados.validade) {
        throw new ErroNegocio('DADOS_INVALIDOS', 'Informe o número do lote e a validade para registrar a entrada.');
      }

      this.repositorio.registrarEntrada({
        medicamento_id: medicamento.id,
        quantidade: dados.quantidade,
        lote_numero: dados.lote_numero,
        validade: dados.validade,
        observacao: dados.observacao,
      });
    } else if (dados.tipo === 'SAIDA') {
      if (dados.quantidade <= 0) {
        throw new ErroNegocio('DADOS_INVALIDOS', 'A quantidade de saída deve ser maior que zero.');
      }
      if (dados.quantidade > saldoAtual) {
        throw new ErroNegocio(
          'ESTOQUE_INSUFICIENTE',
          `Saldo insuficiente em estoque para "${medicamento.nome}" (disponível: ${saldoAtual} ${medicamento.unidade}).`,
        );
      }

      this.repositorio.registrarSaidaFefo({
        medicamento_id: medicamento.id,
        quantidade: dados.quantidade,
        observacao: dados.observacao,
      });
    } else if (dados.tipo === 'AJUSTE') {
      // Em AJUSTE o front envia a quantidade contada no inventário; grava-se a diferença como nova movimentação
      const diferenca = arredondar2(dados.quantidade - saldoAtual);
      this.repositorio.registrarAjuste({
        medicamento_id: medicamento.id,
        diferenca,
        observacao: dados.observacao,
      });
    }

    const movsAtualizadas = this.repositorio.listarMovimentacoesPorMedicamento(medicamento.id);
    return calcularDiasRestantes(medicamento, movsAtualizadas);
  }
}
