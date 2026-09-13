import { afterEach, beforeEach, expect, test } from 'bun:test';
import { loadSettings, saveSettings } from '../src/lib/settings';
import { resolveModelRoute, switchToProxy, setModelProvider, setProviderKey, updateProviderKeyStatus, validateProviderKey, fetchWithModelFallback, getModelProvider } from '../src/lib/gemini-api';

const oldStorage = globalThis.localStorage;
const oldFetch = globalThis.fetch;
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); } } as Storage;
});
afterEach(() => { globalThis.localStorage = oldStorage; globalThis.fetch = oldFetch; });
function validKey() {
  setProviderKey('google', 'secret');
  updateProviderKeyStatus('google', 'valid');
}

test('explicit proxy survives route resolution, key retesting and settings reload', async () => {
  validKey();
  setModelProvider('ai-sdk');
  expect(resolveModelRoute('gemini-2.5-flash').module).toBe('ai-sdk');
  switchToProxy();
  for (const model of ['gemini-2.5-flash', 'gemini-2.5-pro']) {
    expect(resolveModelRoute(model)).toMatchObject({ module: 'proxy', headers: {} });
  }
  globalThis.fetch = (async () => Response.json({ ok: true, status: 'valid' })) as typeof fetch;
  expect(await validateProviderKey('google')).toBe('valid');
  expect(getModelProvider()).toBe('proxy');
  expect(loadSettings()).toMatchObject({ preferredModelModule: 'proxy', byokKeys: { google: 'secret' } });
  expect(JSON.parse(store.get('mogger_settings')!).preferredModelModule).toBe('proxy');
  expect(resolveModelRoute('gemini-3-flash-preview').module).toBe('proxy');
});

test('validation alone does not select BYOK; explicit switching back does', () => {
  validKey();
  expect(resolveModelRoute('gemini-2.5-flash').module).toBe('proxy');
  setModelProvider('ai-sdk');
  expect(resolveModelRoute('gemini-2.5-flash').headers['X-AI-API-Key']).toBe('secret');
  switchToProxy();
  setModelProvider('gemini-api');
  expect(getModelProvider()).toBe('ai-sdk');
});

test('a validation response cannot override proxy selected while testing', async () => {
  validKey();
  setModelProvider('ai-sdk');
  let resolve!: (response: Response) => void;
  globalThis.fetch = (() => new Promise<Response>(done => { resolve = done; })) as typeof fetch;
  const validation = validateProviderKey('google');
  switchToProxy();
  resolve(Response.json({ ok: true, status: 'valid' }));
  await validation;
  expect(resolveModelRoute('gemini-2.5-flash').module).toBe('proxy');
});

test('actual unsupported-model routing does not erase the BYOK preference', () => {
  validKey();
  setModelProvider('ai-sdk');
  expect(resolveModelRoute('claude-disabled').module).toBe('proxy');
  expect(loadSettings()).toMatchObject({ preferredModelModule: 'ai-sdk', activeModelModule: 'proxy' });
  expect(getModelProvider()).toBe('ai-sdk');
  expect(resolveModelRoute('gemini-2.5-flash').module).toBe('ai-sdk');
});

test('fallback records proxy use independently from the saved preference', async () => {
  validKey();
  setModelProvider('ai-sdk');
  let calls = 0;
  const response = await fetchWithModelFallback('/api/stream', {}, 'gemini-2.5-flash', (async () => {
    return ++calls === 1 ? new Response('BYOK failed', { status: 400 }) : new Response('proxy answer');
  }) as typeof fetch);
  expect(response.headers.get('X-Resolved-Model-Module')).toBe('proxy');
  expect(loadSettings()).toMatchObject({ preferredModelModule: 'ai-sdk', activeModelModule: 'proxy' });
});

test('proxy requests strip stale BYOK headers while retaining authentication', async () => {
  validKey();
  switchToProxy();
  await fetchWithModelFallback('/api/title', { headers: new Headers({ 'X-AI-API-Key': 'stale', 'X-Gemini-API-Key': 'stale', 'X-AI-Provider': 'google', 'X-Model-Module': 'ai-sdk', 'X-Session': 'session' }) }, 'gemini-2.5-flash', (async (_url, init) => {
    expect(Object.fromEntries(new Headers(init?.headers))).toEqual({ 'x-session': 'session' });
    return new Response('title');
  }) as typeof fetch);
});

