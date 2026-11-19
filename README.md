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

# Aplicar migrations (SQLite)
pnpm db:migrate

# Gerar migrations (MySQL)
pnpm --filter app db:generate -- --config=drizzle.config.mysql.ts

# Aplicar migrations (MySQL)
pnpm --filter app db:migrate -- --config=drizzle.config.mysql.ts

# Iniciar em desenvolvimento
pnpm dev
```

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