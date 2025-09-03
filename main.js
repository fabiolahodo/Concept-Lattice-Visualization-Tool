// main.js — Electron (ESM) cross-platform entry
// Works on Linux, Windows, macOS; starts a CJS backend via fork().

import { app, BrowserWindow } from "electron";
import { fork } from "child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

let win = null;
let backendProcess = null;

/* ------------------------- Paths & helpers ------------------------- */

// Adjust if your packaged HTML lives elsewhere:
function resolveRendererIndex() {
  // In dev you might serve from a dev server; here we default to local file.
  // Rollup typically outputs "dist/renderer/index.html"
  return path.resolve(__dirname, "dist", "renderer", "index.html");
}

// server.cjs is listed in "extraResources" so it ends up under process.resourcesPath when packaged.
function resolveServerPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "server.cjs");
  }
  // In development, keep server.cjs next to main.js (adjust if you store it elsewhere)
  return path.resolve(__dirname, "server.cjs");
}

/* ----------------------- Backend (Express) ------------------------ */

function startBackend() {
  if (backendProcess) return; // already running

  const serverPath = resolveServerPath();
  if (!fs.existsSync(serverPath)) {
    console.error(`[backend] server.cjs not found at: ${serverPath}`);
    return;
  }

  try {
    backendProcess = fork(serverPath, [], {
      stdio: "ignore",
      // Use Electron’s embedded Node runtime; important for Linux/macOS packages
      execPath: process.execPath
      // NOTE: no 'shell' or 'windowsHide' here; those are spawn() options only.
    });
    backendProcess.unref();

    backendProcess.on("error", (err) => {
      console.error("[backend] error:", err);
    });
    backendProcess.on("exit", (code, signal) => {
      console.log(`[backend] exited code=${code} signal=${signal}`);
      backendProcess = null;
    });

    console.log("[backend] started:", serverPath);
  } catch (err) {
    console.error("[backend] failed to start:", err);
  }
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    try { backendProcess.kill("SIGTERM"); } catch {}
  }
  backendProcess = null;
}

/* ------------------------ Single-instance ------------------------ */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

/* ------------------------- Create window ------------------------- */

function createWindow() {
  // Nice-to-have on Windows for notifications/updater
  if (process.platform === "win32") {
    app.setAppUserModelId("com.example.lattice"); // set to your appId
  }

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // show after ready-to-show for smoother UX
    // Note: 'icon' is ignored on macOS (use app bundle icon). Works on Win/Linux.
    icon: path.resolve(__dirname, "assets", "icons", "icon.png"),
    webPreferences: {
      // Security best practices:
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // If you have a preload script, point to it here:
      // preload: path.resolve(__dirname, "dist", "preload.js"),
      // Restrict navigation (tighten as needed in production):
      webSecurity: true
    }
  });

  // macOS: optional dock icon at runtime (uses PNG)
  if (process.platform === "darwin" && app.dock && fs.existsSync(path.resolve(__dirname, "assets", "icons", "icon.png"))) {
    try { app.dock.setIcon(path.resolve(__dirname, "assets", "icons", "icon.png")); } catch {}
  }

  // Load packaged HTML
  const indexPath = resolveRendererIndex();
  win.loadFile(indexPath).catch(err => console.error("Failed to load index:", err));

  win.once("ready-to-show", () => {
    win?.show();
  });

  win.on("closed", () => {
    win = null;
  });
}

/* --------------------------- Lifecycle --------------------------- */

app.on("ready", () => {
  startBackend();
  createWindow();

  // macOS: set About panel (optional)
  if (process.platform === "darwin") {
    app.setAboutPanelOptions?.({
      applicationName: "Lattice",
      applicationVersion: app.getVersion(),
      credits: "Built with Electron",
    });
  }
});

app.on("activate", () => {
  // macOS: recreate window when clicking dock icon and no windows are open
  if (win === null) {
    createWindow();
  }
});

// Clean shutdown on all platforms
app.on("before-quit", () => {
  stopBackend();
});

// Extra safety for some Linux environments
process.on("SIGTERM", () => {
  app.quit();
});
process.on("SIGINT", () => {
  app.quit();
});