for (const module of ['proxy', 'ai-sdk']) test(`migration respects stored ${module} route even with a valid key`, () => {
  store.set('mogger_settings', JSON.stringify({ activeModelModule: module, activeAiProvider: module === 'ai-sdk' ? 'google' : '', byokKeys: { google: 'secret' }, byokKeyStatus: { google: 'valid' } }));
  expect(loadSettings().preferredModelModule).toBe(module);
  expect(resolveModelRoute('gemini-2.5-flash').module).toBe(module);
});

test('legacy Gemini-only settings migrate and new preference overrides legacy state', () => {
  store.set('mogger_settings', JSON.stringify({ modelProvider: 'gemini-api', geminiApiKey: 'secret', geminiApiKeyStatus: 'valid' }));
  expect(loadSettings().preferredModelModule).toBe('ai-sdk');
  switchToProxy();
  expect(resolveModelRoute('gemini-2.5-flash').module).toBe('proxy');
});

test('an in-flight BYOK response can update actual routing without undoing a newer proxy choice', async () => {
  validKey();
  setModelProvider('ai-sdk');
  let resolve!: (response: Response) => void;
  const pending = fetchWithModelFallback('/api/stream', {}, 'gemini-2.5-flash', (() => new Promise<Response>(done => { resolve = done; })) as typeof fetch);
  switchToProxy();
  resolve(new Response('BYOK answer'));
  await pending;
  expect(loadSettings()).toMatchObject({ preferredModelModule: 'proxy', activeModelModule: 'ai-sdk' });
  expect(getModelProvider()).toBe('proxy');
  expect(resolveModelRoute('gemini-2.5-flash').module).toBe('proxy');
});

for (const kind of ['credentials', 'quota', 'network', 'model-access', 'unknown']) {
  test(`request ${kind} only invalidates confirmed credentials`, async () => {
    validKey(); setModelProvider('ai-sdk');
    let calls = 0;
    await fetchWithModelFallback('/api/stream', { method: 'POST' }, 'gemini-2.5-flash', (async () => {
      return ++calls === 1 ? Response.json({ error: 'secret', failureKind: kind }, { status: 502 }) : Response.json({});
    }) as typeof fetch);
    expect(calls).toBe(2);
    expect(loadSettings().byokKeyStatus.google).toBe(kind === 'credentials' ? 'invalid' : 'valid');
    expect(loadSettings().preferredModelModule).toBe('ai-sdk');
  });
}
test('network exceptions preserve a valid key; cancellation never falls back', async () => {
  validKey(); setModelProvider('ai-sdk');
  let calls = 0;
  await fetchWithModelFallback('/api/stream', {}, 'gemini-2.5-flash', (async () => {
    if (++calls === 1) throw new TypeError('Failed to fetch');
    return Response.json({});
  }) as typeof fetch);
  expect(loadSettings().byokKeyStatus.google).toBe('valid');
  calls = 0;
  await expect(fetchWithModelFallback('/api/stream', {}, 'gemini-2.5-flash', (async () => {
    calls++; throw new DOMException('cancelled', 'AbortError');
  }) as typeof fetch)).rejects.toThrow('cancelled');
  expect(calls).toBe(1);
  expect(loadSettings().byokKeyStatus.google).toBe('valid');
});
test('explicit stream fallback uses proxy without invalidating key or changing preference', async () => {
  validKey(); setModelProvider('ai-sdk');
  await fetchWithModelFallback('/api/stream', {}, 'gemini-2.5-flash', (async (_url, init) => {
    expect(new Headers(init?.headers).has('X-AI-API-Key')).toBe(false);
    return Response.json({});
  }) as typeof fetch, true);
  expect(loadSettings().byokKeyStatus.google).toBe('valid');
  expect(loadSettings().preferredModelModule).toBe('ai-sdk');
});

test('retry helper preserves structured BYOK rejection for the route layer', async () => {
  const { fetchWithRetry } = await import('../src/lib/agent/retry');
  validKey(); setModelProvider('ai-sdk');
  let calls = 0;
  globalThis.fetch = (async () => ++calls === 1
    ? Response.json({ failureKind: 'credentials', error: 'Rejected key' }, { status: 502 })
    : Response.json({})) as typeof fetch;
  await fetchWithModelFallback('/api/stream', {}, 'gemini-2.5-flash', fetchWithRetry);
  expect(calls).toBe(2);
  expect(loadSettings().byokKeyStatus.google).toBe('invalid');
});
