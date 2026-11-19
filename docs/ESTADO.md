# Estado local de execução — DEV 1

Este registro complementa [ESTADO.md original da líder](../ESTADO.md), preservado sem
alterações. Não representa aprovação ou merge pelo grupo.

## A1 revisada — correção de estrutura

- [x] Origin/main dd136bf integrado, mantendo os documentos da lefcc intactos.
- [x] Workspaces `shared` e `app`, TypeScript estrito, ESLint/Prettier e Vitest.
- [x] Retirados o servidor HTTP, workspace desktop antigo e configurações PostgreSQL/JWT.
- [x] MySQL 8.4 de desenvolvimento: localhost:3306, utf8mb4 e volume nomeado.
- [x] Modelos/segredos locais adequados ao MySQL dev; bancos SQLite ignorados no Git.
- [ ] Revisão humana/PR e merge da correção.
- [ ] Execução do container MySQL quando o motor Docker estiver disponível.

As validações e os resultados estão em CORRECAO-A1-OFFLINE-FIRST.md. A1 não implementa
Electron, armazenamento SQLite nem sincronização; não marcar esses itens como concluídos.

## A2 — contratos base (validação em 19/11/2026)

- [x] Schemas de perfil, login, sessão, usuário, colaborador e paginação em shared.
- [x] Resposta IPC tipada e contratos de ping, WhatsApp e autenticação.
- [x] Typecheck, lint e 42 testes de contratos aprovados; importação por app verificada.
- [x] Zod e typescript-eslint instalados após aprovação explícita do usuário.
- [ ] Revisão humana e merge pelo grupo.

Detalhes em [A2-CONTRATOS-IPC.md](A2-CONTRATOS-IPC.md).
A2 define contratos; não implementa ainda Electron, handlers, login ou banco.
A publicação das branches A1/A2 foi solicitada em 19/11/2026. Os relatórios anteriores
são registros históricos; a auditoria não foi reexecutada para todo o cronograma.

## Próximas tarefas do cronograma revisado

1. A3: Electron seguro, preload e registry IPC; renderer HTML/CSS/TS puro.
2. A4: SQLite local, migrations e escrita atômica com outbox.
3. A5–A7: autenticação offline, tela de login e colaboradores.

Antes de adicionar dependências novas, listar nome, motivo e link npm e obter confirmação
conforme os prompts revisados. Não usar o número A2 antigo como referência para tarefas novas.
