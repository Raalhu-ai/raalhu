import { googleFailure } from './byok-failure';
import { createGoogle } from '@ai-sdk/google';
import { generateText, jsonSchema, streamText, type ModelMessage, type AssistantModelMessage, type UserModelMessage, type ToolModelMessage } from 'ai';
import type { SessionData } from './session';
import { proxyAntigravity, type RefreshSession } from './antigravity';

export type ModelModule = 'proxy' | 'ai-sdk';
export type AiProvider = 'google' | 'openai' | 'anthropic';

export type ModelRoute = {
	module: ModelModule;
	provider?: AiProvider;
	apiKey?: string;
};

export type GeminiRequestBody = {
	model?: string;
	contents: Array<{ role: string; parts: Record<string, any>[] }>;
	generationConfig?: Record<string, any>;
	tools?: unknown;
	systemInstruction?: unknown;
	toolConfig?: unknown;
	userPromptId?: string;
	conversationId?: string;
};

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

/** Gemini clients may omit call IDs. Match those results by name in call order. */
export function toModelMessages(contents: GeminiRequestBody['contents']): ModelMessage[] {
	const messages: ModelMessage[] = [];
	const pending: Array<{ id: string; name: string }> = [];
	const reserved = new Set(contents.flatMap(c => c.parts.flatMap(p =>
		typeof p.functionCall?.id === 'string' ? [p.functionCall.id] : [])));
	let sequence = 0;
	const newId = () => {
		let id: string;
		do { id = `gemini-call-${sequence++}`; } while (reserved.has(id));
		reserved.add(id);
		return id;
	};
	for (const content of contents) {
		if (content.role === 'model') {
			const parts: AssistantModelMessage['content'] = [];
			for (const part of content.parts) {
				const providerOptions = typeof part.thoughtSignature === 'string'
					? { google: { thoughtSignature: part.thoughtSignature } } : undefined;
				if (part.functionCall) {
					const call = part.functionCall;
					const id = typeof call.id === 'string' ? call.id : newId();
					pending.push({ id, name: call.name });
					parts.push({ type: 'tool-call', toolCallId: id, toolName: call.name,
						input: call.args ?? {}, providerOptions });
				} else if (typeof part.text === 'string') {
					parts.push({ type: part.thought ? 'reasoning' : 'text', text: part.text, providerOptions });
				}
			}
			if (parts.length) messages.push({ role: 'assistant', content: parts });
			continue;
		}
		// Tool results require their own SDK role; keep interleaved user text in order.
		let userParts: Exclude<UserModelMessage['content'], string> = [];
		let toolParts: ToolModelMessage['content'] = [];
		const flushUser = () => {
			if (userParts.length) messages.push({ role: 'user', content: userParts });
			userParts = [];
		};
		const flushTools = () => {
			if (toolParts.length) messages.push({ role: 'tool', content: toolParts });
			toolParts = [];
		};
		for (const part of content.parts) {
			if (part.functionResponse) {
				flushUser();
				const result = part.functionResponse;
				const index = pending.findIndex(call => call.name === result.name &&
					(typeof result.id !== 'string' || call.id === result.id));
				if (index < 0) throw new Error('Tool result has no matching function call.');
				const [call] = pending.splice(index, 1);
				toolParts.push({ type: 'tool-result', toolCallId: call.id, toolName: call.name,
					output: { type: 'json', value: result.response ?? {} } });
			} else {
				flushTools();
				if (typeof part.text === 'string') userParts.push({ type: 'text', text: part.text });
				else if (part.inlineData) userParts.push({ type: 'file',
					data: part.inlineData.data, mediaType: part.inlineData.mimeType });
			}
		}
		flushUser();
		flushTools();
	}
	return messages;
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
		// fullStream errors are sanitized below; avoid SDK logging raw provider bodies.
		onError: () => {},
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
					if (chunk.type === 'error') throw chunk.error;
					if (chunk.type === 'abort') throw new DOMException('Request cancelled', 'AbortError');
					if (chunk.type === 'text-delta' && chunk.text) {
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
				const failure = googleFailure(err);
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(failure)}\n\n`));
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			}
		}
	});
}

export type ProxyRuntime = {
	version: string;
	refreshSession: RefreshSession;
};

export async function generateModel(
	route: ModelRoute,
	body: GeminiRequestBody,
	session: SessionData,
	runtime: ProxyRuntime
) {
	if (route.module === 'ai-sdk') {
		try {
			const data = await generateWithAiSdk(route, body);
			return new Response(JSON.stringify(data), {
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (err) {
			return new Response(
				JSON.stringify(googleFailure(err)),
				{
					status: 502,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
	}

	return proxyAntigravity(session, body, runtime.version, false, runtime.refreshSession);
}

export async function streamModel(
	route: ModelRoute,
	body: GeminiRequestBody,
	session: SessionData,
	runtime: ProxyRuntime
) {
	if (route.module === 'ai-sdk') {
		try {
			const stream = await streamWithAiSdk(route, body);
			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'X-Accel-Buffering': 'no'
				}
			});
		} catch (err) {
			return new Response(
				JSON.stringify(googleFailure(err)),
				{
					status: 502,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
	}

	return proxyAntigravity(session, body, runtime.version, true, runtime.refreshSession);
}
