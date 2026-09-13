import { contextBridge, ipcRenderer } from "electron";
import { storageMethods, type StorageAPI } from "./storage/types";

contextBridge.exposeInMainWorld("platform", {
  apiBase: process.argv.find(arg => arg.startsWith('--raalhu-api-base='))?.slice('--raalhu-api-base='.length) || 'http://127.0.0.1:3000',
  modelRequests: {
    start: (request: import('./model-request-types').ModelRequest) => ipcRenderer.invoke('model:start', request),
    read: (id: string) => ipcRenderer.invoke('model:read', id),
    cancel: (id: string) => ipcRenderer.invoke('model:cancel', id),
  },
  byok: {
    status: () => ipcRenderer.invoke("byok:status"),
    save: (key: string) => ipcRenderer.invoke("byok:save", key),
    remove: () => ipcRenderer.invoke("byok:remove"),
    test: () => ipcRenderer.invoke("byok:test"),
    setPreferredRoute: (route: 'proxy' | 'byok') => ipcRenderer.invoke("byok:setPreferredRoute", route),
  },
  storage: Object.fromEntries(storageMethods.map(method => [method, (...args: unknown[]) => ipcRenderer.invoke(`storage:${method}`, ...args)])) as unknown as StorageAPI,
  backupStorage: () => ipcRenderer.invoke("storage:backup"),
  onStorageFlush: (callback: () => Promise<void>) => {
    const handler = async (_event: Electron.IpcRendererEvent, token: number) => {
      let error: string | undefined;
      try { await callback(); } catch (err) { error = String(err); }
      await ipcRenderer.invoke("storage:flushed", token, error);
    };
    ipcRenderer.on("storage:flush", handler);
    return () => ipcRenderer.removeListener("storage:flush", handler);
  },
  isDesktop: true,
  platform: process.platform,
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  startOAuthCallback: (state: string) => ipcRenderer.invoke("oauth-callback-start", state),
  readOAuthCallback: (state: string) => ipcRenderer.invoke("oauth-callback-read", state),
  stopOAuthCallback: (state: string) => ipcRenderer.invoke("oauth-callback-stop", state),
  saveFile: (data: string, filename: string) => ipcRenderer.invoke("save-file", data, filename),
  onShortcut: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on("shortcut", handler);
    return () => ipcRenderer.removeListener("shortcut", handler);
  },
});
