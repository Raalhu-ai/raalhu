import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const body = await request.json();
	const { model, contents, systemInstruction, tools, toolConfig, generationConfig } = body;

	const cookie = request.headers.get('cookie') || '';
	const modelModule = request.headers.get('x-model-module')?.trim();
	const aiProvider = request.headers.get('x-ai-provider')?.trim();
	const aiApiKey = request.headers.get('x-ai-api-key')?.trim();
	const legacyGeminiApiKey = request.headers.get('x-gemini-api-key')?.trim();
	const userPromptId = body.userPromptId || crypto.randomUUID();
	const headers: Record<string, string> = { 'Content-Type': 'application/json', Cookie: cookie };
	if (modelModule) headers['X-Model-Module'] = modelModule;
	if (aiProvider) headers['X-AI-Provider'] = aiProvider;
	if (aiApiKey) headers['X-AI-API-Key'] = aiApiKey;
	if (legacyGeminiApiKey && !aiApiKey) headers['X-Gemini-API-Key'] = legacyGeminiApiKey;

	console.log(`[generate proxy] model=${model} contents=${contents?.length} messages systemInstruction=${!!systemInstruction} tools=${tools?.[0]?.functionDeclarations?.length ?? 0} declarations`);
	console.log(`[generate proxy] Last content role=${contents?.[contents.length - 1]?.role} parts=${contents?.[contents.length - 1]?.parts?.length}`);

	const payload = {
		model: model || 'gemini-3-flash-preview',
		contents,
		generationConfig: generationConfig || { maxOutputTokens: 8192 },
		...(systemInstruction && { systemInstruction }),
		...(tools && { tools }),
		...(toolConfig && { toolConfig }),
		userPromptId
	};

	console.log(`[generate proxy] Forwarding to ${BACKEND}/api/generate`);
	const t0 = performance.now();

	const backendRes = await fetch(`${BACKEND}/api/generate`, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload)
	});

	console.log(`[generate proxy] Backend response: status=${backendRes.status} (${(performance.now() - t0).toFixed(0)}ms)`);

	if (!backendRes.ok) {
		const err = await backendRes.text();
		console.error(`[generate proxy] Backend error:`, err.slice(0, 500));
		return new Response(err, { status: backendRes.status });
	}

	const data = await backendRes.json();

	const candidate = data?.candidates?.[0] || data?.response?.candidates?.[0];
	if (candidate) {
		const parts = candidate.content?.parts || [];
		const partsSummary = parts.map((p: any) => {
			if (p.text) return `text(${p.text.length} chars)`;
			if (p.functionCall) return `functionCall(${p.functionCall.name}(${JSON.stringify(p.functionCall.args).slice(0, 80)}))`;
			return `unknown(${Object.keys(p).join(',')})`;
		}).join(', ');
		console.log(`[generate proxy] Response parts: [${partsSummary}]`);
		console.log(`[generate proxy] Finish reason: ${candidate.finishReason}`);
	} else {
		console.warn(`[generate proxy] No candidate in response. Keys:`, Object.keys(data || {}));
		console.log(`[generate proxy] Full response:`, JSON.stringify(data).slice(0, 500));
	}

	return new Response(JSON.stringify(data), {
		headers: { 'Content-Type': 'application/json' }
	});
};
