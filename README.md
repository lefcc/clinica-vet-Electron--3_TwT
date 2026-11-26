# Clínica Veterinária - Sistema Desktop Offline-First

Sistema desktop para gestão de clínica veterinária, desenvolvido com Electron, TypeScript, SQLite (local) e MySQL (sincronização em nuvem).

## Stack Tecnológica

- **Gerenciador de pacotes**: pnpm (workspaces)
- **Linguagem**: TypeScript estrito
- **Desktop**: Electron 30+
- **Front-end**: HTML + CSS + JS (sem frameworks)
- **Banco local**: SQLite (better-sqlite3)
- **Banco central**: MySQL 8 (InnoDB, utf8mb4, TLS)
- **ORM**: Drizzle ORM + drizzle-kit
- **Validação**: Zod
- **Segurança**: bcryptjs (custo ≥ 10)
- **Testes**: Vitest
- **Jobs**: node-cron
- **PDF**: Electron printToPDF
- **Instalador**: electron-builder + NSIS

## Estrutura do Monorepo

```
clinica-vet/
├── package.json              # Root package.json
├── pnpm-workspace.yaml       # Workspaces config
├── tsconfig.base.json        # TypeScript base config
├── docker-compose.yml        # MySQL para desenvolvimento
├── .env.example              # Exemplo de variáveis de ambiente
├── AGENTS.md                 # Guia de desenvolvimento
│
├── shared/                   # Pacote compartilhado (schemas Zod, tipos, IPC)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│
└── app/                      # Aplicação Electron
    ├── package.json
    ├── tsconfig.json
    ├── drizzle.config.ts     # Drizzle config (SQLite)
    ├── drizzle.config.mysql.ts # Drizzle config (MySQL)
    └── src/
        ├── main/             # Processo principal + Backend
        │   ├── main.ts       # Entry point Electron
        │   ├── preload.ts    # Context bridge
        │   ├── ipc/          # Registry de handlers IPC
        │   ├── modules/      # Módulos de negócio
        │   ├── db/           # Database clients + schemas
        │   ├── sync/         # Sincronização offline-first
        │   ├── auth/         # Autenticação + sessão
        │   ├── jobs/         # Jobs agendados (node-cron)
        │   └── config/       # Configuração de ambiente
        │
        └── renderer/         # Front-end
            ├── index.html
            ├── css/          # Design tokens + estilos
            └── ts/           # Scripts TypeScript
                ├── main.ts   # Entry point renderer
                ├── pages/    # Scripts por tela
                ├── components/ui/ # Componentes visuais
                └── lib/      # api.ts, validadores, etc.
```

## Requisitos

- Node.js ≥ 20.0.0
- pnpm ≥ 9.6.0
- Docker (para MySQL local)

## Instalação

```bash
# Instalar dependências
pnpm install

# Subir MySQL local (desenvolvimento)
docker-compose up -d

# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env conforme necessário

# Gerar migrations (SQLite)
pnpm db:generate

# Aplicar migrations em um SQLite de desenvolvimento (o app faz isso ao abrir)
export SQLITE_PATH=/caminho/absoluto/clinica-vet.sqlite
pnpm db:migrate

# Iniciar em desenvolvimento
pnpm dev
```

O contêiner MySQL aplica as migrations centrais na criação de um volume vazio. As instruções para sincronização, credenciais e instalador Windows estão no [guia da Trilha 1](docs/SINCRONIZACAO.md).

Para entrar, trabalhar offline e fazer ou restaurar uma cópia de segurança, consulte o [manual rápido com imagens](docs/MANUAL-TRILHA1.md).

## Rodando só o app (front + login de exemplo) no Windows

Passo a passo testado para abrir o app sem MySQL/Docker. Só precisa do Node 20+.

**1. Instalar o pnpm 9.6.0 de verdade** (o `npx pnpm` não serve, porque os scripts chamam `pnpm` por dentro):

```powershell
npm i -g pnpm@9.6.0
```

