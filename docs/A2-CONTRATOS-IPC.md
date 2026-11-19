# A2 — Contratos base e canais IPC

Responsável: Cir0Arruda, DEV 1 / Dev A. Branch: `feat/a2-contratos-ipc`.
Fonte: A2 de `PROMPTS-SEMANA-1.md` e seções 4, 5 e 7 de `CONTEXTO.md` da lefcc.
Este registro descreve a execução local; não substitui os documentos originais.

## Entrega

- `shared/src/perfil.ts`: MASTER, VETERINARIO e ATENDENTE.
- `resposta-ipc.ts`: resposta discriminada por `ok`, com dados tipados ou código/mensagem.
- `paginacao.ts`: entrada e fábrica da saída paginada, com tipos inferidos.
- `login.ts` e `sessao.ts`: credenciais de entrada e sessão pública sem senha/hash.
- `usuario.ts` e `colaborador.ts`: campos públicos conforme o schema inicial da líder.
- `ipc.ts`: contratos de `sistema:ping`, `whatsapp:abrir`, `auth:login`, `auth:sessao`
  e `auth:sair`, tipos de entrada/retorno e interface das funções nomeadas de `window.api`.
- `index.ts`: ponto único de exportação para os workspaces consumidores.

Os schemas usam objetos estritos: campos desconhecidos, incluindo `senha_hash`, são
recusados. O repository deverá montar o DTO público antes de validar a saída; passar uma
linha de `usuarios` diretamente ao renderer não é permitido.

A sessão mantém os nomes explícitos da líder: `usuarioId`, `perfil`, `expiraEm`.
Nome do colaborador não foi acrescentado a esse contrato sem alinhamento. A3/A5 irão
implementar os handlers; A6 precisará obter o nome público pelo contrato acordado.

Decisões técnicas de validação: página inicial 1, tamanho padrão 20, limite 100 itens,
busca até 200 caracteres; UUIDs e datas ISO UTC; telefone normalizado com 10/11 dígitos.
Login é aparado, senha é preservada. A2 valida o formato de CPF de colaborador; validação
de dígitos verificadores e regras de criação/CRMV/perfil serão tratadas no contrato A7.
Validade/expiração da sessão e permissão de abrir WhatsApp pertencem ao main, não ao DTO.

## Dependências e suporte

O usuário aprovou explicitamente os dois pacotes nesta conversa antes da instalação:

| Pacote                                                                      | Uso                                            |
| --------------------------------------------------------------------------- | ---------------------------------------------- |
| [zod](https://www.npmjs.com/package/zod) 4.6.7                              | Validação e inferência dos contratos em shared |
| [typescript-eslint](https://www.npmjs.com/package/typescript-eslint) 8.73.0 | Parser e regras para TypeScript real no ESLint |

Além dos arquivos `shared/src/*.ts`, a tarefa exige alterações de suporte nos manifests,
lockfile, configuração ESLint/TypeScript e scripts de teste. Sem elas os imports e o lint de TS não
funcionariam. Nenhuma dependência de Electron/banco foi instalada nesta etapa.
As bibliotecas padrão ES2022/DOM dão suporte aos tipos de URL e AbortSignal usados pelo
Zod e pelo Vitest. TypeScript continua estrito, sem ignorar erros nas declarações externas.

Referências consultadas: [API oficial do Zod](https://zod.dev/api) e
[configuração oficial do typescript-eslint](https://typescript-eslint.io/getting-started/).

## Validação

Em 19/11/2026: `pnpm -r typecheck`, `pnpm lint` e `pnpm -r test` passaram.
Os 42 testes em shared cobrem perfis, entradas inválidas, paginação, datas UTC,
respostas IPC e rejeição de senha/hash nos DTOs públicos. O app ainda é esqueleto e
não tem testes de funcionalidade Electron.

Uma sondagem TypeScript executada no workspace app importou e usou LoginSchema,
SessaoSchema, Perfil e RetornoIpc de `@clinica/shared`, sem emitir arquivos. Passou;
o arquivo temporário foi removido após o comando. Não confundir com execução de IPC,
que será implementada na A3.

## Integração

A branch será publicada por solicitação explícita do usuário. B, C e D podem consultar
os contratos nela; este chat não enviou mensagens ao grupo. Revisão humana e merge
permanecem pendentes.
