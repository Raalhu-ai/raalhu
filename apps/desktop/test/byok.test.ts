import { afterAll, expect, mock, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { defaultByokPreferences } from '../src/byok-types';

const directory = mkdtempSync(path.join(tmpdir(), 'raalhu-byok-'));
const handlers = new Map<string, Function>();
let available = true;
const frame = { url: 'http://localhost:5173/' };
const webContents = Object.assign(new EventEmitter(), { mainFrame: frame });
const event = { sender: webContents, senderFrame: frame };
const originalURL = process.env.ELECTRON_RENDERER_URL;
process.env.ELECTRON_RENDERER_URL = frame.url;
// Exercise the service without opening Electron or touching OS credentials.
mock.module('electron', () => ({
  app: { getPath: () => directory },
  ipcMain: { handle: (name: string, handler: Function) => handlers.set(name, handler) },
  safeStorage: {
    isEncryptionAvailable: () => available,
    getSelectedStorageBackend: () => 'gnome_libsecret',
    encryptString: (text: string) => Buffer.from(text.split('').reverse().join('')),
    decryptString: (bytes: Buffer) => bytes.toString().split('').reverse().join(''),
  },
}));
const { registerByokSettings } = await import('../src/byok');
let preferences = { ...defaultByokPreferences };
registerByokSettings(() => ({ webContents }) as any, {
  get: async () => ({ ...preferences }), save: async value => { preferences = { ...value }; },
});
const call = (action: string, value?: unknown) => handlers.get(`byok:${action}`)!(event, value);
const originalFetch = globalThis.fetch;
afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalURL === undefined) delete process.env.ELECTRON_RENDERER_URL;
  else process.env.ELECTRON_RENDERER_URL = originalURL;
  rmSync(directory, { recursive: true, force: true });
});

test('credential lifecycle, validation, preference persistence and failure handling', async () => {
  const key = 'test-secret';
  const saved = await call('save', key);
  expect(saved).toMatchObject({ hasKey: true, validationStatus: 'untested', preferredRoute: 'proxy' });
  expect(JSON.stringify(preferences)).not.toContain(key);
  expect(JSON.stringify(saved)).not.toContain(key);
  expect(readFileSync(path.join(directory, 'google-byok-key.enc'), 'utf8')).not.toBe(key);
  await expect(call('setPreferredRoute', 'byok')).rejects.toThrow();
  globalThis.fetch = (async (url, init) => {
    expect(new URL(String(url)).pathname).toBe('/api/byok-test');
    expect(new Headers(init?.headers).get('x-ai-api-key')).toBe(key);
    return Response.json({ ok: true, status: 'valid', text: key });
  }) as typeof fetch;
  expect(await call('test')).toMatchObject({ validationStatus: 'valid', lastError: '' });
  expect(await call('setPreferredRoute', 'byok')).toMatchObject({ preferredRoute: 'byok' });
  globalThis.fetch = (async () => Response.json({ status: 'untested', error: key }, { status: 429 })) as typeof fetch;
  expect(await call('test')).toMatchObject({ validationStatus: 'valid', preferredRoute: 'byok' });
  expect(JSON.stringify(preferences)).not.toContain(key);
  globalThis.fetch = (async () => Response.json({ status: 'invalid', error: key }, { status: 400 })) as typeof fetch;
  expect(await call('test')).toMatchObject({ validationStatus: 'invalid', preferredRoute: 'proxy' });
  expect(await call('save', 'replacement')).toMatchObject({ validationStatus: 'untested', lastValidatedAt: null });
  expect(await call('remove')).toMatchObject({ hasKey: false, preferredRoute: 'proxy' });
});

test('missing key after restore resets stale metadata', async () => {
  preferences = { ...defaultByokPreferences, credentialId: 'old-file', validationStatus: 'valid', preferredRoute: 'byok' };
  expect(await call('status')).toMatchObject({ validationStatus: 'untested', preferredRoute: 'proxy', hasKey: false });
});

test('untrusted frames cannot access credentials, unavailable encryption cannot save', async () => {
  expect(() => handlers.get('byok:status')!({ ...event, senderFrame: {} })).toThrow();
  frame.url = 'https://untrusted.example/';
  expect(() => handlers.get('byok:status')!(event)).toThrow();
  frame.url = 'http://localhost:5173/';
  available = false;
  await expect(call('save', 'secret')).rejects.toThrow('Secure key storage');
  available = true;
});

