import { z } from "zod";

export const ColaboradorSchema = z.strictObject({
  id: z.uuid(),
  nome: z.string().trim().min(1).max(200),
  cpf: z.string().regex(/^\d{11}$/, "Informe o CPF com 11 dígitos."),
  cargo: z.string().trim().min(1).max(100),
  crmv: z.string().trim().min(1).max(30).nullable(),
  telefone: z.string().regex(/^\d{10,11}$/, "Informe o telefone com DDD."),
  ativo: z.boolean(),
  criado_em: z.iso.datetime(),
  atualizado_em: z.iso.datetime(),
});
export type Colaborador = z.infer<typeof ColaboradorSchema>;
