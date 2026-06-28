import type { RequestHandler } from './$types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function formatGeminiError(status: number, body: string) {
	const trimmed = body.trim();

	try {
		const parsed = JSON.parse(trimmed);
		const message = parsed?.error?.message || parsed?.message;
		if (message) return `Gemini API ${status}: ${message}`;
	} catch {
		// Non-JSON responses can come from network layers between us and Google.
	}

	if (/error code\s*:?\s*1003/i.test(trimmed)) {
		return 'Cloudflare 1003 while reaching Gemini API. This is a network/proxy response, not a Gemini key validation error.';
	}

	return trimmed ? `Gemini API ${status}: ${trimmed.slice(0, 500)}` : `Gemini API ${status}`;
}

export const POST: RequestHandler = async ({ request }) => {
	const provider = request.headers.get('x-ai-provider')?.trim() || 'google';
	const geminiApiKey =
		request.headers.get('x-ai-api-key')?.trim() ||
		request.headers.get('x-gemini-api-key')?.trim();

	if (provider !== 'google') {
		return new Response(JSON.stringify({ error: `${provider} BYOK is not enabled yet` }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!geminiApiKey) {
		return new Response(JSON.stringify({ error: 'Missing Gemini API key' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const res = await fetch(`${GEMINI_API_BASE}/gemini-2.5-flash:generateContent`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-goog-api-key': geminiApiKey
			},
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }],
				generationConfig: { maxOutputTokens: 8 }
			})
		});

		if (!res.ok) {
			const error = await res.text();
			return new Response(JSON.stringify({ error: formatGeminiError(res.status, error) }), {
				status: res.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await res.json();
		const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

		return new Response(JSON.stringify({ ok: true, text }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return new Response(JSON.stringify({ error: `Gemini API request failed: ${message}` }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
