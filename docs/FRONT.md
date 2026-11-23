# FRONT.md — o que o front-end faz e o que o back-end precisa entregar

Sem o back-end conectado, qualquer chamada devolve o erro `SEM_BACKEND` e as telas mostram a mensagem de erro (é o comportamento esperado até o back-end existir).

## 1. Regras gerais

- **Formato de resposta de todo canal:** `{ ok: true, dados }` ou `{ ok: false, erro: { codigo, mensagem } }`. Mensagens em português, legíveis para o usuário final.
- **Campos em `snake_case`** (`data_nascimento`, `peso_kg`...), como no `CONTEXTO.md`.
- **Dinheiro em centavos (inteiro)**. O front formata para "R$ 12,50".
- **Datas e horas em ISO UTC** (`2026-11-20T12:00:00.000Z`); o front mostra sempre no horário de São Paulo (`America/Sao_Paulo`), não importa o fuso do computador, e converte o que o usuário digita (horário de São Paulo) para UTC antes de enviar. **Datas puras** (`data_nascimento`, `validade`, `proxima_dose`) vão como `yyyy-mm-dd`.
- **CPF, telefone e CEP chegam só com dígitos** (o front tira as máscaras antes de enviar).
- **Listagens:** entrada `{ pagina, tamanho, busca?, ...filtros }`, saída `{ itens, total, pagina, tamanho }`. O front pede 10 por página (e até 200 nas listas de seleção).
- **Exclusão lógica:** "inativar" nunca apaga; o registro some das listagens (`ativo = false`).
- **Sessão expirada:** se qualquer canal (menos `auth:*`) devolver `NAO_AUTENTICADO` ou `SESSAO_EXPIRADA`, o front volta sozinho para o login.
- **Perfis:** `MASTER`, `VETERINARIO`, `ATENDENTE`. O front só esconde menus e botões; **toda permissão precisa ser validada no back-end** em cada canal.

## 2. Telas, o que cada uma precisa do back-end

| Tela (rota) | MASTER | VETERINARIO | ATENDENTE |
|---|---|---|---|
| Login | — | — | — |
| Início (`#/inicio`) | sim | sim | sim |
| Agenda (`#/agenda`) | criar/editar/cancelar | só leitura, só a própria | criar/editar/cancelar |
| Consultas (`#/consultas`) | criar e ver | criar e ver | só ver, sem diagnóstico |
| Vacinas (`#/vacinas`) | tudo | aplicar e ver | ver fila e enviar lembrete |
| Clientes (`#/clientes`, `#/clientes/:id`) | tudo | só leitura | tudo |
| Animais (`#/animais`) | tudo | só leitura | tudo |
| Fornecedores (`#/fornecedores`): cadastro e comparativo de preços | tudo | não vê | não vê |
| Colaboradores (`#/colaboradores`) | tudo | não vê | não vê |
| Medicamentos (`#/medicamentos`) | tudo | leitura | leitura |
| Estoque (`#/estoque`) | movimentar | leitura | leitura |
| Orçamentos (`#/orcamentos`) | tudo | não vê | criar e ver |
| Relatórios (`#/relatorios`) | tudo | não vê | não vê |
| Conflitos de sincronização (`#/conflitos`) | tudo | não vê | não vê |
| Auditoria (`#/auditoria`) | só leitura | não vê | não vê |
| Configurações e backup (`#/configuracoes`) | tudo | não vê | não vê |

Fornecedores e Relatórios estão só para o MASTER por suposição (o `CONTEXTO.md` não detalha): confirmar com o grupo. Auditoria e Configurações/backup são do MASTER conforme a tabela do `AGENTS.md`. A fonte única dessa tabela no front é `ts/layout/menu.config.ts`.

### Login
O usuário digita login e senha. Canal `auth:login`. Tem que funcionar **offline** (confere no SQLite local). Em qualquer falha devolver a mesma mensagem: **"Usuário ou senha inválidos."** (sem dizer qual errou). Usuário inativo não entra. Nunca devolver `senha_hash`.

