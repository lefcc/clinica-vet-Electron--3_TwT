import { z } from "zod";
import { PerfilSchema } from "./perfil.js";

// DTO público: senha_hash pertence exclusivamente ao repository no main.
export const UsuarioSchema = z.strictObject({
  id: z.uuid(),
  colaborador_id: z.uuid(),
  login: z.string().trim().min(1).max(100),
  perfil: PerfilSchema,
  ativo: z.boolean(),
  ultimo_login_em: z.iso.datetime().nullable(),
  criado_em: z.iso.datetime(),
  atualizado_em: z.iso.datetime(),
});
export type Usuario = z.infer<typeof UsuarioSchema>;
