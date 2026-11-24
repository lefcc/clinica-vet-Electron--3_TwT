import { z } from 'zod';
import { PerfilSchema } from './perfil';

export const IdSchema = z.string().trim().min(1).max(100);
export const PorIdSchema = z.object({ id: IdSchema }).strict();
export const SemEntradaSchema = z.undefined();
export const VazioSchema = z.object({}).strict();
export const DataUtcSchema = z.string().datetime();
export const DataSchema = z.string().date();
export const CentavosSchema = z.number().int().min(0).max(2147483647);
export const NomeSchema = z.string().trim().min(1).max(255);
export const CpfSchema = z.string().regex(/^\d{11}$/);
export const TelefoneSchema = z.string().regex(/^\d{10,11}$/);
export const CepSchema = z.string().regex(/^\d{8}$/);
export const UfSchema = z.string().regex(/^[A-Z]{2}$/);
export const EmailSchema = z.string().email().max(255);
export function vazioOpcionalSchema(schema: z.ZodString) {
  return z.union([schema, z.literal('')]).optional().transform((valor) => valor || undefined);
}
const paginacao = { pagina: z.number().int().min(1).max(1000000), tamanho: z.number().int().min(1).max(200) };
export const EntradaListagemSchema = z.object({ ...paginacao, busca: z.string().trim().max(255).optional() }).catchall(z.unknown());
export type EntradaListagem = z.infer<typeof EntradaListagemSchema>;
export interface Pagina<T> { itens: T[]; total: number; pagina: number; tamanho: number }
export function paginaSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ ...paginacao, itens: z.array(item), total: z.number().int().nonnegative() }).strict();
}

export const SessaoSchema = z.object({ usuarioId: IdSchema, nome: NomeSchema, perfil: PerfilSchema, expiraEm: z.number().int().positive() }).strict();
export type Sessao = z.infer<typeof SessaoSchema>;
export const LoginEntradaSchema = z.object({ login: z.string().trim().min(1).max(60), senha: z.string().min(1).max(200) }).strict();
export const EstadoSyncSchema = z.object({ estado: z.enum(['sincronizado', 'sincronizando', 'erro']), pendentes: z.number().int().nonnegative(), ultimo_sync_em: DataUtcSchema.optional() });
export type EstadoSync = z.infer<typeof EstadoSyncSchema>;
export const EnderecoSchema = z.object({ cep: CepSchema, logradouro: z.string(), bairro: z.string(), cidade: z.string(), uf: UfSchema });
export type Endereco = z.infer<typeof EnderecoSchema>;
export const CepEntradaSchema = z.object({ cep: CepSchema }).strict();
export const WhatsAppEntradaSchema = z.object({ telefone: TelefoneSchema, mensagem: z.string().trim().min(1).max(2000) }).strict();
