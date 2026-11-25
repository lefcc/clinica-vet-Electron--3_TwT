const { spawnSync } = require('node:child_process');
const { dirname } = require('node:path');
const { rebuild } = require('electron-rebuild');
const electron = require('electron');
const { version: electronVersion } = require('electron/package.json');

async function prepararSqlite() {
  // A dependência pode estar no node_modules da raiz do workspace.
  const buildPath = dirname(require.resolve('better-sqlite3/package.json'));
  await rebuild({ buildPath, electronVersion, onlyModules: ['better-sqlite3'] });
  const teste = spawnSync(electron, ['-e', "new (require('better-sqlite3'))(':memory:').close()"], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  });
  if (teste.status !== 0) throw teste.error ?? new Error('O módulo SQLite não abriu no Electron.');
}

prepararSqlite().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
