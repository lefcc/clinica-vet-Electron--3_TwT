const { spawnSync } = require('node:child_process');
const path = require('node:path');
const electron = require('electron');

// O postinstall prepara o better-sqlite3 para o ABI do Electron.
const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const resultado = spawnSync(electron, [vitest, 'run', '--pool=forks', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  windowsHide: true
});
if (resultado.error) console.error(resultado.error.message);
process.exitCode = resultado.status ?? 1;