**Já implementado (login de exemplo):** `auth:login`, `auth:sessao` e `auth:sair` existem em `app/src/main/modules/auth` e conferem no SQLite local. Ao abrir o app (só em desenvolvimento), `db/local/seed-usuario-exemplo.ts` cria um usuário MASTER de exemplo; o login e a senha estão nesse arquivo, ou podem ser trocados pelas variáveis `SEED_MASTER_*` do `.env` (veja `.env.example`). Dependência nova: `dotenv`, para ler o `.env`.

### Barra superior e menu (em todas as telas)
- Etiqueta de sincronização: `sync:estado`. Mostra "Sincronizado", "N pendentes de envio", "Sincronização com problema" ou "Offline" (offline vem do navegador, não do back-end). Atualiza a cada 20 s.
- Sino de alertas: `alertas:contar` (número de medicamentos com estoque crítico).
- O botão **Sair** (canto inferior direito) chama `auth:sair`.

### Início (painel)
`dashboard:resumo` devolve `{ agenda_hoje, alertas_estoque, vacinas_proximas, pendencias_sync }`. **O back-end já filtra por perfil**: o veterinário recebe só a agenda dele. O cartão de pendências de sincronização só aparece para o MASTER.

### Clientes e Animais
- Lista com busca (espera 300 ms depois de digitar) por nome, CPF ou telefone, **sem diferenciar acento e maiúscula**.
- Formulário de cliente com CEP: ao completar 8 dígitos o front chama `cep:buscar`; sem internet o front só avisa e deixa digitar à mão. Códigos: `CEP_INVALIDO`, `CEP_NAO_ENCONTRADO`, `SEM_CONEXAO`.
- Regras: **CPF único** (`CPF_DUPLICADO`, aparece embaixo do campo CPF). **Cliente com animais ativos não pode ser inativado** (`CLIENTE_POSSUI_ANIMAIS_ATIVOS`). Animal sempre ligado a um cliente ativo. `idade_texto` do animal vem calculada ("3 anos e 2 meses").
- A tela de detalhe do cliente usa `clientes:obter` e `animais:listar_por_cliente`.
- Histórico do animal: `consultas:historico_animal` (mais recente primeiro).

### Medicamentos e Fornecedores
- Medicamento: `dias_alerta` de 1 a 60 (padrão 3), `consumo_inicial_diario` opcional (usado só até 7 dias de saídas reais). **Nome + unidade únicos entre ativos** (`MEDICAMENTO_DUPLICADO`). Só MASTER escreve.
- Fornecedor: tipo `NACIONAL` ou `IMPORTADO` (filtro `tipo` na listagem). Só MASTER vê. A tela mostra a cotação do dólar via `dolar:atual` (`origem: 'API'` ou `'CACHE'`; com `CACHE` o front avisa "última cotação salva").
- **Comparativo de preços** (aba da tela de Fornecedores): o usuário escolhe um medicamento e vê quanto cada fornecedor cobra.
  - `fornecedores:precos_listar` (`{ medicamento_id }`) devolve, **ordenado do mais barato ao mais caro**, `PrecoFornecedor[]` (ver `tipos.ts`): `moeda` (`BRL` ou `USD`), `preco_centavos` na moeda original, **`preco_reais_centavos` já convertido pela cotação do dia**, `diferenca_percentual` (0 para o mais barato) e `mais_barato`. A conta é do back-end; o front só mostra.
  - `fornecedores:precos_salvar` (`{ medicamento_id, fornecedor_id, moeda, preco_centavos }`) cria ou corrige o preço (chave: medicamento + fornecedor) e guarda a data de atualização.
  - `fornecedores:precos_inativar` (`{ id }`) remove o preço da comparação (exclusão lógica).

### Colaboradores
CRUD só para MASTER, mais `colaboradores:redefinir_senha` (`{ id, nova_senha }`, mínimo 8 caracteres). Regras: login e CPF únicos (`LOGIN_DUPLICADO`, `CPF_DUPLICADO`), **CRMV obrigatório para veterinário** (`CRMV_OBRIGATORIO`), **não pode inativar nem rebaixar o último MASTER** (`ULTIMO_MASTER`). A senha só vai na criação.

