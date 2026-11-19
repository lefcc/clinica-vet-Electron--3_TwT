import { z } from "zod";

export const PaginacaoSchema = z.strictObject({
  pagina: z.number().int().min(1).default(1),
  tamanho: z.number().int().min(1).max(100).default(20),
  busca: z.string().trim().max(200).default(""),
});
export type Paginacao = z.infer<typeof PaginacaoSchema>;

export function criarPaginaSchema<T extends z.ZodType>(item: T) {
  return z.strictObject({
    itens: z.array(item),
    total: z.number().int().min(0),
    pagina: z.number().int().min(1),
    tamanho: z.number().int().min(1).max(100),
  });
}

export type Pagina<T> = z.infer<ReturnType<typeof criarPaginaSchema<z.ZodType<T>>>>;
