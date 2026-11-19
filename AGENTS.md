# Contexto local deste chat — DEV 1

Este arquivo foi preparado neste workspace, não fornecido pela lefcc. O AGENTS.md oficial
mencionado por ela ainda não aparece em origin/main dd136bf; não atribuir este texto à líder.

- Usuário: **Cir0Arruda = DEV 1 = Dev A**. Lefcc é líder e proprietária do repositório.
- Fonte vigente: **CONTEXTO.md, ESTADO.md e PROMPTS-SEMANA-1.md na raiz**, originais da lefcc.
  Eles prevalecem sobre nossos relatórios de planejamento antigos.
- Arquitetura: shared/app, Electron main em TS, IPC validado, SQLite local e sync MySQL 8.
  Renderer HTML/CSS/TS puro. Sem PostgreSQL, Fastify, HTTP, JWT, React, Tailwind ou shadcn.
- Estado local: docs/ESTADO.md. Correção A1 revisada commitada: 6fcc497, branch feat/a1-offline-first, sem push.
- Atualização de 19/11/2026: A2 em feat/a2-contratos-ipc, contratos e 42 testes validados.
  O usuário solicitou publicar o trabalho no GitHub; consultar docs/ESTADO.md para execução.
  Consulte docs/CORRECAO-A1-OFFLINE-FIRST.md para backups e validações.
- A A2 antiga de servidor/health foi retirada e arquivada fora do workspace. Não continuar
  seu aceite. A2 nova = contratos/canais IPC; A3 = Electron; A4 = SQLite/outbox.
- Não adicionar novos pacotes sem lista de nome, motivo e link npm e confirmação do grupo,
  conforme a metodologia revisada. A correção A1 mantém apenas quatro ferramentas diretas.
- Não executar módulos de B/C/D por conta própria, não inventar campos fora dos contratos,
  não conectar MySQL de produção nem contratar serviços a partir de exemplos dos documentos.
- Autoria Git local: Cir0Arruda e e-mail informado pelo usuário. Não commitar como lefcc
  nem alterar autoria dos commits dela. Um commit por tarefa, revisão humana antes do merge.
- Antes de commit: typecheck, lint, testes pertinentes e critérios de aceite da tarefa.
  Esqueletos sem teste não comprovam funcionalidade. Não fazer reset/restore genérico.
- Preservar os arquivos originais da líder e segredos fora do Git. Não versionar dados
  SQLite, dumps ou o backup externo desta migração.
- Não ativar subagentes sem solicitação explícita. Skills pessoais instaladas não são
  agentes aprovados do grupo nem prova de revisão de segurança já feita.
