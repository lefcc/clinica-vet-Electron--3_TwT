# Prompts Prontos para Gabriel (Trilha 2)

> Copie e cole cada prompt no chat com a IA quando chegar na etapa correspondente.

---

## PROMPT 1 — Mocks + Validação das Telas (Passo 1)

```
Leia AGENTS.md, docs/FRONT.md, app/src/renderer/ts/lib/tipos.ts e as telas clientes.ts, animais.ts, agenda.ts e consultas.ts em app/src/renderer/ts/pages/. Crie app/src/renderer/ts/lib/mocks/trilha2.mock.ts exportando um mapa de handlers mockados em memória para todos os canais de clientes:*, animais:*, agendamentos:* e consultas:*, simulando paginação, cálculo de idade_texto, erro CPF_DUPLICADO, CLIENTE_POSSUI_ANIMAIS_ATIVOS, AGENDA_CONFLITO e omissão de diagnostico para ATENDENTE.
```

**Arquivo alvo**: `app/src/renderer/ts/lib/mocks/trilha2.mock.ts`

**O que validar manualmente após criar**:
- [ ] Tela de Clientes: listagem, busca, paginação, criar/editar, erro CPF duplicado
- [ ] Tela de Animais: listagem por cliente, criar/editar, cálculo de idade_texto ("3 anos e 2 meses")
- [ ] Tela de Agenda: listar agendamentos, criar com detecção de conflito (AGENDA_CONFLITO), filtrar por veterinário
- [ ] Tela de Consultas: listar, criar com prescrições, omitir diagnóstico para ATENDENTE

---

## PROMPT 2 — Backend de Clientes e Animais (Passo 2)

```
Leia AGENTS.md, docs/FRONT.md, app/src/main/db/local/client.ts e app/src/main/erros/erro-negocio.ts. Crie repository.ts, service.ts e testes Vitest em app/src/main/modules/clientes/ e app/src/main/modules/animais/. Use runInTransaction gravando na tabela e na sync_outbox atomicamente. Implemente busca case/accent-insensitive, cálculo de idade_texto, bloqueio de CPF_DUPLICADO e CLIENTE_POSSUI_ANIMAIS_ATIVOS.
```

**Arquivos alvo**:
- `app/src/main/modules/clientes/clientes.repository.ts`
- `app/src/main/modules/clientes/clientes.service.ts`
- `app/src/main/modules/clientes/clientes.test.ts`
- `app/src/main/modules/animais/animais.repository.ts`
- `app/src/main/modules/animais/animais.service.ts`
- `app/src/main/modules/animais/animais.test.ts`

**Regras de negócio a implementar**:
- [ ] `clientes:criar` → erro `CPF_DUPLICADO` se CPF já existe ativo
- [ ] `clientes:inativar` → erro `CLIENTE_POSSUI_ANIMAIS_ATIVOS` se houver animal ativo vinculado
- [ ] `animais:listar/obter` → retornar `idade_texto` calculado (ex: "3 anos e 2 meses") e `cliente_nome`
- [ ] `animais:listar_por_cliente` → filtrar por `cliente_id`
- [ ] Busca case/accent-insensitive (ex: "joão" encontra "João")
- [ ] Transação SQLite: `BEGIN IMMEDIATE` + gravação na tabela + `sync_outbox` atômico
- [ ] Exclusão lógica: `ativo = false` (nunca DELETE)

---

## PROMPT 3 — Backend de Agenda, Consultas e trilha2.ipc.ts (Passo 3)

```
Crie app/src/main/modules/agenda/ e app/src/main/modules/consultas/ com testes Vitest. Na agenda, valide sobreposição de horário por veterinário (AGENDA_CONFLITO) e marque confirmado: false ao criar offline. Nas consultas, omita diagnostico quando o perfil da sessão for ATENDENTE e faça a baixa transacional FEFO nos lotes de estoque para cada item em prescricoes (lançando ESTOQUE_INSUFICIENTE se a soma dos lotes não cobrir). Registre todos os canais em app/src/main/ipc/trilha2.ipc.ts usando registrarHandler.
```

**Arquivos alvo**:
- `app/src/main/modules/agenda/agenda.repository.ts`
- `app/src/main/modules/agenda/agenda.service.ts`
- `app/src/main/modules/agenda/agenda.test.ts`
- `app/src/main/modules/consultas/consultas.repository.ts`
- `app/src/main/modules/consultas/consultas.service.ts`
- `app/src/main/modules/consultas/consultas.test.ts`
- `app/src/main/ipc/trilha2.ipc.ts`

**Regras de negócio a implementar**:

### Agenda
- [ ] `agendamentos:criar` → validar sobreposição: mesmo `veterinario_id`, horário `[inicio, inicio + duracao_min)` não pode sobrepor outro agendamento ativo → erro `AGENDA_CONFLITO`
- [ ] `agendamentos:criar` offline → `confirmado: false` (sincronização posterior confirma)
- [ ] `agendamentos:listar` → se perfil `VETERINARIO`, filtrar apenas `veterinario_id` do usuário logado
- [ ] `agendamentos:veterinarios` → listar veterinários ativos (perfil VETERINARIO)

### Consultas
- [ ] `consultas:listar|obter` → se `sessao.perfil === 'ATENDENTE'`, omitir campo `diagnostico` (retornar `undefined`)
- [ ] `consultas:criar` → para cada item em `prescricoes[]`:
    - Baixar estoque por FEFO (lotes com vencimento mais próximo primeiro)
    - Mesma transação SQLite que grava a consulta + prescrições + movimentações_estoque + `sync_outbox`
    - Se soma dos lotes não cobrir quantidade → erro `ESTOQUE_INSUFICIENTE`
- [ ] `consultas:historico_animal` → listar consultas de um animal ordenadas por data decrescente

### trilha2.ipc.ts
- [ ] Registrar todos os canais usando `registrarHandler` de `app/src/main/ipc/registry.ts`
- [ ] Aplicar perfis corretos em cada handler (conforme tabela de permissões)

---

## Comandos de Verificação (rodar após cada passo)

```bash
# TypeCheck
pnpm -r typecheck

# Lint
pnpm -r lint

# Testes
pnpm -r test

# Testes em modo watch (durante desenvolvimento)
cd app && pnpm test:watch
```

---

## Estrutura de Pastas Esperada Após Conclusão

```
app/src/main/modules/
├── clientes/
│   ├── clientes.repository.ts
│   ├── clientes.service.ts
│   └── clientes.test.ts
├── animais/
│   ├── animais.repository.ts
│   ├── animais.service.ts
│   └── animais.test.ts
├── agenda/
│   ├── agenda.repository.ts
│   ├── agenda.service.ts
│   └── agenda.test.ts
├── consultas/
│   ├── consultas.repository.ts
│   ├── consultas.service.ts
│   └── consultas.test.ts
app/src/main/ipc/
└── trilha2.ipc.ts

app/src/renderer/ts/lib/mocks/
└── trilha2.mock.ts
```