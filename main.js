// main.js
import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win = null;

/* ---------- Helpers ---------- */

/** Resolve cross-platform Python executable + args */
/*
function pythonCmd() {
  if (process.platform === "win32") {
    return { cmd: "py", args: ["-3"] };   // Windows: force Python 3
  }
  return { cmd: "python3", args: [] };    // Linux/macOS
}
*/

function pythonCmd() {
  // In packaged apps, use bundled venv if present
  if (app.isPackaged) {
    const exe = process.platform === "win32"
      ? path.join(process.resourcesPath, "python-venv", "Scripts", "python.exe")
      : path.join(process.resourcesPath, "python-venv", "bin", "python");
    if (fs.existsSync(exe)) return { cmd: exe, args: [] };
  }

  // Dev / fallback
  if (process.platform === "win32") {
    return { cmd: "py", args: ["-3"] }; // Windows Python launcher
  }
  return { cmd: "python3", args: [] };
}


/** Resolve path to Python script (dev vs packaged) */
function scriptPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "python", "for_concepts.py") // or just "for_concepts.py" if you kept it at root via extraResources
    : path.join(__dirname, "python", "for_concepts.py");
}

/** Spawn Python and exchange JSON via stdin/stdout */
function runPythonCompute(payload) {
  return new Promise((resolve, reject) => {
    const { cmd, args } = pythonCmd();
    const script = scriptPath();

    console.log("[main] Using Python:", cmd, args.join(" "), "script:", script);

    const child = spawn(cmd, [...args, script], { stdio: ["pipe", "pipe", "pipe"] });

    let out = "", err = "";
    child.stdout.on("data", d => (out += d.toString()));
    child.stderr.on("data", d => (err += d.toString()));
    child.on("close", code => {
      if (code === 0) {
        try { resolve(JSON.parse(out)); }
        catch (e) { reject(new Error("Failed to parse Python output: " + e.message + "\nRaw: " + out)); }
      } else {
        reject(new Error("Python exited with code " + code + (err ? "\n" + err : "")));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}


/* ---------- Electron App ---------- */

function createWindow() {

const preloadPath = path.join(__dirname, 'preload.cjs');
  console.log('[main] preload path:', preloadPath, 'exists?', fs.existsSync(preloadPath));

  if (process.platform === "win32") {
    app.setAppUserModelId("com.example.lattice");
  }

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    icon: path.resolve(__dirname, "assets", "icons", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: preloadPath,
      webSecurity: true,
    },
  });

  const indexPath = path.resolve(__dirname, "dist", "renderer", "index.html");
  win
    .loadFile(indexPath)
    .catch((err) => console.error("Failed to load index:", err));

  win.once("ready-to-show", () => {
    win?.show();
  });

  win.on("closed", () => {
    win = null;
  });
}

/* ---------- IPC Handlers ---------- */

// Called from renderer via window.py.computeLattice()
ipcMain.handle("compute-lattice", async (_evt, payload) => {
  return await runPythonCompute(payload);
});

/* ---------- App lifecycle ---------- */

app.on("ready", () => {
  createWindow();

  if (process.platform === "darwin") {
    app.setAboutPanelOptions?.({
      applicationName: "Lattice",
      applicationVersion: app.getVersion(),
      credits: "Built with Electron",
    });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (win === null) createWindow();
});
