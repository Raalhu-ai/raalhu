import type { PyodideSandbox } from './sandbox';
import type { AgentEvent, GeminiContent, UserInputQuestion, MessageComposeData, RecipeData } from './types';
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

/** Accumulator for one SSE turn — populated by streamGeminiTurn */
interface TurnAccumulator {
	rawParts: any[];
	functionCalls: { name: string; args: Record<string, unknown> }[];
	textContent: string;
}

/**
 * Parse a Gemini SSE response body line-by-line, yielding parsed JSON chunks.
 */
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
			buffer = lines.pop()!; // Keep incomplete line in buffer

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

/**
 * Stream one Gemini SSE turn, yielding delta events and populating the accumulator.
 */
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
				// Thinking delta
				yield { type: 'thinking-delta', content: part.text };
				acc.rawParts.push(part);
			} else if (part.text && !part.thought) {
				// Text delta
				acc.textContent += part.text;
				yield { type: 'text-delta', content: part.text };
				acc.rawParts.push(part);
			} else if (part.functionCall) {
				// Function call (arrives complete in one SSE chunk)
				const fc = part.functionCall;
				acc.functionCalls.push({ name: fc.name, args: fc.args || {} });
				acc.rawParts.push(part);
			} else {
				// Metadata (thoughtSignature, etc.) — preserve for history
				acc.rawParts.push(part);
			}
		}
	}
}

/**
 * Agent loop: calls Gemini via SSE streaming, executing tools until
 * a text response is produced or the turn limit is reached.
 *
 * Yields AgentEvent objects for the UI to consume.
 */
