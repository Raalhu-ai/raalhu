import { expect, test } from 'bun:test';
import { googleFailure } from '../src/byok-failure';
for (const [error, status, kind] of [
  [{ error: { details: [{ reason: 'API_KEY_INVALID' }] } }, 400, 'credentials'],
  [{ error: { details: [{ reason: 'API_KEY_EXPIRED' }] } }, 403, 'credentials'],
  [{}, 401, 'credentials'], [{}, 403, 'model-access'], [{}, 404, 'model-access'],
  [{}, 429, 'quota'], [{}, 500, 'unknown'],
  [new TypeError('fetch failed: secret'), undefined, 'network'],
  [new DOMException('cancelled', 'AbortError'), undefined, 'cancelled'],
  [new DOMException('timeout', 'TimeoutError'), undefined, 'network'],
  [{ lastError: { statusCode: 429, responseBody: '{}' } }, undefined, 'quota'],
  [{ statusCode: 400, responseBody: JSON.stringify({ error: { message: 'secret', details: [{ reason: 'API_KEY_INVALID' }] } }) }, undefined, 'credentials'],
] as const) {
  test(`classifies Google ${status ?? (error as any).name ?? 'SDK error'} as ${kind}`, () => {
    const result = googleFailure(error, status);
    expect(result.failureKind).toBe(kind);
    expect(result.error).not.toContain('secret');
  });
}

test('AI SDK error events reach SSE clients with structured, sanitized credential failures', async () => {
  const { streamModel } = await import('../src/model-providers');
  const previous = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ error: {
    code: 400, message: 'API key not valid. secret-key', status: 'INVALID_ARGUMENT',
    details: [{ reason: 'API_KEY_INVALID' }],
  } }, { status: 400 })) as typeof fetch;
  try {
    const response = await streamModel({ module: 'ai-sdk', provider: 'google', apiKey: 'secret-key' },
      { model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] }, {} as any, {} as any);
    const stream = await response.text();
    expect(stream).toContain('"failureKind":"credentials"');
    expect(stream).not.toContain('secret-key');
    expect(stream).toContain('[DONE]');
  } finally { globalThis.fetch = previous; }
});
