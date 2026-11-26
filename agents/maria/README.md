# Agente da Maria — Trilha 3: Suprimentos, Estoque FEFO, Alertas e Dólar

> **Desenvolvedor 3 (Maria)** — Responsável por: Medicamentos, Fornecedores, Estoque, Alertas, Dólar

---

## Status
**Pasta reservada — Aguardando Maria iniciar**

---

## Responsabilidades da Trilha 3 (resumo do PLANO_4_TRILHAS)

### Objetivo
Gestão de Medicamentos, Fornecedores (Nacional/Importado com comparativo em Dólar), Movimentações de Estoque Append-Only (FEFO) e Motor de Alertas de Estoque Crítico.

### Arquivos Principais para Criar

#### Mocks Front-end
- `app/src/renderer/ts/lib/mocks/trilha3.mock.ts`

#### Front-end (páginas)
- `app/src/renderer/ts/pages/medicamentos/medicamentos.ts`
- `app/src/renderer/ts/pages/fornecedores/fornecedores.ts`
- `app/src/renderer/ts/pages/estoque/estoque.ts`

#### Backend (app/src/main/modules/)
- `medicamentos/` — repository, service, test
- `fornecedores/` — repository, service, test
- `dolar/` — service, test
- `estoque/` — repository, service, test
- `alertas/` — service, test
- `ipc/trilha3.ipc.ts`

#### IPC da Trilha 3
- `medicamentos:listar|obter|criar|atualizar|inativar` — Erro `MEDICAMENTO_DUPLICADO` (nome + unidade)
- `fornecedores:listar|obter|criar|atualizar|inativar|precos_listar|precos_salvar|precos_inativar`
- `dolar:atual` — AwesomeAPI + fallback cache
- `estoque:saldos|lotes|movimentar` — FEFO, append-only, cálculo dias_restantes
- `alertas:listar|contar` — status CRITICO/ATENCAO/OK

### Regras de Negócio-Chave
- **Medicamentos**: unicidade nome + unidade, escrita só MASTER
- **Fornecedores**: comparativo USD → BRL em centavos, ordenar mais barato, marcar `mais_barato: true`
- **Dólar**: buscar AwesomeAPI, salvar em `cotacoes_dolar` (centavos), fallback offline → última salva
- **Estoque**: saldo = soma movimentações; consumo_medio = saídas 30d ÷ 30 (ou `consumo_inicial_diario` se < 7d); FEFO na saída; AJUSTE grava diferença
- **Alertas**: 1 alerta aberto por medicamento com status CRITICO (dias_restantes <= dias_alerta)

---

## Integração Final
Em `app/src/main/main.ts`:
```ts
registrarTrilha3Ipc(conexao);  // ← Maria adiciona esta linha
```

---

## Referência Completa
Ver `PLANO_4_TRILHAS.pdf` — Seção "TRILHA 3 (Dev C)".