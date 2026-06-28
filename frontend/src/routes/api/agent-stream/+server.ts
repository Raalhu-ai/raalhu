import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const headers = new Headers({
		'Content-Type': request.headers.get('content-type') || 'application/json'
	});
	const cookie = request.headers.get('cookie');
	const geminiApiKey = request.headers.get('x-gemini-api-key');
	if (cookie) headers.set('Cookie', cookie);
	if (geminiApiKey) headers.set('X-Gemini-API-Key', geminiApiKey);

	const res = await fetch(new URL('/api/stream', request.url), {
		method: 'POST',
		headers,
		body: await request.text()
	});

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: res.headers
	});
};
