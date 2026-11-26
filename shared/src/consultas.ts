// Schemas Zod e canais IPC para consultas
import { z } from 'zod';

export const PrescricaoConsultaEntradaSchema = z.object({
  medicamento_id: z.string().uuid('Medicamento inválido'),
  quantidade: z.coerce.number().int().positive('Quantidade deve ser positiva'),
  posologia: z.string().max(500).optional().or(z.literal('')),
});

export const ConsultaEntradaSchema = z.object({
  animal_id: z.string().uuid('Animal inválido'),
  anamnese: z.string().trim().min(1, 'Anamnese é obrigatória').max(5000),
  diagnostico: z.string().max(5000).optional().or(z.literal('')),
  observacoes: z.string().max(5000).optional().or(z.literal('')),
  prescricoes: z.array(PrescricaoConsultaEntradaSchema).default([]),
  agendamento_id: z.string().uuid().optional().or(z.literal('')),
});

export const ConsultaIdSchema = z.object({
  id: z.string().uuid(),
});

export const ConsultaListarSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(200).default(10),
  busca: z.string().trim().optional(),
});

export const ConsultaHistoricoAnimalSchema = z.object({
  animal_id: z.string().uuid(),
});

export const ConsultaObterSchema = z.object({
  id: z.string().uuid(),
});

// Canais IPC
export const CANAIS_CONSULTAS = {
  listar: 'consultas:listar',
  obter: 'consultas:obter',
  criar: 'consultas:criar',
  historico_animal: 'consultas:historico_animal',
} as const;

// Tipos derivados
export type PrescricaoConsultaEntrada = z.infer<typeof PrescricaoConsultaEntradaSchema>;
export type ConsultaEntrada = z.infer<typeof ConsultaEntradaSchema>;
export type ConsultaId = z.infer<typeof ConsultaIdSchema>;
export type ConsultaListar = z.infer<typeof ConsultaListarSchema>;
export type ConsultaHistoricoAnimal = z.infer<typeof ConsultaHistoricoAnimalSchema>;
export type ConsultaObter = z.infer<typeof ConsultaObterSchema>;