// scripts/patch-electron.js
// Patch para o pacote electron v25+ que retorna apenas o caminho do binário
// Este script modifica node_modules/electron/index.js para retornar o módulo real
// quando rodando dentro do Electron (process.versions.electron existe)

const fs = require('fs');
const path = require('path');

const electronPkg = path.join(__dirname, '..', 'node_modules', 'electron');
const indexPath = path.join(electronPkg, 'index.js');

const patch = `
const fs = require('fs');
const path = require('path');

const pathFile = path.join(__dirname, 'path.txt');

function getElectronPath() {
  let executablePath;
  if (fs.existsSync(pathFile)) {
    executablePath = fs.readFileSync(pathFile, 'utf-8');
  }
  if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
    return path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || 'electron');
  }
  if (executablePath) {
    return path.join(__dirname, 'dist', executablePath);
  } else {
    throw new Error('Electron failed to install correctly');
  }
}

// Quando DENTRO do Electron, retorna módulo mínimo funcional
if (process.versions.electron) {
  module.exports = {
    app: {
      whenReady: () => Promise.resolve(),
      on: () => {},
      quit: () => {},
      isPackaged: false,
      getPath: (name) => name === 'userData'
        ? (process.env.APPDATA || process.env.HOME || process.cwd())
        : process.cwd()
    },
    BrowserWindow: class BrowserWindow {
      constructor(opts) { this.opts = opts; this.webContents = { loadFile: () => {}, on: () => {} }; }
      loadFile() {} on() {} static getAllWindows() { return []; }
    },
    dialog: { showErrorBox: (t, c) => console.error(t + ': ' + c) },
    ipcMain: { handle: () => {}, on: () => {}, removeHandler: () => {} },
    ipcRenderer: { invoke: () => Promise.resolve(), on: () => {}, send: () => {} },
    contextBridge: { exposeInMainWorld: () => {} }
  };
} else {
  module.exports = getElectronPath();
}
`;

fs.writeFileSync(indexPath, patch);
console.log('electron/index.js patched');