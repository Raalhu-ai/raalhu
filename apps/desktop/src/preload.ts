import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("platform", {
  isDesktop: true,
  platform: process.platform,
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  saveFile: (data: string, filename: string) => ipcRenderer.invoke("save-file", data, filename),
  onShortcut: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on("shortcut", handler);
    return () => ipcRenderer.removeListener("shortcut", handler);
  },
});
