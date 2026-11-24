import { z } from 'zod';
import { PerfilSchema } from './perfil';
import { CepSchema, CpfSchema, DataUtcSchema, EmailSchema, EntradaListagemSchema, IdSchema, NomeSchema, PorIdSchema, SemEntradaSchema, TelefoneSchema, UfSchema, VazioSchema, paginaSchema } from './comum';

const SenhaSchema = z.string().min(8).max(72).refine((senha) => new TextEncoder().encode(senha).length <= 72, 'Use até 72 bytes na senha.');
const LoginSchema = z.string().trim().min(1).max(60);
const vazioOpcional = (schema: z.ZodString) => z.union([schema, z.literal('')]).optional()
  .transform((valor) => valor || undefined);
const CamposColaborador = z.object({
  nome: NomeSchema, cpf: CpfSchema, cargo: z.string().trim().min(1).max(100), crmv: z.string().trim().max(20).optional(),
  telefone: vazioOpcional(TelefoneSchema), login: LoginSchema, perfil: PerfilSchema
}).strict();
export const ColaboradorSchema = CamposColaborador.extend({ id: IdSchema, ativo: z.boolean() });
export type Colaborador = z.infer<typeof ColaboradorSchema>;
export const ColaboradorCriarSchema = CamposColaborador.extend({ senha: SenhaSchema });
export const ColaboradorAtualizarSchema = CamposColaborador.partial().extend({ id: IdSchema });
export const RedefinirSenhaSchema = PorIdSchema.extend({ nova_senha: SenhaSchema });

export const AuditoriaRegistroSchema = z.object({
  id: IdSchema, ocorrido_em: DataUtcSchema, usuario_nome: NomeSchema, perfil: PerfilSchema, acao: z.string().min(1),
  entidade: z.string().min(1), registro_id: IdSchema.optional(), descricao: z.string().min(1)
}).strict();
export type AuditoriaRegistro = z.infer<typeof AuditoriaRegistroSchema>;
export const AuditoriaListarSchema = EntradaListagemSchema.extend({
  acao: z.string().max(60).optional(), entidade: z.string().max(100).optional(), periodo: z.enum(['HOJE', '7D', '30D']).optional()
}).strict();

export const ConfiguracoesSchema = z.object({
  nome_clinica: NomeSchema, telefone: TelefoneSchema.optional(), email: EmailSchema.optional(), cep: CepSchema.optional(),
  logradouro: z.string().trim().max(255).optional(), numero: z.string().trim().max(20).optional(),
  bairro: z.string().trim().max(100).optional(), cidade: z.string().trim().max(100).optional(), uf: UfSchema.optional(),
  template_lembrete: z.string().min(1).max(2000),
  backup_horario: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), backup_manter: z.number().int().min(1).max(90)
}).strict();
export type Configuracoes = z.infer<typeof ConfiguracoesSchema>;
export const ConfiguracoesAtualizarSchema = ConfiguracoesSchema.partial().extend({
  telefone: vazioOpcional(TelefoneSchema), cep: vazioOpcional(CepSchema)
});
export const TemplateLembreteSchema = ConfiguracoesSchema.pick({ template_lembrete: true });
export const BackupArquivoSchema = z.object({
  id: z.string().uuid(), criado_em: DataUtcSchema, tipo: z.enum(['AUTOMATICO', 'MANUAL']), tamanho_bytes: z.number().int().positive()
}).strict();
export type BackupArquivo = z.infer<typeof BackupArquivoSchema>;
export const BackupRestaurarSchema = BackupArquivoSchema.pick({ id: true });

export const ConflitoSchema = z.object({
  id: IdSchema, tabela: z.string().min(1), registro_id: IdSchema, tipo: z.string().min(1),
  dados_local: z.record(z.unknown()), dados_central: z.record(z.unknown()), criado_em: DataUtcSchema
}).strict();
export type Conflito = z.infer<typeof ConflitoSchema>;
export const ConflitoResolverSchema = PorIdSchema.extend({ escolha: z.enum(['LOCAL', 'CENTRAL']) });

export const canaisTrilha1 = {
  'colaboradores:listar': { entrada: EntradaListagemSchema.strict(), saida: paginaSchema(ColaboradorSchema) },
  'colaboradores:obter': { entrada: PorIdSchema, saida: ColaboradorSchema },
  'colaboradores:criar': { entrada: ColaboradorCriarSchema, saida: ColaboradorSchema },
  'colaboradores:atualizar': { entrada: ColaboradorAtualizarSchema, saida: ColaboradorSchema },
  'colaboradores:inativar': { entrada: PorIdSchema, saida: VazioSchema },
  'colaboradores:redefinir_senha': { entrada: RedefinirSenhaSchema, saida: VazioSchema },
  'auditoria:listar': { entrada: AuditoriaListarSchema, saida: paginaSchema(AuditoriaRegistroSchema) },
  'configuracoes:obter': { entrada: SemEntradaSchema, saida: z.union([ConfiguracoesSchema, TemplateLembreteSchema]) },
  'configuracoes:atualizar': { entrada: ConfiguracoesAtualizarSchema, saida: ConfiguracoesSchema },
  'backup:listar': { entrada: SemEntradaSchema, saida: z.array(BackupArquivoSchema) },
  'backup:criar': { entrada: SemEntradaSchema, saida: BackupArquivoSchema },
  'backup:restaurar': { entrada: BackupRestaurarSchema, saida: VazioSchema },
  'sync_conflitos:listar': { entrada: SemEntradaSchema, saida: z.array(ConflitoSchema) },
  'sync_conflitos:resolver': { entrada: ConflitoResolverSchema, saida: VazioSchema }
} as const;
