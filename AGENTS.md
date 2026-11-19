# AGENTS.md — Guia de Desenvolvimento: Sistema Clínica Veterinária

> **Arquivo de referência principal para IAs e desenvolvedores.**  
> Leia este arquivo **antes de qualquer tarefa**. Se algo mudar, atualize **este arquivo primeiro** e depois o `docs/CONTEXTO.md` via PR.

---

## 1. Visão Geral do Produto

Sistema **desktop offline-first** para clínica veterinária (substitui planilhas/caderno).

| Aspecto | Detalhe |
|---|---|
| **Funções** | Clientes, animais, agenda, consultas/diagnóstico, histórico (prontuário), medicamentos, estoque com alarme, vacinas com lembrete WhatsApp, fornecedores (nacional/importado, cotação dólar), orçamento/PDF (sem valor fiscal), colaboradores com perfis e auditoria |
| **Uso** | 5 computadores / 5 usuários, **100% offline** (SQLite local em cada PC) com **sync automática** para MySQL em nuvem quando houver internet |
| **Idioma** | Português do Brasil (interface, erros, logs) |
| **Fase 2 (fora do escopo)** | WhatsApp automático, NF-e, API HTTP, app mobile, multiclínica |

---

## 2. Stack Tecnológica (FIXA — Não Trocar)

| Camada | Tecnologia |
|---|---|
| Gerenciador de pacotes | **pnpm** (workspaces) |
| Linguagem | **TypeScript estrito** (`strict: true`) no `main`, `preload` e `/shared`; front-end em **HTML + CSS + JS** |
| Compartilhado (`/shared`) | Contratos IPC, **schemas Zod**, tipos/constantes reutilizados |
| Desktop | **Electron** (tudo junto na mesma pasta) |
| Front (`renderer`) | HTML + CSS + JS (sem React/Vue/Angular; pode usar Tailwind). CSS com variáveis (design tokens), consome `window.api` e constantes de `/shared` |
| Backend (`main`) | TypeScript no processo `main` do Electron, exposto via **`ipcMain.handle`** (canais de `/shared`). **Sem Fastify, HTTP, JWT** |
| Ponte (`preload`) | `contextBridge` + `ipcRenderer.invoke` → expõe apenas `window.api` |
| Banco local | **SQLite** (`better-sqlite3` + `electron-rebuild`), pasta de dados do usuário |
| Banco central (sync) | **MySQL 8** (InnoDB, `utf8mb4`, TLS) via `mysql2`. Dev: container `mysql:8.4` |
| ORM/Migrations | **Drizzle ORM + drizzle-kit** (NÃO Prisma) — schemas SQLite e MySQL em paridade |
| Validação | **Zod** (entrada/saída e contratos IPC centralizados em `/shared`) |
| Senhas | **bcryptjs** (custo ≥ 10; NÃO argon2) |
| Testes | **Vitest** |
| Jobs | **node-cron** (no `main`: alertas, sync, dólar, vacinas) |
| PDF | `printToPDF` do Electron (HTML → PDF) |
| Instalador | `electron-builder` + NSIS |
| Integrações | ViaCEP (CEP), AwesomeAPI USD-BRL (dólar), `wa.me` (WhatsApp) — **todas no `main`, nunca no `renderer`** |

**Regra de dependências:** não adicionar pacote sem listar **nome, motivo e link no npmjs.com** e aguardar confirmação.

---

## 3. Estrutura do Monorepo

```
/clinica-vet
  package.json, pnpm-workspace.yaml, tsconfig.base.json
  docker-compose.yml (MySQL dev), .env.example, .gitignore
  AGENTS.md                          ← ESTE ARQUIVO

  /shared
    /src                             ← Schemas Zod + tipos + canais IPC (1 arquivo/entidade + index.ts)

  /app
    /src
      /renderer                      ← Front-end (HTML + CSS + TS puro)
        index.html
        /pages                       ← Telas HTML (views modulares)
        /css                         ← Design tokens (variáveis), estilos globais/por tela
        /ts
          /pages                     ← Scripts de cada tela
          /components/ui             ← Componentes visuais reutilizáveis
          /lib                       ← api.ts (wrapper window.api), cep.ts, validadores

      /main                          ← Processo principal Electron + Backend
        main.ts                      ← Cria janela, registra handlers IPC, inicia jobs/sync
        preload.ts                   ← contextBridge + ipcRenderer.invoke (expõe window.api)
        /ipc                         ← registry (registrarHandler) + <modulo>.ipc.ts
        /modules
          /<modulo>                  ← repository.ts, service.ts, <modulo>.test.ts
        /db
          /local                     ← client.ts, schema.ts, migrations/ (SQLite)
          /central                   ← client.ts, schema.ts, migrations/ (MySQL)
        /sync                        ← outbox, push, pull, conflitos, estado
        /auth                        ← Sessão em memória, controle de perfis
        /jobs                        ← Alertas, vacinas, dólar, sync (node-cron)
        /config                      ← env.ts

  /docs                              ← CONTEXTO.md, ESTADO.md, prompts, manual, metodologia.html
```

