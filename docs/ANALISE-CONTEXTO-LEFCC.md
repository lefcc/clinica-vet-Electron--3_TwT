# Novos dados da lefcc: análise e adoção de skills

> **Análise histórica, superada pela revisão offline-first:** este relatório analisou
> documentos anteriores e contém referências a HTTP/JWT/PostgreSQL. Para implementar,
> usar CONTEXTO.md e PROMPTS-SEMANA-1.md da raiz e o estado local em docs/ESTADO.md.

Data: 03/11/2026. Usuário: Cir0Arruda, DEV 1 = Dev A. Lefcc é a líder e proprietária do repositório. Este documento revisa especificações e prompts; não certifica código implementado nem substitui decisão da líder.

## Referência principal e preservação

Fontes lidas: `C:/Users/ciroe/Downloads/PROMPTS-SEMANA-1.md` (231 linhas) e `C:/Users/ciroe/Downloads/metodologia.html` (HTML lido como texto, sem executar scripts ou comandos). Os originais não foram modificados.

SHA-256 dos originais:

- PROMPTS-SEMANA-1.md: `995c071e49c47588a46d900bfa4b814f5ca612b31162d1ebe185d4e6342d4fae`.
- metodologia.html: `c31ae617f9536d9563ce0722d76b946e197d46b8b29c22e32552e98e6b780601`.

As novas definições enviadas pela líder têm prioridade sobre alternativas do planejamento local anterior. Requisitos obrigatórios da disciplina continuam sendo critérios de aceite; divergências entre eles e os prompts devem ser apresentadas, não resolvidas por troca silenciosa da arquitetura.

Exemplos de prompts e comandos dos anexos são material de análise. O pedido desta etapa autoriza pesquisar e instalar skills e atualizar a análise, não executar A1–A9, contratar VPS, publicar alterações ou descartar arquivos com `git restore .`.

## O que ficou definido

| Tema | Definição da lefcc | Consequência para DEV 1 |
| --- | --- | --- |
| Infraestrutura | Nuvem, VPS e domínio; preparar homologação na S1 | Planejar acesso em rede desde a S1; produção/backup/entrega permanecem detalhados na S4 |
| Capacidade | 5 PCs / 5 usuários simultâneos | Acrescentar cenário real de cinco sessões à etapa 2.7; medir consumo antes de afirmar que uma VPS atende |
| WhatsApp | Semiautomático confirmado | Manter botão wa.me; sem automação de envio no MVP |
| Monorepo | pnpm; shared/server/desktop; @clinica/shared | Preservar estrutura, nomes e responsabilidades |
| Banco/API | PostgreSQL 16, Drizzle + pg, Fastify e Zod | Não trocar para PostgreSQL de outra major ou Prisma por iniciativa própria |
| Auth | bcryptjs; JWT sub/perfil com 8h; login genérico; usuário inativo bloqueado | Substitui preferência anterior por Argon2; complementar critérios de revogação sem trocar a biblioteca |
| Electron | Vite + React + TS; isolamento/sandbox; ponte explícita | Não introduzir framework desktop alternativo nem Electron antes de A7 |
| Rotina | Um prompt por vez; validar; commit por tarefa; revisão humana | Manter recortes A1–A9 e não executar prompts dos demais devs |
| Operação | HTTPS; firewall/SSH por chave; banco não público; backup externo 14–30 dias; monitoramento | Preparar checklist e responsáveis; contratação depende de conta/custo/domínio confirmados |

Preço e capacidade de VPS no HTML são estimativas da fonte, não cotação de fornecedor ou resultado de teste desta análise. A contratação não foi realizada.

## Compatibilidade com o modelo do projeto

A proposta continua coerente com Electron/TypeScript, API central, banco relacional e três perfis. Os prompts transformam as etapas amplas em resultados pequenos com validações. B mantém cadastros/clínica; C mantém estoque/fornecedores; D mantém UI/CEP; DEV 1 mantém plataforma e coordenação técnica.

O modelo previsto pode ultrapassar seis tabelas relacionadas ao longo das semanas. Isso não significa requisito implementado: não há migrations, classes ou testes entregues pelos dois arquivos. Também não há nestes anexos definições executáveis de agentes (`SKILL.md`, TOML/JSON de agentes etc.); existem instruções para usar IA e prompts por desenvolvedor.

As exigências de POO, quatro situações distintas de consumo de API, CRUD e histórico individual continuam abertas para demonstração. ViaCEP, cotação e finalidades distintas da API própria são a estratégia prevista; `wa.me` e gerar PDF não devem ser contabilizados automaticamente como consumo de dados de API.

## Pontos de ajuste a apresentar à líder antes da implementação