test('replacement waits for in-flight validation and resets its result', async () => {
  await call('save', 'first-key');
  let release!: () => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  globalThis.fetch = (async () => {
    started();
    await gate;
    return Response.json({ ok: true, status: 'valid' });
  }) as typeof fetch;
  const validating = call('test');
  await began;
  const replacing = call('save', 'second-key');
  release();
  expect(await validating).toMatchObject({ validationStatus: 'valid' });
  expect(await replacing).toMatchObject({ validationStatus: 'untested', preferredRoute: 'proxy', lastValidatedAt: null });
  await call('remove');
});

test('model routing preserves session, body and streaming; proxy strips BYOK headers', async () => {
  await call('save', 'model-secret');
  globalThis.fetch = (async () => Response.json({ ok: true, status: 'valid' })) as typeof fetch;
  await call('test');
  await call('setPreferredRoute', 'byok');
  const body = JSON.stringify({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: 'hello' }] }], tools: [{ functionDeclarations: [] }] });
  for (const endpoint of ['/api/stream', '/api/generate']) {
    globalThis.fetch = (async (url, init) => {
      expect(new URL(String(url)).pathname).toBe(endpoint);
      const headers = new Headers(init?.headers);
      expect(headers.get('x-session')).toBe('session-123');
      expect(headers.get('x-ai-api-key')).toBe('model-secret');
      expect(headers.get('x-model-module')).toBe('ai-sdk');
      expect(init?.body).toBe(body);
      expect(init?.redirect).toBe('error');
      return new Response('data: {"candidates":[]}\n\n', { headers: { 'x-ai-api-key': 'do-not-expose' } });
    }) as typeof fetch;
    const id = crypto.randomUUID();
    const result = await handlers.get('model:start')!(event, { id, endpoint, body, session: 'session-123' });
    expect(result.headers['X-Resolved-Model-Module']).toBe('ai-sdk');
    expect(JSON.stringify(result)).not.toContain('model-secret');
    expect(JSON.stringify(result)).not.toContain('do-not-expose');
    const chunk = await handlers.get('model:read')!(event, id);
    expect(new TextDecoder().decode(chunk.value)).toContain('candidates');
    expect((await handlers.get('model:read')!(event, id)).done).toBe(true);
  }
  await call('setPreferredRoute', 'proxy');
  globalThis.fetch = (async (_url, init) => {
    const headers = new Headers(init?.headers);
    expect(headers.get('x-session')).toBe('session-123');
    expect(headers.has('x-ai-api-key')).toBe(false);
    expect(headers.has('x-model-module')).toBe(false);
    return Response.json({ candidates: [] });
  }) as typeof fetch;
  await handlers.get('model:start')!(event, { id: 'proxy-test', endpoint: '/api/generate', body, session: 'session-123' });
  await handlers.get('model:cancel')!(event, 'proxy-test');
  expect((await call('status')).preferredRoute).toBe('proxy');
  await call('remove');
});

test('model bridge rejects unrelated endpoints and cancels pending network requests', async () => {
  const body = JSON.stringify({ model: 'gemini-2.5-flash', contents: [] });
  await expect(handlers.get('model:start')!(event, { id: 'bad', endpoint: '/api/quota', body, session: 'session-123' })).rejects.toThrow();
  let began!: () => void;
  const started = new Promise<void>(resolve => { began = resolve; });
  let aborted = false;
  globalThis.fetch = ((_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; reject(new Error('cancelled')); });
    began();
  })) as typeof fetch;
  const request = handlers.get('model:start')!(event, { id: 'cancel-test', endpoint: '/api/stream', body, session: 'session-123' });
  const rejected = request.then(() => false, () => true);
  await started;
  await handlers.get('model:cancel')!(event, 'cancel-test');
  expect(await rejected).toBe(true);
  expect(aborted).toBe(true);
  expect(webContents.listenerCount('destroyed')).toBe(0);
});