### Agenda
- Lista os atendimentos de **um dia** (`agendamentos:listar` com `inicio` e `fim` em UTC, e `veterinario_id` opcional). Lista de veterinários para o formulário e o filtro: `agendamentos:veterinarios`.
- **Conflito de horário:** o mesmo veterinário não pode ter dois atendimentos que se cruzam. Devolver `AGENDA_CONFLITO` (aparece embaixo do campo de horário).
- `confirmado: false` = marcado offline e ainda não confirmado pelo servidor central; o front mostra o selo "Não confirmado até sincronizar".
- Cancelar (`agendamentos:cancelar`) muda o status para `CANCELADO`, não apaga.

### Consultas
- Criar (`consultas:criar`) com `{ animal_id, anamnese, diagnostico?, observacoes?, prescricoes[] }`. O veterinário da consulta é o usuário da sessão.
- **Salvar a consulta baixa o estoque** dos medicamentos prescritos, numa transação e seguindo FEFO. Se faltar, devolver `ESTOQUE_INSUFICIENTE` e não salvar nada.
- **O ATENDENTE nunca recebe o `diagnostico`** (omitir o campo).

### Vacinas
- `vacinas:fila`: vacinas com próxima dose nos **próximos 3 dias**, com telefone do tutor e `lembrete_enviado`.
- Botão "Enviar WhatsApp": o front lê o texto em `configuracoes:obter` (`template_lembrete`), troca os marcadores `{tutor}`, `{animal}`, `{vacina}` e `{data}` e chama `whatsapp:abrir` com `{ telefone, mensagem }`. **O main monta e valida o link `https://wa.me/55...`** (o front nunca abre link sozinho). Depois chama `vacinas:lembrete_registrar`. Se não houver internet, o lembrete continua pendente. **Atenção:** VETERINARIO e ATENDENTE precisam conseguir ler o `template_lembrete`; para eles `configuracoes:obter` pode devolver só esse campo.
- `vacinas:aplicar` registra a aplicação e deve calcular a próxima dose pelo `intervalo_reforco_dias` do catálogo.
- Catálogo: canais `vacinas:catalogo_listar/obter/criar/atualizar/inativar` (só MASTER escreve).

### Estoque
- `estoque:saldos`: por medicamento `{ saldo, consumo_medio_diario, dias_restantes, status }`. **Saldo = soma das movimentações** (nunca campo editável). Consumo médio = saídas dos últimos 30 dias ÷ 30; com menos de 7 dias de histórico usar `consumo_inicial_diario`. `status`: `CRITICO` quando `dias_restantes <= dias_alerta`, `ATENCAO` até o dobro disso, senão `OK`.
- `estoque:lotes`: lotes **ordenados pela validade** (FEFO).
- `estoque:movimentar` (`ENTRADA`, `SAIDA`, `AJUSTE`). Entrada exige `lote_numero` e `validade`. Saída maior que o saldo: `ESTOQUE_INSUFICIENTE`. Em `AJUSTE` o front envia a **quantidade contada** no inventário; o back-end deve registrar a **diferença como uma nova movimentação** (o saldo nunca é sobrescrito).
- `alertas:listar`: um alerta aberto por medicamento crítico.

### Orçamentos e serviços
- `orcamentos:criar` recebe os itens com o valor unitário já "congelado" pelo front, mas **o back-end deve recalcular o total** (`soma dos itens − desconto`, em centavos, nunca negativo) e guardar o valor do item no momento. Número sequencial do orçamento (`numero`).
- `orcamentos:pdf` gera o PDF via `printToPDF`, com "Documento sem valor fiscal", e devolve `{ caminho }`.
- Catálogo de serviços: `servicos:*` (só MASTER escreve; `valor_centavos`). **Atenção:** o ATENDENTE precisa poder **ler** `servicos:listar`, porque o formulário de orçamento sugere o preço do catálogo.

