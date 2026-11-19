# Auditoria do projeto — realizado, pendente e não verificado

> Registro histórico anterior à implementação da A2. O estado atualizado de execução
> está em docs/ESTADO.md e docs/A2-CONTRATOS-IPC.md. As observações sobre branches
> remotas e código ausente descrevem o momento desta auditoria.

## Conclusão

**Há uma base de monorepo alinhada à arquitetura revisada, mas ainda não há aplicação
funcional.** A1 atende aos critérios locais de instalação/typecheck dos prompts; sua
publicação, revisão e validação do container ainda estão pendentes. A2–A7 e os módulos
funcionais seguintes não estão implementados no workspace ou no remoto consultados.

O objeto desta auditoria é verificar e identificar pendências, não implementar os próximos
módulos nem certificar a entrega do sistema. Nenhum código da aplicação foi alterado.

## Escopo e fontes

- Workspace e branch: `feat/a1-offline-first`, HEAD `6fcc497`.
- Remoto após fetch: `origin/main` = `dd136bf0df8c29c33e5a3c0fbab857a5c37f58a1`.
- Fontes vigentes: CONTEXTO.md, ESTADO.md, PROMPTS-SEMANA-1.md, metodologia.html e projeto
  reescrito enviados pela lefcc. A arquitetura antiga foi tratada como histórico superado.
- Requisitos acadêmicos: `C:/Users/ciroe/Downloads/requisitos-projeto-final.pdf`.
- Projeto reescrito e levantamento original: PDFs com esses títulos na raiz, lidos por inteiro.
- Evidência: fontes/manifests/configurações atuais, histórico Git, refs remotas, API GitHub
  de PRs/proteção de branch, comandos executados e inventário local das skills.

Não há evidência sobre código que colegas possam ter somente em suas máquinas ou em outros
repositórios. “Ausente” abaixo significa ausente do workspace e/ou remoto efetivamente vistos.
Não é avaliação de participação pessoal de B/C/D.

## O que foi comprovadamente realizado

| Entrega                            | Evidência                                                     | Limite                                                |
| ---------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| Estrutura pnpm shared/app          | pnpm-workspace.yaml, manifests privados e ligação workspace:* | Apenas dois pontos de entrada vazios                  |
| TypeScript estrito                 | tsconfig.base.json e typecheck atual                          | Não há regra de negócio para verificar                |
| ESLint/Prettier compartilhados     | Configurações e comandos passam                               | Parser atual não aceita anotações TS                  |
| Vitest instalado                   | Runner executou nos dois pacotes                              | Zero testes; passWithNoTests explícito                |
| Compose MySQL dev                  | mysql:8.4, utf8mb4, localhost:3306, volume e healthcheck      | Container não executado; motor Docker indisponível    |
| Retirada da arquitetura anterior   | Sem server/desktop ou dependências Fastify/pg/JWT ativas      | Não equivale a implementar Electron/SQLite            |
| Proteção de arquivos locais no Git | .env/SQLite/WAL/SHM ignorados                                 | Não é segurança de aplicação implementada             |
| Documentos da líder preservados    | Oito arquivos iguais byte a byte ao remoto                    | AGENTS.md oficial não consta nesses arquivos          |
| Autoria de DEV 1                   | d082fc2 e 6fcc497: Cir0Arruda com e-mail informado            | Commits ainda não estão no GitHub                     |
| Pesquisa e quatro skills           | Arquivos existentes, hashes conferidos com manifesto          | Skills pessoais, sem auditoria de segurança executada |

O código ativo é integralmente representado por:

- `app/src/index.ts:1`: comentário e `export {}`.
- `shared/src/index.ts:1`: comentário e `export {}`.

São **2 arquivos de código, 0 testes ativos, 0 migrations**. Não existem scripts dev/start/build
de aplicação, dependências Electron/SQLite/Zod, janela, handlers, tabelas ou telas.

## Resultado dos comandos de verificação

