import { getApiBase } from './api-base';
import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from "electron";
import path from "path";
import fs from "fs";
import { OAuthCallbackListener } from "./oauth-callback";
import { registerByokSettings } from "./byok";

import { startStorage } from "./storage/service";

let closeStorage: (() => Promise<void>) | undefined;
let flushRenderer: (() => Promise<void>) | undefined;
let storageClosed = false;
let quitting = false;
let mainWindow: BrowserWindow | null = null;
const oauthCallback = new OAuthCallbackListener(() => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

const isDev = !!process.env.ELECTRON_RENDERER_URL;
const icoPath = isDev
  ? path.join(__dirname, "../../build/icon.ico")
  : path.join(process.resourcesPath, "icon.ico");
const pngPath = isDev
  ? path.join(__dirname, "../../build/icon.png")
  : path.join(process.resourcesPath, "icon.png");
const iconPath = process.platform === "win32" ? icoPath : pngPath;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#242526",
    icon: iconPath,
    // The renderer provides a transparent drag region above the app controls.
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    webPreferences: {
      additionalArguments: [`--raalhu-api-base=${getApiBase()}`],
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.on("closed", () => {
    oauthCallback.stop();
    mainWindow = null;
  });
  const win = mainWindow;
  let mayClose = false;
  let closing = false;
  win.on('close', event => {
    if (mayClose || storageClosed || !flushRenderer) return;
    event.preventDefault();
    if (closing) return;
    closing = true;
    flushRenderer().then(() => { mayClose = true; win.close(); }).catch(error => {
      closing = false;
      dialog.showErrorBox('Could not save conversations', String(error));
    });
  });

  // Application menu with keyboard shortcuts
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: "about" as const },
        { type: "separator" as const },
        { role: "hide" as const },
        { role: "hideOthers" as const },
        { role: "unhide" as const },
        { type: "separator" as const },
        { role: "quit" as const },
      ],
    }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Chat",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.webContents.send("shortcut", "new-chat"),
        },
        { type: "separator" },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => mainWindow?.webContents.send("shortcut", "settings"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

ipcMain.handle("open-external", (_event, url: string) => {
  return shell.openExternal(url);
});

// Only the app's top-level renderer may manage its pending OAuth callback.
for (const action of ["start", "read", "stop"] as const) {
  ipcMain.handle(`oauth-callback-${action}`, (event, state: unknown) => {
    if (event.sender !== mainWindow?.webContents || event.senderFrame !== event.sender.mainFrame ||
        typeof state !== "string" || !state || state.length > 256) {
      throw new Error("Invalid OAuth callback request.");
    }
    return oauthCallback[action](state);
  });
}

app.on("before-quit", () => oauthCallback.stop());

ipcMain.handle("save-file", async (_event, data: string, filename: string) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return false;

  const ext = filename.split(".").pop() || "";
  const result = await dialog.showSaveDialog(win, {
    defaultPath: filename,
    filters: [
      { name: ext.toUpperCase() + " File", extensions: [ext] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePath) return false;

  // data is base64 encoded
  const buffer = Buffer.from(data, "base64");
  fs.writeFileSync(result.filePath, buffer);
  return true;
});

if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(async () => {
  const storage = await startStorage(() => mainWindow);
  registerByokSettings(() => mainWindow, storage.byok);
  closeStorage = storage.close;
  flushRenderer = storage.flush;
  createWindow();
}).catch(error => {
  dialog.showErrorBox("Unable to open desktop storage", String(error));
  app.quit();
});
app.on("second-instance", () => { mainWindow?.show(); mainWindow?.focus(); });
app.on("before-quit", event => {
  if (!closeStorage || storageClosed) return;
  event.preventDefault();
  if (quitting) return;
  quitting = true;
  (async () => {
    await flushRenderer?.();
    await closeStorage();
    storageClosed = true;
    app.quit();
  })().catch(error => {
    quitting = false;
    dialog.showErrorBox('Could not save conversations', String(error));
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (closeStorage && !storageClosed && BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
