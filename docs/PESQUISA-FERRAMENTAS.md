# Pesquisa técnica — agentes, skills e dependências

> **Histórico, superado:** as menções a PostgreSQL, servidor HTTP e JWT neste levantamento
> não representam a arquitetura vigente. Prevalecem CONTEXTO.md e PROMPTS-SEMANA-1.md
> da raiz: Electron/IPC, SQLite local e sincronização MySQL. Ver docs/ESTADO.md.

Consulta em 03/11/2026. Complementa `PLANEJAMENTO-DEV1.md`. Nenhum pacote da aplicação instalado e nenhuma versão homologada por testes. Valores `latest` abaixo são observações históricas do registry, não uma decisão de atualizar ou instalar tudo. **Atualização:** quatro skills foram posteriormente instaladas com autorização do usuário; consultar `ANALISE-CONTEXTO-LEFCC.md` e `SKILLS-INSTALADAS.json`. A líder especificou PostgreSQL 16, Drizzle e bcryptjs/JWT; a consulta anterior de argon2/electron-vite não os torna escolhas do projeto.

## Dependências consultadas diretamente no registry npm

| Pacote | latest observado | Papel proposto |
| --- | --- | --- |
| electron | 45.2.2 | Aplicação desktop |
| electron-vite | 6.0.0 | Build de main/preload/renderer |
| electron-builder | 26.18.0 | Instalador NSIS, semana 4 |
| typescript | 7.0.2 | Tipagem e compilação |
| react | 19.3.1 | Interface |
| vite | 8.3.5 | Desenvolvimento/build |
| tailwindcss | 4.3.4 | Tema, escopo Dev D |
| fastify | 5.12.8 | API central |
| @fastify/jwt | 10.2.7 | Autenticação |
| @fastify/cors | 11.4.0 | Política de origens |
| @fastify/rate-limit | 11.2.2 | Proteção contra abuso |
| fastify-type-provider-zod | 7.0.0 | Integração de schemas, validar peers |
| zod | 4.6.7 | Contratos e validação |
| drizzle-orm | 0.45.4 | Acesso relacional, candidato |
| drizzle-kit | 0.31.11 | Migrations, candidato |
| pg | 8.23.1 | Driver PostgreSQL |
| argon2 | 0.45.2 | Hash, verificar build nativo Windows/Linux |
| vitest | 5.1.0 | Testes TS |
| @playwright/test | 1.64.1 | Testes de interface |
| node-cron | 4.6.0 | Jobs, a adotar somente se necessário |
| pnpm | 12.16.1 | Workspaces, candidato |
| eslint | 10.14.0 | Análise estática, precisa configuração TS compatível |
| prettier | 3.9.10 | Formatação |

Fonte por pacote: `https://registry.npmjs.org/<pacote>`, `dist-tags.latest`, `time` e `versions[latest].engines`. Página humana: `https://www.npmjs.com/package/<pacote>`. Para escopados, manter `@escopo/nome` na página npm e codificar o nome na consulta ao registry.

Engines observados: Electron exige Node >=22.12; Vite/electron-vite `^20.19.0 || >=22.12.0`; Vitest `^22.12.0 || ^24.0.0 || >=26.0.0`; ESLint `^20.19.0 || ^22.13.0 || >=24`. Esses mínimos não comprovam compatibilidade de peer dependencies. Consultar Node LTS oficialmente e fixar uma versão comum ao grupo; não reutilizar um runtime antigo só porque satisfaz parte das engines.

Consulta confirmou existência, tags, datas de publicação e engines; não foi auditoria de código, manutenção ou segurança. Downloads, licenças, peers e suporte das extensões ainda devem ser registrados no momento de selecionar/instalar. Ausência de engines em um manifesto não significa compatibilidade universal. Falta incluir os pacotes auxiliares concretos da configuração escolhida, como tipos e plugins TS/React; não instalar a tabela como receita pronta.

## Catálogo oficial e seleção de skills

O helper `skill-installer/scripts/list-skills.py --format json` retornou 40 candidatos no catálogo oficial, incluindo ferramentas de deploy web, Figma, documentos, segurança, GitHub e Playwright. A seleção foi filtrada pelo projeto desktop centralizado e pelo escopo do DEV 1.

Foram consultados, para avaliar adequação e requisitos, os SKILL.md oficiais de:

