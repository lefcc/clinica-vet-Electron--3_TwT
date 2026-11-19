# Clínica Veterinária - Estrutura do Projeto e Responsabilidades

> Documentação gerada automaticamente - **Fonte da verdade: AGENTS.md**

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│ RENDERER (Front-end)                                                │
│  ├── HTML + CSS + JS (sem frameworks)                              │
│  ├── window.api.invoke('canal', dados)                             │
│  └── NUNCA acessa: Node, fs, db, rede, better-sqlite3, mysql2      │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ IPC (contextBridge + ipcMain)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ MAIN (Backend + Electron)                                           │
│  ├── ipc/registry.ts → valida sessão + perfil + Zod                │
│  ├── auth/ → login, bcrypt, sessão memória 8h                      │
│  ├── modules/<modulo>/service.ts → REGRAS DE NEGÓCIO               │
│  ├── modules/<modulo>/repository.ts → SQL/Drizzle (ÚNICO local)    │
│  ├── db/local/client.ts → SQLite (better-sqlite3)                  │
│  ├── db/central/client.ts → MySQL (mysql2)                         │
│  ├── sync/ → outbox push/pull, conflitos                           │
│  └── jobs/ → node-cron (alertas, dólar, vacinas, sync)             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura Completa de Pastas e Arquivos

### 📁 RAIZ (Workspace Orchestrator)

| Arquivo | Responsabilidade |
|---------|------------------|
| `package.json` | Define workspaces `["shared", "app"]`, scripts globais (`dev`, `build`, `typecheck`, `lint`, `test`) |
| `pnpm-workspace.yaml` | Configuração oficial do pnpm workspaces |
| `tsconfig.base.json` | Config TypeScript BASE herdada por `shared` e `app` (paths, strict, target ES2022) |
| `.gitignore` | Ignora `node_modules`, `dist`, `.env`, `*.sqlite`, build outputs |
| `.env.example` | Template de variáveis de ambiente (MySQL, sync, dólar, bcrypt) |
| `docker-compose.yml` | MySQL 8.4 para desenvolvimento local (container) |
| `README.md` | Documentação do projeto (como rodar, stack, arquitetura) |
| `AGENTS.md` | **Guia de desenvolvimento** (regras, arquitetura, convenções) - **FONTE DA VERDADE** |

---

### 📁 shared/ (`@clinica-vet/shared`) - CONTRATOS COMUNS

```
shared/
├── package.json          # Deps: zod, typescript, vitest, eslint
├── tsconfig.json         # Estende base, outDir: dist, composite: true
├── eslint.config.mjs     # Config ESLint flat (typescript-eslint)
└── src/
    ├── index.ts          # Barrel export - re-exporta tudo
    ├── perfil.ts         # type Perfil = 'MASTER' | 'VETERINARIO' | 'ATENDENTE'
    └── perfil.test.ts    # Teste básico do tipo Perfil
```

**🎯 RESPONSABILIDADE:** Contratos IPC (schemas Zod), tipos compartilhados, enums, constantes  
**📦 CONSUMIDO POR:** `app` (main + renderer) via `import @clinica-vet/shared`

---

### 📁 app/ (`@clinica-vet/app`) - APLICAÇÃO ELECTRON

