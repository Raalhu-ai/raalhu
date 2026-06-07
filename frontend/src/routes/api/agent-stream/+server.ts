import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const body = await request.json();
	const { model, contents, systemInstruction, tools, toolConfig, generationConfig, memories } = body;

	const cookie = request.headers.get('cookie') || '';
	const geminiApiKey = request.headers.get('x-gemini-api-key')?.trim();
	const userPromptId = crypto.randomUUID();
	const headers: Record<string, string> = { 'Content-Type': 'application/json', Cookie: cookie };
	if (geminiApiKey) headers['X-Gemini-API-Key'] = geminiApiKey;

	const payload = {
		model: model || 'gemini-3-flash-preview',
		contents,
		generationConfig: generationConfig || { maxOutputTokens: 65536 },
		...(systemInstruction && { systemInstruction }),
		...(memories && { memories }),
		...(tools && { tools }),
		...(toolConfig && { toolConfig }),
		userPromptId
	};

	console.log(`[agent-stream] model=${model} contents=${contents?.length} messages memories=${memories ? 'yes' : 'no'}`);

	const backendRes = await fetch(`${BACKEND}/api/stream`, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload)
	});

	if (!backendRes.ok) {
		const err = await backendRes.text();
		console.error(`[agent-stream] Backend error ${backendRes.status}:`, err.slice(0, 500));
		return new Response(err, {
			status: backendRes.status,
			headers: { 'Content-Type': 'text/plain' }
		});
	}

	// SSE passthrough — forward the raw Gemini stream
	return new Response(backendRes.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