| Verificação                                   | Resultado atual                               | O que prova                                                            |
| --------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| pnpm install --frozen-lockfile --offline      | Saída 0                                       | Instalação reproduzível usando cache disponível                        |
| pnpm check                                    | Saída 0                                       | Pipeline do esqueleto executa                                          |
| pnpm -r typecheck, dentro de check            | Passou nos dois workspaces                    | Os fontes vazios compilam com configuração estrita                     |
| pnpm lint, dentro de check                    | Passou                                        | Regras atuais aceitam os esqueletos e a configuração                   |
| pnpm -r test, dentro de check                 | Zero testes, saída 0                          | Somente disponibilidade do runner, sem cobertura funcional             |
| pnpm format:check, dentro de check            | Passou                                        | Arquivos abrangidos pelo formatter estão conformes                     |
| Import resolution de @clinica/shared em app   | Aponta para shared/src/index.ts local         | Ligação de workspace funciona, mas não há contratos exportados         |
| docker compose config --quiet e inspeção JSON | Passaram                                      | Serviço/porta/volume/charset/healthcheck estão declarados corretamente |
| docker info                                   | Falhou: pipe dockerDesktopLinuxEngine ausente | Não comprova container ou banco em execução                            |
| git diff --check                              | Passou                                        | Sem erros de whitespace no diff observado                              |
| Teste de parser por stdin, sem criar arquivo  | Erro esperado em const numero: number = 1     | Lint não está pronto para código tipado real                           |

O teste de parser retornou `Parsing error: Unexpected token :` em uma entrada TS mínima.
Ele foi uma sondagem controlada, não um arquivo de negócio quebrado no projeto. Antes da
A2 com z.infer, será necessário escolher/aprovar parser/plugin TS compatível com as versões.
Isso não contradiz o aceite limitado da A1, mas impede considerar o lint “completo para TS”.

## Semana 1 — responsabilidades específicas de DEV 1 / Dev A

Referência dos prompts: A1 linhas 15–24, A2 26–34, A3 36–49, A4 51–61,
A5 63–72, A6 74–81 e A7 a partir da linha 83.

| Prompt                         | Estado                                                     | Falta concreta                                                                                    | Evidência necessária para fechar                                                        |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A1 — monorepo                  | Implementado e validado localmente; não integrado ao grupo | Publicar/revisar branch; testar MySQL dev quando Docker funcionar                                 | PR revisado/merge; container saudável é gate adicional da semana 1                      |
| A2 — contratos/canais          | Não iniciado                                               | Perfil, RespostaIpc, paginação, Login/Sessao, Colaborador/Usuario sem hash; mapa ipc.ts e exports | Schemas Zod com testes válidos/inválidos; importações reais por app                     |
| A3 — Electron/preload/registry | Não iniciado                                               | main.ts, preload.ts, registrarHandler, funções nomeadas, ping e página HTML/CSS/TS                | Janela abre offline; ping atravessa IPC; testes de validação/sessão/perfil e isolamento |
| A4 — SQLite/outbox             | Não iniciado                                               | better-sqlite3/Drizzle, WAL/FK, migration de 4 tabelas de domínio e 3 de sync                     | Migrations em memória/arquivo; entidade + outbox atômicas, inclusive rollback           |
| A5 — seed/auth offline         | Não iniciado                                               | Seed MASTER, bcryptjs, login/sessão/sair e expiração de 8h no main                                | Login ok, senha errada, inativo, sessão expirada e ausência de hash na resposta         |
| A6 — login renderer            | Não iniciado                                               | Formulário, estado de sessão, nome/perfil e sair, tratamento NAO_AUTENTICADO                      | Fluxo abrir/logar/sair sem internet e acesso através do preload                         |
| A7 — colaboradores             | Não iniciado                                               | Backend + tela, MASTER, CRMV, CPF/login únicos, transação/outbox, último MASTER                   | Testes previstos, perfis negados e demonstração da tela com dados reais de teste        |

