# Prompts da Semana 1 (Arquitetura Offline-First: Electron + IPC + SQLite + HTML/CSS/TS)

**Como usar:** em cada prompt, garanta que a IA leu o `AGENTS.md` (ou cole o `docs/CONTEXTO.md` completo no início). Onde aparecer `[COLAR ...]`, cole o conteúdo atual do projeto. Rode **um prompt por vez**, valide, faça commit e só então siga para o próximo.

**Validação padrão após cada prompt:** `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test`, e o teste manual descrito em "Pronto quando".

**Regra de pacotes:** lembre a IA de **listar nome, motivo e link do npmjs.com** e aguardar sua confirmação antes de instalar qualquer dependência.

**Se a IA errar:** `git restore .` (ou `git revert`), refine o prompt (mais restrição, menos escopo) e refaça. Não conserte com cadeia de remendos.

---

## DEV A — Plataforma, IPC, SQLite e Autenticação

### A1. Monorepo (dia 1)
```
[COLAR CONTEXTO.md]
TAREFA: Criar a estrutura inicial do monorepo pnpm com os pacotes shared e app, mais docker-compose.yml apenas com MySQL 8.4 para desenvolvimento local do sync futuro.
FAZER: pnpm-workspace.yaml, package.json raiz com scripts typecheck/lint/test (-r), tsconfig.base.json (strict: true), ESLint + Prettier compartilhados, package.json e tsconfig de /shared e /app (apenas esqueleto), docker-compose.yml (mysql:8.4 com utf8mb4, porta 3306 só em 127.0.0.1 e volume nomeado), .gitignore, .env.example.
ARQUIVOS PERMITIDOS: package.json, pnpm-workspace.yaml, tsconfig.base.json, eslint.config.*, .prettierrc*, .gitignore, .env.example, docker-compose.yml, shared/package.json, shared/tsconfig.json, shared/src/index.ts, app/package.json, app/tsconfig.json.
NÃO FAZER: não criar código de negócio, não usar React/Tailwind/Fastify, não instalar pacotes sem listar e pedir confirmação antes (apenas typescript, eslint, prettier, vitest).
SAÍDA: lista de dependências propostas para aprovação, arquivos completos e comandos para validar.
```
Pronto quando: `pnpm install` e `pnpm -r typecheck` passam sem erros.

### A2. Contratos base e canais IPC em `/shared` (dia 1, antes dos outros devs)
```
[COLAR CONTEXTO.md]
TAREFA: Criar em /shared/src os schemas Zod, tipos e mapa base de canais IPC para: Perfil (enum MASTER | VETERINARIO | ATENDENTE), RespostaIpc ({ ok: true, dados } | { ok: false, erro: { codigo, mensagem } }), Paginacao (entrada { pagina, tamanho, busca } e saída { itens, total, pagina, tamanho }), Login/Sessao (entrada e saída sem senha_hash), Colaborador e Usuario (sem senha_hash).
REGRAS: nomes conforme AGENTS.md; exportar tipos com z.infer; um arquivo por entidade + ipc.ts + index.ts; TypeScript estrito sem any.
ARQUIVOS PERMITIDOS: shared/src/*.ts.
NÃO FAZER: não mexer em /app, não instalar dependências além de zod (pedir confirmação antes).
```
Pronto quando: `/app` consegue importar `@clinica/shared` e os testes de schema passam. **Avise B, C e D imediatamente.**

