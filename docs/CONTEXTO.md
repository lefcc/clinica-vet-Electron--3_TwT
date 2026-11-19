# CONTEXTO.md — Sistema Clínica Veterinária

> **Fonte única de verdade detalhada:** `AGENTS.md` na raiz do repositório.
> Cole este arquivo (ou garanta que sua IA leia o `AGENTS.md`) no início de **TODO** prompt. Se algo mudar, atualize primeiro o `AGENTS.md` e depois este resumo (via PR).

## 1. Produto
Sistema **desktop offline-first** para a clínica veterinária do Will. Substitui planilhas e caderno.
- **Funções:** clientes, animais, agenda, consultas/diagnóstico, histórico (prontuário), medicamentos, estoque com alarme, vacinas com lembrete por WhatsApp, fornecedores (nacional/importado, cotação do dólar), orçamento/demonstrativo em PDF (sem valor fiscal), colaboradores com perfis de acesso e auditoria.
- **Uso:** **5 computadores / 5 usuários**, funcionamento **100% offline** (banco local SQLite em cada PC) com **sincronização automática** para o **MySQL em nuvem** quando houver internet. Interface em **português do Brasil**.
- **Fora do escopo (fase 2):** WhatsApp com envio automático, nota fiscal/NF-e, servidor/API HTTP, app mobile, multiclínica.

## 2. Stack (FIXA: não trocar nem sugerir alternativas)

| Camada | Tecnologia |
|---|---|
| Gerenciador de pacotes | **pnpm** (workspaces) |
| Linguagem | **TypeScript estrito** (`strict: true`) no backend (`main`), `preload.ts` e `/shared`; front-end em **HTML + CSS + JS** |
| Compartilhado (`/shared`) | Pacote/pasta central com contratos de comunicação (**canais IPC**), **schemas Zod** e tipos/constantes reutilizados entre `main`, `preload` e `renderer` |
| Desktop | **Electron** — front-end, `/shared` e backend armazenados juntos na mesma pasta/estrutura do software |
| Front (`renderer`) | **HTML + CSS + JS** (sem React/Vue/Angular e pode usar Tailwind). CSS próprio com variáveis (design tokens), consumindo `window.api` e constantes de `/shared` |
| Backend (`main`) | API em TypeScript no processo `main` do Electron, exposta via **`ipcMain.handle`** usando os canais definidos em `/shared`. **Sem Fastify, sem HTTP, sem JWT** |
| Ponte (`preload`) | `preload.ts` com `contextBridge` + **`ipcRenderer.invoke`** (mapeando canais de `/shared`) expondo apenas `window.api` para o front chamar o backend |
| Banco local | **SQLite** (`better-sqlite3`, exige `electron-rebuild`), na pasta de dados do usuário |
| Banco central (sync) | **MySQL 8** já existente em nuvem (InnoDB, `utf8mb4`, TLS) via `mysql2`. Em dev local: container `mysql:8.4` |
| ORM/migrations | **Drizzle ORM + drizzle-kit** (NÃO usar Prisma): schemas SQLite e MySQL mantidos em paridade |
| Validação | **Zod** (schemas de entrada/saída e contratos de canais IPC centralizados em `/shared`) |
| Senhas | **bcryptjs** (custo ≥ 10; NÃO usar argon2) |
| Testes | **Vitest** |
| Jobs | **node-cron** (no `main`: alertas, sync, dólar, vacinas) |
| PDF | `printToPDF` do Electron (HTML → PDF) |
| Instalador | `electron-builder` + NSIS |
| Integrações | ViaCEP (CEP), AwesomeAPI USD-BRL (dólar), `wa.me` (WhatsApp) — todas chamadas pelo `main`, nunca pelo `renderer` |

**Regra de dependências:** não adicionar nenhum pacote sem antes listar **nome, motivo e link no npmjs.com** e aguardar confirmação do grupo.