**Atenção à numeração:** A2 antiga = Fastify/health, descartada. A2 vigente = contratos IPC.
Os oito testes da implementação anterior foram arquivados e não contam para o produto novo.
O comentário em shared/src/index.ts ainda fala em contratos na A3: deve ser atualizado para
A2 junto da próxima tarefa. É uma inconsistência documental pequena, não código implementado.

## Matriz do cronograma completo de ESTADO.md

Em todas as linhas “não iniciado”, os diretórios/implementações esperados não existem na
árvore ativa. Os checkboxes remotos continuam vazios. Não se atribui atraso em dias, pois
não há data inicial de execução confirmada.

| Etapa | Dono  | Entrega                                              | Estado observado                                  |
| ----- | ----- | ---------------------------------------------------- | ------------------------------------------------- |
| 1.1   | A     | Monorepo e MySQL dev                                 | Base local validada; container/PR/merge pendentes |
| 1.2   | A     | Contratos, Electron, preload e registry              | Não iniciado; corresponde a A2+A3 dos prompts     |
| 1.3   | A     | SQLite, migrations e tabelas sync                    | Não iniciado; A4 dos prompts                      |
| 1.4   | A     | Seed, auth e tela login                              | Não iniciado; A5+A6 dos prompts                   |
| 1.5   | D     | Tokens CSS, componentes, layout e menus              | Não encontrado                                    |
| 1.6   | B     | Clientes e animais                                   | Não encontrado                                    |
| 1.7   | D     | ViaCEP/IPC e CepInput com fallback                   | Não encontrado                                    |
| 1.8   | C     | Medicamentos e fornecedores                          | Não encontrado                                    |
| 1.9   | A     | Colaboradores, revisão e integração                  | Não iniciado; A7 dos prompts                      |
| 2.1   | A     | MySQL central, paridade, TLS e safeStorage           | Não iniciado; Compose dev não é essa entrega      |
| 2.2   | A     | Push outbox e pull por marca d'água                  | Não iniciado                                      |
| 2.3   | B     | Agenda e conflitos                                   | Não encontrado                                    |
| 2.4   | B     | Consulta, diagnóstico e ocultação por perfil         | Não encontrado                                    |
| 2.5   | B     | Histórico/timeline do animal                         | Não encontrado                                    |
| 2.6   | C     | Lotes, movimentos e saldo por soma                   | Não encontrado                                    |
| 2.7   | C     | Uso na consulta, FEFO e baixa transacional           | Não encontrado                                    |
| 2.8   | D     | Dashboard e indicador sync                           | Não encontrado                                    |
| 3.1   | A     | Conflitos de sync e resolução MASTER                 | Não iniciado                                      |
| 3.2   | A     | Auditoria e testes sync/concorrência                 | Não iniciado                                      |
| 3.3   | C     | Consumo médio/dias restantes e testes                | Não encontrado                                    |
| 3.4   | C     | Jobs de alerta, sino e notificação                   | Não encontrado                                    |
| 3.5   | C     | Preços/fornecedores, dólar e cache                   | Não encontrado                                    |
| 3.6   | D     | Catálogo/aplicação de vacinas e próximas doses       | Não encontrado                                    |
| 3.7   | D     | WhatsApp semiautomático e lembretes                  | Não encontrado                                    |
| 3.8   | B     | Serviços, itens, orçamento em centavos               | Não encontrado                                    |
| 4.1   | D     | PDF sem valor fiscal e cobranças                     | Não encontrado                                    |
| 4.2   | C     | Compras/estoque/validades e PDF/CSV                  | Não encontrado                                    |
| 4.3   | B     | Importação/exportação CSV com erros por linha        | Não encontrado                                    |
| 4.4   | A     | Backup SQLite e restauração                          | Não iniciado; ZIP de fontes não é backup do banco |
| 4.5   | A     | NSIS e máquina limpa offline                         | Não iniciado                                      |
| 4.6   | D     | UX, teclado e teste com usuário leigo                | Não encontrado                                    |
| 4.7   | Todos | QA 3 perfis/2+ PCs, offline-online, manual e entrega | Não iniciado                                      |

