import { createGoogle } from '@ai-sdk/google';
import { generateText, jsonSchema, streamText, type ModelMessage } from 'ai';
import type { SessionData } from './session';

export type ModelModule = 'proxy' | 'ai-sdk';
export type AiProvider = 'google' | 'openai' | 'anthropic';

export type ModelRoute = {
	module: ModelModule;
	provider?: AiProvider;
	apiKey?: string;
};

export const RESOLVED_MODEL_MODULE_HEADER = 'X-Resolved-Model-Module';
export const RESOLVED_AI_PROVIDER_HEADER = 'X-Resolved-AI-Provider';
export const BYOK_ERROR_ORIGIN_HEADER = 'X-BYOK-Error-Origin';

export function getModelRouteResponseHeaders(
	route: ModelRoute,
	providerFailure = false
): Record<string, string> {
	const headers: Record<string, string> = {
		[RESOLVED_MODEL_MODULE_HEADER]: route.module
	};
	if (route.provider) headers[RESOLVED_AI_PROVIDER_HEADER] = route.provider;
	if (providerFailure) headers[BYOK_ERROR_ORIGIN_HEADER] = 'provider';
	return headers;
}

function withModelRouteHeaders(
	response: Response,
	route: ModelRoute,
	providerFailure = false
): Response {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(getModelRouteResponseHeaders(route, providerFailure))) {
		headers.set(name, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

export type GeminiRequestBody = {
	model?: string;
	contents: Array<{ role: string; parts: Record<string, any>[] }>;
	generationConfig?: Record<string, any>;
	tools?: unknown;
	systemInstruction?: unknown;
	toolConfig?: unknown;
	userPromptId?: string;
};

const CODE_ASSIST_BASE = 'https://cloudcode-pa.googleapis.com/v1internal';
const DEFAULT_TOOL_INPUT_SCHEMA = { type: 'object', properties: {} };
const GEMINI_SCHEMA_TYPE_MAP: Record<string, string> = {
	OBJECT: 'object',
	STRING: 'string',
	NUMBER: 'number',
	INTEGER: 'integer',
	BOOLEAN: 'boolean',
	ARRAY: 'array',
	NULL: 'null'
};

function isRecord(value: unknown): value is Record<string, any> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSchemaType(type: unknown): unknown {
	if (typeof type === 'string') {
		return GEMINI_SCHEMA_TYPE_MAP[type.toUpperCase()] || type;
	}
	if (Array.isArray(type)) {
		return type.map((item) => normalizeSchemaType(item));
	}
	return type;
}

function normalizeSchemaValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => normalizeSchemaValue(item));
	}
	if (!isRecord(value)) return value;

	const normalized: Record<string, any> = {};
	for (const [key, childValue] of Object.entries(value)) {
		if (key === 'type') {
			normalized[key] = normalizeSchemaType(childValue);
		} else if (key === 'properties' && isRecord(childValue)) {
			normalized[key] = Object.fromEntries(
				Object.entries(childValue).map(([propertyName, propertySchema]) => [
					propertyName,
					normalizeSchemaValue(propertySchema)
				])
			);
		} else if (key === 'items' || key === 'anyOf' || key === 'oneOf' || key === 'allOf') {
			normalized[key] = normalizeSchemaValue(childValue);
		} else {
			normalized[key] = childValue;
		}
	}

	return normalized;
}

export function normalizeGeminiFunctionSchemaForAiSdk(parameters: unknown): Record<string, any> {
	if (!isRecord(parameters)) return { ...DEFAULT_TOOL_INPUT_SCHEMA };
	return normalizeSchemaValue(parameters) as Record<string, any>;
}

export function geminiFunctionParametersToAiSdkInputSchema(parameters: unknown) {
	return jsonSchema(normalizeGeminiFunctionSchemaForAiSdk(parameters));
}

function textFromParts(parts: Record<string, any>[] | undefined): string {
	return (parts || [])
		.map((part) => {
			if (typeof part.text === 'string') return part.text;
			if (part.functionResponse) return JSON.stringify(part.functionResponse.response ?? part.functionResponse);
			if (part.functionCall) return JSON.stringify(part.functionCall);
			return '';
		})
		.filter(Boolean)
		.join('\n');
}

function systemText(systemInstruction: unknown): string | undefined {
	if (!systemInstruction || typeof systemInstruction !== 'object') return undefined;
	const parts = (systemInstruction as { parts?: unknown }).parts;
	if (!Array.isArray(parts)) return undefined;
	const text = textFromParts(parts as Record<string, any>[]);
	return text || undefined;
}

