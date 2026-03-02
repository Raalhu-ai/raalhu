import type { RequestHandler } from './$types';
import { getToolsForMode, getSystemInstruction } from '$lib/tools';
import { executeFunctionCall } from '$lib/tool-executor';

interface GeminiContent {
	role: string;
	parts: Record<string, unknown>[];
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const { messages, model = 'gemini-3-flash-preview', mode, formData } = await request.json();
	const modeId = (mode || 'chat') as string;
	const userPromptId = crypto.randomUUID();

	console.log(
		`[chat] model=${model} mode=${modeId} formData=${formData ? JSON.stringify(formData) : 'none'}`
	);

	// Build Gemini contents from AI SDK messages (skip sys- messages)
	const contents: GeminiContent[] = messages
		.filter((m: { id?: string }) => !m.id?.startsWith('sys-'))
		.map((m: { role: string; content: string }) => ({
			role: m.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: m.content }]
		}));

	// Build system instruction and tools based on mode
	const systemInstruction = getSystemInstruction(modeId, formData);
	const { tools, toolConfig } = getToolsForMode(modeId);

	// Forward cookies for Express session auth
	const cookie = request.headers.get('cookie') || '';

	const isGenerateMode = modeId === 'generate' && !!formData?.documentType;
	const isSearchMode = modeId === 'research' || modeId === 'web_search';
	const docType = formData?.documentType || 'other';

	const encoder = new TextEncoder();
	const emit = (code: string, data: unknown) =>
		encoder.encode(`${code}:${JSON.stringify(data)}\n`);

	// --- Generate mode: real function calling (non-streaming first, then streaming) ---
	if (isGenerateMode) {
		return handleGenerateMode({
			model,
			contents,
			systemInstruction,
			tools,
			toolConfig,
			cookie,
			userPromptId,
			docType,
			formData,
			emit,
			encoder
		});
	}

	// --- All other modes: direct streaming ---
	const payload: Record<string, unknown> = {
		model,
		contents,
		generationConfig: { maxOutputTokens: 65536 },
		systemInstruction,
		userPromptId,
		...(tools && { tools }),
		...(toolConfig && { toolConfig })
	};

	const backendRes = await fetch(`${BACKEND}/api/stream`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Cookie: cookie },
		body: JSON.stringify(payload)
	});

	if (!backendRes.ok) {
		const err = await backendRes.text();
		return new Response(JSON.stringify({ error: err }), {
			status: backendRes.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const stream = new ReadableStream({
		async start(controller) {
			const hasError = await streamGeminiSSE(backendRes, controller, emit, isSearchMode);
			emitFinish(controller, emit, hasError);
			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'X-Vercel-AI-Data-Stream': 'v1'
		}
	});
};

/**
 * Generate mode: two-step function calling.
 * 1. Non-streaming call with tools → Gemini returns functionCall
 * 2. Execute function locally → build functionResponse
 * 3. Streaming call with full history → final document text
 */
async function handleGenerateMode({
	model,
	contents,
	systemInstruction,
	tools,
	toolConfig,
	cookie,
	userPromptId,
	docType,
	formData,
	emit,
	encoder
}: {
	model: string;
	contents: GeminiContent[];
	systemInstruction: Record<string, unknown>;
	tools: Record<string, unknown>[] | undefined;
	toolConfig: Record<string, unknown> | undefined;
	cookie: string;
	userPromptId: string;
	docType: string;
	formData: Record<string, string>;
	emit: (code: string, data: unknown) => Uint8Array;
	encoder: TextEncoder;
}): Promise<Response> {
	const stream = new ReadableStream({
		async start(controller) {
			let hasError = false;

			try {
				// Step 1: Non-streaming call to get function call
				console.log(`[chat][generate] Step 1: requesting function call for ${docType}`);

				const step1Payload = {
					model,
					contents,
					generationConfig: { maxOutputTokens: 8192 },
					systemInstruction,
					userPromptId,
					...(tools && { tools }),
					...(toolConfig && { toolConfig })
				};

				const step1Res = await fetch(`${BACKEND}/api/generate`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Cookie: cookie },
					body: JSON.stringify(step1Payload)
				});

				if (!step1Res.ok) {
					const err = await step1Res.text();
					console.error(`[chat][generate] Step 1 failed:`, err);
					controller.enqueue(emit('3', `Generate step 1 failed: ${err}`));
					emitFinish(controller, emit, true);
					controller.close();
					return;
				}

				const step1Data = await step1Res.json();
				const candidate = step1Data?.candidates?.[0] || step1Data?.response?.candidates?.[0];
				const parts = candidate?.content?.parts || [];

				console.log(
					`[chat][generate] Step 1 parts:`,
					parts.map((p: Record<string, unknown>) => Object.keys(p))
				);

				// Check if Gemini returned a function call
				const functionCallPart = parts.find(
					(p: Record<string, unknown>) => p.functionCall
				);

				if (functionCallPart) {
					const fc = functionCallPart.functionCall as {
						name: string;
						args: Record<string, unknown>;
					};
					console.log(`[chat][generate] Got functionCall: ${fc.name}(${JSON.stringify(fc.args)})`);

					// Emit tool-call annotation for frontend UX
					controller.enqueue(
						emit('8', [
							{
								type: 'tool-call',
								toolName: `generate_${docType}`,
								documentType: docType,
								topic: formData?.topic || '',
								points: formData?.points || '',
								status: 'generating'
							}
						])
					);

					// Step 2: Execute function locally
					const result = executeFunctionCall(fc.name, fc.args);
					console.log(`[chat][generate] Step 2: executed ${fc.name}, got ${result.length} chars`);

					// Build the multi-turn contents:
					// original contents + model's functionCall + our functionResponse
					const fullContents: GeminiContent[] = [
						...contents,
						{
							role: 'model',
							parts: [{ functionCall: { name: fc.name, args: fc.args } }]
						},
						{
							role: 'user',
							parts: [
								{
									functionResponse: {
										name: fc.name,
										response: { content: result }
									}
								}
							]
						}
					];

					// Step 3: Streaming call for final document (no tools needed)
					console.log(`[chat][generate] Step 3: streaming final document`);

					const step3Payload = {
						model,
						contents: fullContents,
						generationConfig: { maxOutputTokens: 65536 },
						systemInstruction,
						userPromptId
						// No tools — model should just generate the document now
					};

					const step3Res = await fetch(`${BACKEND}/api/stream`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', Cookie: cookie },
						body: JSON.stringify(step3Payload)
					});

					if (!step3Res.ok) {
						const err = await step3Res.text();
						console.error(`[chat][generate] Step 3 failed:`, err);
						controller.enqueue(emit('3', `Generate step 3 failed: ${err}`));
						hasError = true;
					} else {
						hasError = await streamGeminiSSE(step3Res, controller, emit, false);
					}

					// Emit tool-result annotation
					controller.enqueue(
						emit('8', [
							{
								type: 'tool-result',
								toolName: `generate_${docType}`,
								status: hasError ? 'error' : 'success'
							}
						])
					);
				} else {
					// No function call — Gemini gave text directly (fallback)
					console.log(
						`[chat][generate] No functionCall detected, falling back to server-side execution`
					);

					// Emit tool-call annotation
					controller.enqueue(
						emit('8', [
							{
								type: 'tool-call',
								toolName: `generate_${docType}`,
								documentType: docType,
								topic: formData?.topic || '',
								points: formData?.points || '',
								status: 'generating'
							}
						])
					);

					// Server-side fallback: inject template into systemInstruction
					const templateInstructions = executeFunctionCall('get_document_template', {
						document_type: docType
					});
					const enrichedSystemInstruction = {
						role: 'user',
						parts: [
							{
								text:
									(systemInstruction as { parts: [{ text: string }] }).parts[0].text +
									'\n\n--- ލިޔުމުގެ ޓެމްޕްލޭޓް ---\n\n' +
									templateInstructions
							}
						]
					};

					console.log(`[chat][generate] Fallback: injected template for ${docType}`);

					const fallbackPayload = {
						model,
						contents,
						generationConfig: { maxOutputTokens: 65536 },
						systemInstruction: enrichedSystemInstruction,
						userPromptId
					};

					const fallbackRes = await fetch(`${BACKEND}/api/stream`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', Cookie: cookie },
						body: JSON.stringify(fallbackPayload)
					});

					if (!fallbackRes.ok) {
						const err = await fallbackRes.text();
						controller.enqueue(emit('3', `Generate fallback failed: ${err}`));
						hasError = true;
					} else {
						hasError = await streamGeminiSSE(fallbackRes, controller, emit, false);
					}

					// Emit tool-result annotation
					controller.enqueue(
						emit('8', [
							{
								type: 'tool-result',
								toolName: `generate_${docType}`,
								status: hasError ? 'error' : 'success'
							}
						])
					);
				}
			} catch (err) {
				hasError = true;
				console.error(`[chat][generate] Error:`, err);
				controller.enqueue(emit('3', String(err)));
			}

			emitFinish(controller, emit, hasError);
			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'X-Vercel-AI-Data-Stream': 'v1'
		}
	});
}