### A3. Electron seguro + `preload.ts` + `registrarHandler` IPC (dias 1-2)
```
[COLAR CONTEXTO.md] [COLAR shared/src/ipc.ts]
TAREFA: Criar a base do Electron em /app com Vite (HTML + CSS + TS puro no renderer, sem React), preload seguro e registry de handlers IPC no main.
FAZER:
- app/src/main/main.ts: BrowserWindow com contextIsolation: true, nodeIntegration: false, sandbox: true; bloqueio de navegação externa; helper openWhatsApp validando prefixo https://wa.me/.
- app/src/main/backend/ipc/registry.ts: função registrarHandler(canal, { perfis?, entrada, saida }, fn) que valida entrada com Zod, checa sessão/perfil em memória (quando exigido), executa fn e retorna sempre { ok: true, dados } ou { ok: false, erro: { codigo, mensagem } }, permitindo também chamar o handler direto nos testes Vitest sem ipcMain.
- app/src/preload/preload.ts: contextBridge expondo window.api com canal de teste sistema:ping e utilitário whatsapp:abrir.
- app/src/renderer/index.html + ts/main.ts + ts/lib/api.ts: tela inicial em HTML/CSS/TS puro exibindo resposta do sistema:ping.
ARQUIVOS PERMITIDOS: app/package.json, app/vite.config.*, app/src/main/**, app/src/preload/preload.ts, app/src/renderer/**.
DEPENDÊNCIAS: liste nome, motivo e link npm antes de instalar (electron, vite, vite-plugin-electron ou equivalente).
TESTES: Vitest testando registrarHandler (entrada inválida, sem sessão -> NAO_AUTENTICADO, perfil negado -> ACESSO_NEGADO, sucesso).
```
Pronto quando: a janela abre offline, exibe o ping vindo do `main` via `preload.ts`, `window.api` só expõe funções nomeadas e os testes passam. **Avise B, C e D.**

### A4. SQLite local + Drizzle + migrations iniciais + outbox (dia 2)
```
[COLAR CONTEXTO.md, seção 7]
TAREFA: Configurar o banco SQLite local (better-sqlite3 + Drizzle) em app/src/main/backend/db/local/ e criar o schema + primeira migration para colaboradores, usuarios, clientes, animais e as 3 tabelas locais de sincronização (sync_outbox, sync_estado, sync_conflitos).
REGRAS: WAL ativado, PRAGMA foreign_keys = ON, helper de transação BEGIN IMMEDIATE que grava entidade + registro em sync_outbox na mesma transação; UUID TEXT gerado com crypto.randomUUID(); datas ISO-8601 UTC; CPF e login únicos; arquivo do banco na pasta userData do Electron (e :memory: nos testes).
ARQUIVOS PERMITIDOS: app/src/main/backend/db/local/**, app/drizzle.local.config.ts, app/package.json (scripts db:generate:local, db:migrate:local e rebuild do better-sqlite3).
NÃO FAZER: não criar medicamentos/fornecedores (é do Dev C), não conectar no MySQL ainda (Semana 2).
DEPENDÊNCIAS: listar e pedir confirmação antes (better-sqlite3, @types/better-sqlite3, drizzle-orm, drizzle-kit, @electron/rebuild).
TESTES: teste em SQLite :memory: aplicando migrations e validando gravação atômica com sync_outbox.
```
Pronto quando: migrations rodam em `:memory:` e no arquivo local criando as 7 tabelas.

### A5. Seed MASTER e módulo `auth` com sessão em memória (dia 3)
```
[COLAR CONTEXTO.md, seções 4 e 6] [COLAR schema de usuarios/colaboradores] [COLAR contratos de Login/Sessao em /shared]
TAREFA: Criar o módulo auth no main (auth:login, auth:sessao, auth:sair) usando sessão em memória (expira em 8h) e bcryptjs, além do seed inicial do usuário MASTER.
REGRAS: funciona 100% offline consultando o SQLite local; mensagem genérica "Usuário ou senha inválidos" em qualquer falha; usuário inativo não entra; nunca retornar senha_hash; seed lê variáveis de ambiente em config/env.ts (validadas com Zod) para criar o primeiro MASTER se não existir nenhum.
ARQUIVOS PERMITIDOS: app/src/main/backend/config/env.ts, app/src/main/backend/auth/**, app/src/main/backend/modules/auth/**, app/src/main/backend/ipc/auth.ipc.ts, app/src/preload/preload.ts, app/src/main/main.ts.
DEPENDÊNCIAS: listar e pedir confirmação antes (bcryptjs, @types/bcryptjs, dotenv).
TESTES: login ok, senha errada, usuário inativo, sessão expirada, auth:sessao sem login = NAO_AUTENTICADO.
```
Pronto quando: os testes cobrem todos os cenários offline sem expor `senha_hash`.

