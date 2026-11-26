// Schemas Zod e canais IPC para agendamentos
import { z } from 'zod';

export const AgendamentoEntradaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  veterinario_id: z.string().uuid('Veterinário inválido'),
  inicio: z.string().datetime({ offset: true, message: 'Data/hora inválida (use ISO 8601 UTC)' }),
  duracao_min: z.coerce.number().int().positive().max(480, 'Duração máxima 480 min'),
  motivo: z.string().max(500).optional().or(z.literal('')),
  cliente_id: z.string().uuid().optional().or(z.literal('')),
});

export const AgendamentoAtualizarSchema = AgendamentoEntradaSchema.partial();

export const AgendamentoIdSchema = z.object({
  id: z.string().uuid(),
});

export const AgendamentoListarSchema = z.object({
  inicio: z.string().datetime({ offset: true }),
  fim: z.string().datetime({ offset: true }),
  veterinario_id: z.string().uuid().optional(),
});

export const AgendamentoCancelarSchema = z.object({
  id: z.string().uuid(),
});

export const AgendamentoVeterinariosSchema = z.object({});

// Canais IPC
export const CANAIS_AGENDAMENTOS = {
  listar: 'agendamentos:listar',
  obter: 'agendamentos:obter',
  criar: 'agendamentos:criar',
  atualizar: 'agendamentos:atualizar',
  cancelar: 'agendamentos:cancelar',
  veterinarios: 'agendamentos:veterinarios',
} as const;

// Tipos derivados
export type AgendamentoEntrada = z.infer<typeof AgendamentoEntradaSchema>;
export type AgendamentoAtualizar = z.infer<typeof AgendamentoAtualizarSchema>;
export type AgendamentoId = z.infer<typeof AgendamentoIdSchema>;
export type AgendamentoListar = z.infer<typeof AgendamentoListarSchema>;
export type AgendamentoCancelar = z.infer<typeof AgendamentoCancelarSchema>;