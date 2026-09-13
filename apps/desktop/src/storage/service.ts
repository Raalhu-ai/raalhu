import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { storageMethods } from './types';
import type { ByokPreferences } from '../byok-types';

export async function startStorage(getWindow: () => BrowserWindow | null) {
  const directory = path.join(app.getPath('userData'), process.env.ELECTRON_RENDERER_URL ? 'desktop-data-dev' : 'desktop-data');
  await mkdir(directory, { recursive: true });
  const worker = new Worker(path.join(__dirname, 'storage-worker.js'), { workerData: { filename: path.join(directory, 'raalhu.sqlite') } });
  let nextId = 0;
  let failure: Error | undefined;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  const fail = (error: Error) => {
    failure = error;
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };
  worker.on('error', fail);
  worker.on('exit', code => fail(new Error(`Storage worker stopped (${code})`)));
  worker.on('message', ({ requestId, result, error }) => {
    const request = pending.get(requestId);
    if (!request) return;
    pending.delete(requestId);
    if (error) request.reject(new Error(error));
    else request.resolve(result);
  });
  function call(method: string, args: unknown[] = []): Promise<any> {
    if (failure) return Promise.reject(failure);
    return new Promise((resolve, reject) => {
      const requestId = ++nextId;
      pending.set(requestId, { resolve, reject });
      worker.postMessage({ requestId, method, args });
    });
  }
  function validate(event: Electron.IpcMainInvokeEvent) {
    const win = getWindow();
    if (!win || event.sender !== win.webContents || event.senderFrame !== event.sender.mainFrame) throw new Error('Invalid storage caller');
    const actual = new URL(event.senderFrame.url);
    const expected = new URL(process.env.ELECTRON_RENDERER_URL || pathToFileURL(path.join(__dirname, '../renderer/index.html')).href);
    if (actual.origin !== expected.origin || (expected.protocol === 'file:' && actual.pathname !== expected.pathname)) throw new Error('Invalid storage origin');
  }
  for (const method of storageMethods) {
    ipcMain.handle(`storage:${method}`, (event, ...args) => { validate(event); return call(method, args); });
  }
  let flush: { token: number; resolve: () => void; reject: (error: Error) => void } | undefined;
  let flushing: Promise<void> | undefined;
  ipcMain.handle('storage:flushed', (event, token: unknown, error: unknown) => {
    validate(event);
    if (!flush || flush.token !== token) return;
    if (error) flush.reject(new Error(String(error)));
    else flush.resolve();
  });
  function flushRenderer(): Promise<void> {
    if (flushing) return flushing;
    const win = getWindow();
    if (!win || win.isDestroyed() || win.webContents.isLoadingMainFrame()) return Promise.resolve();
    flushing = new Promise<void>((resolve, reject) => {
      const token = ++nextId;
      flush = { token, resolve, reject };
      win.webContents.send('storage:flush', token);
    });
    const timer = setTimeout(() => flush?.reject(new Error('The app did not finish saving. Please retry closing the window.')), 15000);
    flushing = flushing.finally(() => { clearTimeout(timer); flush = undefined; flushing = undefined; });
    return flushing;
  }
  ipcMain.handle('storage:backup', async event => {
    validate(event);
    const result = await dialog.showSaveDialog(getWindow()!, { defaultPath: 'raalhu-backup.sqlite', filters: [{ name: 'SQLite database', extensions: ['sqlite'] }] });
    if (result.canceled || !result.filePath) return false;
    if (path.resolve(result.filePath).startsWith(path.resolve(directory) + path.sep)) throw new Error('Choose a backup location outside the active data directory');
    await call('backup', [result.filePath]);
    return true;
  });
  // Surface native-module/init errors before opening a renderer.
  await call('migrationStatus');
  return {
    byok: {
      get: (): Promise<ByokPreferences> => call('getByokPreferences'),
      save: (value: ByokPreferences): Promise<void> => call('saveByokPreferences', [value]),
    },
    flush: flushRenderer,
    close: async () => { try { await call('close'); } finally { await worker.terminate(); } },
  };
}
