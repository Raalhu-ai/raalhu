import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from "electron";
import path from "path";
import fs from "fs";

const isDev = !!process.env.ELECTRON_RENDERER_URL;
const icoPath = isDev
  ? path.join(__dirname, "../../build/icon.ico")
  : path.join(process.resourcesPath, "icon.ico");
const pngPath = isDev
  ? path.join(__dirname, "../../build/icon.png")
  : path.join(process.resourcesPath, "icon.png");
const iconPath = process.platform === "win32" ? icoPath : pngPath;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#242526",
    icon: iconPath,
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
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
          click: () => mainWindow.webContents.send("shortcut", "new-chat"),
        },
        { type: "separator" },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => mainWindow.webContents.send("shortcut", "settings"),
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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
