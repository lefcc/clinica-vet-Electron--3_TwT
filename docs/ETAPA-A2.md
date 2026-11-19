# A2 — Banco e servidor mínimo

> **SUPERADA pela revisão da lefcc em dd136bf e pela confirmação do usuário: não usar
> PostgreSQL.** Este arquivo descreve a A2 antiga, não a tarefa vigente. Não continuar
> seu aceite Docker/PostgreSQL nem criar commit dessa direção arquitetural. Ver
> REVISAO-LEFCC-OFFLINE-FIRST.md; A2 nova trata de contratos IPC em shared.

Responsável: Cir0Arruda, DEV 1 / Dev A. Base: A1, commit `d082fc2`.
Branch: `feat/a2-servidor-banco`, derivada da A1. Não houve push nem merge.

## Estado

Implementação e testes automatizados concluídos; aceite manual **pendente** porque o Docker
Desktop deste computador não disponibilizou o motor Linux. O usuário confirmou que há erro
no Docker e vai informar a mensagem. Não marcar A2 como pronta, criar seu commit ou avançar
para A3 antes de resolver e validar o caso real de conexão.

## Entrega

- Compose com PostgreSQL 16, volume nomeado, healthcheck e porta 5432 apenas em 127.0.0.1.
- Pool PostgreSQL com limite de conexões e timeout; instância Drizzle disponível para A4.
- Validação Zod de DATABASE_URL, JWT_SECRET, PORT e HOST; `.env` lido da raiz do monorepo.
- Factory de app Fastify separada da inicialização, permitindo `app.inject` sem abrir porta.
- GET /health consulta SELECT 1: HTTP 200 com status ok se conectado; HTTP 503 com status
  unavailable em falha. Resposta não contém mensagem interna nem URL do banco.
- Encerramento do pool em app.close e tratamento de sinais de encerramento.
- `.env.example` sem senhas e `.env` local ignorado pelo Git. Valores locais gerados
  aleatoriamente, nunca exibidos nem adicionados ao commit.
- O servidor passa a exigir testes existentes: retirado `--passWithNoTests` deste pacote.

Não foram criadas tabelas, migrations, login, contratos A3 ou funcionalidades de B/C/D.

## Dependências e ajustes de suporte

As dependências do prompt foram conferidas no registry/npm antes de instalar:

| Dependência | Versão  | Finalidade                                           |
| ----------- | ------- | ---------------------------------------------------- |
| fastify     | 5.12.8  | API e app.inject                                     |
| drizzle-orm | 0.45.4  | Camada tipada sobre PostgreSQL                       |
| pg          | 8.23.1  | Pool e driver PostgreSQL                             |
| zod         | 4.6.7   | Validação de ambiente                                |
| dotenv      | 18.0.9  | Leitura do .env local                                |
| drizzle-kit | 0.31.11 | Ferramenta para migrations futuras, ainda não usadas |
| tsx         | 4.23.15 | Executar/observar servidor TypeScript                |

Suporte informado ao usuário: @types/node 24.19.2, @types/pg 8.23.1 e typescript-eslint
8.72.1. O parser suporta TypeScript >=4.8.4 e <6.1, então TypeScript foi alinhado de 7.0.2
para 6.0.3 em vez de ignorar o conflito. ESLint continua em 10.14.0, dentro da faixa do parser.
ESLint agora analisa sintaxe TypeScript e regras recomendadas; `tsc` continua responsável
pela checagem de tipos. Não é um scanner de segurança.

O servidor usa skipLibCheck para declarações de terceiros, pois Drizzle publica tipos para
drivers opcionais não adotados pelo projeto. Os arquivos TS da aplicação continuam checados
em modo strict. shared/desktop mantêm a configuração de declarações original da A1.

pnpm 11 usa allowBuilds no workspace: só esbuild, dependência transitiva de ferramentas,
foi autorizado a executar seu instalador nativo. engineStrict/saveExact foram movidos do
.npmrc para pnpm-workspace.yaml, configuração suportada nesta versão. Sem permissão global
para scripts de todos os pacotes. As versões efetivamente resolvidas estão no lockfile.

Além do recorte literal de arquivos de A2, foram ajustados manifests/configurações de ferramentas,
types do servidor, lockfile, testes e este registro — necessários para executar e validar TS
real. Não houve mudança de arquitetura ou alteração dos anexos originais da líder.

## Como executar após resolver o Docker

Na raiz, copiar `.env.example` para `.env` se não existir e preencher uma senha de banco e um
JWT_SECRET aleatórios. DATABASE_URL deve usar a mesma senha de POSTGRES_PASSWORD; caracteres
reservados da senha precisam de codificação URL. Não sobrescrever um `.env` existente.

```sh
pnpm install --frozen-lockfile
docker compose config --quiet
docker compose up -d --wait
pnpm --filter server dev
```

Em outro terminal: acessar `http://127.0.0.1:3000/health`. Aceite obrigatório: HTTP 200 e
`{"status":"ok"}` com PostgreSQL real. Não usar `docker compose down -v`, pois remove dados.
Esta é configuração local; não publicar a porta do PostgreSQL ou esta API de desenvolvimento
como implantação de produção. A nuvem/HTTPS seguem o planejamento da líder.

## Evidências disponíveis

- `pnpm install --frozen-lockfile` e `pnpm check`: saída 0 após os ajustes de compatibilidade.
- `git diff --check`: sem erros; `.env` ignorado e README original preservado.
- Typecheck dos três pacotes passou.
- Lint da configuração e dos três pacotes passou.
- Oito testes passaram em dois arquivos: health conectado/falha com app.inject e configuração
  válida/inválida, incluindo URL malformada, protocolo errado, segredo curto e porta inválida.
- shared/desktop seguem sem testes, explicitamente tolerados como esqueletos.
- Peers: nenhum conflito ou peer obrigatório faltante.
- Compose validou com `docker compose config --quiet`.
- API real iniciou na porta 3000; chamada HTTP retornou 503/status unavailable porque não
  havia PostgreSQL. Processo de teste encerrado após a chamada, sem deixá-lo ocupando a porta.
- **Ainda não validado:** pull/inicialização PostgreSQL, volume em execução e health HTTP 200
  com banco real. Docker Desktop não expôs janela controlável e o motor Linux não respondeu.

As respostas de banco disponíveis nos testes são controladas; não são evidência de integração
com um PostgreSQL real. Ao resolver o Docker, executar esse aceite e registrar o resultado
antes do commit A2.
