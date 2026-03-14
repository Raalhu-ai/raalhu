import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import { AGENT_TOOLS } from './tools';
import { fetchWithRetry, TerminalQuotaError } from './retry';

interface GeminiTransportOptions {
	model: string;
	systemInstruction: { role: string; parts: [{ text: string }] };
}

async function* parseSSEStream(response: Response): AsyncGenerator<any> {
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

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
				if (jsonStr === '[DONE]') return;

				try {
					yield JSON.parse(jsonStr);
				} catch {
					// Skip malformed JSON
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

export class GeminiChatTransport implements ChatTransport<UIMessage> {
	private _model: string;
	private systemInstruction: { role: string; parts: [{ text: string }] };

	constructor(options: GeminiTransportOptions) {
		this._model = options.model;
		this.systemInstruction = options.systemInstruction;
	}

	setModel(model: string) {
		this._model = model;
	}

	async sendMessages(options: {
		trigger: 'submit-message' | 'regenerate-message';
		chatId: string;
		messageId: string | undefined;
		messages: UIMessage[];
		abortSignal: AbortSignal | undefined;
		headers?: Record<string, string> | Headers;
		body?: object;
		metadata?: unknown;
	}): Promise<ReadableStream<UIMessageChunk>> {
		const { messages, abortSignal } = options;
		const geminiContents = this.convertToGemini(messages);

		const reqBody = {
			model: this._model,
			contents: geminiContents,
			systemInstruction: this.systemInstruction,
			tools: AGENT_TOOLS,
			toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
			generationConfig: {
				maxOutputTokens: 65536,
				thinkingConfig: { includeThoughts: true }
			}
		};

		const response = await fetchWithRetry('/api/stream', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(reqBody),
			signal: abortSignal
		});

		if (!response.ok) {
			const errText = await response.text();
			throw new Error(`API error (${response.status}): ${errText}`);
		}

		return this.createChunkStream(response);
	}

	async reconnectToStream(_options: {
		chatId: string;
		headers?: Record<string, string> | Headers;
		body?: object;
		metadata?: unknown;
	}): Promise<ReadableStream<UIMessageChunk> | null> {
		return null;
	}

	private createChunkStream(response: Response): ReadableStream<UIMessageChunk> {
		return new ReadableStream({
			async start(controller) {
				let textPartId: string | null = null;
				let reasoningPartId: string | null = null;

				try {
					for await (const chunk of parseSSEStream(response)) {
						const candidate =
							chunk?.candidates?.[0] || chunk?.response?.candidates?.[0];
						if (!candidate) continue;

						const parts = candidate.content?.parts || [];

						for (const part of parts) {
							if (part.thought && part.text) {
								// Thinking / reasoning
								if (textPartId) {
									controller.enqueue({ type: 'text-end', id: textPartId });
									textPartId = null;
								}
								if (!reasoningPartId) {
									reasoningPartId = crypto.randomUUID();
									controller.enqueue({
										type: 'reasoning-start',
										id: reasoningPartId
									});
								}
								controller.enqueue({
									type: 'reasoning-delta',
									id: reasoningPartId,
									delta: part.text
								});
							} else if (part.text && !part.thought) {
								// Regular text
								if (reasoningPartId) {
									controller.enqueue({
										type: 'reasoning-end',
										id: reasoningPartId
									});
									reasoningPartId = null;
								}
								if (!textPartId) {
									textPartId = crypto.randomUUID();
									controller.enqueue({
										type: 'text-start',
										id: textPartId
									});
								}
								controller.enqueue({
									type: 'text-delta',
									id: textPartId,
									delta: part.text
								});
							} else if (part.functionCall) {
								// Tool call — close any open text/reasoning
								if (textPartId) {
									controller.enqueue({ type: 'text-end', id: textPartId });
									textPartId = null;
								}
								if (reasoningPartId) {
									controller.enqueue({
										type: 'reasoning-end',
										id: reasoningPartId
									});
									reasoningPartId = null;
								}

								controller.enqueue({
									type: 'tool-input-available',
									toolCallId: crypto.randomUUID(),
									toolName: part.functionCall.name,
									input: part.functionCall.args || {},
									dynamic: true
								});
							}
						}
					}

					// Close any open parts
					if (reasoningPartId) {
						controller.enqueue({
							type: 'reasoning-end',
							id: reasoningPartId
						});
					}
					if (textPartId) {
						controller.enqueue({ type: 'text-end', id: textPartId });
					}

					controller.enqueue({ type: 'finish', finishReason: 'stop' as const });
					controller.close();
				} catch (err: any) {
					if (err instanceof TerminalQuotaError) {
						controller.enqueue({
							type: 'error',
							errorText:
								'ކޯޓާ ހުސްވެއްޖެ — You have exhausted your daily quota.'
						});
					} else {
						controller.enqueue({ type: 'error', errorText: err.message });
					}
					controller.close();
				}
			}
		});
	}

	/**
	 * Convert UIMessage[] to Gemini content format.
	 * Splits assistant messages at tool call boundaries into proper
	 * model turn (with functionCall) + user turn (with functionResponse) pairs.
	 */
	private convertToGemini(
		messages: UIMessage[]
	): Array<{ role: string; parts: any[] }> {
		const contents: Array<{ role: string; parts: any[] }> = [];

		for (const msg of messages) {
			if (msg.role === 'user') {
				const text = msg.parts
					.filter(
						(p): p is { type: 'text'; text: string } => p.type === 'text'
					)
					.map((p) => p.text)
					.join('');
				if (text) {
					contents.push({ role: 'user', parts: [{ text }] });
				}
			} else if (msg.role === 'assistant') {
				let currentModelParts: any[] = [];
				let pendingResponses: any[] = [];

				for (const part of msg.parts) {
					if (part.type === 'text') {
						// If there are pending function responses, flush them first
						if (pendingResponses.length > 0) {
							contents.push({ role: 'user', parts: pendingResponses });
							pendingResponses = [];
						}
						currentModelParts.push({ text: (part as any).text });
					} else if (part.type === 'step-start') {
						// Step boundary — flush pending responses
						if (pendingResponses.length > 0) {
							contents.push({ role: 'user', parts: pendingResponses });
							pendingResponses = [];
						}
					} else if (part.type === 'dynamic-tool') {
						const toolPart = part as any;
						currentModelParts.push({
							functionCall: {
								name: toolPart.toolName,
								args: toolPart.input || {}
							}
						});

						// Flush model parts before adding function response
						if (currentModelParts.length > 0) {
							contents.push({ role: 'model', parts: currentModelParts });
							currentModelParts = [];
						}

						if (toolPart.state === 'output-available') {
							pendingResponses.push({
								functionResponse: {
									name: toolPart.toolName,
									response: toolPart.output || {}
								}
							});
						} else if (toolPart.state === 'output-error') {
							pendingResponses.push({
								functionResponse: {
									name: toolPart.toolName,
									response: { error: toolPart.errorText }
								}
							});
						}
					}
					// Skip reasoning parts — Gemini doesn't accept them as input
				}

				// Flush remaining
				if (currentModelParts.length > 0) {
					contents.push({ role: 'model', parts: currentModelParts });
				}
				if (pendingResponses.length > 0) {
					contents.push({ role: 'user', parts: pendingResponses });
				}
			}
		}

		return contents;
	}
}
