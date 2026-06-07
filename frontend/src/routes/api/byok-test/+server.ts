import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const geminiApiKey = request.headers.get('x-gemini-api-key')?.trim();

	if (!geminiApiKey) {
		return new Response(JSON.stringify({ error: 'Missing Gemini API key' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const cookie = request.headers.get('cookie') || '';
	const res = await fetch(`${BACKEND}/api/generate`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Cookie: cookie,
			'X-Gemini-API-Key': geminiApiKey
		},
		body: JSON.stringify({
			model: 'gemini-2.5-flash',
			contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }],
			generationConfig: { maxOutputTokens: 8 }
		})
	});

	if (!res.ok) {
		const error = await res.text();
		return new Response(JSON.stringify({ error }), {
			status: res.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const data = await res.json();
	const text =
		data?.candidates?.[0]?.content?.parts?.[0]?.text ||
		data?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
		'';

	return new Response(JSON.stringify({ ok: true, text }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
