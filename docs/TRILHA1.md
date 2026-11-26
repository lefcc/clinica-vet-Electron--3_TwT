# Trilha 1 do Dev A

O workspace `shared` concentra os schemas Zod e os tipos públicos consumidos pelo renderer. Os canais administrativos validam a entrada e a saída e usam o mesmo controle de sessão do login.

| Recurso | Canais | Acesso |
| --- | --- | --- |
| Colaboradores | `colaboradores:listar`, `obter`, `criar`, `atualizar`, `inativar`, `redefinir_senha` | MASTER |
| Auditoria | `auditoria:listar` | MASTER |
| Configurações | `configuracoes:obter`, `atualizar` | MASTER. Os demais perfis podem ler apenas o modelo de lembrete. |
| Backup local | `backup:listar`, `criar`, `restaurar` | MASTER |
| Conflitos de sync | `sync_conflitos:listar`, `resolver` | MASTER |
| Indicador de sync | `sync:estado` | Todos os perfis autenticados |

O SQLite aplica as migrations no boot e cria 25 tabelas, incluindo as três tabelas exclusivas de sincronização local. O MySQL tem as 22 tabelas de domínio correspondentes e duas tabelas para ordenar e publicar as atualizações. As datas com horário no SQLite usam segundos UTC. Validade e próxima dose são datas de calendário. Valores monetários são inteiros em centavos.

Alterações administrativas gravam dados, auditoria e pendências de sincronização na mesma transação SQLite. O bcrypt roda antes de abrir a transação. O controle do último MASTER é reavaliado dentro dela. A saída do IPC e a auditoria usam dados públicos. O hash persiste na tabela de usuários e na fila destinada ao MySQL.

Os backups ficam em `backups` dentro da pasta de dados do aplicativo. O backup automático roda a partir do horário configurado de São Paulo enquanto o app está aberto, uma vez por dia, mesmo se a retenção tiver removido a cópia automática anterior. A restauração cria uma cópia preventiva, valida o arquivo antes de substituir o banco, preserva a auditoria local e encerra a sessão para que o operador entre com uma conta do banco restaurado.

A escolha LOCAL conserva o registro atual e enfileira seu envio novamente. A escolha CENTRAL aplica a versão central do mesmo registro e descarta as pendências substituídas. A resolução fica registrada na auditoria. O worker detecta conflitos e recebe as alterações do MySQL pelo cursor gravado no SQLite.

O indicador consulta as pendências diretamente no SQLite. Quando a conexão volta, ele diferencia modo local, fila pendente, falha e envios confirmados pelo MySQL. Uma tentativa que falha mantém a fila em ordem para a próxima execução. O provisionamento e os testes estão no [guia de sincronização e instalação](SINCRONIZACAO.md).

## Validação

```powershell
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm --filter @clinica-vet/app build:tsc
pnpm --filter @clinica-vet/app dev
```

Os testes nativos do app usam o Node do Electron para corresponder ao ABI do `better-sqlite3` usado em produção. A suíte compara as colunas, chaves e índices dos schemas, testa as opções válidas de cada enum e cobre formulários, autorização, transações, auditoria, resolução de conflitos, retenção e restauração.

A migration inicial do SQLite inclui as restrições `CHECK` e é aplicada na abertura do app. Para aplicar a mesma migration via Drizzle Kit, defina `SQLITE_PATH` com o caminho absoluto de um SQLite de desenvolvimento e rode `pnpm db:migrate`. O `drizzle-kit` atual omite as restrições `CHECK` no SQL gerado para SQLite. Confira essas restrições ao revisar novas migrations.

Para conferir o SQL central em um ambiente isolado, gere o DDL com o Drizzle e aplique-o a um banco MySQL 8.4 vazio de teste.

```powershell
pnpm --filter @clinica-vet/app exec drizzle-kit generate --dialect mysql --schema ./src/main/db/central/schema.ts --out ./dist/verificacao-mysql
```
