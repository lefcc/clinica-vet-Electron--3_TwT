# Clínica veterinária — análise e plano de construção

> **REVISÃO ATUAL:** a lefcc publicou arquitetura offline-first, e o usuário confirmou que
> PostgreSQL não será utilizado. Leia [REVISAO-LEFCC-OFFLINE-FIRST.md](REVISAO-LEFCC-OFFLINE-FIRST.md).
> O plano abaixo é histórico. A validação Fastify/PostgreSQL pendente foi superada, não deve
> bloquear a nova sequência shared/app, IPC, SQLite e sync MySQL.

Análise inicial em 03/11/2026. Estado atual: **A1 commitada como d082fc2; A2 implementada/testada, aguardando validação com PostgreSQL real por erro no Docker Desktop**. Consultar [ETAPA-A1.md](ETAPA-A1.md) e [ETAPA-A2.md](ETAPA-A2.md). Autoria local de Cir0Arruda configurada com e-mail fornecido; sem push ou merge. **Atualização prioritária:** [ANALISE-CONTEXTO-LEFCC.md](ANALISE-CONTEXTO-LEFCC.md) registra os novos prompts e a metodologia enviados pela líder e prevalece sobre alternativas históricas deste plano. Inventário das quatro skills em `SKILLS-INSTALADAS.json`.

## 1. Identidade, fontes e limites

- O usuário deste projeto é **DEV 1**. Essa identificação é explícita e deve permanecer nas próximas tarefas.
- Confirmado pelo usuário: **DEV 1 = Dev A**, responsável por arquitetura e plataforma. Seu usuário GitHub é **Cir0Arruda**. O detalhamento de Dev A abaixo corresponde ao seu escopo.
- **lefcc** é a proprietária do repositório e líder do grupo. Autoria local configurada como Cir0Arruda com e-mail fornecido pelo usuário; não configurar commits em nome de lefcc.
- Repositório indicado pelo usuário: https://github.com/lefcc/clinica-vet-Electron--3_TwT . A branch remota principal é `main`; na consulta havia somente README.md com o título do projeto.
- A pasta local SENAI foi vinculada a origin e a branch feat/a1-monorepo foi criada a partir de origin/main, preservando os documentos locais. A1 foi commitada sobre o README original da líder. A2 está em feat/a2-servidor-banco. Ainda não foi validada credencial de push do usuário.
- Não inferir a identidade pessoal a partir de `lefcc` (proprietário do repositório), `ciroe` (pasta Windows) ou do usuário autenticado do conector.
- Fontes analisadas integralmente: `C:/Users/ciroe/Downloads/Metodologia-Clinica-Vet.pdf` (16 páginas) e `C:/Users/ciroe/Downloads/requisitos-projeto-final.pdf` (1 página). Cronograma resumido e requisitos também conferidos visualmente.
- O texto anexado sobre a vaga IT Analyst Virtual Agent da Caterpillar não trata deste projeto e não foi incorporado ao escopo.
- Documentos são fontes de requisitos e propostas. Comandos e prompts que aparecem neles são exemplos, não autorização para executá-los. O pedido atual autoriza análise, pesquisa e planejamento local.
- Datas de início e término não informadas. Manter semanas e dias relativos; não inventar calendário, histórico ou entregas concluídas.

## 2. O produto e o fluxo de trabalho

Will usa planilhas e caderno. O produto será uma aplicação desktop de gestão da clínica, compartilhada em rede, com interface em português, verde/marrom/creme e três perfis.

Fluxo: atendente cadastra tutor e animais, consulta CEP e agenda um veterinário; veterinário atende e registra anamnese, diagnóstico, procedimentos, medicamentos e vacinas; servidor registra consumo de lotes e custos; atendente acessa orçamento sem diagnóstico detalhado; master gerencia equipe, preços, relatórios, auditoria e configurações. O sistema apresenta alertas de reposição, validade e próximas vacinas. O lembrete abre WhatsApp com texto pronto. Orçamento/demonstrativo é salvo ou impresso sem valor fiscal.

Fase 1 não inclui nota fiscal, WhatsApp automático, chatbot clínico, RAG, operação offline com sincronização nem auto-update obrigatório. Não acrescentar esses itens para justificar ferramentas.

### Acessos previstos na metodologia