Feche e abra o terminal e confira com `pnpm -v` (tem que mostrar `9.6.0`). Com o pnpm 12 o projeto quebra.

**2. Instalar as dependências**, na pasta raiz (onde está o `pnpm-workspace.yaml`):

```powershell
pnpm install
```

Se terminar sem erro, vá para o passo 4. Se der `ELIFECYCLE` em `better-sqlite3` (aparece "Could not find any Visual Studio installation"), é porque o `postinstall` tenta compilar o SQLite e a máquina não tem o compilador C++. Siga o passo 3.

**3. (Só se o passo 2 falhou) baixar o binário pronto do SQLite**, em vez de compilar:

```powershell
pnpm install --ignore-scripts
pnpm --filter @clinica-vet/app exec node -e "require(require.resolve('electron/install.js'))"
pnpm --filter @clinica-vet/app rebuild:sqlite
```

**4. Abrir o app:**

```powershell
pnpm --filter "@clinica-vet/app" dev
```

(ou `pnpm dev` dentro da pasta `app`). O script se chama `dev`, não `start`.

**Login de exemplo:** em desenvolvimento, ao abrir o app o arquivo `app/src/main/db/local/seed-usuario-exemplo.ts` cria um usuário MASTER de exemplo no SQLite local. O login e a senha estão nesse arquivo. Para usar outros, copie `.env.example` para `.env` e preencha as variáveis `SEED_MASTER_*`. Na versão instalada, configure o primeiro MASTER conforme o [guia de instalação](docs/SINCRONIZACAO.md).

**Problemas comuns**

| Mensagem | O que fazer |
| --- | --- |
| `'pnpm' não é reconhecido` | Rodar o passo 1 e reabrir o terminal |
| `ELIFECYCLE` em `better-sqlite3` | Passo 3 |
| `No handler registered for ...` no terminal | Normal: esses módulos do back-end ainda não existem, a tela avisa |

## Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia Electron em modo dev

# Build
pnpm build            # Build completo (TypeScript + electron-builder)

# Qualidade de código
pnpm typecheck        # Verificação de tipos TypeScript
pnpm lint             # ESLint
pnpm test             # Testes Vitest

# Banco de dados
pnpm db:generate      # Gerar migrations (SQLite)
pnpm db:migrate       # Aplicar migrations (SQLite)
pnpm db:push          # Push schema direto (SQLite)
pnpm db:studio        # Drizzle Studio (SQLite)
```

## Arquitetura Offline-First

```
Renderer → preload (window.api) → IPC → main → SQLite local
                                              ↓
                                    (background sync)
                                              ↓
                                        MySQL nuvem
```

- **Renderer NUNCA** acessa Node, banco, arquivos ou rede
- **Regra de negócio apenas no main** (estoque, conflitos, permissões)
- **Autorização por perfil em TODO handler IPC**
- **Exclusão lógica** (`ativo = false`) - sem DELETE físico
- **Estoque calculado por movimentações** (append-only)
- **Transações atômicas** (dado + sync_outbox juntos)

## Perfis e Permissões

| Recurso | MASTER | VETERINÁRIO | ATENDENTE |
|---------|--------|-------------|-----------|
| Colaboradores, config, backup, sync, auditoria | ✔ | ✘ | ✘ |
| Financeiro e relatórios | ✔ | ✘ | só orçamentos |
| Clientes e animais | ✔ | leitura | ✔ |
| Agenda | toda | própria | criar/editar |
| Consulta, diagnóstico, prontuário | ✔ | ✔ | sem diagnóstico detalhado |
| Medicamentos/estoque | ✔ | usar na consulta | leitura |
| Vacinas e lembretes | ✔ | aplicar | lembretes |

## Integrações Externas (apenas no main)

- **ViaCEP**: Busca de endereço por CEP
- **AwesomeAPI**: Cotação USD/BRL
- **WhatsApp**: `wa.me` links (semi-automático)

## Licença

Proprietário - Clínica Veterinária
