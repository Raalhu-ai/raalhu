import type { RequestHandler } from './$types';
import { modelResponseHeaders } from '$lib/model-response-headers';

export const POST: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const body = await request.json();
	const { model, contents, systemInstruction, tools, toolConfig, generationConfig, memories } = body;

	const cookie = request.headers.get('cookie') || '';
	const modelModule = request.headers.get('x-model-module')?.trim();
	const aiProvider = request.headers.get('x-ai-provider')?.trim();
	const aiApiKey = request.headers.get('x-ai-api-key')?.trim();
	const legacyGeminiApiKey = request.headers.get('x-gemini-api-key')?.trim();
	const headers: Record<string, string> = { 'Content-Type': 'application/json', Cookie: cookie };
	if (modelModule) headers['X-Model-Module'] = modelModule;
	if (aiProvider) headers['X-AI-Provider'] = aiProvider;
	if (aiApiKey) headers['X-AI-API-Key'] = aiApiKey;
	if (legacyGeminiApiKey && !aiApiKey) headers['X-Gemini-API-Key'] = legacyGeminiApiKey;

	const payload = {
		model: model || 'gemini-3-flash-preview',
		contents,
		generationConfig: generationConfig || { maxOutputTokens: 65536 },
		...(systemInstruction && { systemInstruction }),
		...(memories && { memories }),
		...(tools && { tools }),
		...(toolConfig && { toolConfig }),
		userPromptId: body.userPromptId || crypto.randomUUID()
	};

	console.log(`[stream proxy] model=${model} contents=${contents?.length} messages memories=${memories ? 'yes' : 'no'}`);

	const backendRes = await fetch(`${BACKEND}/api/stream`, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload)
	});

	if (!backendRes.ok) {
		const err = await backendRes.text();
		console.error(`[stream proxy] Backend error ${backendRes.status}:`, err.slice(0, 500));
		return new Response(err, {
			status: backendRes.status,
			headers: modelResponseHeaders(backendRes.headers, { 'Content-Type': 'text/plain' })
		});
	}

	return new Response(backendRes.body, {
		headers: modelResponseHeaders(backendRes.headers, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		})
	});
};