test('fallback checks session readiness and sends no BYOK headers to proxy', async () => {
  await call('save', 'fallback-secret');
  globalThis.fetch = (async () => Response.json({ ok: true, status: 'valid' })) as typeof fetch;
  await call('test');
  await call('setPreferredRoute', 'byok');
  const body = JSON.stringify({ model: 'gemini-2.5-flash', contents: [] });
  for (const user of [null, { project: null }, { project: 'project', accountType: 'enterprise' }, { project: 'project', accountType: 'paygo' }]) {
    let calls = 0;
    globalThis.fetch = (async (url, init) => {
      calls++;
      expect(new URL(String(url)).pathname).toBe('/auth/me');
      expect(new Headers(init?.headers).get('X-Session')).toBe('session');
      expect(new Headers(init?.headers).has('X-AI-API-Key')).toBe(false);
      return Response.json(user);
    }) as typeof fetch;
    await expect(handlers.get('model:start')!(event, { id: crypto.randomUUID(), endpoint: '/api/stream', body, session: 'session', proxyFallback: true })).rejects.toThrow();
    expect(calls).toBe(1);
  }
  const paths: string[] = [];
  globalThis.fetch = (async (url, init) => {
    paths.push(new URL(String(url)).pathname);
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Session')).toBe('session');
    expect(headers.has('X-AI-API-Key')).toBe(false);
    expect(headers.has('X-Model-Module')).toBe(false);
    return paths.length === 1 ? Response.json({ project: 'project', accountType: 'consumer' }) : new Response('data: [DONE]\n\n');
  }) as typeof fetch;
  const result = await handlers.get('model:start')!(event, { id: 'available-fallback', endpoint: '/api/stream', body, session: 'session', proxyFallback: true });
  expect(paths).toEqual(['/auth/me', '/api/stream']);
  expect(result.headers['X-Resolved-Model-Module']).toBe('proxy');
  await handlers.get('model:cancel')!(event, 'available-fallback');
  expect(await call('status')).toMatchObject({ preferredRoute: 'byok', validationStatus: 'valid' });
  await call('remove');
});

test('explicit proxy remains selected after retesting a valid saved key and resolving more requests', async () => {
  await call('save', 'retained-secret');
  globalThis.fetch = (async () => Response.json({ ok: true, status: 'valid' })) as typeof fetch;
  await call('test');
  await call('setPreferredRoute', 'byok');
  await call('setPreferredRoute', 'proxy');
  await call('test');
  // Simulate reading the persisted metadata again, separate from active responses.
  preferences = JSON.parse(JSON.stringify(preferences));
  expect(await call('status')).toMatchObject({ preferredRoute: 'proxy', validationStatus: 'valid', hasKey: true });
  globalThis.fetch = (async (_url, init) => {
    expect(new Headers(init?.headers).has('X-AI-API-Key')).toBe(false);
    return Response.json({ candidates: [] });
  }) as typeof fetch;
  for (const endpoint of ['/api/stream', '/api/generate']) {
    const id = crypto.randomUUID();
    const result = await handlers.get('model:start')!(event, { id, endpoint, session: 'session', body: JSON.stringify({ model: 'gemini-2.5-flash', contents: [] }) });
    expect(result.headers['X-Resolved-Model-Module']).toBe('proxy');
    await handlers.get('model:cancel')!(event, id);
  }
  expect((await call('status')).preferredRoute).toBe('proxy');
  await call('setPreferredRoute', 'byok');
  expect((await call('status')).preferredRoute).toBe('byok');
  await call('remove');
});

test('validation distinguishes temporary failures and retains the selected valid key', async () => {
  await call('save', 'classification-test-key');
  globalThis.fetch = (async () => Response.json({ ok: true, status: 'valid' })) as typeof fetch;
  await call('test');
  await call('setPreferredRoute', 'byok');
  for (const failureKind of ['quota', 'network', 'model-access', 'cancelled', 'unknown']) {
    globalThis.fetch = (async () => Response.json({ status: 'untested', failureKind, error: 'classification-test-key' }, { status: 502 })) as typeof fetch;
    expect(await call('test')).toMatchObject({ validationStatus: 'valid', preferredRoute: 'byok', lastFailureKind: failureKind });
    expect(JSON.stringify(preferences)).not.toContain('classification-test-key');
  }
  globalThis.fetch = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
  expect(await call('test')).toMatchObject({ validationStatus: 'valid', lastFailureKind: 'network' });
  await call('remove');
});
