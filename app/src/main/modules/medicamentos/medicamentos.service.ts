import { z } from 'zod';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { MedicamentoDto, RepositorioMedicamentos } from './medicamentos.repository';

export interface PaginaMedicamentosDto {
  itens: MedicamentoDto[];
  total: number;
  pagina: number;
  tamanho: number;
}

export const ListarMedicamentosSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(200).default(10),
  busca: z.string().optional(),
});

export const ObterMedicamentoSchema = z.object({
  id: z.string().trim().min(1),
});

export const CriarMedicamentoSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do medicamento.').max(150),
  principio_ativo: z.string().trim().max(150).optional(),
  unidade: z.string().trim().min(1, 'Informe a unidade do medicamento.').max(40),
  dias_alerta: z.coerce.number().int().min(1).max(60).default(3),
  consumo_inicial_diario: z.coerce.number().min(0).nullable().optional(),
});

export const AtualizarMedicamentoSchema = z.object({
  id: z.string().trim().min(1),
  nome: z.string().trim().min(1).max(150).optional(),
  principio_ativo: z.string().trim().max(150).optional(),
  unidade: z.string().trim().min(1).max(40).optional(),
  dias_alerta: z.coerce.number().int().min(1).max(60).optional(),
  consumo_inicial_diario: z.coerce.number().min(0).nullable().optional(),
});

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export class MedicamentosService {
  constructor(private readonly repositorio: RepositorioMedicamentos) {}

  private validarUnicidadeNomeUnidade(nome: string, unidade: string, ignorarId?: string): void {
    const nomeNorm = normalizarTexto(nome);
    const unidadeNorm = normalizarTexto(unidade);
    const ativos = this.repositorio.listarAtivos();

    const duplicado = ativos.some(
      (m) =>
        m.id !== ignorarId &&
        normalizarTexto(m.nome) === nomeNorm &&
        normalizarTexto(m.unidade) === unidadeNorm,
    );

    if (duplicado) {
      throw new ErroNegocio(
        'MEDICAMENTO_DUPLICADO',
        'Já existe um medicamento ativo cadastrado com este nome e unidade.',
      );
    }
  }

  listar(entrada: unknown = {}): PaginaMedicamentosDto {
    const validado = ListarMedicamentosSchema.safeParse(entrada ?? {});
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Parâmetros de listagem de medicamentos inválidos.');
    }

    const { pagina, tamanho, busca } = validado.data;
    const ativos = this.repositorio.listarAtivos();
    const termo = normalizarTexto(busca ?? '');

    const filtrados = termo
      ? ativos.filter(
          (m) =>
            normalizarTexto(m.nome).includes(termo) ||
            normalizarTexto(m.principio_ativo ?? '').includes(termo) ||
            normalizarTexto(m.unidade).includes(termo),
        )
      : ativos;

    const inicio = (pagina - 1) * tamanho;
    return {
      itens: filtrados.slice(inicio, inicio + tamanho),
      total: filtrados.length,
      pagina,
      tamanho,
    };
  }

  obter(entrada: unknown): MedicamentoDto {
    const validado = ObterMedicamentoSchema.safeParse(entrada);
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Informe o identificador do medicamento.');
    }

    const medicamento = this.repositorio.obterAtivoPorId(validado.data.id);
    if (!medicamento) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Medicamento não encontrado.');
    }
    return medicamento;
  }

  criar(entrada: unknown): MedicamentoDto {
    const validado = CriarMedicamentoSchema.safeParse(entrada);
    if (!validado.success) {
      const mensagem = validado.error.issues[0]?.message ?? 'Dados inválidos para cadastro de medicamento.';
      throw new ErroNegocio('DADOS_INVALIDOS', mensagem);
    }

    const dados = validado.data;
    this.validarUnicidadeNomeUnidade(dados.nome, dados.unidade);

    return this.repositorio.criar({
      nome: dados.nome,
      principio_ativo: dados.principio_ativo || undefined,
      unidade: dados.unidade,
      dias_alerta: dados.dias_alerta,
      consumo_inicial_diario: dados.consumo_inicial_diario ?? null,
    });
  }

  atualizar(entrada: unknown): MedicamentoDto {
    const validado = AtualizarMedicamentoSchema.safeParse(entrada);
    if (!validado.success) {
      const mensagem = validado.error.issues[0]?.message ?? 'Dados inválidos para atualização de medicamento.';
      throw new ErroNegocio('DADOS_INVALIDOS', mensagem);
    }

    const dados = validado.data;
    const atual = this.repositorio.obterAtivoPorId(dados.id);
    if (!atual) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Medicamento não encontrado.');
    }

    const novoNome = dados.nome ?? atual.nome;
    const novaUnidade = dados.unidade ?? atual.unidade;
    this.validarUnicidadeNomeUnidade(novoNome, novaUnidade, dados.id);

    const atualizado = this.repositorio.atualizar({
      id: dados.id,
      nome: novoNome,
      principio_ativo: dados.principio_ativo !== undefined ? (dados.principio_ativo || undefined) : atual.principio_ativo,
      unidade: novaUnidade,
      dias_alerta: dados.dias_alerta ?? atual.dias_alerta,
      consumo_inicial_diario:
        dados.consumo_inicial_diario !== undefined ? dados.consumo_inicial_diario : atual.consumo_inicial_diario,
    });

    if (!atualizado) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Medicamento não encontrado.');
    }
    return atualizado;
  }

  inativar(entrada: unknown): { id: string } {
    const validado = ObterMedicamentoSchema.safeParse(entrada);
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Informe o identificador do medicamento.');
    }

    const sucesso = this.repositorio.inativar(validado.data.id);
    if (!sucesso) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Medicamento não encontrado.');
    }
    return { id: validado.data.id };
  }
}
