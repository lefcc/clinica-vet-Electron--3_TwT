const {app} = require('electron'); console.log('app:', typeof app); app.whenReady().then(() => console.log('ready'));