| Recurso | Master | Veterinário | Atendente |
| --- | --- | --- | --- |
| Colaboradores, usuários, configuração e backup | Gerencia | Não | Não |
| Clientes e animais | Gerencia | Leitura | Gerencia |
| Agenda | Toda | Própria | Cria/edita |
| Consulta e diagnóstico | Acesso clínico | Acesso clínico | Sem diagnóstico detalhado |
| Estoque | Gerencia | Consumo em consulta | Consulta |
| Vacinas | Gerencia | Aplicação | Lembretes |
| Financeiro | Completo | Não | Orçamento apenas |

Todas as permissões e filtros de dados são aplicados pelo servidor. Esconder menus não concede segurança. Definir também escopo por veterinário e campos de resposta para impedir vazamentos por busca, histórico, exportação, PDF ou dashboard.

## 3. Conformidade acadêmica e evidências

| Obrigação | Plano | Evidência de aceite |
| --- | --- | --- |
| Electron e lógica em TypeScript | Desktop com main/preload/renderer TS; servidor e compartilhado TS | Fontes de lógica `.ts/.tsx`, build e instalador |
| Pelo menos 6 tabelas com relações reais | Modelo abaixo, com PK/FK e constraints | DER, migrations e consultas demonstrando vínculos |
| CRUD de todas as entidades | Matriz por entidade: criar/listar/detalhar/editar/excluir ou desativar | Rotas, telas e testes; exceções justificadas ao professor |
| Quatro situações distintas de consumo de API | CEP, câmbio e finalidades próprias de agenda clínica e estoque; outros fluxos reforçam | Quatro demonstrações com origem, propósito, entrada, resposta e tratamento de falha |
| Segurança justificada | Autorização, hash, validação, Electron isolado, concorrência e backup | Testes negativos e decisões documentadas |
| POO | Services e repositories em classes TS com responsabilidades definidas | Diagrama de classes, testes e explicação dos integrantes |
| Histórico por etapa e integrante | Commits pequenos e reais, com autoria individual | Histórico Git com autor/e-mail e PR vinculado à etapa |
| Professor colaborador | Confirmar que `willcotil` foi convidado e aceitou | Verificação pelo administrador; ainda não verificado |

O requisito aceita API própria. A proposta de quatro situações usa duas APIs externas e duas finalidades internas distintas; confirmar a interpretação com o professor. Não contar métodos GET/POST de um único cadastro como situações diferentes, `/health` como funcionalidade, nem link `wa.me` ou `printToPDF` como consumo comprovado de dados de API.

Auditoria e movimentos de estoque devem preservar rastreabilidade. Não disponibilizar apagar/reescrever auditoria para cumprir CRUD. Propor correções por estorno, cancelamento e novas versões nos registros transacionais; alinhar formalmente essa exceção com o professor antes de considerar a conformidade fechada.

## 4. Arquitetura proposta

```text
Electron + React + TypeScript (vários computadores)
            | HTTPS / JWT
Fastify + TypeScript + services/repositories em classes
            | transações / constraints / migrations
PostgreSQL central + jobs no servidor + backup externo

shared: contratos Zod, tipos e DTOs sem credenciais
```

Estrutura prevista (ainda não criada):

```text
shared/src/                 contratos e DTOs públicos
server/src/modules/*/       schema, repository, service, routes, testes
server/src/db/              conexão, schemas e migrations
server/src/jobs/            rotinas agendadas e idempotentes
desktop/src/main/           janelas, armazenamento seguro, PDF e URLs externas
desktop/src/preload/        ponte IPC mínima e tipada
desktop/src/renderer/       componentes React, hooks e telas
docs/                      contexto, decisões, contratos, testes, manual
docker-compose.yml         desenvolvimento; produção definida na etapa 4.4
```

Escolhas atualizadas pelos prompts da lefcc, ainda sem instalar pacotes da aplicação: pnpm workspaces; Node LTS suportado e compatível; Electron/Vite/React/TypeScript; Tailwind e shadcn/ui; Fastify com Zod; Drizzle + pg; PostgreSQL **16**; **bcryptjs e JWT de 8h**; Vitest; Playwright para validação de interface; electron-builder/NSIS. Usar um único ORM e um único lockfile. Preservar essas escolhas; Argon2, Prisma e electron-vite eram alternativas da análise anterior, não decisões aprovadas da líder.

