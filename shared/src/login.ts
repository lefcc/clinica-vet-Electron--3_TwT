import { z } from "zod";

export const LoginSchema = z.strictObject({
  login: z.string().trim().min(1).max(100),
  // Não aparar senhas: espaços podem fazer parte da credencial existente.
  senha: z.string().min(1).max(1024),
});
export type Login = z.infer<typeof LoginSchema>;