Também não há evidência de daily, demo/retrospectiva, treinamento ou validação com Will.
Os marcos semanais e o cenário de cinco usuários ainda não podem ser considerados cumpridos.

## Requisitos obrigatórios da disciplina e do cliente

| Requisito                                                      | Estado                              | Evidência que falta                                                                                                    |
| -------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Banco relacional com ao menos 6 tabelas realmente relacionadas | Não implementado                    | Schemas, FKs, migrations e consultas de integração; 0 migrations atuais                                                |
| CRUD de todas as entidades                                     | Não implementado                    | Handlers/services/repositories/telas, permissões e casos de criação/leitura/edição/inativação                          |
| Quatro situações distintas de consumo de dados de API          | Não demonstrado                     | Nenhuma integração existe; ViaCEP/câmbio planejados são dois casos; alinhar outros casos/API própria IPC com professor |
| Segurança específica do domínio                                | Planejada, não implementada no app  | Hash, validação, autorização no main, isolamento Electron, TLS/safeStorage, testes negativos e justificativas          |
| Lógica de negócio modularizada em classes                      | Não implementado                    | Classes de services/repositories e regras explicáveis; arquivos vazios não satisfazem POO                              |
| Desktop Electron com lógica TypeScript                         | Só configuração TS existe           | Electron, preload, renderer TS compilado e instalador funcionando                                                      |
| 5 PCs e atendimento offline                                    | Não demonstrado                     | Execução offline, persistência local, reconexão e sync em duas ou mais máquinas e cinco sessões                        |
| Tutor com vários animais e prontuário completo                 | Não implementado                    | Relações, cadastros, histórico, consulta/diagnóstico e testes por perfil                                               |
| Estoque de 3 dias, FEFO e fornecedores                         | Não implementado                    | Movimentos/lotes, consumo real e testes de borda, cache de câmbio e comparativo                                        |
| Lembretes de vacinas com 3 dias e WhatsApp                     | Não implementado                    | Job/lista, abertura validada e tratamento offline; distinguir abrir de comprovar envio                                 |
| CEP automático com preenchimento manual offline                | Não implementado                    | Integração no main, componente e testes timeout/inexistente/sem rede                                                   |
| Orçamento/cobrança em PDF sem valor fiscal                     | Não implementado                    | Total em centavos, itens congelados, filtros por perfil e PDF equivalente à tela                                       |
| UI verde/marrom, simples e acessível                           | Não implementado                    | Tokens, componentes, contraste/teclado e fluxo de até 3 cliques para agendar                                           |
| Convenções de dados e contratos                                | Não implementado no domínio         | UUIDs, datas UTC exibidas em America/Sao_Paulo, resposta IPC única, validação Zod de entrada/saída e exclusão lógica   |
| Entrega pelo GitHub                                            | Parcial apenas documental no remoto | Código publicado, PRs, revisão e versão final                                                                          |
| Professor willcotil colaborador desde o início                 | Não verificado                      | Confirmação administrativa do convite/acesso; acesso público não prova colaboração                                     |
| Histórico individual por etapa e integrante                    | DEV 1 tem dois commits locais       | Publicação dos seus commits e verificação do histórico dos demais no repositório do grupo                              |
| Compreensão/explicação das decisões pelo grupo                 | Não verificável por código          | Revisão humana, demonstração e explicação de cada integrante                                                           |

Não contar wa.me, métodos CRUD de um único cadastro ou geração de PDF automaticamente como
quatro situações de consumo de dados. O material aceita API própria, mas a aceitação de
chamadas IPC como evidência acadêmica precisa ser alinhada sem trocar a stack da líder.
Para registros imutáveis (auditoria/movimentos), justificar estorno/correção em vez de
exclusão física ao conciliar CRUD e rastreabilidade.

