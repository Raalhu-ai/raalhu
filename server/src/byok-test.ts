import { googleFailure } from './byok-failure';
// Keep provider error bodies and credentials out of responses and logs.
export async function testByokKey(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const provider = request.headers.get('x-ai-provider')?.trim() || 'google';
  const key = (request.headers.get('x-ai-api-key') || request.headers.get('x-gemini-api-key'))?.trim();
  const reply = (status: number, body: object) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (provider !== 'google') return reply(400, { error: 'Only Google BYOK is enabled.', status: 'untested' });
  if (!key || key.length > 4096) return reply(400, { error: 'A Google API key is required.', status: 'invalid' });
  try {
    const response = await fetcher('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }], generationConfig: { maxOutputTokens: 8 } }),
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    const data = await response.json().catch(() => null) as any;
    if (response.ok) {
      if (!Array.isArray(data?.candidates)) return reply(502, { error: 'Google returned an unexpected response. Try again.', status: 'untested' });
      return reply(200, { ok: true, status: 'valid' });
    }
    const failure = googleFailure(data, response.status);
    return reply(failure.failureKind === 'credentials' ? 400 : response.status === 429 ? 429 : 502, {
      ...failure, status: failure.failureKind === 'credentials' ? 'invalid' : 'untested',
    });
  } catch (error) {
    const failure = googleFailure(error);
    return reply(502, { ...failure, status: 'untested' });
  }
}
