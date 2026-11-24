# Varredura do modo offline

A verificação usou a branch `feat/trilha1-dev-a`, base `82e8c47`, e conferiu a lista de chamadas expostas pelo preload contra os handlers efetivamente registrados pelo Electron. O perfil de teste e os bancos eram isolados.

## Correções da Trilha 1

| Sintoma ou risco | Correção verificada |
| --- | --- |
| O topo mostrava problema ao voltar à rede. | O canal `sync:estado` passou a consultar as pendências do SQLite. O indicador diferencia fila vazia em modo local, pendências, falha e envios confirmados. Uma resposta antiga não substitui o aviso offline. |
| Uma tela lenta podia aparecer por cima da rota atual. | O roteador aplica somente a resposta da navegação mais recente e mostra uma mensagem quando a tela falha. |
| Uma resposta de sessão expirada podia interromper um login mais recente. | A ponte da interface verifica qual sessão iniciou a chamada antes de redirecionar. |
| A senha cadastrada podia perder espaços nas extremidades. | A interface e o cadastro inicial preservam a senha. A conta inicial valida o limite de 72 bytes do bcrypt antes da gravação. |
| Configuração numérica inválida do MySQL podia impedir o início offline. | Campos numéricos inválidos usam valores padrão. Se o banco local não abrir, a aplicação avisa e encerra a inicialização, pois os canais de login ainda não foram registrados. |
| Uma falha no envio podia confirmar uma operação posterior à que falhou. | O push preserva a ordem da fila, registra a falha e deixa as operações pendentes. A restauração e a resolução de conflito aguardam um envio em curso para evitar trocar a fila durante a confirmação. |

## O que ainda falta no aplicativo

O Electron expôs 82 chamadas no preload e registrou 18 handlers. Os 18 são login, sessão e saída, 14 operações administrativas e o indicador de fila. Os demais aparecem como funções em desenvolvimento também com a rede disponível.

| Área | Canais sem handler | Funções afetadas |
| --- | ---: | --- |
| Painel e integrações | 4 | Resumo do início, ViaCEP, dólar e WhatsApp. |
| Clientes e animais | 11 | Cadastros, consulta e lista de animais do cliente. |
| Medicamentos e fornecedores | 13 | Cadastros e preços. |
| Agenda e consultas | 9 | Atendimento, agenda por veterinário e histórico clínico. |
| Estoque e alertas | 5 | Saldos, lotes, movimentações e sino de alertas. |
| Vacinas | 8 | Catálogo, aplicações e lembretes. |
| Serviços e orçamentos | 9 | Catálogo, orçamento e PDF. |
| Relatórios e CSV | 5 | Cobranças, validade, compras, importação e exportação. |

Na plataforma, a fila local e o envio explícito estão operacionais. A aplicação ainda precisa iniciar um worker de sincronização com configuração do grupo, receber alterações de outros PCs por pull e detectar conflitos automaticamente. A tela do MASTER resolve conflitos que já estejam registrados no SQLite. A instalação em máquina limpa e o primeiro acesso de produção ainda precisam de validação. O repositório não publicou release e o ícone indicado pelo instalador está ausente na árvore.

## Como a varredura foi confirmada

- No Electron, bloqueio de HTTP e HTTPS do renderer antes da janela, conexão do renderer simulada como offline e MySQL local indisponível. Login, cadastro com senha contendo espaços, auditoria e backup funcionaram. O cadastro e o backup continuaram disponíveis após fechar e reabrir o app offline.
- Na transição de volta à rede, o indicador leu a fila. Uma resposta de sync atrasada foi entregue depois de outra queda de rede e o topo permaneceu no estado offline. A resposta tardia do painel também não substituiu a Agenda mais recente.
- No MySQL 8.4 isolado, a primeira tentativa com o servidor parado manteve oito operações pendentes. Depois de iniciar o servidor, o envio explícito confirmou as oito em ordem. Uma segunda tentativa encontrou a fila vazia.
- O relatório aponta a branch de revisão. A `main` remota observada na varredura ainda continha a base do frontend e do login, antes das mudanças administrativas do PR #3.
- `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` (55 testes) e `pnpm --filter @clinica-vet/app build:tsc` passaram.
