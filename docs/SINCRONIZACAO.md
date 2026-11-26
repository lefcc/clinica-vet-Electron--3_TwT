# Sincronização e instalação da Trilha 1

Cada PC grava primeiro no SQLite. O worker executa no processo principal ao abrir, a cada 60 segundos e na reconexão observada pelo Electron. A interface pode continuar atendendo com o SQLite enquanto o MySQL estiver indisponível. Sem configuração do MySQL, o aplicativo abre em modo local.

O MySQL registra as alterações aceitas em `sync_mudancas`. A versão da última alteração recebida fica em `sync_estado` no SQLite. O pull grava cada alteração ou conflito junto da sua marca de leitura. A operação tem uma chave estável, então uma resposta perdida depois do commit não duplica a gravação.

O servidor verifica a edição concorrente, CPF e login duplicados, sobreposição de agenda, saldo de estoque e último MASTER dentro da transação. O MASTER pode reenviar o registro local com base na versão conferida ou aceitar a versão central. Se um CPF ou login já pertencer a outro registro, corrija o cadastro local e reenvie. Isso preserva os vínculos existentes. Ao aceitar o central por agenda sobreposta, o horário novo rejeitado é cancelado no SQLite. Uma saída de estoque nova e rejeitada pode ser estornada localmente quando não estiver vinculada a uma consulta.

## Preparar o MySQL 8.4

Use um banco exclusivo do ambiente. Em um banco vazio, aplique `0000_entidades.sql` e depois `0001_sync.sql` da pasta `app/src/main/db/central/migrations`. Em um banco que já tem as 22 tabelas de domínio, aplique apenas a segunda migration após conferir que o schema corresponde ao do app. A primeira sincronização publica os registros existentes seguindo a ordem das chaves estrangeiras.

As migrations devem rodar com a conta de implantação. A conta do aplicativo requer SELECT, INSERT e UPDATE no banco da clínica, com TLS. A réplica pressupõe que as escritas da aplicação passam pelo motor de sincronização.

Para desenvolvimento isolado, `docker compose up -d mysql` prepara o MySQL e aplica as duas migrations em um volume vazio. Use `SYNC_HABILITADO=true` e as variáveis `MYSQL_*` da configuração local. O intervalo pode ser ajustado com `SYNC_INTERVAL_MS`.

## Instalação Windows e primeiro acesso

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @clinica-vet/app exec node -e "require(require.resolve('electron/install.js'))"
pnpm --filter @clinica-vet/app build --win nsis --x64 --publish never
```

Use o pnpm 9.6.0, conforme o `package.json`. O instalador fica em `app/release/Clinica-Veterinaria-Setup-1.0.0.exe`. O build prepara o módulo nativo para a versão do Electron antes de empacotar.

Em um banco novo, provisione o primeiro administrador em um único PC. Antes da primeira abertura, forneça `SEED_MASTER_LOGIN`, `SEED_MASTER_SENHA`, `SEED_MASTER_NOME` e `SEED_MASTER_CPF` como variáveis do processo. A senha precisa ter de 8 caracteres a 72 bytes. Depois do primeiro acesso, retire essas variáveis do ambiente. A versão instalada cria a conta no SQLite e a inclui na fila, mesmo antes de configurar o MySQL. As alterações chegam aos demais PCs quando a conexão estiver configurada e disponível. Nesses PCs, abra o app com o MySQL configurado e faça o primeiro login depois da replicação da conta.

Se a conta inicial foi criada com o instalador anterior, sem MySQL configurado, abra **Colaboradores** no primeiro PC. Edite e salve o administrador existente para incluir o cadastro e a conta na fila antes de configurar o MySQL.

Na versão instalada, forneça `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` e, se a CA for privada, `MYSQL_TLS_CA_ARQUIVO`. Execute uma vez o executável com `--configurar-mysql`, na conta Windows que usará o aplicativo. O programa grava as credenciais criptografadas pelo `safeStorage` na pasta de dados do usuário. Remova as variáveis que contêm segredos do ambiente depois do comando. Na abertura seguinte, a conexão usa TLS com verificação da cadeia e do nome do servidor.

Credenciais e migrações de produção são administradas pelo grupo. Para verificar dois perfis em uma máquina, use diretórios distintos com `--user-data-dir=<pasta-absoluta>`.

## Testar

Execute `pnpm -r typecheck`, `pnpm -r lint` e `pnpm -r test`. A suíte de integração usa bancos SQLite em arquivo e uma instância MySQL isolada. Depois de aplicar as duas migrations em um schema vazio com prefixo `teste_sync_`, passe `TESTE_MYSQL_SYNC_PORTA` e `TESTE_MYSQL_SYNC_BANCO` para rodar a integração. Se o servidor exigir TLS com CA privada, passe o conteúdo PEM em `TESTE_MYSQL_SYNC_CA`. O teste usa exclusivamente a interface de loopback e a conta root do servidor descartável.

O workflow `Validação da Trilha 1` testa as migrations do contêiner MySQL e gera o NSIS em uma VM Windows nova. O teste verifica a fila do primeiro acesso sem MySQL, login offline nos três perfis, as permissões de backup e a reabertura do cofre. O instalador aprovado fica disponível nos artefatos da execução.
