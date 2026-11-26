# ESTADO.md — Acompanhamento de Execução do Projeto

> Atualize este documento ao concluir cada etapa (via PR junto da tarefa ou no fechamento do dia).
> Referência oficial de arquitetura, regras e escopo: `AGENTS.md`.

## 1. Status Geral
- **Arquitetura ativa:** Offline-First — Electron (`main` em TypeScript + IPC + `preload.ts`) + Front HTML/CSS/TS puro (Vite) + SQLite local (`better-sqlite3` + Drizzle) + Sincronização com MySQL 8 em nuvem (`mysql2` + Drizzle).
- **Fase atual:** Semana 1 — Fundação (Dias 1–7).
- **Última atualização:** 25/11/2026 (Trilha 1 incorporada à `main` via PR #3).

---

## 2. Progresso por Semana

### Semana 1 — Fundação Offline-First
- [x] **1.1 (Dev A)** Monorepo pnpm (`/shared`, `/app`), TS estrito, ESLint/Prettier, Docker MySQL dev
- [x] **1.2 (Dev A)** Contratos base em `/shared` + Electron seguro + `preload.ts` + `registrarHandler`
- [x] **1.3 (Dev A)** SQLite local + Drizzle + migrations iniciais + `sync_outbox` / `sync_estado` / `sync_conflitos`
- [x] **1.4 (Dev A)** Seed MASTER + módulo `auth` (sessão em memória offline) + tela de login
- [ ] **1.5 (Dev D)** Design system (tokens CSS + componentes TS puro) + layout/menu por perfil
- [ ] **1.6 (Dev B)** Contratos, handlers IPC e telas de `clientes` e `animais`
- [ ] **1.7 (Dev D)** Busca ViaCEP no `main` (`cep:buscar`) + componente `CepInput` com fallback offline
- [ ] **1.8 (Dev C)** Contratos, migration, handlers IPC e telas de `medicamentos` e `fornecedores`
- [x] **1.9 (Dev A)** CRUD de `colaboradores` (MASTER) + integração à `main`

### Semana 2 — Núcleo Clínico e Sync v1
- [x] **2.1 (Dev A)** Schema/migrations MySQL central + conexão TLS + `safeStorage`
- [x] **2.2 (Dev A)** Motor de sincronização v1 (push outbox + pull por marca d'água)
- [ ] **2.3 (Dev B)** Agenda (`agendamentos` + validação de conflito de horário)
- [ ] **2.4 (Dev B)** Consulta e diagnóstico (`consultas` com omissão de diagnóstico para ATENDENTE)
- [ ] **2.5 (Dev B)** Histórico completo do animal (linha do tempo)
- [ ] **2.6 (Dev C)** Lotes e movimentações de estoque (saldo = soma)
- [ ] **2.7 (Dev C)** Uso de medicamento na consulta com baixa transacional (FEFO)
- [ ] **2.8 (Dev D)** Dashboard por perfil + indicador visual de sincronização no topo

### Semana 3 — Alertas, Vacinas, Dólar, Orçamento e Conflitos
- [x] **3.1 (Dev A)** Tratamento e tela de resolução de `sync_conflitos` (MASTER)
- [x] **3.2 (Dev A)** Auditoria + suíte de testes de sincronização/concorrência
- [ ] **3.3 (Dev C)** Função `calcularDiasRestantes` e testes unitários
- [ ] **3.4 (Dev C)** Job de alertas de estoque (`node-cron`) + sino e notificação nativa
- [ ] **3.5 (Dev C)** Vínculo medicamento-fornecedor, cotação do dólar (AwesomeAPI + cache) e comparativo
- [ ] **3.6 (Dev D)** Catálogo de vacinas, aplicação e fila dos próximos 3 dias
- [ ] **3.7 (Dev D)** Lembrete semiautomático por WhatsApp (`wa.me`) e registro de envio
- [ ] **3.8 (Dev B)** Catálogo de serviços, itens do atendimento e cálculo de orçamento em centavos

### Semana 4 — PDF, Relatórios, Instalador e Entrega
- [ ] **4.1 (Dev D)** PDF de orçamento/demonstrativo (`printToPDF`, sem valor fiscal) e relatório de cobranças
- [ ] **4.2 (Dev C)** Lista de compras sugerida e relatórios de estoque/validade (PDF/CSV)
- [ ] **4.3 (Dev B)** Importação e exportação CSV (clientes/animais)
- [x] **4.4 (Dev A)** Backup local agendado do SQLite e teste de restauração
- [x] **4.5 (Dev A)** Instalador Windows NSIS (`electron-builder`) testado offline em VM limpa no GitHub Actions
- [ ] **4.6 (Dev D)** Polimento de UX, atalhos e teste com usuário leigo
- [ ] **4.7 (Todos)** QA ponta a ponta (3 perfis, 2+ PCs, offline/online), manual curto, README e entrega

O [PR #3](https://github.com/lefcc/clinica-vet-Electron--3_TwT/pull/3) integrou os itens do Dev A à `main`. O [guia de sincronização e instalação](SINCRONIZACAO.md) reúne o provisionamento e os comandos de validação. O [manual rápido da Trilha 1](MANUAL-TRILHA1.md) reúne as telas e o roteiro de conferência em dois computadores. O aceite de ponta a ponta do produto no item 4.7 depende dos módulos de todas as trilhas e da validação do grupo.

---

## 3. Contratos publicados em `/shared`
O pacote `@clinica-vet/shared` publica perfis, sessão e login, o formato de resposta IPC, paginação, schemas de domínio e os contratos administrativos de `canaisTrilha1`. O [índice de exportações](../shared/src/index.ts) indica os arquivos por área.

## 4. Canais IPC registrados (`preload.ts` ↔ `main`)
| Canais registrados na `main` | Perfis |
| --- | --- |
| `auth:login`, `auth:sessao`, `auth:sair` | Origem Electron autorizada. Sessão avaliada no módulo de autenticação. |
| `colaboradores:listar`, `colaboradores:obter`, `colaboradores:criar`, `colaboradores:atualizar`, `colaboradores:inativar`, `colaboradores:redefinir_senha` | MASTER |
| `auditoria:listar`, `configuracoes:atualizar` | MASTER |
| `backup:listar`, `backup:criar`, `backup:restaurar`, `sync_conflitos:listar`, `sync_conflitos:resolver` | MASTER |
| `configuracoes:obter` | MASTER recebe todos os dados. VETERINARIO e ATENDENTE recebem o modelo de lembrete. |
| `sync:estado` | Todos os perfis autenticados |

## 5. Migrations aplicadas (ordem oficial controlada pelo Dev A)
- **SQLite local (`app/src/main/db/local/migrations`):** `0000_inicial.sql`, aplicada na abertura do aplicativo.
- **MySQL central (`app/src/main/db/central/migrations`):** `0000_entidades.sql` e `0001_sync.sql`, nesta ordem para bancos novos.

## 6. Decisões e pendências abertas
- [ ] Confirmar dados de conexão, TLS, usuário de privilégios mínimos e schemas por dev no MySQL em nuvem.
- [ ] Aprovar lista inicial de pacotes npm (`AGENTS.md`, seção 2) antes do prompt A1/A3/A4.
- [ ] Confirmar com o professor a aceitação do WhatsApp semiautomático (`wa.me`) na entrega atual.
- [ ] Receber do Will: logo/dados da clínica, tabela de serviços/preços, planilha atual para CSV e aprovação do texto de lembrete de vacina.
