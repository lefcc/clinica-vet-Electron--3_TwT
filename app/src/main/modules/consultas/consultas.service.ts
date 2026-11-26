import { z, ZodError } from 'zod';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { RepositorioConsultas, EntradaListagem, ConsultaComRelacoes, NovaConsulta } from './consultas.repository';
import {
  CANAIS_CONSULTAS,
  ConsultaEntradaSchema,
  PrescricaoSchema,
  ConsultaObterSchema,
  ConsultaHistoricoAnimalSchema,
  ConsultaListarSchema,
} from '@clinica-vet/shared/consultas';

// ============================================================================
// SERVICE
// ============================================================================

export class ConsultasService {
  constructor(
    private readonly repo: RepositorioConsultas,
    private readonly sessao: { usuarioId: string; colaboradorId: string; perfil: 'MASTER' | 'VETERINARIO' | 'ATENDENTE' } | null,
  ) {}

  listar(entrada: unknown): { itens: ConsultaComRelacoes[]; total: number; pagina: number; tamanho: number } {
    const dados = this.validarSchema(ConsultaListarSchema.parse, entrada);
    const resultado = this.repo.listar(dados);

    // Se for ATENDENTE, omitir diagnóstico
    if (this.sessao?.perfil === 'ATENDENTE') {
      return {
        ...resultado,
        itens: resultado.itens.map((c) => ({ ...c, diagnostico: null })),
      };
    }

    return resultado;
  }

  obter(entrada: unknown): ConsultaComRelacoes {
    const { id } = this.validarSchema(ConsultaObterSchema.parse, entrada);
    const consulta = this.repo.obter(id);
    if (!consulta) throw new ErroNegocio('NAO_ENCONTRADO', 'Consulta não encontrada.');

    // Se for ATENDENTE, omitir diagnóstico (retornar null em vez de undefined para compatibilidade)
    if (this.sessao?.perfil === 'ATENDENTE') {
      return { ...consulta, diagnostico: null };
    }

    return consulta;
  }

  criar(entrada: unknown): ConsultaComRelacoes {
    const dados = this.validarSchema(ConsultaEntradaSchema.parse, entrada);

    // Verificar se animal existe e está ativo
    if (!this.repo.verificarAnimalExiste(dados.animal_id)) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Animal não encontrado ou inativo.');
    }

    const vetId = this.sessao!.colaboradorId;

    const paraCriar: Omit<NovaConsulta, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'> = {
      agendamentoId: dados.agendamento_id || null,
      animalId: dados.animal_id,
      veterinarioId: vetId,
      data: Math.floor(Date.now() / 1000),
      anamnese: dados.anamnese || null,
      diagnostico: dados.diagnostico || null,
      observacoes: dados.observacoes || null,
      prescricoes: dados.prescricoes.map((p) => ({
        medicamentoId: p.medicamento_id,
        quantidade: p.quantidade,
        posologia: p.posologia || null,
      })),
    };

    return this.repo.criar(paraCriar, vetId);
  }

  historicoAnimal(entrada: unknown): ConsultaComRelacoes[] {
    const { animal_id } = this.validarSchema(ConsultaHistoricoAnimalSchema.parse, entrada);
    const consultas = this.repo.historicoAnimal(animal_id);

    // Se for ATENDENTE, omitir diagnóstico (retornar null em vez de undefined para compatibilidade)
    if (this.sessao?.perfil === 'ATENDENTE') {
      return consultas.map((c) => ({ ...c, diagnostico: null }));
    }

    return consultas;
  }

  // ---------- Helpers ----------
  private validarSchema<T>(parser: (dados: unknown) => T, entrada: unknown): T {
    try {
      return parser(entrada);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new ErroNegocio('DADOS_INVALIDOS', e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; '));
      }
      throw e;
    }
  }
}