# Agente da Leticia — Trilha 4: Vacinas, WhatsApp, CEP, Orçamentos/PDF, Dashboard e Relatórios

> **Desenvolvedor 4 (Leticia)** — Responsável por: Vacinas, Integrações (CEP, WhatsApp), Orçamentos/PDF, Dashboard, Relatórios/CSV

---

## Status
**Pasta reservada — Aguardando Leticia iniciar**

---

## Responsabilidades da Trilha 4 (resumo do PLANO_4_TRILHAS)

### Objetivo
Fila de Vacinas + Integrações Externas seguras no main (cep:buscar, whatsapp:abrir), Orçamentos com geração de PDF (printToPDF), Painel Inicial (dashboard:resumo) e Relatórios/CSV.

### Arquivos Principais para Criar

#### Mocks Front-end
- `app/src/renderer/ts/lib/mocks/trilha4.mock.ts`

#### Front-end (páginas)
- `app/src/renderer/ts/pages/inicio/inicio.ts`
- `app/src/renderer/ts/pages/vacinas/vacinas.ts`
- `app/src/renderer/ts/pages/orcamentos/orcamentos.ts`
- `app/src/renderer/ts/pages/relatorios/relatorios.ts`

#### Backend (app/src/main/modules/)
- `vacinas/` — repository, service, test
- `atendimentos/` — servicos.repository, orcamentos.repository, orcamentos.service, orcamentos.pdf.ts, test
- `integracoes/` — cep.service.ts, whatsapp.service.ts, integracoes.test.ts
- `relatorios/` — dashboard.service.ts, relatorios.service.ts, csv.service.ts, test
- `ipc/trilha4.ipc.ts`

#### IPC da Trilha 4
- `cep:buscar` — ViaCEP, validar 8 dígitos, erros: `CEP_INVALIDO`, `CEP_NAO_ENCONTRADO`, `SEM_CONEXAO`
- `whatsapp:abrir` — Validar `https://wa.me/55...`, `shell.openExternal` no main
- `vacinas:catalogo_*|fila|aplicar|lembrete_registrar` — `proxima_dose` = data + `intervalo_reforco_dias`; fila = próximos 3 dias
- `servicos:listar|obter|criar|atualizar|inativar` — Escrita só MASTER; leitura MASTER + ATENDENTE
- `orcamentos:listar|obter|criar|pdf` — Total em centavos no main, nº sequencial, PDF com "Documento sem valor fiscal"
- `dashboard:resumo` — `{ agenda_hoje, alertas_estoque, vacinas_proximas, pendencias_sync }` filtrado por perfil
- `relatorios:cobrancas|estoque_validade|lista_compras` + `csv:exportar|importar` — Importar ignora CPF duplicado

### Regras de Negócio-Chave
- **CEP**: ViaCEP no main, nunca no renderer
- **WhatsApp**: Apenas `https://wa.me/55...` via `shell.openExternal` no main
- **Vacinas**: Catálogo + Fila (próximos 3 dias) + Lembrete WhatsApp semiautomático
- **Orçamentos**: Recalcular total no main (centavos), PDF via `printToPDF` com aviso fiscal
- **Dashboard**: Resumo filtrado por perfil (VETERINARIO vê só sua agenda)
- **CSV Import**: Ignorar CPF duplicado, retornar `{ importados, ignorados }`

---

## Integração Final
Em `app/src/main/main.ts`:
```ts
registrarTrilha4Ipc(conexao);  // ← Leticia adiciona esta linha
```

---

## Referência Completa
Ver `PLANO_4_TRILHAS.pdf` — Seção "TRILHA 4 (Dev D)".