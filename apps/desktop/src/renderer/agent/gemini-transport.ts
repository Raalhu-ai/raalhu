import { byokFailureKind, byokFailureMessages } from '../../byok-failure';
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import { AGENT_TOOLS } from './tools';
import { TerminalQuotaError } from './retry';
import { fetchModelRequest, ModelRequestError } from '../model-request';
import type { MemoriesPayload } from '../memory';

class NonRetryableStreamError extends Error {}

interface GeminiTransportOptions {
  onFallback?: (message: string) => void;
  resolveMemories?: () => Promise<MemoriesPayload | undefined>;
	model: string;
	systemInstruction: { role: string; parts: [{ text: string }] };
}

async function* parseSSEStream(response: Response): AsyncGenerator<any> {
	if (!response.body) throw new Error('The server returned an empty response. Please try again.');
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = done ? '' : lines.pop()!;

			for (const line of lines) {
				if (!line.startsWith('data:')) continue;
				const jsonStr = line.slice(5).trim();
				if (!jsonStr) continue;
				if (jsonStr === '[DONE]') return;

				try {
					yield JSON.parse(jsonStr);
				} catch {
					throw new Error('The server returned an unreadable response. Please try again.');
				}
			}
			if (done) break;
		}
	} finally {
		await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
}

export class GeminiChatTransport implements ChatTransport<UIMessage> {
  private onFallback?: GeminiTransportOptions['onFallback'];
  private resolveMemories?: GeminiTransportOptions['resolveMemories'];
	private _model: string;
	private systemInstruction: { role: string; parts: [{ text: string }] };