```
app/
├── package.json              # Scripts: dev, build, typecheck, lint, test, db:*, postinstall
├── tsconfig.json             # Estende base, lib: ["ES2022", "DOM"], types: ["node", "electron"]
├── drizzle.config.ts         # Drizzle Kit config para SQLite (local)
├── drizzle.config.mysql.ts   # Drizzle Kit config para MySQL (central)
├── eslint.config.mjs         # Config ESLint (ignora *.test.ts)
└── src/
    ├── main/                 # PROCESSO PRINCIPAL (Node.js + Electron APIs)
    │   ├── main.ts           # ENTRY POINT - cria BrowserWindow, carrega preload, index.html
    │   ├── preload.ts        # CONTEXT BRIDGE - expõe window.api pro renderer
    │   │
    │   ├── config/
    │   │   └── env.ts        # Carrega .env, valida, exporta config tipada
    │   │
    │   ├── ipc/
    │   │   └── registry.ts   # REGISTRY IPC - registrarHandler(canal, perfis[], handler)
    │   │
    │   ├── auth/
    │   │   ├── index.ts      # Login (bcrypt), sessão memória 8h, logout, permissões
    │   │   └── auth.test.ts  # Teste de carga do módulo
    │   │
    │   ├── db/
    │   │   ├── local/        # SQLITE (offline-first)
    │   │   │   ├── client.ts # better-sqlite3 singleton, WAL mode, FK ON, transação helper
    │   │   │   └── schema.ts # Drizzle schema: todas as tabelas + sync_outbox/estado/conflitos
    │   │   │
    │   │   └── central/      # MYSQL (sync background)
    │   │       ├── client.ts # mysql2/promise pool, transação com SELECT FOR UPDATE
    │   │       └── schema.ts # Drizzle schema IDÊNTICO ao local (exceto tabelas de sync)
    │   │
    │   ├── sync/
    │   │   └── index.ts      # Outbox pattern: push, pull (futuro), conflitos, status
    │   │
    │   └── jobs/
    │       └── index.ts      # node-cron: sync (5min), dólar (9h), alertas (6h), vacinas (8h)
    │
    └── renderer/             # FRONT-END (HTML/CSS/JS - SEM Node, SEM banco, SEM rede)
        ├── index.html        # Entry HTML - carrega CSS + TS
        │
        ├── css/
        │   ├── variables.css # DESIGN TOKENS: cores, espaçamento, tipografia, sombras, z-index
        │   └── global.css    # Reset, base typography, botões, inputs, scrollbar, utilitários
        │
        └── ts/
            ├── global.d.ts   # Tipos globais: interface Window { api: ElectronAPI }
            ├── main.ts       # Entry point renderer
            └── lib/
                └── api.ts    # Wrapper tipado window.api.invoke → {ok, dados} | {ok, erro}
```

---

## Fluxo de Desenvolvimento Diário

### Comandos Principais (99% do uso)

```bash
# Desenvolvimento - roda todo dia
pnpm dev
# 1. Compila shared (se mudou) → shared/dist/
# 2. Inicia Electron carregando app/src/main/main.ts
# 3. Hot reload: edita TS, salva, app recarrega

# Build final - antes de entregar/testar instalador
pnpm build
# 1. shared: tsc → shared/dist/ (JS + .d.ts)
# 2. app: tsc → app/dist/ + electron-builder → app/release/Setup.exe
```

### Comandos Ocasional

| Comando | Quando usar |
|---------|-------------|
| `pnpm typecheck` | Antes de commit/PR - pega erros de tipo |
| `pnpm lint` | Antes de commit - padroniza código |
| `pnpm test` | Antes de commit - garante que não quebrou nada |
| `pnpm db:generate` | Mudou schema do banco (Drizzle) |
| `pnpm db:migrate` | Aplicar migrations no SQLite local |
| `pnpm db:studio` | Abrir UI visual do banco (Drizzle Studio) |

### Fluxo Prático Completo

```bash
# 1. Abre terminal na raiz
cd clinica-vet-Electron--3_TwT

# 2. Sobe MySQL (uma vez por sessão)
docker-compose up -d

# 3. Desenvolve (mantém rodando)
pnpm dev

# --- Em outro terminal, se precisar ---

# 4. Mudou schema do banco?
pnpm db:generate   # Gera migration
pnpm db:migrate    # Aplica no SQLite

# 5. Antes de commit/PR
pnpm typecheck && pnpm lint && pnpm test

# 6. Gerar instalador pra testar no Windows real
pnpm build
```

---

## Onde Colocar Código (Nova Feature)

