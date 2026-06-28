import type { RequestHandler } from './$types';

function forwardedHeaders(request: Request): Headers {
	const headers = new Headers({
		'Content-Type': request.headers.get('content-type') || 'application/json'
	});
	const cookie = request.headers.get('cookie');
	const modelModule = request.headers.get('x-model-module');
	const aiProvider = request.headers.get('x-ai-provider');
	const aiApiKey = request.headers.get('x-ai-api-key');
	const legacyGeminiApiKey = request.headers.get('x-gemini-api-key');

	if (cookie) headers.set('Cookie', cookie);
	if (modelModule) headers.set('X-Model-Module', modelModule);
	if (aiProvider) headers.set('X-AI-Provider', aiProvider);
	if (aiApiKey) headers.set('X-AI-API-Key', aiApiKey);
	if (legacyGeminiApiKey && !aiApiKey) headers.set('X-Gemini-API-Key', legacyGeminiApiKey);

	return headers;
}

export const POST: RequestHandler = async ({ request }) => {
	const res = await fetch(new URL('/api/generate', request.url), {
		method: 'POST',
		headers: forwardedHeaders(request),
		body: await request.text()
	});

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: res.headers
	});
};
