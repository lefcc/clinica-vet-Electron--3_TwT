# Contexto vigente

O contexto original da lefcc foi integrado sem alterações na raiz:
[CONTEXTO.md](../CONTEXTO.md). Ele é a referência de produto, arquitetura e contratos.
Este arquivo é apenas um ponteiro, não uma segunda versão independente.

Modelo atual: `/shared` + `/app`, Electron main/IPC, SQLite local e sincronização MySQL.
Renderer em HTML/CSS/TypeScript puro. Sem servidor HTTP, Fastify, PostgreSQL ou JWT.

O AGENTS.md oficial mencionado pela líder ainda não foi publicado no commit remoto
dd136bf. O AGENTS.md local deste chat não deve ser atribuído à lefcc.

Estado local: [ESTADO.md](ESTADO.md). Detalhes desta correção:
[CORRECAO-A1-OFFLINE-FIRST.md](CORRECAO-A1-OFFLINE-FIRST.md).