### A6. Tela de login e guarda de sessão no `renderer` (dia 4)
```
[COLAR CONTEXTO.md] [COLAR contratos de Login/Sessao] [COLAR preload.ts]
TAREFA: Criar em app/src/renderer (HTML + CSS + TS puro) a tela de login, o estado de sessão do front e o redirecionamento automático quando receber NAO_AUTENTICADO.
REGRAS: usar tokens CSS e componentes de renderer/ts/components/ui do Dev D (se já disponíveis; senão estrutura semântica limpa compatível); exibir nome e perfil logado no topo e botão Sair.
ARQUIVOS PERMITIDOS: app/src/renderer/ts/lib/api.ts, app/src/renderer/ts/pages/login/**, app/src/renderer/ts/main.ts, app/src/renderer/css/**.
```
Pronto quando: abrir o app sem internet → logar com MASTER → ver nome e perfil → sair.

### A7. CRUD de colaboradores — backend + tela (dia 5, em 2 prompts separados)
```
[COLAR CONTEXTO.md] [COLAR schemas /shared de Colaborador e Usuario]
TAREFA (Prompt 1 - Backend): Módulo colaboradores no main (colaboradores:listar, obter, criar, atualizar, inativar, redefinir_senha), permitido somente ao perfil MASTER.
REGRAS: criar colaborador + usuário + sync_outbox na mesma transação SQLite; CRMV obrigatório para VETERINARIO; login e CPF únicos; proibido desativar ou rebaixar o último MASTER ativo; senha mínima de 8 caracteres com bcryptjs.
ARQUIVOS PERMITIDOS: shared/src/colaborador.ts (se faltar canal), app/src/main/backend/modules/colaboradores/**, app/src/main/backend/ipc/colaboradores.ipc.ts, app/src/preload/preload.ts, app/src/main/main.ts.
TESTES: criação ok + outbox gerada, login duplicado, CRMV faltando para veterinário, proteção do último MASTER, VETERINARIO e ATENDENTE recebem ACESSO_NEGADO.
```
Depois, rodar um segundo prompt apenas para `app/src/renderer/ts/pages/colaboradores/**` usando os componentes de UI do Dev D.

---

## DEV B — Clientes e Animais

### B1. Contratos Zod e canais IPC (dias 1-2)
```
[COLAR CONTEXTO.md, seções 4, 5 e 7]
TAREFA: Criar em /shared/src os schemas Zod e definições de canais IPC de Cliente e Animal (criar, atualizar, listar paginado, obter, inativar).
REGRAS: CPF validado pelos dígitos verificadores; telefone normalizado só com dígitos (10 ou 11); e-mail opcional; UF com 2 letras; sexo enum M | F; peso_kg positivo; data_nascimento não futura; especie obrigatória; resposta de Animal inclui idade calculada (anos e meses).
ARQUIVOS PERMITIDOS: shared/src/cliente.ts, shared/src/animal.ts, shared/src/ipc.ts, shared/src/index.ts.
```
Mostre o contrato ao Dev D (CEP) e ao Dev A antes de seguir.