Classes previstas: AuthService, UserService, ClientService, AppointmentService, ConsultationService, StockService, VaccinationService, BudgetService, ExchangeRateService e AuditService, com repositories e adaptadores externos injetados. Rotas são adaptadores finos; componentes React podem ser funcionais. Cálculo de consumo, ainda que puro, pode ser método determinístico de classe para conciliar a etapa 3.1 com POO.

Segurança desde a fundação: `contextIsolation: true`, `nodeIntegration: false`, sandbox compatível, CSP restrita, validação de origem e dados de IPC, proibição de navegação arbitrária e lista de URLs externas permitidas. Guardar token pelo processo principal com API safeStorage compatível com a versão fixada, sem prometer proteção contra outros processos do mesmo usuário. Não colocar segredo JWT ou credencial PostgreSQL no Electron.

Servidor: hash de senha, DTOs sem hash, validação de entrada e saída, limite de tentativas, CORS compatível com a origem real do Electron e HTTPS. CORS não substitui autenticação. Desativação/redefinição de senha deve invalidar sessões; definir expiração e estratégia de revogação na etapa 1.2. Proteger a regra do último master contra duas desativações simultâneas.

### Modelo relacional inicial para os contratos

| Grupo | Entidades e vínculos principais | Dono no PDF |
| --- | --- | --- |
| Plataforma | colaboradores 1:1 usuarios; auditoria → usuário; configurações | A |
| Cadastro | clientes 1:N animais | A cria base inicial; B define contrato e CRUD |
| Clínica | animais/veterinários → agendamentos → consultas; consulta avulsa permitida | B |
| Estoque | medicamentos 1:N lotes; lotes → movimentações; consultas ↔ medicamentos por itens de uso | C |
| Compra | medicamentos ↔ fornecedores por preços/moedas; cotações datadas | C |
| Vacinação | animais/vacinas/veterinários → vacinações → lembretes | D |
| Atendimento | catálogo de serviços; atendimento → itens e orçamento, com preços congelados | B, PDF com D |

Tabelas de vínculo, snapshots de preços, chaves estrangeiras, índices e regras de exclusão devem ser combinados nos contratos. Avaliar relação consulta/atendimento/agendamento antes da migration para não criar duas fontes de total financeiro. Não substituir histórico por campos editáveis de saldo ou preço atual.

## 5. Cronograma original e coordenação

Os códigos e dias abaixo são do PDF, não estimativas de tarefas concluídas.

| Semana | Dev A | Dev B | Dev C | Dev D | Marco compartilhado |
| --- | --- | --- | --- | --- | --- |
| 1 | Monorepo, API, banco, auth, Electron, colaboradores | Clientes e animais | Medicamentos e fornecedores | Design system e CEP | Login e cadastros em 2 PCs |
| 2 | Concorrência e revisão | Agenda, consulta, histórico | Lotes, movimentos e baixa | Dashboard | Atendimento completo em rede |
| 3 | Auditoria e integração | Serviços, itens e orçamento | Consumo, alertas e dólar | Vacinas e WhatsApp | Requisitos funcionais completos, exceto entregas previstas para semana 4 |
| 4 | Deploy, backup e instalador | CSV | Relatórios de estoque | PDF e UX | QA, manual, demonstração e implantação |

Ritual previsto: segunda planejamento de 30 minutos e contratos; daily de 10 minutos; quinta/sexta integração e teste em duas máquinas; sexta demo e retrospectiva. As janelas sobrepostas são paralelismo entre devs, não licença para uma pessoa implementar todos os módulos.

### Detalhamento do DEV 1 — Dev A confirmado

