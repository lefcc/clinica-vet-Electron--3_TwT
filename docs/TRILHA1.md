# Trilha 1 do Dev A

O workspace `shared` concentra os schemas Zod e os tipos públicos consumidos pelo renderer. Os canais administrativos validam a entrada e a saída e usam o mesmo controle de sessão do login.

| Recurso | Canais | Acesso |
| --- | --- | --- |
| Colaboradores | `colaboradores:listar`, `obter`, `criar`, `atualizar`, `inativar`, `redefinir_senha` | MASTER |
| Auditoria | `auditoria:listar` | MASTER |
| Configurações | `configuracoes:obter`, `atualizar` | MASTER. Os demais perfis podem ler apenas o modelo de lembrete. |
| Backup local | `backup:listar`, `criar`, `restaurar` | MASTER |
| Conflitos de sync | `sync_conflitos:listar`, `resolver` | MASTER |

O SQLite cria 25 tabelas no boot, incluindo as 3 tabelas exclusivas de sincronização local. O schema central declara as 22 tabelas correspondentes. As datas com horário no SQLite usam segundos UTC, conforme o Drizzle existente. Validade e próxima dose são datas de calendário. Valores monetários são inteiros em centavos.

Alterações administrativas gravam dados, auditoria e pendências de sincronização na mesma transação SQLite. O bcrypt roda antes de abrir a transação. O controle do último MASTER é reavaliado dentro dela. A saída do IPC e a auditoria usam dados públicos. O hash persiste na tabela de usuários e na fila destinada ao MySQL.

Os backups ficam em `backups` dentro da pasta de dados do aplicativo. O backup automático roda a partir do horário configurado de São Paulo enquanto o app está aberto, uma vez por dia, mesmo se a retenção tiver removido a cópia automática anterior. A restauração cria uma cópia preventiva, valida o arquivo antes de substituir o banco, preserva a auditoria local e encerra a sessão para que o operador entre com uma conta do banco restaurado.

A escolha LOCAL conserva o registro atual e enfileira seu envio novamente. A escolha CENTRAL aplica a versão central do mesmo registro e descarta as pendências substituídas. A resolução fica registrada na auditoria. A detecção automática de novos conflitos e a importação de alterações por pull continuam como trabalho separado da interface de resolução.

## Validação

```powershell
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm --filter @clinica-vet/app build:tsc
pnpm --filter @clinica-vet/app dev
```

Os testes nativos do app usam o Node do Electron para corresponder ao ABI do `better-sqlite3` usado em produção. A suíte compara as colunas, chaves e índices dos schemas, testa as opções válidas de cada enum e cobre formulários, autorização, transações, auditoria, resolução de conflitos, retenção e restauração.

O boot em `esquema-local.ts` aplica as restrições `CHECK` do SQLite. O `drizzle-kit` atual gera as tabelas SQLite a partir do schema, mas omite essas restrições no SQL gerado. Use o boot do app para conferir o SQLite com todas as restrições.

Para conferir o SQL central em um ambiente isolado, gere o DDL com o Drizzle e aplique-o a um banco MySQL 8.4 vazio de teste.

```powershell
pnpm --filter @clinica-vet/app exec drizzle-kit generate --dialect mysql --schema ./src/main/db/central/schema.ts --out ./dist/verificacao-mysql
```