### B2. Backend IPC de clientes (dias 2-3)
```
[COLAR CONTEXTO.md] [COLAR schema SQLite de clientes] [COLAR contrato de Cliente]
TAREFA: Implementar módulo clientes no main (repository, service, clientes.ipc.ts) com clientes:listar (busca por nome/CPF/telefone sem diferenciar caixa/acento, paginação), clientes:obter, clientes:criar, clientes:atualizar e clientes:inativar (exclusão lógica).
PERMISSÕES: MASTER e ATENDENTE criam/atualizam/inativam; VETERINARIO apenas lê (listar/obter).
REGRAS: toda escrita grava no SQLite + sync_outbox na mesma transação; CPF duplicado -> erro CPF_DUPLICADO; cliente com animais ativos não pode ser inativado (retornar CLIENTE_POSSUI_ANIMAIS_ATIVOS).
ARQUIVOS PERMITIDOS: app/src/main/backend/modules/clientes/**, app/src/main/backend/ipc/clientes.ipc.ts, registro mínimo em main.ts e preload.ts.
TESTES: criar (+ verificar outbox), CPF duplicado, busca paginada, bloqueio de inativação com animal ativo, teste dos 3 perfis + sem sessão.
```

### B3. Backend IPC de animais (dias 3-4)
```
[COLAR CONTEXTO.md] [COLAR schema SQLite de animais] [COLAR contrato de Animal]
TAREFA: Implementar módulo animais no main: animais:listar_por_cliente, animais:listar, animais:obter, animais:criar, animais:atualizar, animais:inativar (exclusão lógica).
REGRAS: animal sempre vinculado a um cliente ativo; service calcula idade (anos e meses) a partir de data_nascimento; escrita atômica com sync_outbox; permissões iguais às de clientes.
ARQUIVOS PERMITIDOS: app/src/main/backend/modules/animais/**, app/src/main/backend/ipc/animais.ipc.ts, registro mínimo em main.ts e preload.ts.
TESTES: cliente com 3 animais, cliente inativo/inexistente recusado, cálculo exato de idade, permissões nos 3 perfis.
```

### B4. Telas em HTML/CSS/TS puro (dias 4-5, um prompt por tela)
```
[COLAR CONTEXTO.md] [COLAR contratos de Cliente] [COLAR renderer/ts/lib/api.ts] [COLAR lista de componentes em renderer/ts/components/ui]
TAREFA: Criar a página de listagem de clientes em HTML/CSS/TS puro com busca (debounce 300ms), paginação, estados de carregando/vazio/erro e ações Novo, Editar e Inativar (com ConfirmDialog). Esconder botões de escrita se perfil for VETERINARIO.
USAR: apenas componentes do design system do Dev D em renderer/ts/components/ui.
ARQUIVOS PERMITIDOS: app/src/renderer/ts/pages/clientes/**.
```
Repetir em prompts separados: formulário de cliente (integrando o componente de CEP do Dev D) → detalhe do cliente listando seus animais → formulário de animal.

---

## DEV C — Medicamentos e Fornecedores

### C1. Contratos Zod e canais IPC (dia 1)
```
[COLAR CONTEXTO.md, seções 4, 5, 7 e 8]
TAREFA: Criar em /shared/src os schemas Zod e canais IPC de Medicamento e Fornecedor (listar, obter, criar, atualizar, inativar).
REGRAS: dias_alerta inteiro de 1 a 60 (padrão 3); consumo_inicial_diario opcional e >= 0; tipo do fornecedor enum NACIONAL | IMPORTADO; telefone só dígitos (10 ou 11).
ARQUIVOS PERMITIDOS: shared/src/medicamento.ts, shared/src/fornecedor.ts, shared/src/ipc.ts, shared/src/index.ts.
```

### C2. Schema SQLite e nova migration (dia 2, após A4)
```
[COLAR CONTEXTO.md, seção 7] [COLAR schemas Drizzle SQLite existentes]
TAREFA: Criar os schemas Drizzle SQLite de medicamentos e fornecedores em app/src/main/backend/db/local/schema/ e gerar UMA nova migration (sem editar a migration inicial do Dev A).
ARQUIVOS PERMITIDOS: app/src/main/backend/db/local/schema/medicamentos.ts, fornecedores.ts, index.ts, nova migration em migrations/.
```
Avise o Dev A antes do merge para manter a ordem das migrations.