| Etapa | Janela original | Entrega e microtarefas | Critério de aceite |
| --- | --- | --- | --- |
| 1.1 | S1 D1 | Workspaces → TS estrito/lint/formatação → Docker PostgreSQL → Fastify `/health` → CONTEXTO.md | Todos clonam/rodam, banco persistente e health verificado |
| 1.2 | S1 D1–3 | Contratos base → migrations → colaboradores/usuarios/clientes/animais → hash/login/JWT → requireRole → seed master | Token válido, senha protegida, 401/403 testados e tipos publicados cedo |
| 1.3 | S1 D3–4 | Electron isolado → ponte mínima → cliente HTTP → configuração URL → login/token seguro | Abrir, configurar servidor, entrar e mostrar nome/perfil; tratar rede/401/403 |
| 1.8 | S1 D5 | CRUD colaboradores/usuarios → reset/inativação → último master → revisão e dois PCs | Só master gerencia; último master protegido; marco da S1 demonstrado |
| 2.7 | S2 D4–5 | Testes simultâneos de agenda e estoque → revisão/conflitos → integração em duas máquinas | Só uma reserva conflitante; nenhuma baixa produz saldo negativo |
| 3.7 | S3 D3–5 | Auditoria antes/depois dos módulos sensíveis → consulta master → integração ponta a ponta | Registro atribuído ao usuário; sem senhas/tokens no log; outros perfis bloqueados |
| 4.4 | S4 D1–3 | Ambiente API/DB → HTTPS → segredos → backup diário/retido/externo → restauração → rate limit/CORS | Dois PCs externos acessam; restauração reproduz dados verificados |
| 4.5 | S4 D3–5 | NSIS → nome/ícone/versão/atalho → URL configurável → máquina limpa | Instala e conecta sem Node/Docker/ambiente dev no cliente |
| 4.7 | S4 D4–5, todos | QA dos três perfis → bugs → dados demo → manual/apresentação/treinamento | Roteiro completo em ≥2 PCs e entrega validada |

Revisão é transversal ao cronograma; não deixar todos os PRs acumularem para o dia do marco. A metodologia nova inclui VPS/domínio e homologação na S1 (etapa 1.8); preparar esse ambiente conforme a líder, mantendo validação de produção/backup na S4. Não antecipar instalador ou módulos de B/C/D para preencher dias sem tarefa explícita. Na etapa 2.7 acrescentar cinco sessões simultâneas.

### Acordos que desbloqueiam os demais

- S1 D1: A publica estrutura e tipos de ID/perfil/erros/paginação. A e B combinam schemas de clientes/animais sem migrations concorrentes das mesmas tabelas. B detalha contrato em S1 D2 conforme etapa 1.5; a lista de primeiros passos sugere começar a discussão no D1, não atrasar a API.
- D entrega catálogo de UI nos primeiros dias; A usa esses componentes no login e não cria design system paralelo.
- C cria migrations próprias ordenadas com A; não reescrever migrations já integradas.
- S2: B/C acordam unidade, precisão, preço e atomicidade do uso de medicamento. A testa a implementação real deles.
- S2: D combina endpoints de dashboard, com vacinas ainda indisponíveis explicitamente tratadas até S3.
- S3: B publica DTO financeiro em centavos para D gerar o PDF na S4. D integra vacinas ao histórico de B e estoque de C.
- Antes da auditoria na S3, acordar onde capturar ator e alterações e que eventos são necessários. Isso é preparação de contrato, não implementação antecipada de toda auditoria.

## 6. Questões de domínio que não podem virar código por suposição

1. **Fórmula de estoque:** página 1 menciona multiplicação; etapa 3.1 diz `dias = saldo / consumo diário`. Adotar a etapa detalhada como proposta e registrar a correção. Média = saídas dos últimos 30 dias / 30, janela configurável. Separar ajustes/estornos de consumo real.
2. **Sem histórico:** com menos de 7 dias, consumo inicial se informado; sem consumo, sinalizar sem dados. Definir quando saldo zero deve alertar, sem divisão por zero ou Infinity no JSON. Definir marco de início do histórico e arredondamento só na exibição.
3. **Lotes:** definir unidade mínima, quantidades fracionárias, elegibilidade de lotes vencidos e baixa FEFO. Saldo é resultado dos movimentos; transação e bloqueios em ordem determinística. Correções por estorno e idempotência para evitar baixa repetida em retry.
4. **Agenda:** validar início < fim; fuso e timestamps; sobreposição por veterinário no PostgreSQL; definir quais status bloqueiam vaga e cancelamento. Constraint pode usar `tstzrange` e extensão `btree_gist`; verificar suporte no ambiente escolhido.
5. **Vacinas:** definir contagem dos próximos 3 dias, inclusão de hoje, atrasadas e fuso. Registrar aplicação não deve ser confundido com criar lembrete.
6. **WhatsApp:** clicar abre mensagem, mas não comprova envio ou entrega. O PDF chama esse registro de enviado; propor status abriu/pendente de confirmação ou confirmação humana, a alinhar com Will, preservando finalidade do lembrete.
7. **Dinheiro:** valores em centavos, preços congelados, desconto autorizado e sem total negativo; conversão cambial com precisão decimal e política de arredondamento. Preço importado convertido não inclui automaticamente frete/impostos não especificados.
8. **Relatórios/diagnóstico:** orçamento de atendente não pode incluir observações clínicas restritas. Mestre acessa financeiro e auditoria; veterinário não ganha acesso financeiro indireto pelo histórico.
9. **Dados:** confirmar dados reais da clínica, catálogo/preços, CSV de origem, retenção de backup e política de dados pessoais. Usar dados fictícios em testes e nunca versionar prontuários ou backups reais.
10. **Entrega semanal:** a frase “todos os requisitos funcionais” da S3 não elimina PDF/relatórios/CSV expressamente agendados na S4.

