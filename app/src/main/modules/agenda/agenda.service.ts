import { z, ZodError } from 'zod';
import { ErroNegocio } from '../../erros/erro-negocio';
import type {
  RepositorioAgendamentos,
  EntradaListagem,
  AgendamentoComRelacoes,
  NovoAgendamento,
} from './agenda.repository';
import { AgendamentoEntradaSchema, AgendamentoAtualizarSchema, AgendamentoVeterinariosSchema, AgendamentoCancelarSchema, AgendamentoIdSchema } from '@clinica-vet/shared/agendamentos';

// ============================================================================
// SERVICE
// ============================================================================

export class AgendaService {
  constructor(
    private readonly repo: RepositorioAgendamentos,
    private readonly sessao: { usuarioId: string; colaboradorId: string; perfil: 'MASTER' | 'VETERINARIO' | 'ATENDENTE' } | null,
  ) {}

  listar(entrada: unknown): AgendamentoComRelacoes[] {
    const dados = this.validarSchema(this.validarListagem, entrada);

    // Se for VETERINARIO, filtrar apenas seus agendamentos
    const veterinarioId = this.sessao?.perfil === 'VETERINARIO' ? this.sessao.colaboradorId : dados.veterinario_id;

    // dados.inicio e dados.fim já são Unix seconds (transform do schema)
    return this.repo.listar({
      inicio: dados.inicio,
      fim: dados.fim,
      veterinario_id: veterinarioId,
    });
  }

  obter(id: string): AgendamentoComRelacoes {
    const { id: idValido } = this.validarSchema(AgendamentoIdSchema.parse, { id });
    const agendamento = this.repo.obter(idValido);
    if (!agendamento) throw new ErroNegocio('NAO_ENCONTRADO', 'Agendamento não encontrado.');
    return agendamento;
  }

  criar(entrada: unknown): AgendamentoComRelacoes {
    const dados = this.validarSchema(AgendamentoEntradaSchema.parse, entrada);

    // Converter data ISO string para timestamp Unix (segundos)
    const inicioTimestamp = Math.floor(new Date(dados.inicio).getTime() / 1000);
    const fimTimestamp = inicioTimestamp + dados.duracao_min * 60;

    // Verificar se animal existe e está ativo
    if (!this.repo.verificarAnimalExiste(dados.animal_id)) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Animal não encontrado ou inativo.');
    }