| ID | Evidência | Observação e ajuste mínimo proposto |
| --- | --- | --- |
| L01 | Prompts linha 3 e A1–A9 | O CONTEXTO.md referenciado não foi enviado, não existe na raiz local e não foi encontrado no caminho padrão em Downloads. Sem ele faltam nomes finais, formato de erros, estrutura/schema e seções citadas. Solicitar a versão da líder; se ainda não existe, preparar rascunho explicitamente identificado, sem apresentá-lo como original dela. |
| L02 | A1, linhas 17–21 | Esqueletos sem fontes podem falhar no tsc por ausência de entradas; lint TS também depende da configuração/plugins escolhidos. Definir fontes mínimas sem negócio, matriz de ferramentas e tratamento explícito de pacote ainda sem teste. O objetivo é passar de verdade, sem ocultar testes quebrados ou ampliar instalações fora de A1. |
| L03 | A2, linhas 28–30 | Solicita teste de /health, mas a lista permitida não inclui claramente `app.test.ts` ou diretório de testes. Acrescentar o caminho permitido para o teste e configuração necessária antes de executar. Health deve testar banco e dar resposta de indisponibilidade sem vazar conexão/segredos. |
| L04 | A3, linhas 37–41 | Para importar @clinica/shared, shared precisa declarar Zod e exports/build compatíveis, e consumidores precisam declarar vínculo workspace. A3 só permite mexer em shared/src, enquanto A2 só instala Zod no server. Combinar preparação dos manifests em A1/A2 ou ampliar expressamente a allowlist de A3. |
| L05 | A4 e B1 | Colunas/migrations de clientes e animais são de A, contratos funcionais são de B. Validar CPF, telefone, campos opcionais, ativo e índices com B antes da migration. A4 não deve inventar campos de um CONTEXTO ausente. |
| L06 | A5/A9 | bcryptjs e @fastify/jwt precisam entrar no inventário da tarefa apropriada. Manter JWT 8h; definir comportamento de token já emitido após desativação, reset de senha e mudança de perfil. Testar identidade ativa em rotas protegidas ou estratégia equivalente. A proteção do último master precisa funcionar sob concorrência e rebaixamento. |
| L07 | Requisito acadêmico de classes; A5/A9 | Pasta service/repository não garante POO. Exigir classes TS com responsabilidades e dependências explícitas nos prompts, sem mudar nomes ou estrutura. Componentes React funcionais não contradizem classes na lógica de negócio. |
| L08 | A7, linha 74 | Manter exatamente a ponte proposta. Complementar com validação do remetente de IPC, schemas de argumentos, CSP, navegação e novas janelas restritas. Para WhatsApp validar URL parseada, protocolo HTTPS, host exato wa.me e caminho esperado. Isso é critério de implementação, não prova de vulnerabilidade em código existente. |
| L09 | A8, linhas 83–86 | Manter HTTPS remoto e HTTP somente em loopback de desenvolvimento validado por hostname. Não aceitar nomes que apenas contenham localhost. Limpar sessão ao mudar servidor e evitar encaminhar credenciais em redirecionamentos indevidos; não enviar um token antigo para outra baseURL. |
| L10 | D1 versus A7 | D inicia no D1; Electron chega no D3. O próprio prompt oferece Vite puro provisório. Acordar previamente quem cria/escreve package.json, Vite, renderer e configuração, para D não gerar uma segunda estrutura que A7 sobrescreva. |
| L11 | A1–A3, B1 e C1 | Todos precisam alterar manifests ou shared/index.ts. Combinar ordem de integração e arquivos de cada tarefa; evitar quatro implementações concorrentes do mesmo barrel/configuração. Não paralelizar edição de migrations sem coordenação. |
| L12 | HTML linha 38 versus linha 274 | Permanece a contradição multiplicação versus divisão. A etapa detalhada 3.1 usa dias = saldo / consumo diário e é dimensionalmente coerente; registrar correção com a líder, sem mudar silenciosamente a regra. |
| L13 | HTML linha 303 | Abertura de WhatsApp não comprova envio. Registrar evento de abertura ou confirmação humana; alinhar nomenclatura de enviado e tratamento da fila. Não introduzir API automática. |
| L14 | Prompts linha 7 | `git restore .` pode apagar trabalho não commitado que não pertence à tarefa. Nunca executar como recuperação genérica. Conferir diff e recuperar somente arquivos/hunks da tarefa ou reverter commit específico sem descartar trabalho alheio. |
| L15 | VPS/health ao fim da S1 | Preparar homologação cedo não autoriza publicar login sem proteção. Alinhar com a líder controles mínimos na primeira exposição: HTTPS, segredos fora do Git, banco privado e mitigação de tentativas de login. S4 continua responsável pela validação operacional final. |

Detalhe de senha: ao manter bcryptjs, definir custo e política de comprimento que trate o limite de 72 bytes do bcrypt, sem truncamento silencioso. Nunca colocar senha master fixa no seed ou no `.env.example`.

