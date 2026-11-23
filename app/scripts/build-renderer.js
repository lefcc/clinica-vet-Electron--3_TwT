// Compila o renderer (ES modules) e copia HTML/CSS para dist/renderer.
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const origem = path.join(raiz, 'src', 'renderer');
const destino = path.join(raiz, 'dist', 'renderer');

execSync('pnpm exec tsc -p tsconfig.renderer.json', { cwd: raiz, stdio: 'inherit' });

fs.cpSync(path.join(origem, 'css'), path.join(destino, 'css'), { recursive: true });

const html = fs
  .readFileSync(path.join(origem, 'index.html'), 'utf8')
  .replace('./ts/main.ts', './ts/main.js');
fs.writeFileSync(path.join(destino, 'index.html'), html);

console.log('Renderer compilado em dist/renderer');