```
Nova feature "Agendamento"
│
├── shared/src/agendamento.ts          # Zod schemas: Input, Output, Canal: 'agendamento:*'
│
├── app/src/main/modules/agendamento/
│   ├── repository.ts                  # SQL/Drizzle (CRUD + queries complexas)
│   ├── service.ts                     # Regras: não sobrepor horário, valida vet, status sync
│   └── agendamento.test.ts            # Testes de serviço
│
├── app/src/main/ipc/agendamento.ipc.ts # Handlers: registrarHandler('agendamento:criar', [...], service.criar)
│
└── app/src/renderer/
    ├── pages/agendamento.html         # HTML da tela
    ├── ts/pages/agendamento.ts        # Lógica da tela (usa window.api ou lib/api.ts)
    └── components/ui/Calendario.ts    # Componente reutilizável (se precisar)
```

---

## Regra de Ouro: Separação de Responsabilidades

| Camada | O que FAZ | O que NÃO FAZ |
|--------|-----------|---------------|
| **Renderer** | Exibe UI, valida formulário (máscaras, required), notifica usuário | Acessa Node, banco, arquivos, rede, `better-sqlite3`, `mysql2` |
| **Main (IPC)** | Valida sessão/perfil, valida Zod, chama Service | Regra de negócio complexa, SQL direto |
| **Main (Service)** | **TODAS as regras de negócio** (estoque, conflitos, cálculos, permissões) | SQL direto |
| **Main (Repository)** | **ÚNICO lugar com SQL/Drizzle** | Regras de negócio |
| **Shared** | Contratos (Zod), tipos, enums, constantes | Lógica, implementação |

---

## Arquivos que Você VAI Editar Frequentemente

| O que você faz | Arquivo(s) |
|----------------|------------|
| Novo endpoint IPC | `shared/src/<entidade>.ts` → `app/src/main/ipc/registry.ts` → `app/src/main/modules/<modulo>/service.ts` + `repository.ts` |
| Nova tabela | `app/src/main/db/local/schema.ts` + `central/schema.ts` → `pnpm db:generate` → `pnpm db:migrate` |
| Regra de negócio | `app/src/main/modules/<modulo>/service.ts` (só no main!) |
| Estilo visual | `app/src/renderer/css/variables.css` (tokens) ou `global.css` |
| Tela nova | `app/src/renderer/pages/<tela>.html` + `app/src/renderer/ts/pages/<tela>.ts` |
| Componente UI | `app/src/renderer/ts/components/ui/<Componente>.ts` |
| Config de ambiente | `.env` (local) ou `app/src/main/config/env.ts` |
| Job agendado | `app/src/main/jobs/index.ts` |

---

## Arquivos que NÃO Precisa Mexer (Infraestrutura Pronta)

| Arquivo | Por quê |
|---------|---------|
| `tsconfig.base.json` | Base compartilhada - muda só se precisar novo target/lib |
| `pnpm-workspace.yaml` | Workspaces definidos - não muda |
| `docker-compose.yml` | MySQL dev - só muda porta/senha se conflitar |
| `app/src/main/preload.ts` | Context bridge padrão - só adiciona métodos em `window.api` |
| `app/src/main/db/local/client.ts` | Singleton SQLite - já configurado (WAL, FK, transação) |
| `app/src/main/db/central/client.ts` | Pool MySQL - já configurado (TLS, charset, timezone) |
| `app/src/renderer/ts/global.d.ts` | Tipos Window - auto-atualizado via shared |
| `app/src/renderer/ts/lib/api.ts` | Wrapper IPC - pronto pra usar |

---

## Por que pnpm e Monorepo?

```
clinica-vet-Electron--3_TwT/           ← RAIZ
├── package.json                        ← Workspaces: ["shared", "app"]
├── shared/                             ← @clinica-vet/shared (contratos)
│   └── package.json
└── app/                                ← @clinica-vet/app (Electron)
    └── package.json                    ← "dev": "electron ."
```

| Comando na raiz | O que faz |
|-----------------|-----------|
| `pnpm dev` | `pnpm --filter app dev` → `cd app && electron .` |
| `pnpm build` | Compila `shared` → compila `app` → gera instalador (ordem certa) |
| `pnpm test` | Roda testes no `shared` E no `app` |
| `pnpm typecheck` | Verifica tipos nos dois packages |

