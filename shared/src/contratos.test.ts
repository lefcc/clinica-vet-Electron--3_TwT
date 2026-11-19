import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  ColaboradorSchema,
  LoginSchema,
  PaginacaoSchema,
  PerfilSchema,
  RespostaIpcSchema,
  SessaoSchema,
  UsuarioSchema,
  canaisIpc,
  criarPaginaSchema,
  criarRespostaIpcSchema,
  type ApiClinica,
  type EntradaIpc,
  type RetornoIpc,
} from "./index.js";

const id = "b09a1931-193b-461e-a0a2-40e31456cd01";
const data = "2026-11-16T12:00:00.000Z";
const usuario = {
  id,
  colaborador_id: "a642746e-bd83-4eac-9e0c-d5d10b9ad0ec",
  login: "master",
  perfil: "MASTER",
  ativo: true,
  ultimo_login_em: null,
  criado_em: data,
  atualizado_em: data,
};
const colaborador = {
  id,
  nome: "Maria Silva",
  cpf: "52998224725",
  cargo: "Administração",
  crmv: null,
  telefone: "11999999999",
  ativo: true,
  criado_em: data,
  atualizado_em: data,
};
const sessao = { usuarioId: id, perfil: "MASTER", expiraEm: data };

describe("contratos públicos", () => {
  it.each(["MASTER", "VETERINARIO", "ATENDENTE"])("aceita o perfil %s", (perfil) => {
    expect(PerfilSchema.parse(perfil)).toBe(perfil);
  });

  it.each(["ADMIN", "master", "", null, 1])("recusa perfil não previsto: %s", (perfil) => {
    expect(PerfilSchema.safeParse(perfil).success).toBe(false);
  });

  it("preserva a senha e normaliza somente o login", () => {
    expect(LoginSchema.parse({ login: "  master  ", senha: " senha com espaços " })).toEqual({
      login: "master",
      senha: " senha com espaços ",
    });
  });

  it.each([
    { login: " ", senha: "segredo" },
    { login: "master", senha: "" },
    { login: "master", senha_hash: "hash" },
    { login: "master", senha: "segredo", perfil: "MASTER" },
  ])("recusa login incompleto ou campos não permitidos", (entrada) => {
    expect(LoginSchema.safeParse(entrada).success).toBe(false);
  });

  it("valida os campos públicos de usuário, colaborador e sessão", () => {
    expect(UsuarioSchema.parse(usuario)).toEqual(usuario);
    expect(ColaboradorSchema.parse(colaborador)).toEqual(colaborador);
    expect(SessaoSchema.parse(sessao)).toEqual(sessao);
  });

  it("recusa senha_hash e senha nos três DTOs públicos", () => {
    for (const [schema, dados] of [
      [UsuarioSchema, usuario],
      [ColaboradorSchema, colaborador],
      [SessaoSchema, sessao],
    ] as const) {
      expect(schema.safeParse({ ...dados, senha_hash: "não deve atravessar o IPC" }).success).toBe(
        false,
      );
      expect(schema.safeParse({ ...dados, senha: "segredo" }).success).toBe(false);
    }
  });

  it.each([
    { id: "não é UUID" },
    { cpf: "529.982.247-25" },
    { telefone: "9999" },
    { nome: " " },
    { cargo: " " },
    { criado_em: "16/11/2026" },
    { atualizado_em: "2026-11-16T09:00:00-03:00" },
  ])("recusa colaborador fora do contrato", (alteracao) => {
    expect(ColaboradorSchema.safeParse({ ...colaborador, ...alteracao }).success).toBe(false);
  });

  it("aceita CRMV e último login preenchidos", () => {
    expect(ColaboradorSchema.parse({ ...colaborador, crmv: "SP-12345" }).crmv).toBe("SP-12345");
    expect(UsuarioSchema.parse({ ...usuario, ultimo_login_em: data }).ultimo_login_em).toBe(data);
  });
});