**Módulos do backend (`main`):** `auth`, `colaboradores`, `clientes`, `animais`, `medicamentos`, `fornecedores`, `agenda`, `consultas`, `estoque`, `alertas`, `vacinas`, `atendimentos`, `dolar`, `auditoria`, `sync`.

---

## 4. Arquitetura e Regras Invioláveis

1. **Fluxo offline-first:**  
   `Renderer → preload (window.api) → IPC → main → SQLite local → (sync background) → MySQL nuvem`  
   O `renderer` **NUNCA** acessa Node, banco, arquivos ou rede.

2. **Regra de negócio só no `main`** (estoque, conflitos agenda, cálculos, permissões).  
   `renderer` só exibe, máscaras, valida formulário, notifica.

3. **Autorização por perfil em TODO handler IPC no `main`** (`registrarHandler` com `perfis`).  
   Esconder menu no front **não é segurança**.

4. **Camadas por módulo:** `ipc (handler) → service → repository`  
   - Handlers: validam (Zod), checam sessão/perfil, chamam `service`  
   - SQL/Drizzle **apenas** no `repository`

5. **Contrato Zod em `/shared` ANTES do código** (schemas entrada, saída, nome canal IPC).

6. **Dinheiro em centavos (inteiro).** Nunca `float`.  
   Datas em **UTC** no banco, exibidas em `America/Sao_Paulo`.

7. **Exclusão lógica (`ativo = false`)** em cadastros com histórico.  
   Proibido `DELETE` físico em clientes, animais, consultas, tabelas sincronizáveis.

8. **Saldo de estoque = soma das movimentações** (append-only). Nunca campo editável.

9. **Concorrência e transações:**  
   - Local: transação SQLite (`BEGIN IMMEDIATE`) gravando dado + `sync_outbox` juntos  
   - Central (sync): transação MySQL + `SELECT ... FOR UPDATE`

10. **Segurança Electron:**  
    `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`;  
    `preload` expõe apenas funções nomeadas (nunca `ipcRenderer` inteiro);  
    `shell.openExternal` **só** para `https://wa.me/...`

11. **Segredos e senhas:**  
    - Nunca retornar `senha_hash` ao `renderer`  
    - Nunca logar senha/credencial  
    - Credenciais MySQL só no `main` (produção: `safeStorage` + TLS + usuário privilégios mínimos)

12. **Formato único de resposta IPC:**  
    ```ts
    // Sucesso
    { ok: true, dados: T }
    // Erro
    { ok: false, erro: { codigo: "CPF_DUPLICADO", mensagem: "Já existe um cliente com este CPF." } }
    ```
    Sempre em português.

13. **Sincronização resiliente:**  
    Falha de internet/MySQL nunca bloqueia tela nem perde dados; pendência fica na `sync_outbox`.  
    Toda tabela sincronizável: `id` (UUID `crypto.randomUUID()`), `criado_em`, `atualizado_em`, `ativo`.

---

## 5. Convenções

| Item | Regra |
|---|---|
| **Domínio** | Português (`snake_case`, tabelas plural): `clientes`, `animais`, `colaboradores` |
| **Técnico** | Inglês: `id`, `handler`, `preload`, `service`, `repository` |
| **Canais IPC** | `<modulo>:<acao>` em português/minúsculas: `clientes:listar`, `clientes:obter`, `clientes:criar`, `clientes:atualizar`, `clientes:inativar` |
| **Paginação IPC** | Entrada: `{ pagina, tamanho, busca }` → Saída: `{ itens, total, pagina, tamanho }` |
| **Perfis (enum)** | `MASTER`, `VETERINARIO`, `ATENDENTE` |
| **Sessão** | Memória no `main`: `{ usuarioId, perfil, expiraEm }` (8h) |
| **Git** | Branch `feat/<etapa>-<descricao>`; commits `feat:`, `fix:`, `test:`, `chore:`; PR pequeno revisado; migrations nunca editadas pós-merge |
| **Validação pré-commit** | `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` |

---

## 6. Perfis e Permissões (Aplicadas no `main`)

| Recurso | MASTER | VETERINARIO | ATENDENTE |
|---|---|---|---|
| Colaboradores/usuários, config, backup, sync/conflitos, auditoria | ✔ | ✘ | ✘ |
| Financeiro e relatórios | ✔ | ✘ | só orçamentos |
| Clientes e animais | ✔ | leitura | ✔ |
| Agenda | toda | a própria | criar/editar |
| Consulta, diagnóstico, prontuário | ✔ | ✔ | sem diagnóstico detalhado |
| Medicamentos/estoque | ✔ | usar na consulta | leitura |
| Vacinas e lembretes | ✔ | aplicar | lembretes |
| Catálogo serviços/preços, template lembrete | ✔ | ✘ | ✘ |

---

## 7. Schema Inicial (Semana 1) — Tabelas de Sync

