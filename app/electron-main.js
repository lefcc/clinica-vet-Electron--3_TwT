// Electron main entry point - loads app after Electron initializes
const { app } = require('electron');

// Wait for Electron to be ready, then load the main script
app.whenReady().then(() => {
  // Clear any cached electron module
  for (const key of Object.keys(require.cache)) {
    if (key.includes('electron') && !key.includes('electron-shim')) {
      delete require.cache[key];
    }
  }

  // Now load the actual main script
  require('./dist/main/main.js');
}).catch(err => {
  console.error('Failed to start app:', err);
  process.exit(1);
});