import { z } from 'zod';
import { CepSchema, CpfSchema, DataSchema, DataUtcSchema, EmailSchema, IdSchema, NomeSchema, TelefoneSchema, UfSchema } from './comum';

const CamposCliente = z.object({
  nome: NomeSchema, cpf: CpfSchema, telefone: TelefoneSchema, email: EmailSchema.optional(), cep: CepSchema.optional(),
  logradouro: z.string().max(255).optional(), numero: z.string().max(20).optional(), complemento: z.string().max(100).optional(),
  bairro: z.string().max(100).optional(), cidade: z.string().max(100).optional(), uf: UfSchema.optional()
}).strict();
export const ClienteCriarSchema = CamposCliente;
export const ClienteAtualizarSchema = CamposCliente.partial().extend({ id: IdSchema });
export const ClienteSchema = CamposCliente.extend({ id: IdSchema, ativo: z.boolean() });
export type Cliente = z.infer<typeof ClienteSchema>;

const CamposAnimal = z.object({
  cliente_id: IdSchema, nome: NomeSchema, especie: z.string().trim().min(1).max(100), raca: z.string().max(100).optional(),
  sexo: z.enum(['M', 'F']), data_nascimento: DataSchema.optional(), peso_kg: z.number().positive().max(9999.99).optional(),
  observacoes: z.string().max(5000).optional()
}).strict();
export const AnimalCriarSchema = CamposAnimal;
export const AnimalAtualizarSchema = CamposAnimal.partial().extend({ id: IdSchema });
export const AnimalSchema = CamposAnimal.extend({ id: IdSchema, ativo: z.boolean(), cliente_nome: NomeSchema.optional(), idade_texto: z.string().optional() });
export type Animal = z.infer<typeof AnimalSchema>;
export const AnimaisPorClienteSchema = z.object({ cliente_id: IdSchema }).strict();

export const StatusAgendamentoSchema = z.enum(['AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO']);
export type StatusAgendamento = z.infer<typeof StatusAgendamentoSchema>;
export const AgendamentoCriarSchema = z.object({
  cliente_id: IdSchema.optional(), animal_id: IdSchema, veterinario_id: IdSchema, inicio: DataUtcSchema,
  duracao_min: z.number().int().positive().max(1440), motivo: z.string().max(1000).optional(), status: StatusAgendamentoSchema.optional()
}).strict();
export const AgendamentoAtualizarSchema = AgendamentoCriarSchema.partial().extend({ id: IdSchema });
export const AgendamentoSchema = AgendamentoCriarSchema.extend({
  id: IdSchema, status: StatusAgendamentoSchema, animal_nome: NomeSchema, cliente_nome: NomeSchema,
  veterinario_nome: NomeSchema, confirmado: z.boolean()
});
export type Agendamento = z.infer<typeof AgendamentoSchema>;
export const AgendaListarSchema = z.object({ inicio: DataUtcSchema, fim: DataUtcSchema, veterinario_id: IdSchema.optional() })
  .strict().refine((d) => Date.parse(d.inicio) < Date.parse(d.fim), 'O fim deve ser posterior ao início.');

const PrescricaoEntradaSchema = z.object({ medicamento_id: IdSchema, quantidade: z.number().positive(), posologia: z.string().max(2000).optional() }).strict();
export const PrescricaoSchema = PrescricaoEntradaSchema.extend({ medicamento_nome: NomeSchema.optional() });
export type Prescricao = z.infer<typeof PrescricaoSchema>;
export const ConsultaCriarSchema = z.object({
  animal_id: IdSchema, anamnese: z.string().trim().min(1).max(10000), diagnostico: z.string().max(10000).optional(),
  observacoes: z.string().max(10000).optional(), prescricoes: z.array(PrescricaoEntradaSchema).max(200)
}).strict();
export const ConsultaSchema = ConsultaCriarSchema.extend({
  id: IdSchema, animal_nome: NomeSchema, cliente_nome: NomeSchema, veterinario_nome: NomeSchema,
  data: DataUtcSchema, anamnese: z.string().optional(), prescricoes: z.array(PrescricaoSchema)
});
export type Consulta = z.infer<typeof ConsultaSchema>;
export const HistoricoAnimalSchema = z.object({ animal_id: IdSchema }).strict();
