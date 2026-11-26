const { cpSync } = require('node:fs');
const { join } = require('node:path');

const app = join(__dirname, '..');
const migrations = 'main/db/local/migrations';
cpSync(join(app, 'src', migrations), join(app, 'dist', migrations), { recursive: true });