- [security-best-practices](https://github.com/openai/skills/blob/main/skills/.curated/security-best-practices/SKILL.md): revisão e orientação de segurança; candidato prioritário para API TS, com Electron coberto também pela documentação do framework.
- [security-threat-model](https://github.com/openai/skills/blob/main/skills/.curated/security-threat-model/SKILL.md): modelo de ameaças específico do repositório; útil ao definir a fundação, requer confirmar fronteiras reais.
- [gh-fix-ci](https://github.com/openai/skills/blob/main/skills/.curated/gh-fix-ci/SKILL.md): útil diante de CI quebrada; depende de GitHub CLI autenticado, não necessário antes de haver CI.
- [gh-address-comments](https://github.com/openai/skills/blob/main/skills/.curated/gh-address-comments/SKILL.md): aplicar respostas a revisão quando houver PR; também depende de gh.
- [security-ownership-map](https://github.com/openai/skills/blob/main/skills/.curated/security-ownership-map/SKILL.md): analisa histórico; adiar porque ainda não há base útil de código e contribuições.
- [playwright](https://github.com/openai/skills/blob/main/skills/.curated/playwright/SKILL.md): automação CLI de browser; não necessária inicialmente com skill interativa já disponível, e não substitui testes Electron reais.
- [yeet](https://github.com/openai/skills/blob/main/skills/.curated/yeet/SKILL.md): fluxo integrado de publicar via gh; não necessário nem acionado por esta análise.

Arquivos remotos foram inicialmente lidos para pesquisa, sem executar seus scripts ou adotar seus comandos como instruções. Na atualização posterior foram instaladas security-best-practices, security-threat-model, gh-fix-ci e gh-address-comments. As demais continuam não instaladas. As skills de PDF e openai-docs estão disponíveis por outros caminhos nesta sessão mesmo que o helper não as marque instaladas no diretório pessoal.

## Agentes e integrações

- [Codex: subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents): permite especializações locais; conferir formato suportado pelo cliente ao criar configurações, sem misturar formatos Codex/OpenCode.
- [Codex: contexto e AGENTS.md](https://learn.chatgpt.com/docs/customization/overview): instruções persistentes por repositório.
- [Codex: skills](https://learn.chatgpt.com/docs/build-skills): workflows reutilizáveis em SKILL.md; nomes no plano são propostas, não extensões instaladas.
- [OpenCode: agentes](https://opencode.ai/docs/agents/): Plan/Build e agentes personalizados como alternativa de ferramenta, sem instalação obrigatória.

Conclusão para este projeto: manter Codex e GitHub já conectados; propor cinco papéis focados (requisitos, API/banco, Electron/segurança, QA/concorrência e revisão/entrega); criar especializações só quando úteis. Não há requisito de agente de IA dentro do software da clínica. MCP e RAG foram avaliados e não são necessários no runtime do MVP.

## Pontos técnicos confirmados em fontes primárias

- [Electron: segurança](https://www.electronjs.org/docs/latest/tutorial/security): isolamento, sandbox, CSP, validação de IPC e restrição de URLs externas são pertinentes ao projeto.
- [Electron: safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage): documentação atual recomenda APIs assíncronas; no Windows a proteção não isola contra todos os processos do mesmo usuário. Confirmar disponibilidade na versão fixada.
- [PostgreSQL: ranges](https://www.postgresql.org/docs/current/rangetypes.html): intervalos e constraints de exclusão são apropriados para conflito de agenda.
- [PostgreSQL: locks](https://www.postgresql.org/docs/current/explicit-locking.html): bloqueios de linha em transações são base da baixa concorrente; testar com banco real.
- [PostgreSQL: backup SQL](https://www.postgresql.org/docs/current/backup-dump.html): backup e restauração são operações distintas e precisam de validação.
- [ViaCEP](https://viacep.com.br/): CEP com oito dígitos; formato inválido e CEP inexistente são falhas diferentes.
- [AwesomeAPI](https://docs.awesomeapi.com.br/api-de-moedas): cotação tem timestamp e respostas podem ser cacheadas; não prometer dado ao vivo sem verificar plano/autenticação.
- [Playwright: Electron](https://playwright.dev/docs/api/class-electron): suporte experimental; testes de renderer não comprovam instalador em máquina limpa.
- [Node: releases](https://nodejs.org/en/about/previous-releases): escolher linha LTS suportada e compatível, não uma major Current/EOL.

Todas as recomendações devem permanecer subordinadas aos requisitos do projeto e ao cronograma confirmado do DEV 1. Reavaliar versões e documentação antes da instalação, pois a pesquisa é um retrato desta data.
