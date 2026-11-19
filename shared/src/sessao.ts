import { z } from "zod";
import { PerfilSchema } from "./perfil.js";

export const SessaoSchema = z.strictObject({
  usuarioId: z.uuid(),
  perfil: PerfilSchema,
  expiraEm: z.iso.datetime(),
});
export type Sessao = z.infer<typeof SessaoSchema>;
