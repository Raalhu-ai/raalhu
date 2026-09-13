import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { ModelRequest } from './model-request-types';

// Pull one response chunk per IPC call; never buffer a whole model stream.
export function registerModelRequests(
  getWindow: () => BrowserWindow | null,
  backend: URL,
  routeHeaders: (model: string) => Promise<Record<string, string>>,
) {
  type Pending = {
    abort: AbortController;
    reader?: ReadableStreamDefaultReader<Uint8Array>;
    reading: boolean;
    timer?: ReturnType<typeof setTimeout>;
    cleanup: () => void;
  };
  const pending = new Map<string, Pending>();
  function validate(event: IpcMainInvokeEvent) {
    if (event.sender !== getWindow()?.webContents || event.senderFrame !== event.sender.mainFrame) throw new Error('Invalid model request caller.');
    const actual = new URL(event.senderFrame.url);
    const expected = new URL(process.env.ELECTRON_RENDERER_URL || pathToFileURL(path.join(__dirname, '../renderer/index.html')).href);
    if (actual.origin !== expected.origin || (expected.protocol === 'file:' && actual.pathname !== expected.pathname)) throw new Error('Invalid model request origin.');
  }
  function finish(id: string) {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    entry.cleanup();
    entry.abort.abort();
    void entry.reader?.cancel().catch(() => {});
  }
  function touch(id: string, entry: Pending) {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => finish(id), 120000);
  }
  ipcMain.handle('model:start', async (event, input: ModelRequest) => {
    validate(event);
    if (!input || typeof input.id !== 'string' || !/^[\w-]{1,128}$/.test(input.id) || pending.has(input.id) || pending.size >= 16 ||
        !['/api/stream', '/api/generate'].includes(input.endpoint) || typeof input.body !== 'string' ||
        (input.proxyFallback !== undefined && (typeof input.proxyFallback !== 'boolean' || input.endpoint !== '/api/stream')) ||
        typeof input.session !== 'string' || !input.session || input.session.length > 4096 || /[\r\n]/.test(input.session)) {
      throw new Error('Invalid model request.');
    }
    const body = JSON.parse(input.body);
    if (!body || typeof body.model !== 'string' || !body.model.startsWith('gemini-') || !Array.isArray(body.contents)) throw new Error('Invalid Gemini request.');
    const cancel = () => finish(input.id);
    const navigate = (_event: unknown, _url: string, inPlace: boolean, mainFrame: boolean) => { if (mainFrame && !inPlace) cancel(); };
    const entry: Pending = {
      abort: new AbortController(), reading: false,
      cleanup: () => { event.sender.removeListener('destroyed', cancel); event.sender.removeListener('did-start-navigation', navigate); },
    };
    pending.set(input.id, entry);
    event.sender.once('destroyed', cancel);
    event.sender.on('did-start-navigation', navigate);
    touch(input.id, entry);
    let resolvedModule = 'proxy';
    try {
      const headers = input.proxyFallback ? {} : await routeHeaders(body.model);
      resolvedModule = headers['X-AI-API-Key'] ? 'ai-sdk' : 'proxy';
      if (input.proxyFallback) {
        const me = await fetch(new URL('/auth/me', backend), {
          headers: { 'X-Session': input.session }, signal: entry.abort.signal, redirect: 'error',
        });
        const user = me.ok ? await me.json() as any : null;
        if (!user?.project || user.accountType === 'enterprise' || user.accountType === 'paygo') {
          throw new Error('Proxy fallback is unavailable for this session.');
        }
      }
      entry.abort.signal.throwIfAborted();
      const response = await fetch(new URL(input.endpoint, backend), {
        method: 'POST', body: input.body,
        headers: { ...headers, 'Content-Type': 'application/json', 'X-Session': input.session },
        signal: entry.abort.signal, redirect: 'error',
      });
      entry.abort.signal.throwIfAborted();
      entry.reader = response.body?.getReader();
      touch(input.id, entry);
      return {
        status: response.status,
        // Do not expose request credentials, cookies, or arbitrary backend headers.
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/json',
          'X-Resolved-Model-Module': resolvedModule,
        },
      };
    } catch {
      if (!entry.abort.signal.aborted && resolvedModule === 'ai-sdk') {
        // Preserve the resolved route for a failed connection, without exposing credentials.
        entry.reader = new Response(JSON.stringify({ error: 'The BYOK connection failed. Please try again.', failureKind: 'network' })).body!.getReader();
        return { status: 502, headers: { 'Content-Type': 'application/json', 'X-Resolved-Model-Module': 'ai-sdk' } };
      }
      finish(input.id);
      throw new Error(input.proxyFallback ? 'Proxy fallback is unavailable or could not start.' : 'Model request could not start. Check your connection, session and selected provider.');
    }
  });
  ipcMain.handle('model:read', async (event, id: string) => {
    validate(event);
    const entry = pending.get(id);
    if (!entry || entry.reading) throw new Error('Model stream is unavailable.');
    entry.reading = true;
    touch(id, entry);
    try {
      const chunk = entry.reader ? await entry.reader.read() : { done: true };
      if (chunk.done) finish(id);
      else touch(id, entry);
      return chunk;
    } catch {
      finish(id);
      throw new Error('Model stream was interrupted. Please try again.');
    } finally { entry.reading = false; }
  });
  ipcMain.handle('model:cancel', (event, id: string) => { validate(event); finish(id); });
}
