// main.js (ESModule version)
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

//adding this to run backend as child process
import { spawn } from 'child_process';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// single-instance guard
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

// Globals
let win = null;
let backendProcess = null;

// Base where your packaged app's JS/HTML lives (inside app.asar)
const appBase = app.isPackaged ? app.getAppPath() : __dirname;
// Base where extra resources live (outside asar)
const resourcesBase = app.isPackaged ? process.resourcesPath : __dirname;

// ---- Start backend (must be OUTSIDE asar) ----
function startBackend() {
  if (backendProcess) return;
  const serverPath = path.join(resourcesBase, 'server.cjs');
  backendProcess = spawn(process.execPath, [serverPath], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
    windowsHide: true
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // UI is inside app.asar → load from appBase
  const indexHtml = path.join(appBase, 'dist/renderer', 'index.html');
  win.loadFile(indexHtml);

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// ---- App lifecycle ----
app.on('second-instance', () => {
  if (win) { 
    if (win.isMinimized()) win.restore(); 
    win.focus(); }
});


app.whenReady().then(() => {
  startBackend();
  createWindow();
});

//Shut down backend on Electron exit
app.on('before-quit', () => {
  try{
    backendProcess.kill();
  }

  catch {} 

});
