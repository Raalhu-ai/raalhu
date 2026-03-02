import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const body = await request.json();
	const { model, contents, systemInstruction, tools, toolConfig, generationConfig } = body;

	const cookie = request.headers.get('cookie') || '';
	const userPromptId = crypto.randomUUID();

	const payload = {
		model: model || 'gemini-3-flash-preview',
		contents,
		generationConfig: generationConfig || { maxOutputTokens: 65536 },
		...(systemInstruction && { systemInstruction }),
		...(tools && { tools }),
		...(toolConfig && { toolConfig }),
		userPromptId
	};

	console.log(`[agent-stream] model=${model} contents=${contents?.length} messages`);

	const backendRes = await fetch(`${BACKEND}/api/stream`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Cookie: cookie },
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
