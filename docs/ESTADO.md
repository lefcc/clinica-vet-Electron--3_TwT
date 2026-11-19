# ESTADO.md — Acompanhamento de Execução do Projeto

> Atualize este documento ao concluir cada etapa (via PR junto da tarefa ou no fechamento do dia).
> Referência oficial de arquitetura, regras e escopo: `AGENTS.md`.

## 1. Status Geral
- **Arquitetura ativa:** Offline-First — Electron (`main` em TypeScript + IPC + `preload.ts`) + Front HTML/CSS/TS puro (Vite) + SQLite local (`better-sqlite3` + Drizzle) + Sincronização com MySQL 8 em nuvem (`mysql2` + Drizzle).
- **Fase atual:** Semana 1 — Fundação (Dias 1–7).
- **Última atualização:** 03/11/2026 (definição e alinhamento documental completo).

---

## 2. Progresso por Semana

### Semana 1 — Fundação Offline-First
- [ ] **1.1 (Dev A)** Monorepo pnpm (`/shared`, `/app`), TS estrito, ESLint/Prettier, Docker MySQL dev
- [ ] **1.2 (Dev A)** Contratos base em `/shared` + Electron seguro + `preload.ts` + `registrarHandler`
- [ ] **1.3 (Dev A)** SQLite local + Drizzle + migrations iniciais + `sync_outbox` / `sync_estado` / `sync_conflitos`
- [ ] **1.4 (Dev A)** Seed MASTER + módulo `auth` (sessão em memória offline) + tela de login
- [ ] **1.5 (Dev D)** Design system (tokens CSS + componentes TS puro) + layout/menu por perfil
- [ ] **1.6 (Dev B)** Contratos, handlers IPC e telas de `clientes` e `animais`
- [ ] **1.7 (Dev D)** Busca ViaCEP no `main` (`cep:buscar`) + componente `CepInput` com fallback offline
- [ ] **1.8 (Dev C)** Contratos, migration, handlers IPC e telas de `medicamentos` e `fornecedores`
- [ ] **1.9 (Dev A)** CRUD de `colaboradores` (MASTER) + revisão e integração da Semana 1

### Semana 2 — Núcleo Clínico e Sync v1
- [ ] **2.1 (Dev A)** Schema/migrations MySQL central + conexão TLS + `safeStorage`
- [ ] **2.2 (Dev A)** Motor de sincronização v1 (push outbox + pull por marca d'água)
- [ ] **2.3 (Dev B)** Agenda (`agendamentos` + validação de conflito de horário)
- [ ] **2.4 (Dev B)** Consulta e diagnóstico (`consultas` com omissão de diagnóstico para ATENDENTE)
- [ ] **2.5 (Dev B)** Histórico completo do animal (linha do tempo)
- [ ] **2.6 (Dev C)** Lotes e movimentações de estoque (saldo = soma)
- [ ] **2.7 (Dev C)** Uso de medicamento na consulta com baixa transacional (FEFO)
- [ ] **2.8 (Dev D)** Dashboard por perfil + indicador visual de sincronização no topo

### Semana 3 — Alertas, Vacinas, Dólar, Orçamento e Conflitos
- [ ] **3.1 (Dev A)** Tratamento e tela de resolução de `sync_conflitos` (MASTER)
- [ ] **3.2 (Dev A)** Auditoria + suíte de testes de sincronização/concorrência
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
- [ ] **4.4 (Dev A)** Backup local agendado do SQLite e teste de restauração
- [ ] **4.5 (Dev A)** Instalador Windows NSIS (`electron-builder`) testado offline em máquina limpa
- [ ] **4.6 (Dev D)** Polimento de UX, atalhos e teste com usuário leigo
- [ ] **4.7 (Todos)** QA ponta a ponta (3 perfis, 2+ PCs, offline/online), manual curto, README e entrega

---

## 3. Contratos publicados em `/shared`
_(Nenhum código criado ainda — registrar aqui conforme forem mergeados na Semana 1)_

## 4. Canais IPC registrados (`preload.ts` ↔ `main`)
_(Nenhum canal criado ainda — registrar aqui no formato `modulo:acao` + perfis permitidos)_

## 5. Migrations aplicadas (ordem oficial controlada pelo Dev A)
- **SQLite local (`app/src/main/backend/db/local/migrations`):** _(vazio)_
- **MySQL central (`app/src/main/backend/db/central/migrations`):** _(vazio)_

## 6. Decisões e pendências abertas
- [ ] Confirmar dados de conexão, TLS, usuário de privilégios mínimos e schemas por dev no MySQL em nuvem.
- [ ] Aprovar lista inicial de pacotes npm (`AGENTS.md`, seção 2) antes do prompt A1/A3/A4.
- [ ] Confirmar com o professor a aceitação do WhatsApp semiautomático (`wa.me`) na entrega atual.
- [ ] Receber do Will: logo/dados da clínica, tabela de serviços/preços, planilha atual para CSV e aprovação do texto de lembrete de vacina.
