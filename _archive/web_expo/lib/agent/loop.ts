import type { PyodideSandbox } from './sandbox';
import type { AgentEvent, GeminiContent, UserInputQuestion, MessageComposeData, RecipeData, WidgetData } from './types';
import { AGENT_TOOLS } from './tools';
import { executeToolCall } from './executor';
import { fetchWithRetry, TerminalQuotaError } from './retry';

const MAX_TURNS = 15;

interface AgentLoopOptions {
	model: string;
	contents: GeminiContent[];
	systemInstruction: { role: string; parts: [{ text: string }] };
	sandbox: PyodideSandbox;
}

interface TurnAccumulator {
	rawParts: any[];
	functionCalls: { name: string; args: Record<string, unknown> }[];
	textContent: string;
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

async function* streamGeminiTurn(
	response: Response,
	acc: TurnAccumulator
): AsyncGenerator<AgentEvent> {
	for await (const chunk of parseSSEStream(response)) {
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

export async function* agentLoop(options: AgentLoopOptions): AsyncGenerator<AgentEvent> {
	const { model, contents, systemInstruction, sandbox } = options;
	const history = contents;

	for (let turn = 0; turn < MAX_TURNS; turn++) {
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

		let response: Response;

		try {
			response = await fetchWithRetry('/api/stream', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(reqBody)
			});

			if (!response.ok) {
				const errText = await response.text();
				yield { type: 'error', message: `API error (${response.status}): ${errText}` };
				return;
			}
		} catch (err: any) {
			if (err instanceof TerminalQuotaError) return;
			yield { type: 'error', message: `Network error: ${err.message}` };
			return;
		}

		const acc: TurnAccumulator = {
			rawParts: [],
			functionCalls: [],
			textContent: ''
		};

		for await (const event of streamGeminiTurn(response, acc)) {
			yield event;
		}

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
					const { response: toolResponse, artifact } = await executeToolCall(sandbox, fc.name, fc.args);
					yield { type: 'tool-result', name: fc.name, result: toolResponse };

					if (artifact) {
						yield {
							type: 'artifact',
							url: artifact.url,
							label: artifact.label,
							filename: artifact.filename,
							mimeType: artifact.mimeType
						};
					}

					if (fc.name === 'message_compose' && toolResponse.success) {
						const composeData: MessageComposeData = {
							kind: toolResponse.kind as MessageComposeData['kind'],
							summaryTitle: toolResponse.summary_title as string,
							variants: toolResponse.variants as MessageComposeData['variants']
						};
						yield { type: 'message-compose', data: composeData };
					}

					if (fc.name === 'recipe_display' && toolResponse.success) {
						const recipeData: RecipeData = {
							title: toolResponse.title as string,
							description: toolResponse.description as string | undefined,
							ingredients: toolResponse.ingredients as RecipeData['ingredients'],
							steps: toolResponse.steps as RecipeData['steps'],
							base_servings: (toolResponse.base_servings as number) || 4,
							notes: toolResponse.notes as string | undefined
						};
						yield { type: 'recipe-display', data: recipeData };
					}

					if (fc.name === 'show_widget' && toolResponse.success) {
						const widgetData: WidgetData = {
							title: toolResponse.title as string,
							widget_code: toolResponse.widget_code as string,
							mode: toolResponse.mode as 'html' | 'svg'
						};
						yield { type: 'show-widget', data: widgetData };
					}

					responseParts.push({
						functionResponse: { name: fc.name, response: toolResponse }
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

		if (acc.textContent) {
			history.push({ role: 'model', parts: acc.rawParts });
		}

		return;
	}

	yield { type: 'error', message: 'Agent reached maximum turn limit (15)' };
}

export function buildContents(
	existingContents: GeminiContent[],
	userMessage: string
): GeminiContent[] {
	return [
		...existingContents,
		{ role: 'user', parts: [{ text: userMessage }] }
	];
}