function toModelMessages(contents: GeminiRequestBody['contents']): ModelMessage[] {
	return contents.map((content) => {
		const text = textFromParts(content.parts);
		if (content.role === 'model') {
			return { role: 'assistant', content: text } as ModelMessage;
		}
		return { role: 'user', content: text } as ModelMessage;
	});
}

function buildGoogleTools(googleProvider: ReturnType<typeof createGoogle>, tools: unknown): Record<string, any> | undefined {
	const toolMap: Record<string, any> = {};
	if (Array.isArray(tools)) {
		for (const tool of tools as any[]) {
			if (tool.google_search) toolMap.google_search = googleProvider.tools.googleSearch({});
			if (tool.url_context) toolMap.url_context = googleProvider.tools.urlContext({});
		}
	}

	const declarations = Array.isArray(tools)
		? (tools as any[]).flatMap((tool) => tool.functionDeclarations || [])
		: [];
	for (const declaration of declarations) {
		toolMap[declaration.name] = {
			description: declaration.description,
			inputSchema: geminiFunctionParametersToAiSdkInputSchema(declaration.parameters)
		};
	}

	return Object.keys(toolMap).length ? toolMap : undefined;
}

function googleMetadata(providerMetadata: unknown): Record<string, any> {
	const metadata = providerMetadata as Record<string, any> | undefined;
	return (metadata?.google || metadata?.['google.generative-ai'] || {}) as Record<string, any>;
}

function toGeminiResponse(parts: Record<string, any>[], finishReason = 'STOP', metadata: Record<string, any> = {}) {
	return {
		candidates: [
			{
				content: {
					role: 'model',
					parts
				},
				finishReason,
				...(metadata.groundingMetadata && { groundingMetadata: metadata.groundingMetadata }),
				...(metadata.urlContextMetadata && { urlContextMetadata: metadata.urlContextMetadata }),
				...(metadata.safetyRatings && { safetyRatings: metadata.safetyRatings })
			}
		],
		...(metadata.usageMetadata && { usageMetadata: metadata.usageMetadata })
	};
}

function getGoogleProvider(route: ModelRoute) {
	if (route.provider !== 'google' || !route.apiKey) {
		throw new Error('Only Google BYOK is enabled for AI SDK routing');
	}
	return createGoogle({ apiKey: route.apiKey });
}

async function generateWithAiSdk(route: ModelRoute, body: GeminiRequestBody) {
	const model = body.model || 'gemini-3-flash-preview';
	const googleProvider = getGoogleProvider(route);
	const tools = buildGoogleTools(googleProvider, body.tools);
	const result = await generateText({
		model: googleProvider(model),
		messages: toModelMessages(body.contents),
		system: systemText(body.systemInstruction),
		tools,
		toolChoice: tools ? 'auto' : undefined,
		maxOutputTokens: body.generationConfig?.maxOutputTokens,
		providerOptions: {
			google: {
				thinkingConfig: body.generationConfig?.thinkingConfig
			}
		}
	});

	const parts: Record<string, any>[] = [];
	if (result.reasoningText) parts.push({ text: result.reasoningText, thought: true });
	if (result.text) parts.push({ text: result.text });
	for (const toolCall of result.toolCalls) {
		parts.push({
			functionCall: {
				name: toolCall.toolName,
				args: toolCall.input ?? {}
			}
		});
	}

	return toGeminiResponse(
		parts,
		result.finishReason?.toUpperCase?.() || 'STOP',
		googleMetadata(result.providerMetadata)
	);
}

