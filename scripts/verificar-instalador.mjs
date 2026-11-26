import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as aguardar } from 'node:timers/promises';
import puppeteer from 'puppeteer';

const instalador = resolve('app/release/Clinica-Veterinaria-Setup-1.0.0.exe');
const raiz = await mkdtemp(join(tmpdir(), 'clinica-instalador-'));
const destino = join(raiz, 'app');
const perfil = join(raiz, 'perfil');

// A verificação deve começar em uma máquina sem instalação anterior do produto.
for (const hive of ['HKCU', 'HKLM']) {
  const chave = hive + '\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall';
  const busca = spawnSync('reg.exe', ['query', chave, '/s', '/f', 'Clínica Veterinária', '/d', '/e']);
  assert.equal(busca.status, 1, 'A máquina já tem uma instalação da Clínica Veterinária.');
}

const instalacao = spawnSync(instalador, ['/S', '/D=' + destino], {
  windowsVerbatimArguments: true,
  windowsHide: true,
  timeout: 120_000
});
assert.equal(instalacao.status, 0, 'O NSIS não concluiu a instalação.');
const nomeExecutavel = (await readdir(destino)).find((nome) => nome.endsWith('.exe') && !nome.startsWith('Uninstall'));
assert.ok(nomeExecutavel, 'O NSIS não extraiu o aplicativo.');
const executavel = join(destino, nomeExecutavel);
const ambiente = { ...process.env, NODE_PATH: '' };
for (const nome of Object.keys(ambiente)) {
  if (nome.startsWith('MYSQL_') || nome.startsWith('SEED_MASTER_')) delete ambiente[nome];
}

async function testarJanela(diretorio, variaveis, testar) {
  const reserva = createServer();
  await new Promise((pronto, falhou) => {
    reserva.once('error', falhou);
    reserva.listen(0, '127.0.0.1', pronto);
  });
  const porta = reserva.address().port;
  await new Promise((pronto) => reserva.close(pronto));
  const app = spawn(
    executavel,
    ['--user-data-dir=' + diretorio, '--remote-debugging-port=' + porta, '--remote-debugging-address=127.0.0.1'],
    { cwd: raiz, env: { ...ambiente, ...variaveis } }
  );
  let navegador;
  try {
    const limite = Date.now() + 30_000;
    while (!navegador && Date.now() < limite && app.exitCode === null) {
      navegador = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + porta }).catch(() => undefined);
      if (!navegador) await aguardar(300);
    }
    assert.ok(navegador, 'O aplicativo instalado não abriu.');
    const tela = await navegador.waitForTarget((alvo) => alvo.type() === 'page' && alvo.url().startsWith('file:'), {
      timeout: 15_000
    });
    const pagina = await tela.page();
    await pagina.waitForSelector('input[name="login"]', { timeout: 10_000 });
    await testar(pagina);
  } finally {
    navegador?.disconnect();
    app.kill();
  }
}

async function entrar(pagina, login, senha) {
  const usuario = 'input[name="login"]';
  await pagina.waitForSelector(usuario, { timeout: 10_000 });
  await pagina.type(usuario, login);
  await pagina.type('input[name="senha"]', senha);
  await pagina.click('.login__form button[type="submit"]');
  await pagina.waitForFunction(() => !document.querySelector('.login__form'), { timeout: 10_000 });
}

const login = 'qa_instalador';
const senha = randomUUID();
await testarJanela(
  perfil,
  {
    SEED_MASTER_LOGIN: login,
    SEED_MASTER_SENHA: senha,
    SEED_MASTER_NOME: 'Administrador QA',
    SEED_MASTER_CPF: '52998224725'
  },
  async (pagina) => {
    const cdp = await pagina.createCDPSession();
    // O Chromium do Electron 30 usa o comando original do CDP.
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });
    await pagina.waitForFunction(() => !navigator.onLine, { timeout: 10_000 });
    await entrar(pagina, login, senha);
    const estado = await pagina.evaluate(() => window.api['sync:estado']());
    assert.equal(estado.ok, true);
    assert.equal(estado.dados.estado, 'local');
    const banco = new DatabaseSync(join(perfil, 'clinica-vet.sqlite'), { readOnly: true });
    try {
      const iniciais = banco
        .prepare('SELECT tabela FROM sync_outbox WHERE enviado_em IS NULL ORDER BY id LIMIT 2')
        .all();
      assert.deepEqual(
        iniciais.map(({ tabela }) => tabela),
        ['colaboradores', 'usuarios'],
        'A primeira conta deve ficar na fila mesmo sem configurar o MySQL.'
      );
    } finally {
      banco.close();
    }
    const backup = await pagina.evaluate(() => window.api['backup:criar']());
    assert.equal(backup.ok, true);
    assert.ok((await readdir(join(perfil, 'backups'))).some((arquivo) => arquivo.endsWith('.sqlite')));

    const perfis = [
      {
        nome: 'Veterinária QA',
        login: 'qa_veterinaria',
        cpf: '11144477735',
        cargo: 'Veterinária',
        crmv: 'QA-123',
        perfil: 'VETERINARIO',
        senha: randomUUID()
      },
      {
        nome: 'Atendente QA',
        login: 'qa_atendente',
        cpf: '39053344705',
        cargo: 'Atendente',
        perfil: 'ATENDENTE',
        senha: randomUUID()
      }
    ];
    for (const cadastro of perfis) {
      const criado = await pagina.evaluate((dados) => window.api['colaboradores:criar'](dados), cadastro);
      assert.equal(criado.ok, true);
    }
    for (const conta of perfis) {
      await pagina.click('button.sair');
      await entrar(pagina, conta.login, conta.senha);
      const respostas = await pagina.evaluate(async () => ({
        sessao: await window.api['auth:sessao'](),
        backup: await window.api['backup:listar'](),
        sincronizacao: await window.api['sync:estado']()
      }));
      assert.equal(respostas.sessao.dados.perfil, conta.perfil);
      assert.equal(respostas.backup.erro?.codigo, 'SEM_PERMISSAO');
      assert.equal(respostas.sincronizacao.dados.estado, 'local');
    }
    console.log('NSIS verificado em Windows limpo com os três perfis offline, fila inicial e backup do MASTER.');
  }
);

const perfilCofre = join(raiz, 'perfil-cofre');
const senhaMysql = randomUUID();
const provisionamento = spawnSync(executavel, ['--user-data-dir=' + perfilCofre, '--configurar-mysql'], {
  cwd: raiz,
  env: {
    ...ambiente,
    MYSQL_HOST: '127.0.0.1',
    MYSQL_PORT: '1',
    MYSQL_USER: 'qa',
    MYSQL_PASSWORD: senhaMysql,
    MYSQL_DATABASE: 'qa'
  },
  timeout: 15_000
});
assert.equal(provisionamento.status, 0, 'O provisionamento MySQL falhou.');
const cofre = await readFile(join(perfilCofre, 'mysql.credenciais'));
assert.ok(!cofre.includes(Buffer.from(senhaMysql)), 'A senha MySQL foi gravada sem criptografia.');
await testarJanela(perfilCofre, {}, async () => {
  // No perfil vazio, a tela só abre sem seed se a conexão central foi habilitada pelo cofre.
  console.log('O NSIS reabriu com as credenciais do safeStorage em um novo processo.');
});
