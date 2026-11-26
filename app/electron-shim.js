// Electron shim - minimal version for testing database initialization
// This is loaded via --require flag before the main script

const Module = require('module');
const path = require('path');

// Patch Module._resolveFilename to redirect 'electron' to this shim
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === 'electron') {
    return path.join(__dirname, 'electron-shim.js');
  }
  return originalResolveFilename.apply(this, arguments);
};

// When running inside Electron, provide a minimal Electron module
if (process.versions.electron) {
  module.exports = {
    app: {
      whenReady: () => Promise.resolve(),
      on: () => {},
      quit: () => {},
      isPackaged: false,
      getPath: (name) => {
        if (name === 'userData') {
          return process.env.APPDATA || process.env.HOME || process.cwd();
        }
        return process.cwd();
      }
    },
    BrowserWindow: class BrowserWindow {
      constructor(options) {
        this.options = options;
        this.webContents = {
          loadFile: () => {},
          on: () => {}
        };
      }
      loadFile() {}
      on() {}
      static getAllWindows() { return []; }
    },
    dialog: {
      showErrorBox: (title, content) => {
        console.error(`${title}: ${content}`);
      }
    },
    ipcMain: {
      handle: () => {},
      on: () => {},
      removeHandler: () => {}
    },
    ipcRenderer: {
      invoke: () => Promise.resolve(),
      on: () => {},
      send: () => {}
    },
    contextBridge: {
      exposeInMainWorld: () => {}
    }
  };
} else {
  // Outside Electron, return the binary path
  const fs = require('fs');
  const pathFile = path.join(__dirname, 'node_modules/electron/path.txt');
  let executablePath;
  if (fs.existsSync(pathFile)) {
    executablePath = fs.readFileSync(pathFile, 'utf-8');
  }
  if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
    module.exports = path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || 'electron');
  } else if (executablePath) {
    module.exports = path.join(__dirname, 'node_modules/electron/dist', executablePath);
  } else {
    throw new Error('Electron failed to install correctly');
  }
}