import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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

const reserva = createServer();
await new Promise((pronto, falhou) => {
  reserva.once('error', falhou);
  reserva.listen(0, '127.0.0.1', pronto);
});
const porta = reserva.address().port;
await new Promise((pronto) => reserva.close(pronto));
const login = 'qa_instalador';
const senha = randomUUID();
const app = spawn(
  join(destino, nomeExecutavel),
  ['--user-data-dir=' + perfil, '--remote-debugging-port=' + porta, '--remote-debugging-address=127.0.0.1'],
  {
    cwd: raiz,
    env: {
      ...process.env,
      NODE_PATH: '',
      SEED_MASTER_LOGIN: login,
      SEED_MASTER_SENHA: senha,
      SEED_MASTER_NOME: 'Administrador QA',
      SEED_MASTER_CPF: '52998224725'
    }
  }
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
  await pagina.setOfflineMode(true);
  const usuario = 'input[name="login"]';
  await pagina.waitForSelector(usuario, { timeout: 10_000 });
  assert.equal(await pagina.evaluate(() => navigator.onLine), false);
  await pagina.type(usuario, login);
  await pagina.type('input[name="senha"]', senha);
  await pagina.click('.login__form button[type="submit"]');
  await pagina.waitForFunction(() => !document.querySelector('.login__form'), { timeout: 10_000 });
  const estado = await pagina.evaluate(() => window.api['sync:estado']());
  assert.equal(estado.ok, true);
  assert.equal(estado.dados.estado, 'local');
  const backup = await pagina.evaluate(() => window.api['backup:criar']());
  assert.equal(backup.ok, true);
  assert.ok((await readdir(join(perfil, 'backups'))).some((arquivo) => arquivo.endsWith('.sqlite')));
  console.log('NSIS verificado em Windows sem instalação anterior: login MASTER e backup SQLite offline.');
} finally {
  navegador?.disconnect();
  app.kill();
}