### C3. Backend IPC de medicamentos (dias 2-3)
```
[COLAR CONTEXTO.md] [COLAR schema de medicamentos] [COLAR contrato de Medicamento]
TAREFA: Módulo medicamentos no main: medicamentos:listar (busca por nome/princípio ativo, paginação), obter, criar, atualizar, inativar (exclusão lógica + sync_outbox na mesma transação).
PERMISSÕES: MASTER escreve; VETERINARIO e ATENDENTE apenas leem.
REGRAS: nome + unidade únicos entre registros ativos (retornar MEDICAMENTO_DUPLICADO).
ARQUIVOS PERMITIDOS: app/src/main/backend/modules/medicamentos/**, app/src/main/backend/ipc/medicamentos.ipc.ts, registro mínimo em main.ts e preload.ts.
TESTES: criar (+ outbox), duplicado entre ativos, recriar após inativado, teste dos 3 perfis + sem sessão.
```

### C4. Backend IPC de fornecedores (dia 3)
Mesmo formato do C3 para `fornecedores` (incluindo filtro por `tipo`: `NACIONAL | IMPORTADO` e gravação na `sync_outbox`).

### C5. Telas em HTML/CSS/TS puro (dias 4-5, um prompt por módulo)
```
[COLAR CONTEXTO.md] [COLAR contrato de Medicamento] [COLAR renderer/ts/lib/api.ts] [COLAR componentes do design system]
TAREFA: Criar página de listagem e modal/formulário de medicamentos em HTML/CSS/TS puro (busca, paginação, criar, editar, inativar com ConfirmDialog). No campo "Consumo inicial diário", exibir a dica: "Usado apenas até o sistema acumular 7 dias de saídas reais".
ARQUIVOS PERMITIDOS: app/src/renderer/ts/pages/medicamentos/**.
```
Repetir em prompt separado para `fornecedores`.

---

## DEV D — Design System (CSS/TS Puro), Layout e CEP

### D1. Tokens CSS e tema visual (dia 1)
```
[COLAR CONTEXTO.md, seção 9]
TAREFA: Criar a folha de estilos base e os design tokens CSS (:root) em app/src/renderer/css/ com a paleta oficial da clínica (verde #2E7D32, verde claro #4E7A3A, marrom #6D4C41, marrom claro #8D6E63, fundo creme #F7F3EC, texto #3B2F2A, estados de erro/sucesso/alerta), tipografia legível (base 16px), espaçamentos, foco visível e raios arredondados.
NÃO FAZER: não usar Tailwind, Bootstrap, React ou qualquer framework CSS/JS; não criar páginas de negócio.
ARQUIVOS PERMITIDOS: app/src/renderer/css/tokens.css, reset.css, base.css, index.css.
```

### D2. Componentes base em TS/DOM puro (dias 1-2)
```
[COLAR CONTEXTO.md] [COLAR tokens.css]
TAREFA: Criar os componentes reutilizáveis em TypeScript puro (funções/classes DOM tipadas, sem framework) em app/src/renderer/ts/components/ui/: Button (primary/secondary/danger, botões grandes com suporte a ícone+texto), Input (com máscara opcional), Select, Textarea, Field (label + mensagem de erro), Table (cabeçalho fixo e paginação), Modal, ConfirmDialog, Toast, EmptyState e Spinner.
REGRAS: acessíveis por teclado (Tab, Esc fecha modal, Enter confirma), foco visível, textos em português, zero innerHTML inseguro (prevenir XSS usando textContent/createElement).
ENTREGAR: também uma rota/tela de catálogo (#/dev/componentes) exibindo todos os componentes funcionando.
ARQUIVOS PERMITIDOS: app/src/renderer/ts/components/ui/**, app/src/renderer/css/components.css, app/src/renderer/ts/pages/dev-componentes/**.
```
Publique cedo: B, C e A dependem desses componentes.