async function streamWithAiSdk(route: ModelRoute, body: GeminiRequestBody): Promise<ReadableStream> {
	const encoder = new TextEncoder();
	const model = body.model || 'gemini-3-flash-preview';
	const googleProvider = getGoogleProvider(route);
	const tools = buildGoogleTools(googleProvider, body.tools);
	const result = streamText({
		model: googleProvider(model),
		messages: toModelMessages(body.contents),
		system: systemText(body.systemInstruction),
		tools,
		toolChoice: tools ? 'auto' : undefined,
		maxOutputTokens: body.generationConfig?.maxOutputTokens,
		providerOptions: {
			google: {
				thinkingConfig: body.generationConfig?.thinkingConfig
			}
		}
	});

	return new ReadableStream({
		async start(controller) {
			const toolInputs = new Map<string, { toolName: string; json: string }>();
			const emittedToolCalls = new Set<string>();
			try {
				for await (const chunk of result.fullStream) {
					if (chunk.type === 'error') {
						throw chunk.error;
					} else if (chunk.type === 'text-delta' && chunk.text) {
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify(
									toGeminiResponse([{ text: chunk.text }], 'STOP', googleMetadata(chunk.providerMetadata))
								)}\n\n`
							)
						);
					} else if (chunk.type === 'reasoning-delta' && chunk.text) {
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify(
									toGeminiResponse(
										[{ text: chunk.text, thought: true }],
										'STOP',
										googleMetadata(chunk.providerMetadata)
									)
								)}\n\n`
							)
						);
					} else if (chunk.type === 'tool-input-start') {
						toolInputs.set(chunk.id, { toolName: chunk.toolName, json: '' });
					} else if (chunk.type === 'tool-input-delta') {
						const existing = toolInputs.get(chunk.id);
						if (existing) existing.json += chunk.delta;
					} else if (chunk.type === 'tool-call') {
						emittedToolCalls.add(chunk.toolCallId);
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify(
									toGeminiResponse([
										{
											functionCall: {
												name: chunk.toolName,
												args: chunk.input ?? {}
											}
										}
									])
								)}\n\n`
							)
						);
					} else if (chunk.type === 'tool-input-end') {
						if (emittedToolCalls.has(chunk.id)) continue;
						const existing = toolInputs.get(chunk.id);
						if (!existing) continue;
						let args: unknown = {};
						try {
							args = existing.json ? JSON.parse(existing.json) : {};
						} catch {
							args = {};
						}
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify(
									toGeminiResponse([
										{
											functionCall: {
												name: existing.toolName,
												args
											}
										}
									])
								)}\n\n`
							)
						);
					}
				}

				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							error: message,
							errorOrigin: 'provider',
							provider: route.provider
						})}\n\n`
					)
				);
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			}
		}
	});
}

async function generateWithProxy(session: SessionData, body: GeminiRequestBody) {
	const { accessToken, project } = session;
	if (!project) {
		return new Response(JSON.stringify({ error: 'No project set up' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { model, contents, generationConfig, tools, systemInstruction, toolConfig, userPromptId } = body;
	const apiRes = await fetch(`${CODE_ASSIST_BASE}:generateContent`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			project,
			model: model || 'gemini-3-flash-preview',
			...(userPromptId && { user_prompt_id: userPromptId }),
				request: {
					contents,
					generationConfig: generationConfig || { maxOutputTokens: 8192 },
					...(tools ? { tools } : {}),
					...(systemInstruction ? { systemInstruction } : {}),
					...(toolConfig ? { toolConfig } : {})
				}
			})
		});

	if (!apiRes.ok) {
		const errBody = await apiRes.text();
		return new Response(errBody, {
			status: apiRes.status,
			headers: { 'Content-Type': 'text/plain' }
		});
	}

	return new Response(await apiRes.text(), {
		headers: { 'Content-Type': 'application/json' }
	});
}

async function streamWithProxy(session: SessionData, body: GeminiRequestBody) {
	const { accessToken, project } = session;
	if (!project) {
		return new Response(JSON.stringify({ error: 'No project set up' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { model, contents, generationConfig, tools, systemInstruction, toolConfig, userPromptId } = body;
	const apiRes = await fetch(`${CODE_ASSIST_BASE}:streamGenerateContent?alt=sse`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			project,
			model: model || 'gemini-3-flash-preview',
			...(userPromptId && { user_prompt_id: userPromptId }),
				request: {
					contents,
					generationConfig: generationConfig || { maxOutputTokens: 8192 },
					...(tools ? { tools } : {}),
					...(systemInstruction ? { systemInstruction } : {}),
					...(toolConfig ? { toolConfig } : {})
				}
			})
		});

	if (!apiRes.ok) {
		const errBody = await apiRes.text();
		return new Response(errBody, {
			status: apiRes.status,
			headers: { 'Content-Type': 'text/plain' }
		});
	}

	return new Response(apiRes.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}

export async function generateModel(route: ModelRoute, body: GeminiRequestBody, session: SessionData) {
	if (route.module === 'ai-sdk') {
		try {
			const data = await generateWithAiSdk(route, body);
			return withModelRouteHeaders(new Response(JSON.stringify(data), {
				headers: { 'Content-Type': 'application/json' }
			}), route);
		} catch (err) {
			return withModelRouteHeaders(new Response(
				JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
				{
					status: 502,
					headers: { 'Content-Type': 'application/json' }
				}
			), route, true);
		}
	}

	return withModelRouteHeaders(await generateWithProxy(session, body), route);
}

export async function streamModel(route: ModelRoute, body: GeminiRequestBody, session: SessionData) {
	if (route.module === 'ai-sdk') {
		try {
			const stream = await streamWithAiSdk(route, body);
			return withModelRouteHeaders(new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'X-Accel-Buffering': 'no'
				}
			}), route);
		} catch (err) {
			return withModelRouteHeaders(new Response(
				JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
				{
					status: 502,
					headers: { 'Content-Type': 'application/json' }
				}
			), route, true);
		}
	}

	return withModelRouteHeaders(await streamWithProxy(session, body), route);
}
