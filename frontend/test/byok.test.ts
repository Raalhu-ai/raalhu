import { afterEach, expect, test } from 'bun:test';
import { POST } from '../src/routes/api/byok-test/+server';
import { validateProviderKey } from '../src/lib/gemini-api';
import { loadSettings, saveSettings } from '../src/lib/settings';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
afterEach(() => { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; });

test('frontend forwards key validation to the configured backend', async () => {
  globalThis.fetch = (async (url, init) => {
    expect(String(url)).toBe('https://backend.example/api/byok-test');
    expect(new Headers(init?.headers).get('x-ai-api-key')).toBe('test-key');
    expect(init?.redirect).toBe('error');
    return Response.json({ ok: true, status: 'valid' });
  }) as typeof fetch;
  const response = await POST({ request: new Request('https://web.example/api/byok-test', {
    method: 'POST', headers: { 'X-AI-Provider': 'google', 'X-AI-API-Key': 'test-key' },
  }), platform: { env: { BACKEND_URL: 'https://backend.example' } } } as any);
  expect(await response.json()).toEqual({ ok: true, status: 'valid' });
});

test('transient validation failure preserves previously valid keys; rejection invalidates', async () => {
  const store = new Map<string, string>();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); } } as Storage;
  const settings = loadSettings();
  saveSettings({ ...settings, byokKeys: { ...settings.byokKeys, google: 'test-key' }, byokKeyStatus: { ...settings.byokKeyStatus, google: 'valid' } });
  globalThis.fetch = (async () => Response.json({ status: 'untested', error: 'Try again' }, { status: 429 })) as typeof fetch;
  expect(await validateProviderKey('google')).toBe('untested');
  expect(loadSettings().byokKeyStatus.google).toBe('valid');
  globalThis.fetch = (async () => Response.json({ status: 'invalid', error: 'Rejected' }, { status: 400 })) as typeof fetch;
  expect(await validateProviderKey('google')).toBe('invalid');
  expect(loadSettings().byokKeyStatus.google).toBe('invalid');
});