## Publicação, documentação e ferramentas

1. **Código só local:** remoto lista exclusivamente main dd136bf e oito documentos. PRs
   abertos/fechados retornaram lista vazia. Não há revisão ou merge das suas implementações.
2. **Main sem proteção:** API GitHub da branch retornou protected=false, enquanto a metodologia
   exige main protegida. Ajuste é da administração/líder; nada foi alterado nesta auditoria.
3. **AGENTS oficial ausente:** o arquivo local é nosso e está untracked. A líder o cita como
   fonte principal, mas não consta no remoto. Solicitar que ela publique/valide o original.
4. **Relatórios locais fora do Git:** AGENTS.md e seis relatórios/manifestos locais antes desta
   auditoria incluem arquivos untracked (conferir git status). Eles não estão disponíveis ao
   grupo automaticamente. Selecionar o que compartilhar, sem publicar arquivos pessoais em lote.
5. **Dois estados com papéis distintos:** ESTADO.md raiz é original da líder; docs/ESTADO.md é
   acompanhamento local. Consolidar a execução via PR, preservando a autoria/documentação dela.
6. **README só título:** ainda faltam instruções ao grupo, comandos, versão Node/pnpm, configuração
   de ambiente e, na entrega, instalação/uso. As instruções locais estão dispersas em docs.
7. **Skills instaladas:** security-best-practices, security-threat-model, gh-fix-ci e
   gh-address-comments presentes; 30 hashes conferidos com docs/SKILLS-INSTALADAS.json.
   São pessoais, não configurações de agentes do grupo. CLI gh não localizado; fluxos dessas
   duas skills GitHub ainda dependem dele/autenticação, embora o conector tenha leitura funcional.
8. **Agentes:** não existem definições executáveis de agentes especializados aprovados no
   repositório. São recomendação de método, não requisito de runtime. MCP/RAG foram avaliados
   como desnecessários ao MVP; não há motivo comprovado para instalá-los para fechar esta auditoria.

## Ordem recomendada para avançar

1. **Fechar o alinhamento da base:** combinar com lefcc o AGENTS oficial, publicar a branch
   para PR/revisão e conferir proteção de main/acesso de willcotil. Não enviar mensagens ou
   alterar permissões automaticamente a partir desta lista.
2. **Aprovar dependências da A2:** propor Zod e um parser/plugin de lint TS compatível com o
   toolchain atual; informar nomes, motivos e links npm antes de instalar, conforme a líder.
3. **Implementar A2 com testes reais:** schemas, resposta IPC, paginação, sessão/perfis,
   colaboradores/usuários e mapa de canais; testar entradas, saídas e exclusão de senha_hash.
4. **Executar A3:** Electron/preload/registry isolados, ping offline e testes de sessão/perfis.
   Alinhar com D a divisão de arquivos de UI para não sobrescrever o design system.
5. **Executar A4:** SQLite e outbox atômica, migrations e testes com banco real em memória/arquivo.
6. **Seguir A5, A6 e A7**, um prompt/resultado/commit por tarefa, sem fazer módulos de B/C/D.
7. **Resolver Docker em paralelo** para o MySQL dev e o sync da semana 2. Não condiciona A2
   ou contratos IPC nem autoriza retomar PostgreSQL/Fastify.
8. Antes do sync, fixar idempotência/ordenação, tombstones e políticas de conflito. Mesmo horário
   ou estoque alterado em PCs desconectados exige revalidação/reconciliação, não promessa de
   consistência global instantânea offline.

## Critério de encerramento desta auditoria

O objetivo de verificar o estado e listar o trabalho faltante foi atendido pelas inspeções,
execuções e matrizes acima. Isso **não** declara o projeto concluído. O próximo desenvolvimento
é A2 revisada; nenhum gate acadêmico ou funcional sem evidência foi marcado como pronto.
