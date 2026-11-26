// Preload shim - patches Module._resolveFilename before main script loads
const Module = require('module');
const path = require('path');

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === 'electron') {
    return path.join(__dirname, 'electron-shim.js');
  }
  return originalResolveFilename.apply(this, arguments);
};
