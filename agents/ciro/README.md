# Agente do Ciro — Trilha 1: Fundação de Dados e Admin

> **Desenvolvedor 1 (Ciro)** — Responsável por: Contratos Zod em `/shared`, Schemas completos do banco, Módulos Administrativos

---

## Status
**Pasta reservada — Aguardando Ciro iniciar**

---

## Responsabilidades da Trilha 1 (resumo do PLANO_4_TRILHAS)

### Objetivo
Fundação de Dados, Contratos Zod em `/shared` e Módulos Administrativos (colaboradores, auditoria, configuracoes, backup, sync_conflitos).

### Prioridade Zero (Primeiras 2h)
Entregar o commit dos contratos em `/shared` e das tabelas em `schema.ts` / `esquema-local.ts`. Enquanto isso, Trilhas 2, 3 e 4 já começam pelos Mocks + Front.

### Arquivos Principais para Criar

#### `/shared` (Contratos Zod — 1 arquivo por domínio)
- `shared/src/comum.ts` (paginação, IPCResponse, Endereco, EstadoSync)
- `shared/src/clientes-animais.ts` (Cliente, Animal, Agendamento, Consulta, Prescricao)
- `shared/src/estoque-fornecedores.ts` (Medicamento, Fornecedor, PrecoFornecedor, Cotacao, SaldoEstoque, Lote, AlertaEstoque)
- `shared/src/vacinas-orcamentos.ts` (VacinaCatalogo, VacinaFila, Servico, ItemOrcamento, Orcamento, ResumoInicio)
- `shared/src/admin.ts` (Colaborador, AuditoriaRegistro, Configuracoes, BackupArquivo, Conflito)
- `shared/src/index.ts` (exportar todos)

#### Banco (app/src/main/db/)
- `app/src/main/db/local/schema.ts` — Tabelas completas (SQLite)
- `app/src/main/db/local/esquema-local.ts` — CREATE TABLE IF NOT EXISTS de todas
- `app/src/main/db/central/schema.ts` — Tabelas completas (MySQL, paridade com SQLite)

#### Backend Admin (app/src/main/modules/)
- `colaboradores/` — repository, service, test
- `auditoria/` — repository, service
- `configuracoes/` — repository, service, backup.service.ts
- `ipc/trilha1.ipc.ts`

#### IPC da Trilha 1
- `colaboradores:listar|obter|criar|atualizar|inativar|redefinir_senha`
- `sync:estado`, `sync_conflitos:listar|resolver`
- `auditoria:listar`
- `configuracoes:obter|atualizar`
- `backup:listar|criar|restaurar`

---

## Integração Final
Em `app/src/main/main.ts`:
```ts
registrarTrilha1Ipc(conexao);  // ← Ciro adiciona esta linha
registrarTrilha2Ipc(conexao);
registrarTrilha3Ipc(conexao);
registrarTrilha4Ipc(conexao);
```

---

## Referência Completa
Ver `PLANO_4_TRILHAS.pdf` na pasta `docs/Plano Desenvolvimento/` — Seção "TRILHA 1 (Dev A)".