    // Verificar se veterinário existe e está ativo
    if (!this.repo.verificarVeterinarioExiste(dados.veterinario_id)) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Veterinário não encontrado ou inativo.');
    }

    // Verificar conflito de horário
    if (this.repo.verificarConflito(dados.veterinario_id, inicioTimestamp, fimTimestamp)) {
      throw new ErroNegocio('AGENDA_CONFLITO', 'Já existe um agendamento para este veterinário neste horário.');
    }

    // Se for VETERINARIO, só pode criar para si mesmo
    if (this.sessao?.perfil === 'VETERINARIO' && dados.veterinario_id !== this.sessao.colaboradorId) {
      throw new ErroNegocio('SEM_PERMISSAO', 'Veterinários só podem agendar para si mesmos.');
    }

    // Definir confirmado: false se offline (sempre por enquanto)
    const paraCriar: Omit<NovoAgendamento, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'> = {
      clienteId: dados.cliente_id || null,
      animalId: dados.animal_id,
      veterinarioId: dados.veterinario_id,
      inicio: inicioTimestamp,
      duracaoMin: dados.duracao_min,
      motivo: dados.motivo || null,
    };

    return this.repo.criar(paraCriar);
  }

  atualizar(entrada: unknown): AgendamentoComRelacoes {
    const schemaAtualizar = z.object({ id: z.string().uuid() }).merge(AgendamentoAtualizarSchema);
    const parsed = this.validarSchema(schemaAtualizar.parse, entrada);
    const { id, ...dados } = parsed;

    const existente = this.repo.obter(id);
    if (!existente) throw new ErroNegocio('NAO_ENCONTRADO', 'Agendamento não encontrado.');

    // Se for VETERINARIO, só pode atualizar seus próprios agendamentos
    if (this.sessao?.perfil === 'VETERINARIO' && existente.veterinario_id !== this.sessao.colaboradorId) {
      throw new ErroNegocio('SEM_PERMISSAO', 'Veterinários só podem editar seus próprios agendamentos.');
    }

    // Verificar conflito se mudou horário ou veterinário
    if (dados.veterinario_id || dados.inicio || dados.duracao_min) {
      const veterinarioId = dados.veterinario_id || existente.veterinario_id;
      // dados.inicio já é Unix seconds se vier do schema transform, senão converte
      const inicio = dados.inicio ? (typeof dados.inicio === 'string' ? Math.floor(new Date(dados.inicio).getTime() / 1000) : dados.inicio) : existente.inicio;
      const duracaoMin = dados.duracao_min || existente.duracao_min;
      const fim = inicio + duracaoMin * 60;

      if (this.repo.verificarConflito(veterinarioId, inicio, fim, id)) {
        throw new ErroNegocio('AGENDA_CONFLITO', 'Já existe um agendamento para este veterinário neste horário.');
      }
    }

    // Se for VETERINARIO, não pode mudar o veterinário_id
    if (this.sessao?.perfil === 'VETERINARIO' && dados.veterinario_id && dados.veterinario_id !== this.sessao.colaboradorId) {
      throw new ErroNegocio('SEM_PERMISSAO', 'Veterinários não podem transferir agendamentos para outro veterinário.');
    }

    const paraAtualizar: Partial<Omit<NovoAgendamento, 'id' | 'criadoEm'>> = {};
    if (dados.cliente_id !== undefined) paraAtualizar.clienteId = dados.cliente_id || null;
    if (dados.animal_id !== undefined) paraAtualizar.animalId = dados.animal_id;
    if (dados.veterinario_id !== undefined) paraAtualizar.veterinarioId = dados.veterinario_id;
    if (dados.inicio !== undefined) paraAtualizar.inicio = Math.floor(new Date(dados.inicio).getTime() / 1000);
    if (dados.duracao_min !== undefined) paraAtualizar.duracaoMin = dados.duracao_min;
    if (dados.motivo !== undefined) paraAtualizar.motivo = dados.motivo || null;

    return this.repo.atualizar(id, paraAtualizar);
  }

  cancelar(entrada: unknown): void {
    const { id } = this.validarSchema(AgendamentoCancelarSchema.parse, entrada);

    const existente = this.repo.obter(id);
    if (!existente) throw new ErroNegocio('NAO_ENCONTRADO', 'Agendamento não encontrado.');

    // Se for VETERINARIO, só pode cancelar seus próprios agendamentos
    if (this.sessao?.perfil === 'VETERINARIO' && existente.veterinario_id !== this.sessao.colaboradorId) {
      throw new ErroNegocio('SEM_PERMISSAO', 'Veterinários só podem cancelar seus próprios agendamentos.');
    }

    this.repo.cancelar(id);
  }

  listarVeterinarios(entrada: unknown): { id: string; nome: string; crmv: string | null }[] {
    this.validarSchema(AgendamentoVeterinariosSchema.parse, entrada);
    return this.repo.listarVeterinarios();
  }

  // ---------- Helpers ----------
  private validarListagem(entrada: unknown): { inicio: number; fim: number; veterinario_id?: string } {
    const schema = z.object({
      inicio: z.string().datetime({ offset: true, message: 'Data/hora inválida' }).transform((s) => Math.floor(new Date(s).getTime() / 1000)),
      fim: z.string().datetime({ offset: true, message: 'Data/hora inválida' }).transform((s) => Math.floor(new Date(s).getTime() / 1000)),
      veterinario_id: z.string().uuid().optional(),
    });
    return schema.parse(entrada);
  }

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