### Relatórios (MASTER)
`relatorios:cobrancas`, `relatorios:estoque_validade` e `relatorios:lista_compras` devolvem listas (formato em `ts/pages/relatorios/relatorios.ts`). O CSV e a impressão são feitos no front a partir dessas linhas. Importar/exportar clientes e animais: `csv:exportar` (`{ nome_arquivo, conteudo }`) e `csv:importar` (`{ importados, ignorados }`; **ignorar CPF repetido**).

### Conflitos de sincronização (MASTER)
`sync_conflitos:listar` mostra `dados_local` e `dados_central` lado a lado; `sync_conflitos:resolver` recebe `{ id, escolha: 'LOCAL' | 'CENTRAL' }`.

### Auditoria (MASTER, só leitura)
`auditoria:listar` (listagem paginada com `busca` em usuário/descrição e os filtros `acao`, `entidade` e `periodo`: `HOJE`, `7D` ou `30D`) devolve `AuditoriaRegistro[]`: `ocorrido_em` (UTC), `usuario_nome`, `perfil`, `acao`, `entidade`, `registro_id?` e `descricao` em português ("Marcou atendimento de Luna às 10:30"). Ações que o front sabe nomear: `LOGIN`, `LOGOUT`, `CRIAR`, `ATUALIZAR`, `INATIVAR`, `MOVIMENTO_ESTOQUE`, `RESOLVER_CONFLITO`, `BACKUP`, `RESTAURAR`. **Os registros não podem ser editados nem apagados**, e o back-end é quem grava (o front não escreve na auditoria).

### Configurações e backup (MASTER)
Tela com três abas:
- **Backup:**
  - `backup:listar` devolve `BackupArquivo[]` (`criado_em`, `tipo` `AUTOMATICO` ou `MANUAL`, `tamanho_bytes`);
  - `backup:criar` faz um backup agora;
  - `backup:restaurar` (`{ id }`) troca os dados atuais pelos do backup (o front pede confirmação antes);
  - o agendamento (`backup_horario` "HH:MM" e `backup_manter` = quantos guardar) é salvo em `configuracoes:atualizar`.
- **Dados da clínica:** `nome_clinica`, telefone, e-mail e endereço (com busca de CEP), salvos em `configuracoes:atualizar`. Aparecem nos orçamentos em PDF. A logo ainda não existe (pendente com o Will).
- **Lembrete de vacina:** o administrador edita o `template_lembrete`, com os marcadores `{tutor}`, `{animal}`, `{vacina}` e `{data}`, e vê uma prévia da mensagem.

`configuracoes:obter` devolve `Configuracoes` (ver `tipos.ts`); `configuracoes:atualizar` recebe só os campos alterados e o back-end junta com o que já existe.

## 3. Lista completa dos canais usados pelo front

`auth:login` `auth:sessao` `auth:sair` · `sync:estado` · `cep:buscar` · `dolar:atual` · `whatsapp:abrir` · `dashboard:resumo` ·
`clientes:listar|obter|criar|atualizar|inativar` · `animais:listar|obter|criar|atualizar|inativar` · `animais:listar_por_cliente` ·
`medicamentos:listar|obter|criar|atualizar|inativar` · `fornecedores:listar|obter|criar|atualizar|inativar` · `colaboradores:listar|obter|criar|atualizar|inativar` · `colaboradores:redefinir_senha` ·
`agendamentos:listar|criar|atualizar|cancelar|veterinarios` · `consultas:listar|obter|criar|historico_animal` ·
`estoque:saldos|lotes|movimentar` · `alertas:listar|contar` · `vacinas:catalogo_listar|catalogo_obter|catalogo_criar|catalogo_atualizar|catalogo_inativar|fila|aplicar|lembrete_registrar` ·
`servicos:listar|obter|criar|atualizar|inativar` · `orcamentos:listar|obter|criar|pdf` · `relatorios:cobrancas|estoque_validade|lista_compras` · `csv:exportar|importar` · `sync_conflitos:listar|resolver` ·
`fornecedores:precos_listar|precos_salvar|precos_inativar` · `auditoria:listar` · `configuracoes:obter|atualizar` · `backup:listar|criar|restaurar`

