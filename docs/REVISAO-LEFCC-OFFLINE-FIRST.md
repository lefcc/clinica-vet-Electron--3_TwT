# Revisão da lefcc — arquitetura offline-first

Verificação em 03/11/2026, conforme horário de São Paulo. Referência remota: commit
`dd136bf0df8c29c33e5a3c0fbab857a5c37f58a1` na main, que integra o commit
`ad9f3f8511a9493d81dc20e64d8f41c7df7a4306`, “Plano revisado do projeto”, de lefcc.

O usuário confirmou explicitamente que **não será usado PostgreSQL**. Esta decisão e os
documentos revisados da líder substituem a arquitetura anterior. Este relatório é análise
e registro local; não é uma migração do código já concluída.

## Fontes verificadas

- CONTEXTO.md: lido integralmente no commit remoto acima.
- ESTADO.md: lido integralmente no mesmo commit.
- PROMPTS-SEMANA-1.md: lido integralmente no mesmo commit.
- metodologia.html: conteúdo textual integral conferido via Git.
- Árvore e branches remotas: oito arquivos na main, nenhuma outra branch remota listada.

O fetch atualizou origin/main; não houve merge, rebase, reset, push ou sobrescrita dos
arquivos da líder. As alterações locais da A2 anterior foram preservadas para posterior
substituição controlada, não devem ser consideradas a implementação ativa aprovada.

## Arquitetura vigente

```text
Renderer HTML/CSS/TS puro, via Vite
        ↓ window.api
preload.ts / contextBridge / ipcRenderer.invoke
        ↓ IPC tipado e validado
Electron main: sessão, permissões, handlers → services → repositories
        ↓ transação local
SQLite em userData + outbox/estado/conflitos
        ↓ sincronização em background, quando online, via TLS
MySQL 8 em nuvem (mysql2 + Drizzle)
```

| Tema                | Modelo antigo, superado    | Novo modelo da líder                       |
| ------------------- | -------------------------- | ------------------------------------------ |
| Workspace           | shared/server/desktop      | shared/app                                 |
| Operação            | Dependia do servidor/rede  | Funcionalidades locais operam offline      |
| Backend             | API Fastify separada       | TypeScript dentro de main do Electron      |
| Comunicação interna | HTTP                       | IPC com canais em shared                   |
| Sessão              | JWT                        | Sessão em memória no main, 8 horas         |
| Dados               | PostgreSQL central         | SQLite local + MySQL central para sync     |
| Ambiente Docker     | PostgreSQL 16              | MySQL 8.4 só para desenvolvimento do sync  |
| UI                  | React/Tailwind/shadcn      | HTML/CSS/TS puro, sem frameworks           |
| Integrações         | CEP no renderer            | CEP, câmbio e WhatsApp pelo main           |
| Sincronização       | Não prevista no MVP antigo | Outbox transacional, push/pull e conflitos |

Bibliotecas definidas no novo contexto: better-sqlite3, mysql2, Drizzle/drizzle-kit, Zod,
bcryptjs, node-cron, Electron e @electron/rebuild. Os nomes são decisões de arquitetura,
**não autorização automática para instalar**: o novo contexto exige lista de nome, motivo
e link npm, seguida de confirmação do grupo antes de novas dependências.

SQLite é o banco operacional de cada PC. MySQL é o ponto central de sincronização; não
substituir o PostgreSQL por MySQL no antigo servidor Fastify e chamar isso de migração.

## Impacto no DEV 1 / Dev A

O cronograma foi reorganizado em 30 dias, não apenas renomeado:

- Semana 1: nova A1 shared/app + Compose MySQL; A2 contratos/canais IPC; A3 Electron/registry;
  A4 SQLite/outbox/migrations; A5 seed/auth offline; A6 login; A7 colaboradores.
- Semana 2: MySQL central e sincronização push/pull passam a ser responsabilidades de A.
- Semana 3: conflitos, auditoria e testes de sincronização/concorrência.
- Semana 4: backup SQLite, instalador NSIS e integração final.

Não confundir os códigos: **A2 nova é contratos compartilhados**, enquanto a A2 antiga era
servidor/banco/health. O commit local A1 d082fc2 é um marco real do modelo antigo, não prova
de que a A1 revisada já está concluída.

## Trabalho local e próxima adaptação

Preservar o commit d082fc2 e os diffs atuais antes de reorganizar. A próxima tarefa de
implementação deve reconciliar a A1 local com a nova A1 da líder: shared/app, sem server/desktop,
sem dependências Fastify/pg e sem configurações JWT/PostgreSQL. Preparar o Compose MySQL dev,
sem abrir conexão com MySQL de produção ou acrescentar dados reais por conta própria.

Não continuar o diagnóstico Docker como requisito de um /health Fastify: esse aceite foi
**cancelado pela mudança de arquitetura**. Docker continua útil para o MySQL de desenvolvimento;
seu erro ainda pode precisar de solução para esse cenário, mas não bloqueia o uso offline
do SQLite nem autoriza manter PostgreSQL.

Nenhum pacote novo foi instalado ou removido nesta conferência. Não houve commit da A2 antiga.
Os oito testes anteriores validam apenas o protótipo descartado como direção arquitetural,
não são evidência de IPC/SQLite/sincronização.

## Pendências documentais identificadas

1. CONTEXTO.md, ESTADO.md e metodologia.html chamam AGENTS.md de fonte oficial, mas a árvore
   remota não contém esse arquivo. O AGENTS.md local deste chat é próprio, não é da lefcc;
   não apresentá-lo como a fonte oficial ausente.
2. Os arquivos CONTEXTO/ESTADO/PROMPTS estão na raiz remota, embora o texto cite também
   docs/CONTEXTO.md e docs/ESTADO.md. Ao integrar, preservar os originais e combinar o caminho
   canônico para evitar duas versões independentes.
3. O contexto admite front compilado de TS e a disciplina exige lógica em TS: manter fontes
   de lógica renderer em TypeScript, gerando JS só no build.
4. ESTADO.md ainda pede confirmar WhatsApp com professor. A confirmação anterior do cliente
   não deve ser confundida com aceite acadêmico.

Na implementação do sync, acordar contratos de conflito, ordenação/idempotência e tratamento
de agenda/estoque offline antes dos testes de consistência global. Não prometer que cinco PCs
desconectados nunca produzirão alterações conflitantes; o novo plano prevê reconciliação.

## Referências remotas

- [Commit do plano revisado](https://github.com/lefcc/clinica-vet-Electron--3_TwT/commit/ad9f3f8511a9493d81dc20e64d8f41c7df7a4306).
- [CONTEXTO.md](https://github.com/lefcc/clinica-vet-Electron--3_TwT/blob/dd136bf0df8c29c33e5a3c0fbab857a5c37f58a1/CONTEXTO.md).
- [ESTADO.md](https://github.com/lefcc/clinica-vet-Electron--3_TwT/blob/dd136bf0df8c29c33e5a3c0fbab857a5c37f58a1/ESTADO.md).
- [PROMPTS-SEMANA-1.md](https://github.com/lefcc/clinica-vet-Electron--3_TwT/blob/dd136bf0df8c29c33e5a3c0fbab857a5c37f58a1/PROMPTS-SEMANA-1.md).