describe("paginação", () => {
  it("fornece valores iniciais e normaliza busca", () => {
    expect(PaginacaoSchema.parse({})).toEqual({ pagina: 1, tamanho: 20, busca: "" });
    expect(PaginacaoSchema.parse({ pagina: 2, tamanho: 10, busca: "  Maria  " })).toEqual({
      pagina: 2,
      tamanho: 10,
      busca: "Maria",
    });
  });

  it.each([
    { pagina: 0 },
    { pagina: 1.5 },
    { pagina: "1" },
    { tamanho: 0 },
    { tamanho: 101 },
    { busca: "a".repeat(201) },
    { sql: "campo desconhecido" },
  ])("recusa paginação inválida", (entrada) => {
    expect(PaginacaoSchema.safeParse(entrada).success).toBe(false);
  });

  it("valida os itens e metadados da saída", () => {
    const schema = criarPaginaSchema(UsuarioSchema);
    const pagina = { itens: [usuario], total: 1, pagina: 1, tamanho: 20 };
    expect(schema.parse(pagina)).toEqual(pagina);
    expect(schema.safeParse({ ...pagina, total: -1 }).success).toBe(false);
    expect(
      schema.safeParse({ ...pagina, itens: [{ ...usuario, senha_hash: "segredo" }] }).success,
    ).toBe(false);
  });
});

describe("resposta e canais IPC", () => {
  it("aceita sucesso tipado e erro com código/mensagem", () => {
    const schema = criarRespostaIpcSchema(SessaoSchema);
    expect(schema.parse({ ok: true, dados: sessao })).toEqual({ ok: true, dados: sessao });
    const falha = {
      ok: false,
      erro: { codigo: "NAO_AUTENTICADO", mensagem: "Entre para continuar." },
    };
    expect(schema.parse(falha)).toEqual(falha);
  });

  it("exige a propriedade dados até na resposta genérica", () => {
    expect(RespostaIpcSchema.safeParse({ ok: true }).success).toBe(false);
    expect(RespostaIpcSchema.parse({ ok: true, dados: null })).toEqual({ ok: true, dados: null });
  });

  it.each([
    { ok: true },
    { ok: true, dados: "inválido" },
    { ok: false, erro: { codigo: "", mensagem: "Falha" } },
    { ok: false, erro: { codigo: "ERRO", mensagem: "" } },
    { ok: false, erro: { codigo: "ERRO", mensagem: "Falha", stack: "interno" } },
    { ok: false, dados: "indevido", erro: { codigo: "ERRO", mensagem: "Falha" } },
  ])("recusa resposta malformada ou detalhe interno", (resposta) => {
    expect(criarRespostaIpcSchema(SessaoSchema).safeParse(resposta).success).toBe(false);
  });

  it("compartilha os contratos de login, sessão, ping e WhatsApp", () => {
    expect(canaisIpc["auth:login"].entrada).toBe(LoginSchema);
    expect(canaisIpc["auth:login"].saida).toBe(SessaoSchema);
    expect(canaisIpc["auth:sessao"].saida).toBe(SessaoSchema);
    expect(canaisIpc["sistema:ping"].entrada.parse(undefined)).toBeUndefined();
    expect(canaisIpc["sistema:ping"].saida.parse("pong")).toBe("pong");
    expect(canaisIpc["auth:sair"].saida.parse(null)).toBeNull();
    // Restrição de host/protocolo e autorização são verificadas novamente no main (A3).
    expect(
      canaisIpc["whatsapp:abrir"].entrada.parse({ url: "https://wa.me/5511999999999" }),
    ).toEqual({ url: "https://wa.me/5511999999999" });
  });

  it("preserva inferência TypeScript sem permitir invoke arbitrário", () => {
    expectTypeOf<EntradaIpc<"auth:login">>().toEqualTypeOf<z.input<typeof LoginSchema>>();
    expectTypeOf<Awaited<ReturnType<ApiClinica["sistema"]["ping"]>>>().toEqualTypeOf<
      RetornoIpc<"sistema:ping">
    >();
    expectTypeOf<keyof ApiClinica>().toEqualTypeOf<"sistema" | "whatsapp" | "auth">();
    expectTypeOf<
      Extract<RetornoIpc<"sistema:ping">, { ok: true }>["dados"]
    >().toEqualTypeOf<"pong">();
  });
});