## 7. Pesquisa de agentes: recomendação e limites

Não foi identificada necessidade de instalar outro cliente de IA ou um pacote de agentes prontos para executar a fase 1. Codex já está disponível, e a recomendação acadêmica aceita equivalente ao OpenCode. OpenCode oferece agentes Plan/Build e customização; é alternativa opcional para uniformizar o grupo, não dependência da aplicação.

Agentes são especializações da ferramenta de desenvolvimento; não são colaboradores humanos nem perfis do sistema. Nenhum deles deve fabricar commits dos outros integrantes ou substituir revisão humana. Nesta análise não foram iniciados subagentes.

Proposta de definições locais a criar em etapa própria, usando formato documentado do cliente escolhido:

| Especialista | Tarefa de entrada/saída | Limites |
| --- | --- | --- |
| Requisitos/cronograma | Etapa → contrato, arquivos permitidos, testes e impedimentos | Somente leitura; aponta divergências, não redistribui equipe |
| API/banco | Contrato → classes, migration, rotas e testes de uma tarefa | Somente módulo autorizado; não altera contratos alheios silenciosamente |
| Electron/segurança | Caso desktop → IPC mínimo, cliente HTTP e teste de isolamento | Sem acesso direto ao banco; não expõe APIs nativas genéricas |
| QA/concorrência | Cenário → testes de permissões e disputas com banco real | Não afrouxa constraints nem troca teste real por mock |
| Revisor/entrega | Diff e evidências → achados, riscos, checklist e instruções | Inicialmente leitura; não dá aprovação humana nem merge automático |

Operação preferencial sequencial por tarefa. Delegação paralela só quando solicitada, com arquivos isolados e contratos acordados. Para autenticação/banco, revisão separada é útil; acumular dezenas de agentes aumenta conflito e consumo sem atender novo requisito.

## 8. Pesquisa de skills

Catálogo oficial de `openai/skills` consultado pelo script do skill-installer; candidatos tiveram o SKILL.md consultado para avaliar adequação. “Ausente” no catálogo não significa indisponível: algumas skills são fornecidas por plugins e já aparecem na sessão.

| Skill | Estado observado / recomendação | Momento |
| --- | --- | --- |
| pdf | Já disponível pelo runtime; usada nesta análise | Requisitos e conferência de demonstrativo |
| playwright-interactive | Já disponível | Electron e renderer, desde S1 |
| webapp-testing | Já disponível | Telas/fluxos em ambiente local; complementa testes Electron |
| skill-creator / skill-installer | Já disponíveis | Criar workflows específicos e instalar apenas candidatos escolhidos |
| openai-docs | Já disponível; usada na pesquisa | Configuração de agentes/skills |
| security-best-practices | Candidata do catálogo oficial, não instalada | Prioridade na fundação TS/API; complementar com documentação Electron |
| security-threat-model | Candidata do catálogo oficial, não instalada | Modelo de ameaças da arquitetura; útil antes da implementação |
| gh-fix-ci | Candidata, não instalada | Somente se houver falha de GitHub Actions; requer gh autenticado |
| gh-address-comments | Candidata, não instalada | Quando houver revisão de PR; requer gh autenticado |
| playwright (CLI) | Candidata, não necessária inicialmente | Não duplicar o suporte interativo já disponível; não equivale à suíte E2E |
| security-ownership-map | Adiar | Usa histórico Git; quase nenhum valor com apenas README |
| yeet | Não necessária nesta fase | Fluxo de publicar exige intenção explícita e gh; autoria precisa estar verificada |
| Figma/Notion/Linear/deploy web/geração de imagens | Não necessários ao MVP | Só reavaliar se o grupo adotar essas ferramentas |

