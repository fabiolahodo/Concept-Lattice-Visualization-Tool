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

/** Resolve cross-platform Python executable */
function guessPythonCmd() {
  if (process.platform === "win32") {
    return "py";            // most Windows systems
  }
  return "python3";         // Linux & macOS
}

/** Resolve path to Python script (dev vs packaged) */
function scriptPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "for_concepts.py")
    : path.resolve(__dirname, "for_concepts.py");
}

/** Run Python and return JSON result */
function runPythonCompute(payload) {
  return new Promise((resolve, reject) => {
    const py = guessPythonCmd();
    const script = scriptPath();

    const child = spawn(py, [script], { stdio: ["pipe", "pipe", "pipe"] });

    let out = "";
    let err = "";

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));

    child.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(out));
        } catch (e) {
          reject(
            new Error(
              "Failed to parse Python output: " +
                e.message +
                "\nRaw output: " +
                out
            )
          );
        }
      } else {
        reject(new Error("Python exited with code " + code + (err ? "\n" + err : "")));
      }
    });

    // Send payload into Python stdin
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

/* ---------- Electron App ---------- */

function createWindow() {
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
      preload: app.isPackaged
        ?path.join(process.resourcesPath, "preload.js")
        :path.resolve(__dirname, "preload.js"),
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
