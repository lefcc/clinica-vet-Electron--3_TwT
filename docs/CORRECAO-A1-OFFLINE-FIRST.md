# Correção da base — A1 revisada da lefcc

Responsável: Cir0Arruda / DEV 1 / Dev A. Base documental: origin/main dd136bf,
plano revisado da lefcc. Branch de correção: `feat/a1-offline-first`.

## Resultado

A estrutura ativa segue a A1 revisada: `shared` e `app`. O servidor Fastify/PostgreSQL
e o workspace desktop anterior foram retirados, não adaptados como servidor MySQL.
O fluxo futuro será Electron/IPC → SQLite → sync MySQL, conforme CONTEXTO.md original.

```text
shared/src/index.ts        entrada vazia para contratos da A2
app/src/index.ts           esqueleto, sem runtime Electron nesta etapa
docker-compose.yml        MySQL 8.4 apenas para desenvolvimento do sync
CONTEXTO.md                original da líder, sem alterações
ESTADO.md                  original da líder, sem alterações
PROMPTS-SEMANA-1.md        original da líder, sem alterações
docs/CONTEXTO.md           ponteiro para o original, sem contexto paralelo
docs/ESTADO.md             acompanhamento da execução local do DEV 1
```

O ponto de entrada vazio de app permite que tsc valide o pacote sem criar código de negócio
ou adiantar Electron. A migração implementa somente a A1 revisada, não A2/A3/A4.

## Preservação e rastreabilidade

Antes da correção, foi criado e verificado um backup em
`C:/Users/ciroe/.codex/backups/clinica-vet/antes-correcao-offline-first`:
arquivo ZIP com fontes/documentos, manifesto SHA-256, patch e bundle do histórico Git.
As pastas retiradas server e desktop também estão em `retirados/` nesse backup.
O .env anterior foi preservado sem exibir seus valores; o arquivo ativo agora contém
somente parâmetros MySQL de desenvolvimento com senhas aleatórias distintas.

O commit d082fc2 continua no histórico. A A2 antiga não foi commitada nem publicada.
A integração traz os commits da líder preservando a autoria dela; a correção usa autoria
local de Cir0Arruda. Nenhum arquivo original recebido da main foi reescrito ou formatado.

## Ferramentas e dependências

As únicas ferramentas diretas são as quatro já instaladas e permitidas na A1:

| Pacote     | Versão  | Motivo                                 | Origem                                   |
| ---------- | ------- | -------------------------------------- | ---------------------------------------- |
| typescript | 6.0.3   | Checagem estrita dos workspaces        | https://www.npmjs.com/package/typescript |
| eslint     | 10.14.0 | Lint básico do esqueleto               | https://www.npmjs.com/package/eslint     |
| prettier   | 3.9.10  | Formatação compartilhada               | https://www.npmjs.com/package/prettier   |
| vitest     | 4.1.12  | Runner preparado para próximas tarefas | https://www.npmjs.com/package/vitest     |

Não foram adicionados novos pacotes. A resolução foi refeita offline com o cache local.
Foram removidas da árvore ativa as dependências do servidor abandonado e o parser adicional
typescript-eslint, mantendo o recorte de quatro ferramentas da A1. O lockfile não deve mais
conter Fastify, pg, Drizzle ou dotenv da implementação anterior.

Como na A1 original, os dois fontes são apenas `export {}` e comentários; ESLint usa o parser
padrão para esses esqueletos. Isso não é lint TypeScript completo. Antes de código com tipos,
propor o parser correspondente e obter confirmação para nova dependência. Renderer com
JSX/framework não está previsto: manter HTML/CSS/TS puro.

Vitest usa `--passWithNoTests` porque não há regra implementada. Não existem testes de
negócio nesta A1 corrigida. Os oito testes da A2 antiga foram arquivados, não reutilizados
como evidência de IPC/SQLite. Retirar a tolerância quando os primeiros testes reais entrarem.

## Compose e dados locais

- MySQL 8.4, character set utf8mb4, collation utf8mb4_unicode_ci.
- Porta 3306 vinculada exclusivamente a 127.0.0.1; volume mysql_dev_data.
- Senhas vazias no modelo; Compose exige valores locais. Usuário de desenvolvimento
  distinto do root. Nenhuma credencial ou conexão com MySQL de produção criada.
- Healthcheck executa SELECT 1 com o usuário da aplicação, sem senha na linha de comando.
- Arquivos SQLite e auxiliares WAL/SHM ignorados no Git para as tarefas futuras.
- Docker não participa das operações locais futuras do app; sua indisponibilidade não
  justifica reintroduzir servidor central ou bloquear telas offline.

## Validação e uso

```sh
pnpm install --frozen-lockfile
pnpm check
docker compose config --quiet
```

Com Docker disponível e .env preenchido, validar o MySQL de desenvolvimento:

```sh
docker compose up -d --wait mysql
docker compose ps
```

Não executar down -v para corrigir problemas, pois remove o volume. Nunca apontar estes
comandos para o banco MySQL em nuvem. Não há ainda comando para abrir uma janela Electron.

Resultados executados:

- `pnpm install --frozen-lockfile --offline`: saída 0, sem downloads ou novos pacotes.
- `pnpm check`: saída 0; typecheck e lint dos dois pacotes, runner Vitest e Prettier.
- Vitest: zero testes nesta A1, explicitamente tolerados nos dois esqueletos.
- Compose validado sem precisar do daemon: somente mysql:8.4, porta restrita a localhost,
  utf8mb4, volume nomeado, healthcheck SELECT 1 e duas senhas distintas no ambiente local.
- Os oito arquivos recebidos da lefcc foram comparados byte a byte com origin/main e
  permanecem idênticos, incluindo PDFs e HTML.
- Ausência de server/desktop e de Fastify/pg/Drizzle/dotenv/JWT nas configurações e lockfile
  ativos verificada. Exclusão de .env e arquivos SQLite pelo Git verificada.
- `git diff --check`: sem erros de whitespace.
- **Não executado:** inicialização do MySQL em container, pois o motor Docker Linux
  continua indisponível. Não declarar conexão, persistência em execução ou sync validados.

## Limites e pendências

O AGENTS.md oficial referido nos arquivos da líder não está no commit remoto. Os documentos
originais já recebidos são a base; não foi inventado um AGENTS.md em nome dela. Contratos de
sync e conflitos seguem para as etapas próprias. Revisão humana/merge ainda pendentes.