```sql
colaboradores: id, nome, cpf (único), cargo, crmv (nulo; obrigatório se veterinário), telefone, ativo, criado_em, atualizado_em
usuarios:      id, colaborador_id (FK única), login (único), senha_hash, perfil (enum), ativo, ultimo_login_em, criado_em, atualizado_em
clientes:      id, nome, cpf (único), telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf, ativo, criado_em, atualizado_em
animais:       id, cliente_id (FK), nome, especie, raca, sexo (M|F), data_nascimento, peso_kg (decimal 6,2), observacoes, ativo, criado_em, atualizado_em
medicamentos:  id, nome, principio_ativo, unidade, dias_alerta (default 3), consumo_inicial_diario (nulo), ativo, criado_em, atualizado_em
fornecedores:  id, nome, tipo (NACIONAL|IMPORTADO), contato, telefone, email, ativo, criado_em, atualizado_em

-- Somente no SQLite local:
sync_outbox:    id, tabela, registro_id, operacao (inserir|atualizar|inativar), dados (JSON), criado_em, tentativas, ultimo_erro, enviado_em
sync_estado:    chave, valor
sync_conflitos: id, tabela, registro_id, tipo, dados_local, dados_central, status (aberto|resolvido), criado_em, resolvido_por, resolvido_em
```

**Regras:** 1 cliente → N animais. 1 colaborador → 1 usuário. Idade do animal **calculada** a partir de `data_nascimento`.

---

## 8. Regras de Negócio-Chave (Resumo)

- **Alarme de estoque:** consumo médio diário = saídas últimos 30 dias ÷ 30. Dias restantes = saldo ÷ consumo médio. Alerta se dias ≤ `dias_alerta` (padrão 3). < 7 dias histórico → usa `consumo_inicial_diario`. Um alerta aberto por medicamento.
- **Vacina:** aviso 3 dias antes da próxima dose. WhatsApp semiautomático: botão pede ao `main` abrir `https://wa.me/55<DDD><NUMERO>?text=<mensagem>` e registra lembrete; offline mantém pendente.
- **Agenda:** local checa sobreposição por veterinário na transação (offline marca "não confirmado até sincronizar"); push MySQL usa transação + `SELECT ... FOR UPDATE` e envia conflitos para `sync_conflitos`.
- **Dólar:** cotação buscada pelo `main` na AwesomeAPI e salva com data/hora; offline/falha API → usa última cotação salva.
- **Orçamento:** itens (serviço/medicamento), qtd, valor unitário congelado, desconto, total (centavos no `main`), forma pagamento; PDF local com "Documento sem valor fiscal".

---

## 9. Identidade Visual

| Cor | Hex | Uso |
|---|---|---|
| Primária | `#2E7D32` | Verde principal |
| Verde claro | `#4E7A3A` | Hover/ativo |
| Marrom | `#6D4C41` | Secundária |
| Marrom claro | `#8D6E63` | Detalhes |
| Fundo | `#F7F3EC` | Creme |
| Texto | `#3B2F2A` | Escuro legível |

- CSS próprio com **design tokens** (`:root`)
- Fonte legível (16px base), botões grandes, ícones com texto
- Interface simples/rápida: **máx. 3 cliques para agendar**

---

## 10. Instruções Permanentes para IA

1. **Responda sempre em português do Brasil**; código consistente com este `AGENTS.md`.
2. **Faça só o que a tarefa pede** e **só nos arquivos permitidos**.
3. **Não invente** bibliotecas, canais IPC ou campos fora do contrato. Se faltar informação, **pergunte antes de supor**.
4. **Não instale dependências** sem listar nome, motivo e link npmjs.com e aguardar aprovação.
5. **Não altere migrations existentes**; crie nova (mantendo paridade SQLite/MySQL quando aplicável).
6. **Entregue código completo** dos arquivos alterados, testes Vitest e instruções de como testar.

---

## 11. Checklist de Qualidade (Antes de Entregar)

- [ ] TypeScript estrito passa (`pnpm -r typecheck`)
- [ ] Lint passa (`pnpm -r lint`)
- [ ] Testes passam (`pnpm -r test`)
- [ ] Contratos Zod em `/shared` criados/atualizados **antes** do código
- [ ] Handlers IPC usam `registrarHandler` com verificação de perfil
- [ ] Respostas IPC seguem formato `{ ok, dados }` / `{ ok, erro }`
- [ ] Dinheiro em centavos (inteiro), datas UTC no banco
- [ ] Exclusão lógica (`ativo = false`), sem `DELETE` físico
- [ ] Estoque calculado por movimentações (append-only)
- [ ] Transações locais (`BEGIN IMMEDIATE`) + `sync_outbox` atômico
- [ ] Segurança Electron: `contextIsolation`, `nodeIntegration: false`, `sandbox`
- [ ] `preload` expõe apenas `window.api` tipado
- [ ] Senhas: bcryptjs custo ≥ 10, nunca logadas/retornadas
- [ ] Integrações externas (CEP, dólar, WhatsApp) só no `main`

---

> **Este arquivo é a fonte única de verdade.**  
> Qualquer dúvida não coberta aqui → pergunte antes de assumir.