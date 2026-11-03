# A1 — Fundação do monorepo

Responsável: Cir0Arruda, DEV 1 / Dev A. Referência: A1 de PROMPTS-SEMANA-1.md enviado pela lefcc.

## Entrega

- Três workspaces privados: shared, server e desktop.
- TypeScript estrito herdado de uma configuração base e entradas vazias sem regra de negócio.
- ESLint e Prettier compartilhados, scripts recursivos, modelos de ambiente e exclusões Git.
- Vínculo local `workspace:*` para @clinica/shared nos consumidores.
- Contexto provisório claramente identificado; os originais da líder não foram alterados.
- Sem Fastify, banco, Electron, React, Zod, auth ou módulos de B/C/D nesta etapa.

## Ferramentas

Foram consultados versão, publicação, engines, peers e downloads semanais no registry/npm antes
da instalação. As quatro dependências diretas de desenvolvimento são typescript 7.0.2,
eslint 10.14.0, prettier 3.9.10 e vitest 4.1.12. Dependências transitivas pertencem a essas
ferramentas; auto-instalação de peers está desativada. O lockfile registra a resolução efetiva.

Vitest foi fixado na linha 4: a linha 5 consultada exige Vite como peer externo e não inicia
sem ele. A versão 4.1.12 declara Vite como dependência própria, preservando as quatro
dependências diretas permitidas pela A1. Isso não instala/cria o app Vite ou Electron.

Node validado: 24.19.0; pnpm: 11.25.0. O projeto fixa a linha Node 24 LTS para o grupo.

## Execução

```sh
pnpm install --frozen-lockfile
pnpm check
```

Ou, para seguir os prompts separadamente:

```sh
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm format:check
```

O comando `pnpm lint` também verifica o arquivo de configuração compartilhado.

## Limites explícitos

Vitest ainda pode terminar sem encontrar testes, por opção explícita dos esqueletos. Não há
cobertura de negócio nem teste real de aplicação nesta entrega. O teste health nasce na A2.
ESLint usa parser padrão nesta A1: analisa os esqueletos, não suporta ainda anotações TypeScript
ou JSX. A adoção do parser TS deve entrar na tarefa apropriada, sem adicionar uma quinta
dependência direta escondida na A1. Não confundir lint básico com análise tipada completa.

Não existe ainda servidor para iniciar nem app Electron para abrir. A1 fornece a base de
ferramentas; a A2 fará servidor/banco, a A3 contratos, e A7 o Electron.

O CONTEXTO.md original segue pendente. O usuário informou o e-mail de autoria; o nome Git
adotado é seu identificador confirmado, Cir0Arruda, somente na configuração local. Não criar
commit de outra pessoa, adiantar A2 sem fechar esta tarefa ou publicar na main.

## Evidências

- `pnpm install --frozen-lockfile`: instalação reproduzível sem mudança no lockfile.
- `pnpm -r typecheck`: três pacotes passam.
- `pnpm lint`: configuração e três pacotes passam.
- `pnpm -r test`: runner inicia nos três pacotes; **zero testes**, tolerados só no esqueleto.
- `pnpm peers check`: nenhum conflito ou peer obrigatório ausente.
- Resolução de @clinica/shared verificada a partir de server e desktop: ambos apontam para
  `shared/src/index.ts`, sem pacote homônimo vindo do registry.
- `pnpm format:check`: valida os arquivos da A1. O README original e os relatórios anteriores
  foram excluídos da formatação para preservar o trabalho já existente.
- `pnpm check`: cadeia completa executada com saída 0.
- `git diff --check`: sem erros de whitespace; README original sem alterações.
- `.gitattributes` mantém LF em Windows/Linux para evitar divergência com Prettier no grupo.

O primeiro ensaio de Vitest 5 falhou por faltar o peer Vite. A seleção foi corrigida para
Vitest 4.1.12 e o runner passou a iniciar. O verificador de formatação também detectou o
README original sem formatação Prettier; ele foi preservado, sem alterá-lo nesta tarefa.
