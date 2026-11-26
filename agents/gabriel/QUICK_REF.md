# Quick Reference — Gabriel (Trilha 2: Núcleo Clínico)

## Minhas Responsabilidades
| Módulo | Canais IPC | Tela Front-end |
|---|---|---|
| **Clientes** | `clientes:listar|obter|criar|atualizar|inativar` | `clientes.ts` |
| **Animais** | `animais:listar|obter|criar|atualizar|inativar|listar_por_cliente` | `animais.ts` |
| **Agenda** | `agendamentos:listar|criar|atualizar|cancelar|veterinarios` | `agenda.ts` |
| **Consultas** | `consultas:listar|obter|criar|historico_animal` | `consultas.ts` |

## Erros de Negócio que Devo Implementar
| Código | Quando |
|---|---|
| `CPF_DUPLICADO` | Criar cliente com CPF já existente ativo |
| `CLIENTE_POSSUI_ANIMAIS_ATIVOS` | Tentar inativar cliente que tem animal ativo |
| `AGENDA_CONFLITO` | Sobreposição de horário para mesmo veterinário |
| `ESTOQUE_INSUFICIENTE` | Baixa FEFO em consultas não tem saldo suficiente |

## Perfis por Canal (registrarHandler)
| Canal | MASTER | VETERINARIO | ATENDENTE |
|---|---|---|---|
| `clientes:*` | ✔ | leitura | ✔ |
| `animais:*` | ✔ | leitura | ✔ |
| `agendamentos:listar` | ✔ | própria agenda | ✔ |
| `agendamentos:criar|atualizar|cancelar` | ✔ | própria agenda | ✔ |
| `agendamentos:veterinarios` | ✔ | ✔ | ✔ |
| `consultas:listar|obter` | ✔ | ✔ | ✔ (sem diagnostico) |
| `consultas:criar` | ✔ | ✔ | ✘ |
| `consultas:historico_animal` | ✔ | ✔ | ✔ |

## Fluxo de Trabalho (3 Passos)

### Passo 1: Mocks (AGORA - sem esperar Trilha 1)
```bash
# Criar: app/src/renderer/ts/lib/mocks/trilha2.mock.ts
# Testar: rodar app e validar 4 telas no Electron
```

### Passo 2: Backend Clientes + Animais
```bash
# Criar: app/src/main/modules/clientes/*.ts
# Criar: app/src/main/modules/animais/*.ts
# Testes: pnpm -r test
```

### Passo 3: Backend Agenda + Consultas + IPC
```bash
# Criar: app/src/main/modules/agenda/*.ts
# Criar: app/src/main/modules/consultas/*.ts
# Criar: app/src/main/ipc/trilha2.ipc.ts
# Testes: pnpm -r test
```

## Arquivos-Chave para Consultar
| Arquivo | Para que serve |
|---|---|
| `../../../AGENTS.md` | Regras gerais do projeto (LEIA PRIMEIRO) |
| `../../../docs/FRONT.md` | Especificação das telas front-end |
| `../../../app/src/renderer/ts/lib/tipos.ts` | Tipos TypeScript locais (até Trilha 1 entregar /shared) |
| `../../../app/src/main/db/local/client.ts` | Cliente SQLite (runInTransaction) |
| `../../../app/src/main/erros/erro-negocio.ts` | Classes de erro padronizadas |
| `../../../app/src/main/ipc/registry.ts` | `registrarHandler` para canais IPC |
| `../../../shared/src/clientes-animais.ts` | **Quando Trilha 1 entregar** — schemas Zod oficiais |

## Comandos Úteis
```bash
# Rodar app em dev
cd app && pnpm dev

# Typecheck completo
pnpm -r typecheck

# Lint completo
pnpm -r lint

# Testes (uma vez)
pnpm -r test

# Testes watch (durante dev)
cd app && pnpm test:watch

# Gerar migration SQLite (após mudar schema.ts)
cd app && pnpm db:generate

# Push schema no SQLite local
cd app && pnpm db:push
```

## Lembretes Críticos
- ❌ **Nunca** acesse banco/arquivos/rede no `renderer` — só via `window.api` (IPC)
- ❌ **Nunca** faça `DELETE` físico — use `ativo = false`
- ❌ **Nunca** use `float` para dinheiro — use centavos (inteiro)
- ✅ **Sempre** use `runInTransaction` (BEGIN IMMEDIATE) + `sync_outbox` atômico
- ✅ **Sempre** valide perfil no handler IPC (`registrarHandler` com `perfis`)
- ✅ **Sempre** retorne formato `{ ok: true, dados }` ou `{ ok: false, erro: { codigo, mensagem } }`
- ✅ **Sempre** datas em UTC no banco, exibir em America/Sao_Paulo
- ✅ **Sempre** testes Vitest para repository + service

## Integração Final (Quinta-feira)
```ts
// Em app/src/main/main.ts, dentro de prepararBanco():
registrarTrilha1Ipc(conexao);
registrarTrilha2Ipc(conexao);  // ← MINHA LINHA
registrarTrilha3Ipc(conexao);
registrarTrilha4Ipc(conexao);
```