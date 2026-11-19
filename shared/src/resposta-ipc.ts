import { z } from "zod";

export const ErroIpcSchema = z.strictObject({
  codigo: z.string().min(1),
  mensagem: z.string().min(1),
});
export type ErroIpc = z.infer<typeof ErroIpcSchema>;

export function criarRespostaIpcSchema<T extends z.ZodType>(dados: T) {
  return z.discriminatedUnion("ok", [
    z
      .strictObject({ ok: z.literal(true), dados })
      .refine((valor) => Object.hasOwn(valor, "dados"), {
        message: "A resposta de sucesso deve conter dados.",
      }),
    z.strictObject({ ok: z.literal(false), erro: ErroIpcSchema }),
  ]);
}

export const RespostaIpcSchema = criarRespostaIpcSchema(z.unknown());
export type RespostaIpc<T = unknown> = z.infer<
  ReturnType<typeof criarRespostaIpcSchema<z.ZodType<T>>>
>;