**Vantagem:** Um comando na raiz orquestra tudo na ordem certa. `shared` compila antes de `app` porque `app` depende de `@clinica-vet/shared`.

---

## Módulos Nativos (better-sqlite3) - Nota Importante

O `better-sqlite3` **não é JavaScript puro** - é C++ compilado:

```
JavaScript (wrapper) → binding.node (C++ compilado) → SQLite (biblioteca C)
```

**Problema:** Node.js 24 (sistema) ≠ Electron 30 (Node ~18 interno)

```
Node.js 24: NODE_MODULE_VERSION = 137
Electron 30: NODE_MODULE_VERSION = 123
```

**Solução aplicada no projeto:**

```bash
# 1. Instala JS puro (ignora compilação nativa que falharia no Node 24)
pnpm install --ignore-scripts

# 2. Reconstrói o .node pra versão do Electron
cd app && pnpm exec electron-rebuild -f -w better-sqlite3

# 3. Funciona SÓ dentro do Electron (não no terminal Node 24)
npx electron -e "require('better-sqlite3')"  # ✅ OK
```

**No dia a dia:** `pnpm dev` já roda no Electron certo. Não precisa se preocupar.

---

## Stack Tecnológica Fixa (Não Trocar)

| Camada | Tecnologia |
|--------|------------|
| Gerenciador pacotes | **pnpm** (workspaces) |
| Linguagem | **TypeScript estrito** (`strict: true`) |
| Compartilhado | **Zod** (schemas), tipos, canais IPC |
| Desktop | **Electron** (contextIsolation, nodeIntegration: false, sandbox) |
| Front-end | **HTML + CSS + JS** (sem React/Vue) - CSS variables (design tokens) |
| Backend | **TypeScript no main** - `ipcMain.handle` |
| Banco local | **SQLite** (`better-sqlite3` + `electron-rebuild`) |
| Banco central | **MySQL 8** (InnoDB, `utf8mb4`, TLS) via `mysql2` |
| ORM/Migrations | **Drizzle ORM + drizzle-kit** (paridade SQLite/MySQL) |
| Validação | **Zod** (entrada/saída, contratos IPC centralizados) |
| Senhas | **bcryptjs** (custo ≥ 10) |
| Testes | **Vitest** |
| Jobs | **node-cron** (no main: alertas, sync, dólar, vacinas) |
| PDF | `printToPDF` do Electron (HTML → PDF) |
| Instalador | `electron-builder` + NSIS |
| Integrações | ViaCEP, AwesomeAPI USD-BRL, `wa.me` — **todas no main** |

---

## Princípios Arquiteturais Invioláveis (Resumo do AGENTS.md)

1. **Offline-first:** Renderer → preload → IPC → main → SQLite local → (background) → MySQL nuvem
2. **Regra de negócio SÓ no main** (estoque, conflitos, cálculos, permissões)
3. **Autorização por perfil em TODO handler IPC** (`registrarHandler` com `perfis`)
4. **Camadas por módulo:** `ipc (handler) → service → repository`
5. **Contrato Zod em `/shared` ANTES do código**
6. **Dinheiro em centavos (inteiro)** — nunca `float`
7. **Datas em UTC no banco**, exibidas em `America/Sao_Paulo`
8. **Exclusão lógica (`ativo = false`)** — proibido `DELETE` físico
9. **Saldo de estoque = soma das movimentações** (append-only)
10. **Transações atômicas:** Local (SQLite + sync_outbox) + Central (MySQL + FOR UPDATE)
11. **Segurança Electron:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
12. **Senhas:** bcryptjs custo ≥ 10, nunca logadas/retornadas
13. **Formato único resposta IPC:** `{ ok: true, dados }` / `{ ok: false, erro: { codigo, mensagem } }`
14. **Sync resiliente:** Falha internet/MySQL nunca bloqueia tela nem perde dados

---

*Documento gerado em 2026-11-19 - Baseado no AGENTS.md e estrutura atual do projeto*