	constructor(options: GeminiTransportOptions) {
    this.resolveMemories = options.resolveMemories;
    this.onFallback = options.onFallback;
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
		const { messages, abortSignal, chatId } = options;
		const geminiContents = this.convertToGemini(messages);
    const memories = await this.resolveMemories?.();
    abortSignal?.throwIfAborted();

		const reqBody = {
      ...(memories && { memories }),
			model: this._model,
			conversationId: chatId,
			contents: geminiContents,
			systemInstruction: this.systemInstruction,
			tools: AGENT_TOOLS,
			toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
			generationConfig: {
				maxOutputTokens: 65536,
				thinkingConfig: { includeThoughts: true }
			}
		};

    const requestAbort = new AbortController();
    const signal = abortSignal ? AbortSignal.any([abortSignal, requestAbort.signal]) : requestAbort.signal;
    const init: RequestInit = {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody), signal,
    };
    const requestProxy = async () => {
      signal.throwIfAborted();
      return fetchModelRequest('/api/stream', init, true);
    };
    let response: Response;
    let fallbackUsed = false;
    try {
      response = await fetchModelRequest('/api/stream', init);
    } catch (error) {
      if (signal.aborted || !(error instanceof ModelRequestError) || error.module !== 'ai-sdk') throw error;
      fallbackUsed = true;
      try { response = await requestProxy(); }
      catch (proxyError) { throw new Error(error.message + ' Proxy fallback could not start: ' + (proxyError instanceof Error ? proxyError.message : String(proxyError))); }
      if (response.ok) this.onFallback?.('BYOK failed before output. This turn was retried through the Antigravity proxy.');
    }
    return this.createChunkStream(response, requestProxy, signal, fallbackUsed, () => requestAbort.abort());
  }

	async reconnectToStream(_options: {
		chatId: string;
		headers?: Record<string, string> | Headers;
		body?: object;
		metadata?: unknown;
	}): Promise<ReadableStream<UIMessageChunk> | null> {
		return null;
	}

  private createChunkStream(response: Response, requestProxy: () => Promise<Response>, signal?: AbortSignal, fallbackUsed = false, abortRequest?: () => void): ReadableStream<UIMessageChunk> {
    const onFallback = this.onFallback;
    let cancelled = false;
		return new ReadableStream({
			async start(controller) {
				let textPartId: string | null = null;
				let reasoningPartId: string | null = null;
				let hasAnswer = false;
				let finishReason: string | undefined;
        let emitted = false;
        const closeParts = () => {
          if (reasoningPartId) { controller.enqueue({ type: 'reasoning-end', id: reasoningPartId }); reasoningPartId = null; }
          if (textPartId) { controller.enqueue({ type: 'text-end', id: textPartId }); textPartId = null; }
        };
        for (;;) {

				try {
          signal?.throwIfAborted();
          if (!response.ok) {
            const text = await response.text();
            let message = text;
            let failure: unknown;
            try { failure = JSON.parse(text); } catch {}
            const kind = byokFailureKind(failure);
            if (kind === 'cancelled') throw new NonRetryableStreamError(byokFailureMessages[kind]);
            if (kind !== 'unknown') message = byokFailureMessages[kind];
            else { const parsed = failure as any; message = typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message || parsed?.message || text; }
            if (response.status === 401) throw new NonRetryableStreamError(message);
            throw new Error('API error (' + response.status + '): ' + message);
          }
          finishReason = undefined;
					for await (const chunk of parseSSEStream(response)) {
						const error = chunk?.error || chunk?.response?.error;
						if (error) {
              const kind = byokFailureKind(chunk?.error ? chunk : chunk.response);
              if (kind === 'cancelled') throw new NonRetryableStreamError(byokFailureMessages[kind]);
              throw new Error(kind !== 'unknown' ? byokFailureMessages[kind] : typeof error === 'string' ? error : error.message || JSON.stringify(error));
            }
						const blockReason = (chunk?.promptFeedback || chunk?.response?.promptFeedback)?.blockReason;
						if (blockReason) throw new NonRetryableStreamError(`The model blocked this request (${blockReason}). Please revise your message.`);
						const candidate =
							chunk?.candidates?.[0] || chunk?.response?.candidates?.[0];
						if (!candidate) continue;
						if (candidate.finishReason) finishReason = candidate.finishReason;

						const parts = candidate.content?.parts || [];

						for (const part of parts) {
							if (part.thought && part.text) {
                emitted = true;
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
                emitted = true;
								hasAnswer = true;
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
                emitted = true;
								hasAnswer = true;
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

          closeParts();

					if (finishReason && finishReason !== 'STOP') throw new NonRetryableStreamError(`The model stopped before completing its response (${finishReason}). Please try again or choose another model.`);
					if (!hasAnswer) throw new Error('The model returned no answer. Please try again or choose another model.');

					controller.enqueue({ type: 'finish', finishReason: 'stop' as const });
					controller.close();
          return;
				} catch (err: any) {
          if (cancelled) return;
          if (!signal?.aborted && !(err instanceof NonRetryableStreamError) && !emitted && !fallbackUsed && response.headers.get('X-Resolved-Model-Module') === 'ai-sdk') {
            fallbackUsed = true;
            try {
              response = await requestProxy();
              if (response.ok) onFallback?.('BYOK failed before output. This turn was retried through the Antigravity proxy.');
              continue;
            } catch (proxyError) {
              err = new Error((err?.message || 'BYOK stream failed.') + ' Proxy fallback could not start: ' + (proxyError instanceof Error ? proxyError.message : String(proxyError)));
            }
          }
          closeParts();
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
          return;
				}
        }
			},
      cancel() { cancelled = true; abortRequest?.(); }
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
				const parts: any[] = [];
				for (const p of msg.parts) {
					if (p.type === 'text') {
						parts.push({ text: (p as any).text });
					} else if (p.type === 'file') {
						const fp = p as any;
						const url: string = fp.url || '';
						// Convert data URL to Gemini inlineData format
						const match = url.match(/^data:([^;]+);base64,(.+)$/);
						if (match) {
							parts.push({
								inlineData: {
									mimeType: match[1],
									data: match[2],
								}
							});
						}
					}
				}
				if (parts.length > 0) {
					contents.push({ role: 'user', parts });
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
