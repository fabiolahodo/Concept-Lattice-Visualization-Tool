// main.js (ESModule version)
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

//adding this to run backend as child process
import { spawn } from 'child_process';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start backend as child process
const backendProcess = spawn('node', [path.join(__dirname, 'server.cjs')], {
  stdio: 'inherit', // (optional) see backend output in Electron console
  shell: process.platform === "win32" // fix for Windows paths
});

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

  win.loadFile(path.join(__dirname, 'src/views/explorer.html'));
}

app.whenReady().then(createWindow);

//Shut down backend on Electron exit
app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
