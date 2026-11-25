const { spawnSync } = require('node:child_process');
const { dirname, join, isAbsolute } = require('node:path');
const electron = require('electron');

if (!process.env.SQLITE_PATH || !isAbsolute(process.env.SQLITE_PATH)) {
  console.error('Defina SQLITE_PATH com o caminho absoluto do banco SQLite de desenvolvimento.');
  process.exit(1);
}

const kit = join(dirname(require.resolve('drizzle-kit')), 'bin.cjs');
const resultado = spawnSync(electron, [kit, process.argv[2], '--config=drizzle.config.ts'], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
});
if (resultado.error) console.error(resultado.error.message);
process.exitCode = resultado.status ?? 1;
