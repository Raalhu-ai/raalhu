import type { AgentEvent, GeminiContent, UserInputQuestion, MessageComposeData, RecipeData, WidgetData } from './types';
import type { PyodideSandbox } from './sandbox';
import { AGENT_TOOLS } from './tools';
import { executeToolCall } from './executor';
import { TerminalQuotaError } from './retry';
import { API_BASE, getAuthHeaders } from '../api';

const MAX_TURNS = 15;

interface AgentLoopOptions {
	model: string;
	contents: GeminiContent[];
	systemInstruction: { role: string; parts: [{ text: string }] };
	sandbox?: PyodideSandbox | null;
}

/** Accumulator for one SSE turn */
interface TurnAccumulator {
	rawParts: any[];
	functionCalls: { name: string; args: Record<string, unknown> }[];
	textContent: string;
}

/**
 * XHR-based SSE parser for React Native (no ReadableStream support).
 * Returns an async generator that yields parsed JSON chunks.
 */
function createXHRSSEStream(
	url: string,
	body: string,
	headers: Record<string, string>,
	signal?: { aborted: boolean }
): {
	generator: AsyncGenerator<any>;
	abort: () => void;
} {
	let resolve: ((value: IteratorResult<any>) => void) | null = null;
	let done = false;
	const queue: any[] = [];
	let processedLength = 0;
	let buffer = '';
	let xhr: XMLHttpRequest;

	function processNewData(responseText: string) {
		const newData = responseText.slice(processedLength);
		processedLength = responseText.length;
		buffer += newData;

		const lines = buffer.split('\n');
		buffer = lines.pop()!;

		for (const line of lines) {
			if (!line.startsWith('data: ')) continue;
			const jsonStr = line.slice(6).trim();
			if (jsonStr === '[DONE]') continue;

			try {
				const parsed = JSON.parse(jsonStr);
				if (resolve) {
					const r = resolve;
					resolve = null;
					r({ value: parsed, done: false });
				} else {
					queue.push(parsed);
				}
			} catch {
				// Skip malformed JSON
			}
		}
	}

	function finish() {
		done = true;
		if (resolve) {
			const r = resolve;
			resolve = null;
			r({ value: undefined, done: true });
		}
	}

	xhr = new XMLHttpRequest();
	xhr.open('POST', url, true);
	for (const [key, val] of Object.entries(headers)) {
		xhr.setRequestHeader(key, val);
	}

	xhr.onprogress = () => {
		if (signal?.aborted) { xhr.abort(); return; }
		processNewData(xhr.responseText);
	};
	xhr.onload = () => {
		processNewData(xhr.responseText);
		finish();
	};
	xhr.onerror = () => {
		done = true;
		if (resolve) {
			const r = resolve;
			resolve = null;
			r({ value: undefined, done: true });
		}
	};
	xhr.onabort = () => finish();
	xhr.send(body);

	const generator = {
		[Symbol.asyncIterator]() { return this; },
		async next(): Promise<IteratorResult<any>> {
			if (queue.length > 0) {
				return { value: queue.shift()!, done: false };
			}
			if (done) {
				return { value: undefined, done: true };
			}
			return new Promise<IteratorResult<any>>((r) => { resolve = r; });
		},
		async return(): Promise<IteratorResult<any>> {
			xhr.abort();
			return { value: undefined, done: true };
		},
		async throw(): Promise<IteratorResult<any>> {
			xhr.abort();
			return { value: undefined, done: true };
		}
	} as unknown as AsyncGenerator<any>;

	return { generator, abort: () => xhr.abort() };
}

/**
 * Stream one Gemini SSE turn, yielding delta events.
 */
async function* streamGeminiTurn(
	stream: AsyncGenerator<any>,
	acc: TurnAccumulator
): AsyncGenerator<AgentEvent> {
	for await (const chunk of stream) {
		const candidate = chunk?.candidates?.[0] || chunk?.response?.candidates?.[0];
		if (!candidate) continue;

		const parts = candidate.content?.parts || [];

		for (const part of parts) {
			if (part.thought && part.text) {
				yield { type: 'thinking-delta', content: part.text };
				acc.rawParts.push(part);
			} else if (part.text && !part.thought) {
				acc.textContent += part.text;
				yield { type: 'text-delta', content: part.text };
				acc.rawParts.push(part);
			} else if (part.functionCall) {
				const fc = part.functionCall;
				acc.functionCalls.push({ name: fc.name, args: fc.args || {} });
				acc.rawParts.push(part);
			} else {
				acc.rawParts.push(part);
			}
		}
	}
}

/**
 * Non-streaming fetch for the initial request (fallback if XHR doesn't work).
 * Uses standard fetch with retry for getting the full SSE response.
 */
async function fetchSSEWithRetry(
	url: string,
	body: string,
	headers: Record<string, string>
): Promise<{ status: number; text: string }> {
	const res = await fetch(url, {
		method: 'POST',
		headers,
		body,
	});
	const text = await res.text();
	return { status: res.status, text };
}

/**
 * Agent loop: calls Gemini via SSE streaming, executing tools until
 * a text response is produced or the turn limit is reached.
 */