## 3. Estrutura do monorepo
```
/clinica-vet
  package.json, pnpm-workspace.yaml, tsconfig.base.json
  docker-compose.yml (só MySQL de DEV local), .env.example, .gitignore
  AGENTS.md

  /shared
    /src                         schemas Zod + tipos + canais IPC (1 arquivo por entidade + index.ts)

  /app
    /src
      /renderer                  Front-end (HTML + CSS + TS puro)
        index.html
        /pages                   telas HTML (ou views modulares)
        /css                     design tokens (variáveis), estilos globais e por tela
        /ts
          /pages                 scripts de cada tela
          /components/ui         componentes visuais reutilizáveis
          /lib                   api.ts (wrapper do window.api), cep.ts, validadores

      /main                      Processo principal do Electron + Backend
        main.ts                  cria janela, registra handlers IPC, inicia jobs e sync
        preload.ts               contextBridge + ipcRenderer.invoke (expõe window.api)
        /ipc                     registry (registrarHandler) + <modulo>.ipc.ts
        /modules
          /<modulo>              repository.ts, service.ts, <modulo>.test.ts
        /db
          /local                 client.ts, schema.ts, migrations/ (SQLite)
          /central               client.ts, schema.ts, migrations/ (MySQL)
        /sync                    outbox, push, pull, conflitos, estado
        /auth                    sessão em memória, controle de perfis
        /jobs                    alertas, vacinas, dólar, sync (node-cron)
        /config                  env.ts

  /docs                          CONTEXTO.md, ESTADO.md, prompts, manual, metodologia.html

```
Módulos do backend (`main`): `auth`, `colaboradores`, `clientes`, `animais`, `medicamentos`, `fornecedores`, `agenda`, `consultas`, `estoque`, `alertas`, `vacinas`, `atendimentos`, `dolar`, `auditoria`, `sync`.

## 4. Arquitetura e regras invioláveis
1. **Fluxo offline-first:** `Renderer → preload (window.api) → IPC → main → SQLite local → (sync em background) → MySQL em nuvem`. O `renderer` **NUNCA** acessa Node, banco, arquivos ou rede.
2. **Toda regra de negócio fica no `main`** (estoque, conflito de agenda, cálculos, permissões). O `renderer` só exibe, aplica máscaras, valida formulário e notifica.
3. **Autorização por perfil em todo handler IPC no `main`** (`registrarHandler` com `perfis`). Esconder menu no front não é segurança.
4. **Camadas por módulo:** `ipc (handler) → service → repository`. Handlers só validam (Zod), checam sessão/perfil e chamam o `service`. SQL/Drizzle **só** no `repository`.
5. **Contrato Zod em `/shared` ANTES do código** (schemas de entrada, saída e nome do canal IPC).
6. **Dinheiro em centavos (inteiro).** Nunca `float`. Datas em **UTC** no banco, exibidas em `America/Sao_Paulo`.
7. **Exclusão lógica (`ativo = false`)** em cadastros com histórico. Proibido `DELETE` físico em clientes, animais, consultas e demais tabelas sincronizáveis.
8. **Saldo de estoque = soma das movimentações** (append-only). Nunca campo editável.
9. **Concorrência e transações:** local com transação SQLite (`BEGIN IMMEDIATE`) gravando dado + `sync_outbox` juntos; central (sync) com transação MySQL + `SELECT ... FOR UPDATE`.
10. **Segurança Electron:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; `preload` expõe apenas funções nomeadas (nunca `ipcRenderer` inteiro); `shell.openExternal` **só** para `https://wa.me/...`.
11. **Segredos e senhas:** nunca retornar `senha_hash` ao `renderer`. Nunca logar senha/credencial. Credenciais do MySQL só no `main` (protegidas via `safeStorage` em produção, TLS ativo, usuário com privilégios mínimos).
12. **Formato único de resposta IPC:** `{ ok: true, dados }` ou `{ ok: false, erro: { codigo: "CPF_DUPLICADO", mensagem: "Já existe um cliente com este CPF." } }`, sempre em português.
13. **Sincronização resiliente:** falha de internet ou do MySQL nunca bloqueia a tela nem perde dados; a pendência fica na `sync_outbox` para nova tentativa. Toda tabela sincronizável possui `id` (UUID gerado no PC com `crypto.randomUUID()`), `criado_em`, `atualizado_em` e `ativo`.

## 5. Convenções
- **Domínio em português (`snake_case`, tabelas no plural):** `clientes`, `animais`, `colaboradores`. **Termos técnicos em inglês:** `id`, `handler`, `preload`, `service`, `repository`.
- **Canais IPC:** `<modulo>:<acao>` em português e minúsculas (`clientes:listar`, `clientes:obter`, `clientes:criar`, `clientes:atualizar`, `clientes:inativar`).
- **Paginação IPC:** entrada `{ pagina, tamanho, busca }` → saída `{ itens, total, pagina, tamanho }`.
- **Perfis (enum):** `MASTER`, `VETERINARIO`, `ATENDENTE`. Sessão em memória no `main` (`{ usuarioId, perfil, expiraEm }`, 8h).
- **Git:** branch `feat/<etapa>-<descricao>`; commits `feat:`, `fix:`, `test:`, `chore:`; PR pequeno revisado por outro dev; migrations nunca editadas depois do merge.
- **Validação antes de commit:** `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test`.