/**
 * Reads a Gemini SSE stream and emits text chunks as Data Stream Protocol.
 * Returns true if an error occurred.
 */
async function streamGeminiSSE(
	response: Response,
	controller: ReadableStreamDefaultController,
	emit: (code: string, data: unknown) => Uint8Array,
	extractGrounding = false
): Promise<boolean> {
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let hasError = false;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop()!;

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const jsonStr = line.slice(6).trim();
				if (jsonStr === '[DONE]') continue;

				try {
					const chunk = JSON.parse(jsonStr);
					const candidate =
						chunk?.candidates?.[0] || chunk?.response?.candidates?.[0];
					const parts = candidate?.content?.parts || [];

					for (const part of parts) {
						if (part.text) {
							controller.enqueue(emit('0', part.text));
						}
					}

					// Extract grounding metadata for search modes
					if (extractGrounding) {
						const grounding =
							candidate?.groundingMetadata ||
							chunk?.response?.candidates?.[0]?.groundingMetadata;
						if (grounding) {
							controller.enqueue(
								emit('8', [
									{
										type: 'grounding',
										searchQueries: grounding.webSearchQueries || [],
										sources: (grounding.groundingChunks || []).map(
											(c: { web?: { uri: string; title: string } }) => ({
												url: c.web?.uri || '',
												title: c.web?.title || ''
											})
										),
										searchSuggestions:
											grounding.searchEntryPoint?.renderedContent || null
									}
								])
							);
						}
					}
				} catch {
					// skip malformed JSON
				}
			}
		}
	} catch (err) {
		hasError = true;
		controller.enqueue(emit('3', String(err)));
	}

	return hasError;
}

/**
 * Emit finish markers for Data Stream Protocol v1.
 */
function emitFinish(
	controller: ReadableStreamDefaultController,
	emit: (code: string, data: unknown) => Uint8Array,
	hasError: boolean
) {
	const reason = hasError ? 'error' : 'stop';
	controller.enqueue(
		emit('e', { finishReason: reason, usage: { promptTokens: 0, completionTokens: 0 } })
	);
	controller.enqueue(emit('d', { finishReason: reason }));
}
