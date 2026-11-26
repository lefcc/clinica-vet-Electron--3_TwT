# Agente do Gabriel — Trilha 2: Núcleo Clínico

> **Desenvolvedor 2 (Gabriel)** — Responsável por: Clientes, Animais, Agendamentos, Consultas/Prontuário

---

## Visão Geral da Trilha

**Objetivo Único**: Gestão de Tutores, Pacientes, Agenda com detecção de conflito de horário e Prontuário/Consultas (com omissão de diagnóstico para ATENDENTE e baixa FEFO no estoque).

---

## Arquivos para Criar/Modificar

### Mocks no Front-end (100% isolado - Passo 1)
```
app/src/renderer/ts/lib/mocks/trilha2.mock.ts
```

### Front-end (apenas páginas da Trilha 2)
```
app/src/renderer/ts/pages/clientes/clientes.ts
app/src/renderer/ts/pages/animais/animais.ts
app/src/renderer/ts/pages/agenda/agenda.ts
app/src/renderer/ts/pages/consultas/consultas.ts
```

### Backend (app/src/main/)
```
app/src/main/modules/clientes/clientes.repository.ts
app/src/main/modules/clientes/clientes.service.ts
app/src/main/modules/clientes/clientes.test.ts
app/src/main/modules/animais/animais.repository.ts
app/src/main/modules/animais/animais.service.ts
app/src/main/modules/animais/animais.test.ts
app/src/main/modules/agenda/agenda.repository.ts
app/src/main/modules/agenda/agenda.service.ts
app/src/main/modules/agenda/agenda.test.ts
app/src/main/modules/consultas/consultas.repository.ts
app/src/main/modules/consultas/consultas.service.ts
app/src/main/modules/consultas/consultas.test.ts
app/src/main/ipc/trilha2.ipc.ts
```

---

## Contrato (Tipos e Canais que a Trilha 2 consome de /shared)

> **Importante**: A Trilha 1 deve entregar os schemas Zod em `shared/src/clientes-animais.ts` antes. Enquanto isso, use os tipos locais de `app/src/renderer/ts/lib/tipos.ts`.

### Tipos (definidos em tipos.ts / espelhados em shared/clientes-animais.ts)
- `Cliente`, `Animal`, `Agendamento`, `StatusAgendamento`, `Consulta`, `Prescricao`
- `Pagina<T>`, `EntradaListagem` (paginação)

### Canais IPC e Regras de Negócio

#### `clientes:listar|obter|criar|atualizar|inativar`
- **Erros**: `CPF_DUPLICADO`, `CLIENTE_POSSUI_ANIMAIS_ATIVOS` (não pode inativar se tiver animal ativo)

#### `animais:listar|obter|criar|atualizar|inativar|listar_por_cliente`
- Deve retornar `idade_texto` calculada a partir de `data_nascimento` (ex: "3 anos e 2 meses") e `cliente_nome`

#### `agendamentos:listar|criar|atualizar|cancelar|veterinarios`
- **Erro**: `AGENDA_CONFLITO` se houver sobreposição de horário (`inicio` + `duracao_min`) para o mesmo `veterinario_id`
- Se perfil for `VETERINARIO`, listar apenas a agenda dele
- Ao criar offline, marcar `confirmado: false`

#### `consultas:listar|obter|criar|historico_animal`
- Em `consultas:listar` e `consultas:obter`: se `sessao.perfil === 'ATENDENTE'`, omitir o campo `diagnostico` (undefined)
- Em `consultas:criar`: baixar estoque das `prescricoes[]` por ordem de vencimento do lote (FEFO) na mesma transação SQLite
- **Erro**: `ESTOQUE_INSUFICIENTE` se faltar saldo

---

## Passo a Passo para o Desenvolvedor 2 + IA

### Prompt 1 — Mocks + Validação das Telas (sem esperar a Trilha 1)
> "Leia AGENTS.md, docs/FRONT.md, app/src/renderer/ts/lib/tipos.ts e as telas clientes.ts, animais.ts, agenda.ts e consultas.ts em app/src/renderer/ts/pages/. Crie app/src/renderer/ts/lib/mocks/trilha2.mock.ts exportando um mapa de handlers mockados em memória para todos os canais de clientes:*, animais:*, agendamentos:* e consultas:*, simulando paginação, cálculo de idade_texto, erro CPF_DUPLICADO, CLIENTE_POSSUI_ANIMAIS_ATIVOS, AGENDA_CONFLITO e omissão de diagnostico para ATENDENTE."