## 6. Perfis e permissões (aplicadas no `main`)
| Recurso | MASTER | VETERINARIO | ATENDENTE |
|---|---|---|---|
| Colaboradores/usuários, configurações, backup, sync/conflitos, auditoria | ✔ | ✘ | ✘ |
| Financeiro e relatórios | ✔ | ✘ | só orçamentos |
| Clientes e animais | ✔ | leitura | ✔ |
| Agenda | toda | a própria | criar/editar |
| Consulta, diagnóstico, prontuário | ✔ | ✔ | sem diagnóstico detalhado (handler omite) |
| Medicamentos/estoque | ✔ | usar na consulta | leitura |
| Vacinas e lembretes | ✔ | aplicar | lembretes |
| Catálogo de serviços/preços, template de lembrete | ✔ | ✘ | ✘ |

## 7. Schema inicial (Semana 1) e tabelas de sync
```
colaboradores: id, nome, cpf (único), cargo, crmv (nulo; obrigatório se veterinário), telefone, ativo, criado_em, atualizado_em
usuarios:      id, colaborador_id (FK única), login (único), senha_hash, perfil (enum), ativo, ultimo_login_em, criado_em, atualizado_em
clientes:      id, nome, cpf (único), telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf, ativo, criado_em, atualizado_em
animais:       id, cliente_id (FK), nome, especie, raca, sexo (M | F), data_nascimento, peso_kg (decimal 6,2), observacoes, ativo, criado_em, atualizado_em
medicamentos:  id, nome, principio_ativo, unidade, dias_alerta (default 3), consumo_inicial_diario (nulo), ativo, criado_em, atualizado_em
fornecedores:  id, nome, tipo (NACIONAL | IMPORTADO), contato, telefone, email, ativo, criado_em, atualizado_em

-- Somente no SQLite local:
sync_outbox:    id, tabela, registro_id, operacao (inserir|atualizar|inativar), dados (JSON), criado_em, tentativas, ultimo_erro, enviado_em
sync_estado:    chave, valor
sync_conflitos: id, tabela, registro_id, tipo, dados_local, dados_central, status (aberto|resolvido), criado_em, resolvido_por, resolvido_em
```
Regras: 1 cliente → N animais. 1 colaborador → 1 usuário. Idade do animal é **calculada** a partir de `data_nascimento`.

## 8. Regras de negócio-chave (resumo)
- **Alarme de estoque:** consumo médio diário = saídas dos últimos 30 dias ÷ 30. Dias restantes = saldo ÷ consumo médio. Alerta se dias restantes ≤ `dias_alerta` (padrão 3). Menos de 7 dias de histórico → usa `consumo_inicial_diario`. Um alerta aberto por medicamento.
- **Vacina:** aviso 3 dias antes da próxima dose. WhatsApp semiautomático: botão pede ao `main` para abrir `https://wa.me/55<DDD><NUMERO>?text=<mensagem>` e registra lembrete enviado; offline mantém pendente.
- **Agenda:** local checa sobreposição por veterinário na transação (offline marca "não confirmado até sincronizar"); no push para o MySQL, usa transação + `SELECT ... FOR UPDATE` e envia conflitos para `sync_conflitos`.
- **Dólar:** cotação buscada pelo `main` na AwesomeAPI e salva no banco com data/hora; offline ou falha da API → usa a última cotação salva.
- **Orçamento:** itens (serviço/medicamento), quantidade, valor unitário congelado, desconto, total (em centavos no `main`), forma de pagamento; PDF local com "Documento sem valor fiscal".

## 9. Identidade visual
Verde `#2E7D32` (primária), verde claro `#4E7A3A`, marrom `#6D4C41`, marrom claro `#8D6E63`, fundo creme `#F7F3EC`, texto `#3B2F2A`. CSS próprio com design tokens (`:root`), fonte legível (16px), botões grandes, ícones com texto, interface simples e rápida (máx. 3 cliques para agendar).

## 10. Instruções permanentes para a IA
- Responda sempre em **português do Brasil**; código consistente com `AGENTS.md`.
- Faça **só** o que a tarefa pede e **só** nos arquivos permitidos.
- Não invente bibliotecas, canais IPC ou campos fora do contrato. Se faltar informação, **pergunte** antes de supor.
- Não instale dependências sem listar nome, motivo e link do npmjs.com e aguardar aprovação.
- Não altere migrations já existentes; crie uma nova (mantendo paridade SQLite/MySQL quando aplicável).
- Entregue o código completo dos arquivos alterados, testes Vitest e instruções de como testar.
