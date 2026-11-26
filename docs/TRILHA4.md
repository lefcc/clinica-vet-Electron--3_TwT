# Trilha 4 (Dev D)

Vacinas, CEP, WhatsApp, orçamentos com PDF, painel inicial, relatórios e CSV. Todos os canais ficam em `app/src/main/ipc/trilha4.ipc.ts` e validam entrada e saída com os contratos de `/shared`.

| Canais | Quem usa |
| --- | --- |
| `dashboard:resumo` | todos (veterinário vê só a própria agenda) |
| `vacinas:fila`, `catalogo_listar`, `catalogo_obter` | todos |
| `vacinas:aplicar` | MASTER e VETERINARIO |
| `vacinas:lembrete_registrar`, `whatsapp:abrir`, `cep:buscar` | MASTER e ATENDENTE |
| `vacinas:catalogo_criar`, `catalogo_atualizar`, `catalogo_inativar` | MASTER |
| `servicos:listar`, `obter` / `orcamentos:*` | MASTER e ATENDENTE |
| `servicos:criar`, `atualizar`, `inativar` | MASTER |
| `relatorios:*`, `csv:*` | MASTER |

## Regras

- Próxima dose = data da aplicação + intervalo de reforço. A fila mostra o que vence de hoje até 3 dias.
- O WhatsApp só abre links `https://wa.me/55...`. Sem internet o lembrete continua pendente.
- O total do orçamento é calculado no main, em centavos, e nunca fica negativo.
- O PDF pergunta onde salvar e leva o aviso "Documento sem valor fiscal".
- CSV separado por `;`. Colunas de clientes: `nome;cpf;telefone;email;cep;logradouro;numero;complemento;bairro;cidade;uf`. Colunas de animais: `cliente_cpf;nome;especie;raca;sexo;data_nascimento;peso_kg;observacoes`. Linhas repetidas ou inválidas são ignoradas.

## Pendências

- Os canais da Trilha 2 (`clientes:*`, `animais:*`, `agendamentos:*`, `consultas:*`) ainda não existem. Por isso os campos "Cliente" e "Animal" das telas de vacina e orçamento aparecem vazios. Enquanto isso, dá para cadastrar clientes e animais pela importação de CSV.
- O número do orçamento é sequencial em cada computador. Dois PCs offline podem repetir o número, o que vira conflito de sincronização.
