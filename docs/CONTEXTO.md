# Contexto do projeto — base provisória da A1

Este arquivo foi preparado por DEV 1 a partir dos materiais enviados pela lefcc. Não é o
CONTEXTO.md original da líder, que ainda não foi fornecido. Deve ser reconciliado com esse
original antes de definir contratos ou tabelas. Nenhum schema de negócio é fixado aqui.

## 1. Produto

Desktop de gestão da clínica veterinária do Will, para cinco computadores/usuários simultâneos.
Electron acessa a API central por HTTPS; somente a API acessa o PostgreSQL. Sem modo offline
com sincronização, nota fiscal ou WhatsApp automático no MVP.

## 2. Equipe e escopo

- Lefcc: líder e proprietária de `lefcc/clinica-vet-Electron--3_TwT`.
- DEV 1 = Dev A = Cir0Arruda: plataforma, banco, auth, Electron base, revisão e implantação.
- Dev B: núcleo clínico e cadastros de clientes/animais.
- Dev C: medicamentos, fornecedores e estoque.
- Dev D: design system, CEP, comunicação, PDF e UX.

## 3. Stack e estrutura

- pnpm workspaces: `shared`, `server`, `desktop`.
- Node.js 24 LTS, pnpm 11.25.0, versões de ferramentas fixadas no lockfile.
- TypeScript estrito; lógica de negócio em classes no servidor.
- Stack planejada: PostgreSQL 16, Fastify, Drizzle/pg, Zod; bcryptjs, JWT com duração de 8h.
- Desktop planejado: Electron, Vite, React/TS, Tailwind e shadcn/ui.
- `shared/src`: contratos Zod e tipos públicos, sem credenciais nem hashes de senha.
- `server/src/modules/<modulo>`: schema, repository, service, routes e testes.
- `desktop/src`: processos main/preload e renderer. Não misturar privilégios entre camadas.
- `docs`: contexto, decisões, prompts e evidências.

Somente TypeScript, ESLint, Prettier e Vitest são dependências diretas de ferramentas na A1.
Não instalar agora o restante da stack. Os exports de shared apontam para fontes TS para o
tooling do monorepo; não constituem uma distribuição executável em Node puro.

## 4. Convenções

Preservar nomes em português dos prompts e perfis `MASTER`, `VETERINARIO`, `ATENDENTE`.
Formato final de erros, DTOs e schemas depende do CONTEXTO original e dos contratos dos devs.
Uma tarefa por vez, recorte de arquivos claro e nenhuma migração já integrada reescrita.
Contratos → migration → repository → service → rota → testes → hook → tela.

## 5. Validação e Git

```sh
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm lint
pnpm -r test
pnpm format:check
```

Na A1 os fontes são pontos de entrada vazios. Vitest usa `--passWithNoTests` explicitamente
porque ainda não existem regras de negócio. Não é evidência de cobertura. Na A2, criar o
primeiro teste real de health e retirar essa tolerância do pacote server.

O ESLint da A1 verifica a sintaxe dos esqueletos, que é compatível com o parser JavaScript
padrão. Não oferece análise completa de TS/TSX: antes de incluir tipos/JSX, acordar a adição
de parser/plugin apropriado. TypeScript já é checado por `tsc --noEmit` em todos os pacotes.

Branch de trabalho desta etapa: `feat/a1-monorepo`, derivada de `origin/main`. Um commit por
tarefa, com autoria confirmada de Cir0Arruda e revisão humana antes do merge. Não commitar
como lefcc, inventar e-mail ou descartar alterações genéricas com `git restore .`.

## 6. Permissões e segurança planejadas

Autorização no servidor; menu não é controle de acesso. Master administra equipe/configurações;
veterinário atende e acessa diagnóstico; atendente gerencia cadastros/agenda e não vê diagnóstico
detalhado. A matriz final deve seguir os materiais da líder e ser testada nos três perfis.

Na A7: contextIsolation true, nodeIntegration false, sandbox true e IPC mínimo validado. Nenhum
acesso PostgreSQL no cliente. Não colocar senhas, token ou JWT secret no Git. `.env.example`
é somente modelo vazio; `.env` real é ignorado.

## 7. Banco e contratos — ainda não implementados

A4 define colaboradores, usuarios, clientes e animais, após alinhar com o contrato de B.
C cria medicamentos/fornecedores em migration separada. Os campos definitivos não são
inventados nesta A1. A3 exige os contratos base da líder antes dos contratos dos demais devs.

## 8. Regras futuras

Estoque por movimentos, FEFO e transação com bloqueios; agenda sem sobreposição por veterinário.
Cinco sessões nos testes de concorrência. Valores financeiros em centavos. Vacinas com lembrete
semiautomático via wa.me. Registrar com a líder as inconsistências documentadas na análise.

## 9. UI e infraestrutura

Cores da líder: verde #2E7D32, marrom #6D4C41, creme #F7F3EC; textos em português e acessibilidade.
D pode preparar Vite puro enquanto A não chegou à A7; combinar os arquivos de configuração.
Homologação em VPS/domínio na S1; produção com HTTPS, backup diário externo e restauração
verificada na S4. Contratação e calendário ainda precisam de definição do grupo.