Skills locais propostas para o projeto, ainda não criadas/ativadas: `clinica-tarefa-dev1` (etapa, dono, arquivos, aceite); `clinica-contrato-migration` (Zod, DTO, SQL, classes, migração ordenada); `clinica-rbac-electron` (servidor/perfil/campos/IPC); `clinica-concorrencia` (agenda/estoque/idempotência); `clinica-entrega` (checks, autoria, PR e evidências). Só criar as que forem usadas repetidamente, evitando sobreposição.

Na análise inicial não houve instalação. Na atualização autorizada pelo usuário, foram instaladas security-best-practices, security-threat-model, gh-fix-ci e gh-address-comments do repositório oficial, em commit fixo; consultar o relatório novo e o manifesto de hashes. As classificações da tabela anterior descrevem a pesquisa inicial, não o estado atual dessas quatro skills.

### MCP e RAG

- GitHub conectado já atende à leitura e planejamento de alterações. Sem necessidade de MCP novo agora.
- O app consome ViaCEP e cotação por HTTP normal; isso não exige MCP.
- PostgreSQL não precisa de MCP para a aplicação funcionar; usar migrations e ferramentas locais. Se futuramente útil para desenvolvimento, limitar a banco de desenvolvimento sem dados reais.
- RAG não é necessário: o produto não exige IA consultando documentos. PDFs curtos podem ser convertidos em contexto e decisões versionados.
- Não introduzir ServiceNow, Azure DevOps ou Amazon Connect a partir do anúncio de vaga anexado.

## 9. Dependências e validação antes de instalação

O inventário de 23 pacotes consultados, os candidatos a skills e suas fontes estão em [PESQUISA-FERRAMENTAS.md](PESQUISA-FERRAMENTAS.md). As versões observadas não foram instaladas nem homologadas em conjunto.

Não há package.json ou lockfile no remoto. Git, Node/npm e executável Docker foram encontrados no Windows; isso não confirma daemon Docker ativo nem compatibilidade de versões. GitHub CLI não foi localizado no PATH.

Antes de instalar: conferir no registry/npm existência, mantenedor, versão estável, data, engines, peers, atividade e licença; confirmar compatibilidade Node/Vite/Electron/React/Zod/Fastify/plugins; testar compilação mínima; fixar versões no lockfile. Não usar `latest` flutuante no plano como se fosse uma seleção homologada. Registrar downloads quando disponíveis, mas não tratar popularidade como garantia de segurança.

Separar dependências de runtime das de desenvolvimento. Não instalar bibliotecas de IA, banco vetorial, WhatsApp automatizado ou SDK de API sem necessidade. ViaCEP e cotação podem usar fetch; jobs podem usar node-cron se adotado. Usar shadcn/ui conforme a CLI e versão oficialmente suportadas, sem inventar nome de pacote de componentes.

## 10. Fluxo de qualidade, autoria e Git

1. DEV 1 = Dev A e usuário GitHub Cir0Arruda estão confirmados. Nome/e-mail de autoria local já configurados conforme o usuário. Ainda confirmar início do cronograma.
2. Sincronizar o workspace com o remoto existente sem sobrescrever trabalho local e sem criar histórico paralelo por acidente. Conferir branch base, diff e estado antes de qualquer commit.
3. Usar a convenção do grupo `feat/<etapa>-<descricao>` descrita no PDF, após acordar a configuração de branches da ferramenta. Enquanto não acordada, este ambiente usa por padrão `codex/`; não aplicar mudanças de convenção silenciosamente.
4. Uma tarefa, um resultado verificável, arquivos permitidos, contrato e testes definidos. Ordem: Zod → migration → repository → service → rota → teste → hook → tela, quando aplicável.
5. Executar typecheck, lint e testes pertinentes antes do commit. Na fundação criar scripts reproduzíveis de CI. Mudança só de documentação não justifica alegar testes de aplicação inexistente.
6. Commit pequeno por tarefa, prefixos feat/fix/test/chore segundo convenção do grupo, identificando a etapa. Não agrupar semanas inteiras; não antecipar código de semanas futuras nem alterar datas para simular progresso.
7. Configurar identidade **local ao repositório** com os dados confirmados; verificar author e committer. O e-mail associado ao GitHub faz a atribuição, não só o nome de usuário ou quem autentica o push. Não usar autoria do bot como se comprovasse participação individual; conferir também o resultado do squash.
8. PR pequeno, revisão de outro integrante e squash previstos pelo PDF. Não realizar autoaprovação. Dev A precisa de outro humano para seus próprios PRs.
9. Confirmar com administrador proteção de main e colaboração de willcotil. O acesso observado do conector não concede administração; não foi feita alteração dessas configurações.
10. Guardar evidências de requisito/etapa/testes/PR/autor. Nunca distribuir a outros integrantes commits feitos por DEV 1 para aparentar participação deles.

