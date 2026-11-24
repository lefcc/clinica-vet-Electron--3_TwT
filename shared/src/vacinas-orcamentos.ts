import { z } from 'zod';
import { CentavosSchema, DataSchema, DataUtcSchema, IdSchema, NomeSchema, TelefoneSchema } from './comum';

export const VacinaCriarSchema = z.object({
  nome: NomeSchema, descricao: z.string().max(5000).optional(), intervalo_reforco_dias: z.number().int().positive()
}).strict();
export const VacinaAtualizarSchema = VacinaCriarSchema.partial().extend({ id: IdSchema });
export const VacinaCatalogoSchema = VacinaCriarSchema.extend({ id: IdSchema, ativo: z.boolean() });
export type VacinaCatalogo = z.infer<typeof VacinaCatalogoSchema>;
export const VacinaFilaSchema = z.object({
  id: IdSchema, animal_nome: NomeSchema, cliente_nome: NomeSchema, telefone: TelefoneSchema, vacina_nome: NomeSchema,
  proxima_dose: DataSchema, lembrete_enviado: z.boolean()
});
export type VacinaFila = z.infer<typeof VacinaFilaSchema>;
export const VacinaAplicarSchema = z.object({ animal_id: IdSchema, vacina_id: IdSchema, data: DataSchema, lote: z.string().max(100).optional() }).strict();

export const ServicoCriarSchema = z.object({ nome: NomeSchema, valor_centavos: CentavosSchema }).strict();
export const ServicoAtualizarSchema = ServicoCriarSchema.partial().extend({ id: IdSchema });
export const ServicoSchema = ServicoCriarSchema.extend({ id: IdSchema, ativo: z.boolean() });
export type Servico = z.infer<typeof ServicoSchema>;
export const ItemOrcamentoSchema = z.object({
  tipo: z.enum(['SERVICO', 'MEDICAMENTO']), item_id: IdSchema, descricao: NomeSchema, quantidade: z.number().int().positive(),
  valor_unitario_centavos: CentavosSchema
}).strict();
export type ItemOrcamento = z.infer<typeof ItemOrcamentoSchema>;
const dadosOrcamento = {
  itens: z.array(ItemOrcamentoSchema).min(1).max(200), desconto_centavos: CentavosSchema, forma_pagamento: NomeSchema
};
export const OrcamentoCriarSchema = z.object({ ...dadosOrcamento, cliente_id: IdSchema, animal_id: IdSchema.optional() }).strict();
export const OrcamentoSchema = z.object({
  ...dadosOrcamento, id: IdSchema, numero: z.number().int().positive(), cliente_nome: NomeSchema,
  animal_nome: NomeSchema.optional(), criado_em: DataUtcSchema, total_centavos: CentavosSchema
});
export type Orcamento = z.infer<typeof OrcamentoSchema>;
export const OrcamentoPdfSchema = z.object({ caminho: z.string().min(1) });
export const CobrancaSchema = OrcamentoSchema.pick({
  numero: true, cliente_nome: true, forma_pagamento: true, total_centavos: true
}).extend({ data: DataUtcSchema }).strict();