### Prompt 2 — Backend de Clientes e Animais
> "Leia AGENTS.md, docs/FRONT.md, app/src/main/db/local/client.ts e app/src/main/erros/erro-negocio.ts. Crie repository.ts, service.ts e testes Vitest em app/src/main/modules/clientes/ e app/src/main/modules/animais/. Use runInTransaction gravando na tabela e na sync_outbox atomicamente. Implemente busca case/accent-insensitive, cálculo de idade_texto, bloqueio de CPF_DUPLICADO e CLIENTE_POSSUI_ANIMAIS_ATIVOS."

### Prompt 3 — Backend de Agenda, Consultas e trilha2.ipc.ts
> "Crie app/src/main/modules/agenda/ e app/src/main/modules/consultas/ com testes Vitest. Na agenda, valide sobreposição de horário por veterinário (AGENDA_CONFLITO) e marque confirmado: false ao criar offline. Nas consultas, omita diagnostico quando o perfil da sessão for ATENDENTE e faça a baixa transacional FEFO nos lotes de estoque para cada item em prescricoes (lançando ESTOQUE_INSUFICIENTE se a soma dos lotes não cobrir). Registre todos os canais em app/src/main/ipc/trilha2.ipc.ts usando registrarHandler."

---

## Regras de Arquitetura (AGENTS.md) — Resumo para a Trilha 2

1. **Fluxo offline-first**: Renderer → preload (window.api) → IPC → main → SQLite local → (sync background) → MySQL nuvem
2. **Regra de negócio só no `main`** — renderer só exibe, máscaras, valida formulário, notifica
3. **Autorização por perfil em TODO handler IPC** (`registrarHandler` com `perfis`)
4. **Camadas por módulo**: `ipc (handler) → service → repository` — SQL/Drizzle apenas no `repository`
5. **Dinheiro em centavos (inteiro)** — Nunca `float`. Datas em **UTC** no banco
6. **Exclusão lógica (`ativo = false`)** — Proibido `DELETE` físico
7. **Transações locais**: `BEGIN IMMEDIATE` gravando dado + `sync_outbox` juntos
8. **Formato resposta IPC**:
   ```ts
   // Sucesso
   { ok: true, dados: T }
   // Erro
   { ok: false, erro: { codigo: "CPF_DUPLICADO", mensagem: "Já existe um cliente com este CPF." } }
   ```

---

## Perfis e Permissões (Aplicadas no main)

| Recurso | MASTER | VETERINARIO | ATENDENTE |
|---|---|---|---|
| Clientes e animais | ✔ | leitura | ✔ |
| Agenda | toda | a própria | criar/editar |
| Consulta, diagnóstico, prontuário | ✔ | ✔ | sem diagnóstico detalhado |

---

## Checklist de Qualidade (Antes de Entregar)

- [ ] TypeScript estrito passa (`pnpm -r typecheck`)
- [ ] Lint passa (`pnpm -r lint`)
- [ ] Testes passam (`pnpm -r test`)
- [ ] Contratos Zod em `/shared` criados/atualizados **antes** do código
- [ ] Handlers IPC usam `registrarHandler` com verificação de perfil
- [ ] Respostas IPC seguem formato `{ ok, dados }` / `{ ok, erro }`
- [ ] Dinheiro em centavos (inteiro), datas UTC no banco
- [ ] Exclusão lógica (`ativo = false`), sem `DELETE` físico
- [ ] Transações locais (`BEGIN IMMEDIATE`) + `sync_outbox` atômico
- [ ] Segurança Electron: `contextIsolation`, `nodeIntegration: false`, `sandbox`
- [ ] `preload` expõe apenas `window.api` tipado
- [ ] Senhas: bcryptjs custo ≥ 10, nunca logadas/retornadas

---

## Integração Final (Quinta-feira)

1. Rode `pnpm -r typecheck`, `pnpm -r lint` e `pnpm -r test` na sua branch
2. Merge na ordem: Trilha 1 → Trilha 2 → Trilha 3 → Trilha 4
3. Em `app/src/main/main.ts`, dentro de `prepararBanco()`, adicionar:
   ```ts
   registrarTrilha2Ipc(conexao);
   ```

---

## Referências Rápidas

- **AGENTS.md**: `../../../AGENTS.md` (raiz do projeto)
- **docs/FRONT.md**: `../../../docs/FRONT.md`
- **Tipos locais**: `../../../app/src/renderer/ts/lib/tipos.ts`
- **Shared (quando Trilha 1 entregar)**: `../../../shared/src/clientes-animais.ts`
- **DB Local Client**: `../../../app/src/main/db/local/client.ts`
- **Erros de negócio**: `../../../app/src/main/erros/erro-negocio.ts`
- **Registry IPC**: `../../../app/src/main/ipc/registry.ts`