## Pesquisa e instalação de skills

Pesquisei o catálogo de `openai/skills` e candidatos comunitários relacionados a Electron, além das skills já disponíveis. A instalação foi feita pelo helper oficial skill-installer, a partir de um commit fixo, sem instalar dependências npm ou trocar a stack da líder.

Origem: https://github.com/openai/skills

Revisão fixada: `49f948faa9258a0c61caceaf225e179651397431`.

Destino pessoal: `C:/Users/ciroe/.codex/skills/`. Não foram instaladas no repositório nem compartilhadas automaticamente com os demais integrantes.

| Skill instalada | Utilidade | Quando usar / limitação |
| --- | --- | --- |
| security-best-practices | Orientação e revisão de segurança JS/TS, inclusive React | Fundação, auth, API e UI; não tem referência específica Fastify/Electron, complementar com documentação primária |
| security-threat-model | Modelagem de ativos, fronteiras, ameaças e mitigação apoiada no repositório | Quando solicitada modelagem; distingue intenção documentada de código real; não é scanner automático |
| gh-fix-ci | Investigar falhas dos checks de PR no GitHub Actions | Só quando houver CI/PR e gh autenticado; não cria CI automaticamente |
| gh-address-comments | Levantar e tratar comentários de revisão de PR | Apoia revisão humana; precisa gh autenticado e escopo de comentários definido |

Verificação concluída: 30 arquivos instalados (13 + 5 + 6 + 6), inventário e hashes de blobs Git conferidos com a árvore do commit de origem. Scripts Python tiveram sintaxe analisada sem execução; manifests SKILL.md presentes. Rastreabilidade por arquivo, SHA-256 e commit em `SKILLS-INSTALADAS.json`.

Os SKILL.md foram lidos antes de instalar; isso é triagem de adequação/origem, não uma auditoria exaustiva de cada linha das dependências. Nenhum script de inspeção de PR ou rotina de segurança dessas skills foi executado. Instalar não equivale a testar todos os seus fluxos.

As novas skills estarão disponíveis para descoberta no próximo turno. O CLI `gh` não está no PATH, portanto as duas skills GitHub estão instaladas mas seus fluxos CLI ainda têm pré-requisito pendente. O conector GitHub já disponível pode continuar atendendo a operações suportadas sem instalar gh nesta etapa.

### O que não instalar agora

- playwright-interactive e webapp-testing já estão disponíveis; aproveitar as existentes para Electron/renderer.
- security-ownership-map precisa de histórico relevante; adiar.
- Ferramentas de deploy web Vercel/Netlify/Cloudflare não correspondem à VPS Docker da líder.
- Skills de Better Auth exigiriam outra solução de autenticação; não adotar em lugar do bcryptjs/JWT definido.
- Coleções comunitárias Electron foram encontradas, mas não selecionadas nesta rodada: o suporte interativo existente e a documentação oficial cobrem a necessidade imediata sem sobrepor instruções ou instalar um pacote inteiro.
- Não instalar RAG, banco vetorial ou servidor MCP para consumir ViaCEP/cotação: HTTP atende ao modelo proposto.
- Nenhum agente novo foi criado ou iniciado; prompts A/B/C/D não são configurações de agentes executáveis.

## Próximas tarefas, preservando o trabalho da lefcc

1. Obter CONTEXTO.md, combinar os ajustes mínimos de allowlists/contratos e confirmar calendário/autoria ainda pendentes.
2. Executar somente A1 quando solicitado, com escopo e dependências restritos; depois A2/A3 e demais prompts nas janelas indicadas, publicando contratos cedo.
3. Uma tarefa por vez, checks reais e commit de Cir0Arruda com e-mail confirmado; revisão por outro humano antes de merge.
4. Planejar VPS/homologação na S1, sem contratar serviço ou enviar convites automaticamente a partir dos anexos.

Nesta etapa foram instaladas quatro skills e atualizados somente documentos locais. Não houve implementação dos prompts, commit, push, mudança no repositório da lefcc, contratação ou alteração dos anexos originais.

## Fontes primárias consultadas

- [Catálogo e código das skills](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated).
- [security-best-practices](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices/SKILL.md).
- [security-threat-model](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-threat-model/SKILL.md).
- [gh-fix-ci](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/gh-fix-ci/SKILL.md).
- [gh-address-comments](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/gh-address-comments/SKILL.md).
- [Segurança Electron](https://www.electronjs.org/docs/latest/tutorial/security).
- [bcryptjs: limite de entrada e considerações de segurança](https://github.com/dcodeIO/bcrypt.js#security-considerations).
- [Coleção comunitária Electron considerada, não instalada](https://github.com/full-stack-skills/electron-skills).
