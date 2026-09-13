import { byokFailureKind, byokFailureMessages } from './byok-failure';
import { app, ipcMain, safeStorage, type BrowserWindow } from 'electron';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import fs from 'fs';
import path from 'path';
import { defaultByokPreferences, type ByokPreferences, type ByokStatus } from './byok-types';
import { registerModelRequests } from './model-requests';

export function registerByokSettings(getWindow: () => BrowserWindow | null, settings: {
  get(): Promise<ByokPreferences>;
  save(value: ByokPreferences): Promise<void>;
}) {
  const keyPath = () => path.join(app.getPath('userData'), 'google-byok-key.enc');
  const storageAvailable = () => safeStorage.isEncryptionAvailable() &&
    (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
  // Host configuration only: IPC callers cannot redirect credentials to another server.
  const backend = new URL(process.env.RAALHU_API_BASE || 'http://127.0.0.1:3000');
  if (backend.protocol !== 'https:' && !(backend.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(backend.hostname))) {
    throw new Error('BYOK requires an HTTPS backend or a local development backend.');
  }
  async function current() {
    const encrypted: Buffer | null = fs.existsSync(keyPath()) ? fs.readFileSync(keyPath()) : null;
    const credentialId = encrypted ? createHash('sha256').update(encrypted).digest('hex') : '';
    let preferences = await settings.get();
    if (preferences.credentialId !== credentialId || (!encrypted && (preferences.validationStatus !== 'untested' || preferences.preferredRoute !== 'proxy'))) {
      preferences = { ...defaultByokPreferences, credentialId };
      await settings.save(preferences);
    }
    return { encrypted, preferences };
  }
  function publicStatus(encrypted: Buffer | null, preferences: ByokPreferences): ByokStatus {
    const { credentialId: _, ...metadata } = preferences;
    return { ...metadata, hasKey: !!encrypted, storageAvailable: storageAvailable() };
  }
  // A test must finish before a replacement key can be saved or removed.
  let queue: Promise<unknown> = Promise.resolve();
  registerModelRequests(getWindow, backend, async (model): Promise<Record<string, string>> => {
    await queue;
    const { encrypted, preferences } = await current();
    if (preferences.preferredRoute !== 'byok') return {};
    if (!model.startsWith('gemini-') || !encrypted || preferences.validationStatus !== 'valid' || !storageAvailable()) {
      throw new Error('A validated Google key is required for BYOK.');
    }
    return {
      'X-Model-Module': 'ai-sdk',
      'X-AI-Provider': 'google',
      'X-AI-API-Key': safeStorage.decryptString(encrypted),
    };
  });
  for (const action of ['status', 'save', 'remove', 'test', 'setPreferredRoute'] as const) {
    ipcMain.handle(`byok:${action}`, (event, value: unknown) => {
      if (event.sender !== getWindow()?.webContents || event.senderFrame !== event.sender.mainFrame) throw new Error('Invalid BYOK settings request.');
      const actual = new URL(event.senderFrame.url);
      const expected = new URL(process.env.ELECTRON_RENDERER_URL || pathToFileURL(path.join(__dirname, '../renderer/index.html')).href);
      if (actual.origin !== expected.origin || (expected.protocol === 'file:' && actual.pathname !== expected.pathname)) throw new Error('Invalid BYOK settings origin.');
      const operation = queue.then(async () => {
        let { encrypted, preferences } = await current();
        if (action === 'save') {
          if (typeof value !== 'string' || !value.trim() || value.length > 4096) throw new Error('Enter a Google AI Studio API key.');
          if (!storageAvailable()) throw new Error('Secure key storage is unavailable on this device.');
          encrypted = safeStorage.encryptString(value.trim());
          const temporaryPath = `${keyPath()}.tmp`;
          try {
            fs.writeFileSync(temporaryPath, encrypted, { mode: 0o600 });
            fs.renameSync(temporaryPath, keyPath());
          } finally { fs.rmSync(temporaryPath, { force: true }); }
          preferences = { ...defaultByokPreferences, credentialId: createHash('sha256').update(encrypted).digest('hex') };
          await settings.save(preferences);
        } else if (action === 'remove') {
          fs.rmSync(keyPath(), { force: true });
          encrypted = null;
          preferences = { ...defaultByokPreferences };
          await settings.save(preferences);
        } else if (action === 'setPreferredRoute') {
          if (value !== 'proxy' && value !== 'byok') throw new Error('Invalid model route.');
          if (value === 'byok' && (!encrypted || preferences.validationStatus !== 'valid')) throw new Error('Test a saved key before selecting BYOK.');
          preferences = { ...preferences, preferredRoute: value };
          await settings.save(preferences);
        } else if (action === 'test') {
          if (!encrypted || !storageAvailable()) throw new Error('Save a key with secure storage before testing.');
          let key: string;
          try { key = safeStorage.decryptString(encrypted); }
          catch { throw new Error('Could not unlock this key. Save it again on this device.'); }
          try {
            const response = await fetch(new URL('/api/byok-test', backend), {
              method: 'POST', headers: { 'X-AI-Provider': 'google', 'X-AI-API-Key': key },
              signal: AbortSignal.timeout(25000), redirect: 'error',
            });
            const result = await response.json() as any;
            const passed = response.ok && result.ok === true && result.status === 'valid';
            const validationStatus = passed ? 'valid' : result.status === 'invalid' ? 'invalid' : preferences.validationStatus;
            // Persist only local messages, never provider text that could contain a credential.
            const kind = passed ? null : result.status === 'invalid' ? 'credentials'
              : response.status === 429 ? 'quota' : byokFailureKind(result);
            preferences = { ...preferences, validationStatus, lastValidatedAt: Date.now(),
              lastError: kind ? byokFailureMessages[kind] : '', lastFailureKind: kind,
              preferredRoute: validationStatus === 'invalid' ? 'proxy' : preferences.preferredRoute };
          } catch (error) {
            const kind = byokFailureKind(error);
            preferences = { ...preferences, lastError: byokFailureMessages[kind], lastFailureKind: kind };
          }
          await settings.save(preferences);
        }
        return publicStatus(encrypted, preferences);
      });
      queue = operation.catch(() => {});
      return operation;
    });
  }
}
