import { z } from 'zod';
import { CentavosSchema, DataSchema, DataUtcSchema, EmailSchema, EntradaListagemSchema, IdSchema, NomeSchema, TelefoneSchema, vazioOpcionalSchema } from './comum';

const diasAlerta = z.number().int().min(1).max(60);
export const MedicamentoCriarSchema = z.object({
  nome: NomeSchema, principio_ativo: z.string().max(255).optional(), unidade: z.string().trim().min(1).max(50),
  dias_alerta: diasAlerta.default(3), consumo_inicial_diario: z.number().nonnegative().nullable().optional()
}).strict();
export const MedicamentoAtualizarSchema = MedicamentoCriarSchema.partial().extend({ id: IdSchema });
export const MedicamentoSchema = MedicamentoCriarSchema.extend({ id: IdSchema, dias_alerta: diasAlerta, ativo: z.boolean() });
export type Medicamento = z.infer<typeof MedicamentoSchema>;
export const TipoFornecedorSchema = z.enum(['NACIONAL', 'IMPORTADO']);
const CamposFornecedor = z.object({
  nome: NomeSchema, tipo: TipoFornecedorSchema, contato: z.string().max(255).optional(),
  telefone: TelefoneSchema.optional(), email: EmailSchema.optional()
}).strict();
export const FornecedorCriarSchema = CamposFornecedor.extend({ telefone: vazioOpcionalSchema(TelefoneSchema) });
export const FornecedorAtualizarSchema = FornecedorCriarSchema.partial().extend({ id: IdSchema });
export const FornecedorListarSchema = EntradaListagemSchema.extend({ tipo: TipoFornecedorSchema.optional() }).strict();
export const FornecedorSchema = CamposFornecedor.extend({ id: IdSchema, ativo: z.boolean() });
export type Fornecedor = z.infer<typeof FornecedorSchema>;
export const PorMedicamentoSchema = z.object({ medicamento_id: IdSchema }).strict();
export const PrecoFornecedorSalvarSchema = PorMedicamentoSchema.extend({
  fornecedor_id: IdSchema, moeda: z.enum(['BRL', 'USD']), preco_centavos: CentavosSchema
});
export const PrecoFornecedorSchema = PrecoFornecedorSalvarSchema.omit({ medicamento_id: true }).extend({
  id: IdSchema, fornecedor_nome: NomeSchema, fornecedor_tipo: TipoFornecedorSchema, preco_reais_centavos: CentavosSchema,
  diferenca_percentual: z.number().nonnegative(), mais_barato: z.boolean(), atualizado_em: DataUtcSchema
});
export type PrecoFornecedor = z.infer<typeof PrecoFornecedorSchema>;
export const CotacaoSchema = z.object({ valor_centavos: CentavosSchema, atualizado_em: DataUtcSchema, origem: z.enum(['API', 'CACHE']) });
export type Cotacao = z.infer<typeof CotacaoSchema>;

export const StatusEstoqueSchema = z.enum(['OK', 'ATENCAO', 'CRITICO']);
export type StatusEstoque = z.infer<typeof StatusEstoqueSchema>;
export const SaldoEstoqueSchema = z.object({
  medicamento_id: IdSchema, medicamento_nome: NomeSchema, unidade: z.string(), saldo: z.number(),
  consumo_medio_diario: z.number().nonnegative(), dias_restantes: z.number().nullable(), dias_alerta: diasAlerta, status: StatusEstoqueSchema
});
export type SaldoEstoque = z.infer<typeof SaldoEstoqueSchema>;
export const LoteSchema = z.object({ id: IdSchema, numero: z.string(), validade: DataSchema, saldo: z.number() });
export type Lote = z.infer<typeof LoteSchema>;
export const EstoqueValidadeSchema = LoteSchema.omit({ id: true })
  .extend({ medicamento_nome: NomeSchema }).strict();
export const ListaCompraSchema = SaldoEstoqueSchema.pick({
  medicamento_nome: true, unidade: true, saldo: true
}).extend({ sugerido: z.number().finite().nonnegative() }).strict();
export const AlertaEstoqueSchema = z.object({ id: IdSchema, medicamento_nome: NomeSchema, dias_restantes: z.number(), saldo: z.number(), unidade: z.string() });
export type AlertaEstoque = z.infer<typeof AlertaEstoqueSchema>;
export const AlertasContagemSchema = z.object({ total: z.number().int().nonnegative() }).strict();
export const MovimentacaoCriarSchema = PorMedicamentoSchema.extend({
  tipo: z.enum(['ENTRADA', 'SAIDA', 'AJUSTE']), quantidade: z.number().finite().nonnegative(), lote_id: IdSchema.optional(),
  lote_numero: z.string().trim().min(1).max(100).optional(), validade: DataSchema.optional(), observacao: z.string().max(1000).optional()
}).superRefine((d, ctx) => {
  if (d.tipo === 'ENTRADA' && (!d.lote_numero || !d.validade)) ctx.addIssue({ code: 'custom', message: 'Informe o número e a validade do lote.' });
  if (d.tipo !== 'AJUSTE' && d.quantidade === 0) ctx.addIssue({ code: 'custom', path: ['quantidade'], message: 'A quantidade deve ser maior que zero.' });
});