Os formatos de entrada e saída de cada um estão tipados em `app/src/renderer/ts/lib/tipos.ts` (trocar pelos tipos de `/shared` quando os schemas Zod existirem).

**Importante (regra do `AGENTS.md`: contrato em `/shared` antes do código):** os canais de CRUD seguem o padrão `<modulo>:<acao>` do projeto, mas os demais (`dashboard:resumo`, `sync:estado`, `alertas:*`, `agendamentos:veterinarios`, `consultas:historico_animal`, `animais:listar_por_cliente`, `vacinas:fila|aplicar|lembrete_registrar`, `estoque:*`, `relatorios:*`, `csv:*`, `sync_conflitos:*`, `colaboradores:redefinir_senha`, `orcamentos:pdf`, `fornecedores:precos_*`, `auditoria:*`, `configuracoes:*`, `backup:*`) são **propostas do front**. O grupo precisa aprovar os nomes e os formatos e transformá-los em schemas Zod em `/shared`; se algum mudar, só a tela correspondente precisa ser ajustada.

## 4. Códigos de erro que o front reconhece

`NAO_AUTENTICADO`, `SESSAO_EXPIRADA` (voltam ao login), `CPF_DUPLICADO`, `CLIENTE_POSSUI_ANIMAIS_ATIVOS`, `MEDICAMENTO_DUPLICADO`, `LOGIN_DUPLICADO`, `CRMV_OBRIGATORIO`, `ULTIMO_MASTER`, `AGENDA_CONFLITO`, `ESTOQUE_INSUFICIENTE`, `CEP_INVALIDO`, `CEP_NAO_ENCONTRADO`, `SEM_CONEXAO`. Qualquer outro código vira um aviso vermelho com a `mensagem` recebida.

## 5. Organização do front

```
app/src/renderer/
  index.html
  css/        variables.css (tokens), global.css, components.css, layout.css
  ts/
    main.ts            entrada: login ou sistema (menu + telas)
    lib/               api.ts, sessao.ts, tipos.ts, icones.ts, mascaras.ts, validadores.ts, formatadores.ts, dom.ts
    layout/            shell.ts (menu, topo, botão Sair) e menu.config.ts (telas x perfis)
    router/            router.ts (#/tela e #/tela/id)
    components/ui/     button, campos, formulario, tabela, modal, toast, abas, cartoes, busca, feedback
    pages/             uma pasta por tela; comum/ tem crud.ts, seletores.ts, util.ts
```

**Tela nova:** (1) adicionar a rota em `layout/menu.config.ts` com os perfis; (2) criar `pages/<tela>/<tela>.ts`; (3) ligar em `pages/paginas.ts`. Cadastros simples usam `criarPaginaCrud` (`pages/comum/crud.ts`). O catálogo visual dos componentes abre em `#/dev/componentes` (depois do login).

## 6. Pendências que dependem do grupo

- Configurar o **Vite** (previsto na stack) ou manter o build atual (`pnpm build:renderer`) e confirmar que a janela do Electron carrega o front.
- Registrar os canais acima no `main` e expor o `window.api` no `preload.ts`.
- Trocar `ts/lib/tipos.ts` pelos tipos de `/shared` quando existirem.
- As listas de seleção (cliente, animal, medicamento) trazem até 200 itens; se crescer, trocar por busca com autocomplete.
- O texto padrão do lembrete de vacina (`ts/lib/lembrete.ts`) precisa da aprovação do Will; a logo e os dados da clínica (login e PDFs) também estão pendentes.
- Auditoria e backup dependem do `main`: quem grava a auditoria e quem faz o backup do SQLite é o back-end (tarefas 3.2 e 4.4 do `ESTADO.md`).
- Confirmar as permissões de Fornecedores e Relatórios.