export async function* agentLoop(options: AgentLoopOptions): AsyncGenerator<AgentEvent> {
	const { model, contents, systemInstruction, sandbox } = options;
	const history = contents;

	console.log(`[AgentLoop] Starting loop. model=${model} history=${history.length} messages`);

	for (let turn = 0; turn < MAX_TURNS; turn++) {
		console.log(`[AgentLoop] ════ Turn ${turn + 1}/${MAX_TURNS} ════`);

		const reqBody = {
			model,
			contents: history,
			systemInstruction,
			tools: AGENT_TOOLS,
			toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
			generationConfig: {
				maxOutputTokens: 65536,
				thinkingConfig: { includeThoughts: true }
			}
		};

		const authHeaders = await getAuthHeaders();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...authHeaders
		};

		const bodyStr = JSON.stringify(reqBody);

		// Use XHR-based SSE streaming
		const { generator, abort } = createXHRSSEStream(
			`${API_BASE}/api/stream`,
			bodyStr,
			headers
		);

		const acc: TurnAccumulator = {
			rawParts: [],
			functionCalls: [],
			textContent: ''
		};

		let hadError = false;

		try {
			for await (const event of streamGeminiTurn(generator, acc)) {
				yield event;
			}
		} catch (err: any) {
			if (err instanceof TerminalQuotaError) {
				console.error(`[AgentLoop] Terminal quota error:`, err.message);
				return;
			}
			console.error(`[AgentLoop] Stream error:`, err);
			yield { type: 'error', message: `Stream error: ${err.message}` };
			hadError = true;
		}

		if (hadError) return;

		console.log(`[AgentLoop] Turn streamed: ${acc.rawParts.length} parts, ${acc.functionCalls.length} functionCalls, ${acc.textContent.length} chars text`);

		// Handle function calls
		if (acc.functionCalls.length > 0) {
			history.push({ role: 'model', parts: acc.rawParts });

			let userInputEvent: { type: 'ask-user-input'; questions: UserInputQuestion[] } | null = null;
			const responseParts: Record<string, unknown>[] = [];

			for (const fc of acc.functionCalls) {
				if (fc.name === 'ask_user_input') {
					const rawQuestions = (fc.args.questions as any[]) || [];
					const questions: UserInputQuestion[] = rawQuestions.map((q: any) => ({
						question: q.question || '',
						options: q.options || [],
						type: q.type || 'single_select'
					}));
					userInputEvent = { type: 'ask-user-input', questions };

					yield { type: 'tool-call', name: fc.name, args: fc.args };
					yield { type: 'tool-result', name: fc.name, result: { success: true, waiting_for_user: true } };

					responseParts.push({
						functionResponse: {
							name: fc.name,
							response: { success: true, message: 'Questions presented to user. Their response will follow as the next user message.' }
						}
					});
					continue;
				}

				yield { type: 'tool-call', name: fc.name, args: fc.args };

				try {
					const { response, artifact } = await executeToolCall(sandbox ?? null, fc.name, fc.args);
					yield { type: 'tool-result', name: fc.name, result: response };

					if (artifact) {
						yield {
							type: 'artifact',
							uri: artifact.uri,
							label: artifact.label,
							filename: artifact.filename,
							mimeType: artifact.mimeType
						};
					}

					if (fc.name === 'message_compose' && response.success) {
						const composeData: MessageComposeData = {
							kind: response.kind as MessageComposeData['kind'],
							summaryTitle: response.summary_title as string,
							variants: response.variants as MessageComposeData['variants']
						};
						yield { type: 'message-compose', data: composeData };
					}

					if (fc.name === 'recipe_display' && response.success) {
						const recipeData: RecipeData = {
							title: response.title as string,
							description: response.description as string | undefined,
							ingredients: response.ingredients as RecipeData['ingredients'],
							steps: response.steps as RecipeData['steps'],
							base_servings: (response.base_servings as number) || 4,
							notes: response.notes as string | undefined
						};
						yield { type: 'recipe-display', data: recipeData };
					}

					if (fc.name === 'show_widget' && response.success) {
						const widgetData: WidgetData = {
							title: response.title as string,
							widget_code: response.widget_code as string,
							mode: response.mode as 'html' | 'svg'
						};
						yield { type: 'show-widget', data: widgetData };
					}

					responseParts.push({
						functionResponse: { name: fc.name, response }
					});
				} catch (err: any) {
					const errorResponse = { success: false, error: err.message };
					yield { type: 'tool-result', name: fc.name, result: errorResponse };
					responseParts.push({
						functionResponse: { name: fc.name, response: errorResponse }
					});
				}
			}

			history.push({ role: 'user', parts: responseParts });

			if (userInputEvent) {
				yield userInputEvent;
				return;
			}

			continue;
		}

		// No function calls — text response, done
		if (acc.textContent) {
			history.push({ role: 'model', parts: acc.rawParts });
		}

		return;
	}

	yield { type: 'error', message: 'Agent reached maximum turn limit (15)' };
}

/**
 * Build contents with a new user message appended.
 */
export function buildContents(
	existingContents: GeminiContent[],
	userMessage: string
): GeminiContent[] {
	return [
		...existingContents,
		{ role: 'user', parts: [{ text: userMessage }] }
	];
}