### D3. Layout shell e navegação por perfil (dias 2-3)
```
[COLAR CONTEXTO.md, seção 6] [COLAR componentes de UI]
TAREFA: Criar o layout principal (sidebar + barra superior com nome do usuário, perfil, placeholder do indicador de sincronização "Offline / Sincronizado" e botão Sair) e o roteador SPA simples em TS puro (hash router). Definir os itens do menu em UM único arquivo de configuração com a lista de perfis permitidos por rota. Criar páginas vazias para: Início, Clientes, Animais, Agenda, Consultas, Medicamentos, Estoque, Fornecedores, Vacinas, Orçamentos, Relatórios, Colaboradores.
REGRAS: item sem permissão não aparece no menu; tentar navegar para rota sem permissão renderiza "Acesso não permitido".
ARQUIVOS PERMITIDOS: app/src/renderer/ts/layout/**, app/src/renderer/ts/router/**, app/src/renderer/css/layout.css.
TESTES: teste unitário Vitest validando a filtragem de rotas/menus para MASTER, VETERINARIO e ATENDENTE.
```

### D4. Serviço de CEP via IPC no `main` (dia 3)
```
[COLAR CONTEXTO.md]
TAREFA: Criar a busca de CEP executando no processo main (nunca direto no renderer) via canal IPC cep:buscar -> https://viacep.com.br/ws/{cep}/json/.
REGRAS: aceitar CEP com ou sem máscara; validar 8 dígitos; timeout de 5 s (AbortController); tratar { erro: true } e falha de rede/offline retornando códigos padronizados CEP_INVALIDO, CEP_NAO_ENCONTRADO ou SEM_CONEXAO sem travar o sistema; retornar { cep, logradouro, bairro, cidade, uf }. Expor em preload.ts (window.api.cep.buscar) e wrapper em renderer/ts/lib/cep.ts.
ARQUIVOS PERMITIDOS: shared/src/cep.ts, shared/src/ipc.ts, shared/src/index.ts, app/src/main/backend/modules/cep/**, app/src/main/backend/ipc/cep.ipc.ts, app/src/preload/preload.ts, app/src/renderer/ts/lib/cep.ts.
TESTES: Vitest com fetch mockado cobrindo sucesso, CEP inválido, CEP inexistente e sem internet/timeout.
```

### D5. Componente `CepInput` (dias 4-5)
```
[COLAR CONTEXTO.md] [COLAR renderer/ts/lib/cep.ts] [COLAR Input/Field de components/ui]
TAREFA: Criar o componente CepInput em TS puro com máscara 00000-000, busca automática ao completar 8 dígitos, indicador de carregamento e callback onResolve(endereco). Em caso de erro ou computador offline, exibir aviso amigável ("Sem internet — preencha o endereço manualmente") e manter logradouro, bairro, cidade e UF totalmente editáveis.
ARQUIVOS PERMITIDOS: app/src/renderer/ts/components/ui/cep-input.ts (+ integração combinada com o Dev B no formulário de cliente).
```
Pronto quando: com internet, digitar o CEP preenche rua, bairro, cidade e UF; com o Wi-Fi desligado, o usuário digita manualmente sem travar.

---

## Checklist de fim da Semana 1 (todos)
- [ ] `main` integrada, sem erros em `pnpm -r typecheck`, `pnpm -r lint` e `pnpm -r test`
- [ ] App abre e opera **100% offline** (testado com rede desconectada)
- [ ] Login funciona para `MASTER`, `VETERINARIO` e `ATENDENTE` exibindo menus distintos e bloqueando handlers indevidos no `main`
- [ ] Cadastros de clientes (com CEP + fallback offline), animais, medicamentos, fornecedores e colaboradores gravando no SQLite local e gerando pendências na `sync_outbox`
- [ ] Container MySQL 8.4 de dev testado localmente para iniciar o Sync na Semana 2 (Dev A)
- [ ] `AGENTS.md`, `docs/CONTEXTO.md` e `docs/ESTADO.md` atualizados com o que foi entregue