export async function* agentLoop(options: AgentLoopOptions): AsyncGenerator<AgentEvent> {
	const { model, contents, systemInstruction, sandbox } = options;
	// Mutate the passed contents array directly so the caller gets the full history
	// (including tool call/response rounds and thoughtSignatures)
	const history = contents;

	console.log(`[AgentLoop] Starting loop. model=${model} history=${history.length} messages`);
	console.log(`[AgentLoop] History roles:`, history.map(c => `${c.role}(${c.parts.length} parts)`).join(' → '));

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
				thinkingConfig: {
					includeThoughts: true
				}
			}
		};

		console.log(`[AgentLoop] POST /api/agent-stream`, {
			model,
			contentsLength: history.length,
			lastRole: history[history.length - 1]?.role,
			toolCount: AGENT_TOOLS[0]?.functionDeclarations?.length
		});

		// Fetch SSE stream with retry (up to 10 attempts with exponential backoff)
		let response: Response;

		try {
			const t0 = performance.now();
			response = await fetchWithRetry('/api/agent-stream', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(reqBody)
			});
			console.log(`[AgentLoop] Response status=${response.status} (${(performance.now() - t0).toFixed(0)}ms)`);

			if (!response.ok) {
				const errText = await response.text();
				console.error(`[AgentLoop] API error ${response.status}:`, errText);
				yield { type: 'error', message: `API error (${response.status}): ${errText}` };
				return;
			}
		} catch (err: any) {
			if (err instanceof TerminalQuotaError) {
				// Daily quota exhausted — don't show an API error, just stop silently.
				// The processing animation will end naturally.
				console.error(`[AgentLoop] Terminal quota error:`, err.message);
				return;
			}
			console.error(`[AgentLoop] Network/retry error:`, err);
			yield { type: 'error', message: `Network error: ${err.message}` };
			return;
		}

		// Stream this turn's response, yielding deltas to the UI
		const acc: TurnAccumulator = {
			rawParts: [],
			functionCalls: [],
			textContent: ''
		};

		for await (const event of streamGeminiTurn(response, acc)) {
			yield event;
		}

		console.log(`[AgentLoop] Turn streamed: ${acc.rawParts.length} parts, ${acc.functionCalls.length} functionCalls, ${acc.textContent.length} chars text`);
		if (acc.functionCalls.length > 0) {
			console.log(`[AgentLoop] Function calls:`, acc.functionCalls.map(fc => `${fc.name}(${JSON.stringify(fc.args).slice(0, 100)})`).join(', '));
		}

		// If there are function calls, execute them
		if (acc.functionCalls.length > 0) {
			// Append model's FULL response to history (including thoughtSignature etc.)
			// The API requires metadata like thoughtSignature to be echoed back
			history.push({
				role: 'model',
				parts: acc.rawParts
			});

			// Check if ask_user_input is among the calls — it ends the turn
			let userInputEvent: { type: 'ask-user-input'; questions: UserInputQuestion[] } | null = null;

			// Execute each function call
			const responseParts: Record<string, unknown>[] = [];

			for (const fc of acc.functionCalls) {
				// Handle ask_user_input specially — don't execute, just capture
				if (fc.name === 'ask_user_input') {
					console.log(`[AgentLoop] ask_user_input detected — will end turn`);
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

				console.log(`[AgentLoop] Executing tool: ${fc.name}`);
				yield { type: 'tool-call', name: fc.name, args: fc.args };

				try {
					const { response, artifact } = await executeToolCall(sandbox, fc.name, fc.args);
					console.log(`[AgentLoop] Tool result: ${fc.name} success=${response.success}`);
					yield { type: 'tool-result', name: fc.name, result: response };

					if (artifact) {
						console.log(`[AgentLoop] Artifact: ${artifact.filename} (${artifact.mimeType}) url=${artifact.url}`);
						yield {
							type: 'artifact',
							url: artifact.url,
							label: artifact.label,
							filename: artifact.filename,
							mimeType: artifact.mimeType
						};
					}

					// Yield message-compose event for the UI
					if (fc.name === 'message_compose' && response.success) {
						const composeData: MessageComposeData = {
							kind: response.kind as MessageComposeData['kind'],
							summaryTitle: response.summary_title as string,
							variants: response.variants as MessageComposeData['variants']
						};
						console.log(`[AgentLoop] Message compose: ${composeData.variants?.length} variants`);
						yield { type: 'message-compose', data: composeData };
					}

					// Yield recipe-display event for the UI
					if (fc.name === 'recipe_display' && response.success) {
						const recipeData: RecipeData = {
							title: response.title as string,
							description: response.description as string | undefined,
							ingredients: response.ingredients as RecipeData['ingredients'],
							steps: response.steps as RecipeData['steps'],
							base_servings: (response.base_servings as number) || 4,
							notes: response.notes as string | undefined
						};
						console.log(`[AgentLoop] Recipe display: "${recipeData.title}"`);
						yield { type: 'recipe-display', data: recipeData };
					}

					responseParts.push({
						functionResponse: {
							name: fc.name,
							response: response
						}
					});
				} catch (err: any) {
					console.error(`[AgentLoop] Tool error: ${fc.name}:`, err);
					const errorResponse = { success: false, error: err.message };
					yield { type: 'tool-result', name: fc.name, result: errorResponse };
					responseParts.push({
						functionResponse: {
							name: fc.name,
							response: errorResponse
						}
					});
				}
			}

			// Append function responses to history
			history.push({
				role: 'user',
				parts: responseParts
			});
			console.log(`[AgentLoop] Appended ${responseParts.length} function responses to history (now ${history.length} messages)`);

			// Text alongside function calls was already streamed via text-delta events

			// If ask_user_input was called, yield the event and end the loop
			if (userInputEvent) {
				console.log(`[AgentLoop] Yielding ask-user-input event and ending turn`);
				yield userInputEvent;
				return;
			}

			// Continue loop — Gemini may want to call more tools
			console.log(`[AgentLoop] Continuing to next turn...`);
			continue;
		}

		// No function calls — just text response. We're done.
		// Text was already streamed via text-delta events; just append to history.
		if (acc.textContent) {
			console.log(`[AgentLoop] Final text response (${acc.textContent.length} chars): ${acc.textContent.slice(0, 300)}`);

			// Append full model response to history (including any metadata)
			history.push({
				role: 'model',
				parts: acc.rawParts
			});
		} else {
			console.warn(`[AgentLoop] No text and no function calls in response`);
		}

		console.log(`[AgentLoop] Loop complete after ${turn + 1} turn(s)`);
		return;
	}

	console.error(`[AgentLoop] Hit max turns (${MAX_TURNS})`);
	yield { type: 'error', message: 'Agent reached maximum turn limit (15)' };
}

/**
 * Get the updated contents history after the loop finishes.
 * This is needed for persisting state across messages.
 */
export function buildContents(
	existingContents: GeminiContent[],
	userMessage: string
): GeminiContent[] {
	console.log(`[AgentLoop] buildContents: ${existingContents.length} existing + new user message (${userMessage.length} chars)`);
	return [
		...existingContents,
		{
			role: 'user',
			parts: [{ text: userMessage }]
		}
	];
}
