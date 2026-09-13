import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import assert from 'node:assert/strict';
import { startStorage } from '../src/storage/service';

// Hidden production-renderer smoke test. Never opens the user's profile or a dev server.
app.setPath('userData', process.env.RAALHU_STORAGE_TEST_DIR!);
let window: BrowserWindow | null = null;
let service: Awaited<ReturnType<typeof startStorage>> | undefined;
app.whenReady().then(async () => {
  app.dock?.hide();
  service = await startStorage(() => window);
  window = new BrowserWindow({ show: false, webPreferences: { preload: path.join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false } });
  window.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
  await window.loadFile(path.join(__dirname, '../renderer/index.html'));
  const deadline = Date.now() + 10000;
  let complete = false;
  while (Date.now() < deadline) {
    complete = await window.webContents.executeJavaScript('window.platform.storage.migrationStatus().then(s => s.complete)');
    if (complete) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(complete, true, 'real renderer must finish startup migration');
  const result = await window.webContents.executeJavaScript(`(async () => {
    const storage = window.platform.storage;
    await storage.createSession({id:'smoke',title:'Smoke',model:'test',modeId:'agent',body:{},messages:[{id:'user',role:'user',content:'Saved through preload'}],createdAt:1,updatedAt:1,archived:0});
    const messages = await storage.loadMessages('smoke');
    return messages[0].parts[0].text;
  })()`);
  assert.equal(result, 'Saved through preload');
  await service.flush();
  await service.close();
  service = undefined;
  window.destroy(); window = null;
  console.log('Desktop renderer/preload/IPC/SQLite/shutdown smoke test passed.');
  app.exit(0);
}).catch(async error => {
  console.error(error);
  try { await service?.close(); } catch {}
  window?.destroy();
  app.exit(1);
});