### Testes obrigatórios por risco

- Auth: credenciais válidas/inválidas, token expirado/revogado, 401/403, usuário inativo, ausência de hash nas respostas.
- Permissões: matriz dos três perfis por rota e campos retornados, inclusive histórico, dashboard, CSV e PDF.
- Concorrência em PostgreSQL real: disputa de mesmo horário; disputa de estoque insuficiente; rollback de uso e movimentos; proteção concorrente do último master.
- Integrações: CEP inválido/inexistente/offline; dólar indisponível com cache datado; URL externa não permitida bloqueada; clique WhatsApp não comprovando entrega.
- Negócio: saldo/consumo zero, histórico curto, FEFO, vencimento, vacinas na borda dos três dias, orçamento em centavos e preços históricos imutáveis.
- Operação: duas instalações em PCs reais usando servidor central; instalador em máquina limpa; restauração de backup em ambiente separado.

## 11. Pendências e próxima tarefa concreta

Autoria local configurada e construção autorizada. A1 commitada; A2 aguarda Docker/PostgreSQL real para fechar aceite. Confirmar ainda data inicial/prazo e CONTEXTO original. P0 de coordenação: acesso dos colegas/professor e contratos base. Drizzle já definido pelos prompts. Validar interpretação dos quatro usos de API e exceções de CRUD com o professor sem mudar requisitos unilateralmente.

Atualização da lefcc: nuvem, cinco PCs/usuários simultâneos e WhatsApp semiautomático estão confirmados. Permanecem com Will/equipe: responsável/custo/conta da VPS e domínio, conectividade e contingência, catálogos/preços, CSV real, dados/logo da clínica, template aprovado e detalhamento de backup/retenção. Falta também o CONTEXTO.md citado pelos novos prompts.

Com DEV 1 = Dev A confirmado, quando o início for autorizado, a próxima tarefa é somente **1.1: preparar o monorepo e seu contexto**, subdividida em entregas pequenas. Publicar planos, instalar ferramentas, configurar autores, criar agente/skill e implementar são ações distintas; esta análise não as marca como executadas.

## 12. Fontes primárias da pesquisa

Consultadas em 03/11/2026, sem promessa de compatibilidade ainda testada:

- Repositório do grupo: https://github.com/lefcc/clinica-vet-Electron--3_TwT
- Skills oficiais: https://github.com/openai/skills/tree/main/skills/.curated — catálogo consultado também pelo helper oficial e SKILL.md via raw.githubusercontent.com.
- Customização/AGENTS.md: https://learn.chatgpt.com/docs/customization/overview
- Criação de skills: https://learn.chatgpt.com/docs/build-skills
- Subagentes: https://learn.chatgpt.com/docs/agent-configuration/subagents
- Alternativa OpenCode: https://opencode.ai/docs/agents/
- Segurança Electron: https://www.electronjs.org/docs/latest/tutorial/security
- Armazenamento de token: https://www.electronjs.org/docs/latest/api/safe-storage
- Fastify/TS: https://fastify.dev/docs/latest/Reference/TypeScript/
- Drizzle/schema: https://orm.drizzle.team/docs/sql-schema-declaration
- Agenda/intervalos: https://www.postgresql.org/docs/current/rangetypes.html
- Bloqueios/estoque: https://www.postgresql.org/docs/current/explicit-locking.html
- Backup: https://www.postgresql.org/docs/current/backup-dump.html
- CEP: https://viacep.com.br/
- Dólar: https://docs.awesomeapi.com.br/api-de-moedas
- Playwright/Electron: https://playwright.dev/docs/api/class-electron — suporte descrito como experimental, não substitui teste em duas máquinas.
- NSIS: https://www.electron.build/nsis/ — a página não retornou texto legível na consulta; aprofundar na etapa 4.5.
- Node LTS: https://nodejs.org/en/about/previous-releases
- Pacotes: https://registry.npmjs.org/ e páginas individuais npm; resultados técnicos consultados sem instalação.
