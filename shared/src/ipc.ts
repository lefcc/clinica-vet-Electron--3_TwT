import { z } from "zod";
import { LoginSchema } from "./login.js";
import { SessaoSchema } from "./sessao.js";
import type { RespostaIpc } from "./resposta-ipc.js";

// Somente canais nomeados; nenhum invoke genérico será exposto ao renderer.
export const canaisIpc = {
  "sistema:ping": { entrada: z.undefined(), saida: z.literal("pong") },
  "whatsapp:abrir": {
    entrada: z.strictObject({ url: z.url().max(4096) }),
    saida: z.null(),
  },
  "auth:login": { entrada: LoginSchema, saida: SessaoSchema },
  "auth:sessao": { entrada: z.undefined(), saida: SessaoSchema },
  "auth:sair": { entrada: z.undefined(), saida: z.null() },
} as const;

export type CanalIpc = keyof typeof canaisIpc;
export type EntradaIpc<C extends CanalIpc> = z.input<(typeof canaisIpc)[C]["entrada"]>;
export type DadosIpc<C extends CanalIpc> = z.infer<(typeof canaisIpc)[C]["saida"]>;
export type RetornoIpc<C extends CanalIpc> = RespostaIpc<DadosIpc<C>>;

export interface ApiClinica {
  sistema: { ping(): Promise<RetornoIpc<"sistema:ping">> };
  whatsapp: {
    abrir(entrada: EntradaIpc<"whatsapp:abrir">): Promise<RetornoIpc<"whatsapp:abrir">>;
  };
  auth: {
    login(entrada: EntradaIpc<"auth:login">): Promise<RetornoIpc<"auth:login">>;
    sessao(): Promise<RetornoIpc<"auth:sessao">>;
    sair(): Promise<RetornoIpc<"auth:sair">>;
  };
}
