import { describe, expect, test } from 'bun:test';
import { testByokKey } from '../src/byok-test';
import app from '../src/app';

const key = 'test-secret-key';
const request = (provider = 'google') => new Request('https://raalhu.test/api/byok-test', {
  method: 'POST', headers: { 'x-ai-provider': provider, 'x-ai-api-key': key },
});
const upstream = (body: unknown, status = 200) => (async () => Response.json(body, { status })) as typeof fetch;

describe('shared Google key validation', () => {
  test('Hono exposes validation without requiring proxy setup', async () => {
    const response = await app.request('/api/byok-test', { method: 'POST' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ status: 'invalid' });
  });
  test('rejects disabled providers without sending a request', async () => {
    const response = await testByokKey(request('openai'), (() => { throw new Error('unexpected request'); }) as typeof fetch);
    expect(response.status).toBe(400);
  });
  test('uses a fixed Google endpoint and key header, returns no credential or generated text', async () => {
    const response = await testByokKey(request(), (async (url, init) => {
      expect(String(url)).toContain('generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
      expect(new Headers(init?.headers).get('x-goog-api-key')).toBe(key);
      expect(init?.redirect).toBe('error');
      return Response.json({ candidates: [{ content: { parts: [{ text: key }] } }] });
    }) as typeof fetch);
    expect(await response.json()).toEqual({ ok: true, status: 'valid' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  test('recognizes invalid keys without reflecting provider error text', async () => {
    const response = await testByokKey(request(), upstream({ error: { message: key, details: [{ reason: 'API_KEY_INVALID' }] } }, 400));
    const result = await response.json();
    expect(result.status).toBe('invalid');
    expect(JSON.stringify(result)).not.toContain(key);
  });
  for (const status of [403, 429, 500]) test(`${status} is inconclusive, not an invalid key`, async () => {
    const response = await testByokKey(request(), upstream({ error: { message: key } }, status));
    const result = await response.json();
    expect(result.status).toBe('untested');
    expect(JSON.stringify(result)).not.toContain(key);
  });
  test('network and malformed success responses remain untested', async () => {
    const network = await testByokKey(request(), (async () => { throw new Error(key); }) as typeof fetch);
    expect(await network.json()).toMatchObject({ status: 'untested' });
    const malformed = await testByokKey(request(), upstream({}));
    expect(malformed.status).toBe(502);
  });
});
