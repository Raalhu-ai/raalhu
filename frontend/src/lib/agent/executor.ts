import type { PyodideSandbox } from './sandbox';
import type { RecipeData } from './types';
import { getSkillContent, SKILLS } from './skills/index';
import { fetchWithRetry } from './retry';

const MIME_TYPES: Record<string, string> = {
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.pdf': 'application/pdf',
	'.csv': 'text/csv',
	'.txt': 'text/plain',
	'.json': 'application/json',
	'.html': 'text/html',
	'.md': 'text/markdown',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

function getMimeType(path: string): string {
	const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
	return MIME_TYPES[ext] || 'application/octet-stream';
}

function getFilename(path: string): string {
	return path.split('/').pop() || path;
}

export interface ToolResult {
	response: Record<string, unknown>;
	artifact?: {
		url: string;
		label: string;
		filename: string;
		mimeType: string;
	};
}

/**
 * Execute a tool call and return the result.
 */
export async function executeToolCall(
	sandbox: PyodideSandbox,
	name: string,
	args: Record<string, unknown>
): Promise<ToolResult> {
	const t0 = performance.now();
	console.log(`[Executor] ── ${name} ──`);
	console.log(`[Executor] Input:`, JSON.stringify(args).slice(0, 500));

	let result: ToolResult;

	switch (name) {
		case 'read_skill': {
			const skillName = args.name as string;
			console.log(`[Executor] Loading skill: "${skillName}"`);
			try {
				const content = await getSkillContent(skillName);
				console.log(`[Executor] Skill loaded: ${content.length} chars`);
				result = {
					response: { success: true, content }
				};
			} catch (err: any) {
				console.error(`[Executor] Skill load failed:`, err.message);
				result = {
					response: {
						success: false,
						error: err.message,
						available_skills: SKILLS.map((s) => s.name)
					}
				};
			}
			break;
		}

		case 'execute_python': {
			const code = args.code as string;
			console.log(`[Executor] Python code (${code.length} chars):\n${code.slice(0, 400)}${code.length > 400 ? '\n...' : ''}`);
			try {
				const { stdout, stderr, result: pyResult } = await sandbox.execute(code);
				console.log(`[Executor] Python stdout: ${JSON.stringify(stdout).slice(0, 300)}`);
				if (stderr) console.warn(`[Executor] Python stderr: ${JSON.stringify(stderr).slice(0, 300)}`);
				console.log(`[Executor] Python result: ${JSON.stringify(pyResult).slice(0, 200)}`);
				result = {
					response: {
						success: !stderr,
						stdout: stdout || '',
						stderr: stderr || '',
						result: pyResult || ''
					}
				};
			} catch (err: any) {
				console.error(`[Executor] Python execution error:`, err.message);
				result = {
					response: { success: false, error: err.message }
				};
			}
			break;
		}

		case 'write_file': {
			const path = args.path as string;
			const content = args.content as string;
			console.log(`[Executor] Write file: ${path} (${content.length} chars)`);
			try {
				await sandbox.writeFile(path, content);
				console.log(`[Executor] File written: ${path}`);
				result = {
					response: { success: true, path }
				};
			} catch (err: any) {
				console.error(`[Executor] Write file error:`, err.message);
				result = {
					response: { success: false, error: err.message }
				};
			}
			break;
		}

		case 'read_file': {
			const path = args.path as string;
			console.log(`[Executor] Read file: ${path}`);
			try {
				const content = await sandbox.readFile(path);
				console.log(`[Executor] File read: ${path} (${content.length} chars) preview: ${JSON.stringify(content.slice(0, 100))}`);
				result = {
					response: { success: true, content }
				};
			} catch (err: any) {
				console.error(`[Executor] Read file error:`, err.message);
				result = {
					response: { success: false, error: err.message }
				};
			}
			break;
		}

		case 'list_directory': {
			const path = args.path as string;
			console.log(`[Executor] List directory: ${path}`);
			try {
				const entries = await sandbox.listDir(path);
				console.log(`[Executor] Directory entries:`, entries);
				result = {
					response: { success: true, entries }
				};
			} catch (err: any) {
				console.error(`[Executor] List directory error:`, err.message);
				result = {
					response: { success: false, error: err.message }
				};
			}
			break;
		}

		case 'message_compose': {
			const kind = args.kind as string;
			const summaryTitle = args.summary_title as string;
			const variants = args.variants as { label: string; body: string; subject?: string }[];
			console.log(
				`[Executor] Message compose: kind=${kind} title="${summaryTitle}" variants=${variants?.length}`
			);
			result = {
				response: {
					success: true,
					kind,
					summary_title: summaryTitle,
					variants
				}
			};
			break;
		}

		case 'recipe_display': {
			const title = args.title as string;
			const description = args.description as string | undefined;
			const ingredients = args.ingredients as RecipeData['ingredients'];
			const steps = args.steps as RecipeData['steps'];
			const base_servings = (args.base_servings as number) || 4;
			const notes = args.notes as string | undefined;
			console.log(
				`[Executor] Recipe display: title="${title}" ingredients=${ingredients?.length} steps=${steps?.length}`
			);
			result = {
				response: { success: true, title, description, ingredients, steps, base_servings, notes }
			};
			break;
		}

		case 'web_fetch': {
			const prompt = args.prompt as string;
			console.log(`[Executor] Web fetch: "${prompt.slice(0, 200)}"`);
			try {
				const res = await fetchWithRetry('/api/agent-generate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model: 'gemini-3-flash-preview',
						contents: [{ role: 'user', parts: [{ text: prompt }] }],
						tools: [{ url_context: {} }]
					})
				});

				if (!res.ok) {
					const errText = await res.text();
					console.error(`[Executor] Web fetch API error ${res.status}:`, errText);
					result = {
						response: {
							success: false,
							error: `Web fetch failed (${res.status}): ${errText}`
						}
					};
					break;
				}

				const data = await res.json();
				const candidate = data?.candidates?.[0] || data?.response?.candidates?.[0];
				if (!candidate) {
					result = {
						response: { success: false, error: 'No candidate in web fetch response' }
					};
					break;
				}

				const textParts = (candidate.content?.parts || []).filter((p: any) => p.text);
				let responseText = textParts.map((p: any) => p.text).join('');

				if (!responseText.trim()) {
					result = {
						response: {
							success: false,
							error: `Could not retrieve content from the URL(s) in: "${prompt.slice(0, 100)}"`
						}
					};
					break;
				}

				// Process grounding metadata (citations + sources)
				const groundingMetadata = candidate.groundingMetadata;
				const sources = groundingMetadata?.groundingChunks as
					| { web?: { uri?: string; title?: string } }[]
					| undefined;
				const groundingSupports = groundingMetadata?.groundingSupports as
					| {
							segment?: { startIndex: number; endIndex: number };
							groundingChunkIndices?: number[];
					  }[]
					| undefined;

				const sourceList: string[] = [];

				if (sources && sources.length > 0) {
					sources.forEach(
						(source: { web?: { uri?: string; title?: string } }, index: number) => {
							const title = source.web?.title || 'Untitled';
							const uri = source.web?.uri || '';
							sourceList.push(`[${index + 1}] ${title} (${uri})`);
						}
					);

					if (groundingSupports && groundingSupports.length > 0) {
						const insertions: { index: number; marker: string }[] = [];
						for (const support of groundingSupports) {
							if (support.segment && support.groundingChunkIndices) {
								const marker = support.groundingChunkIndices
									.map((i: number) => `[${i + 1}]`)
									.join('');
								insertions.push({ index: support.segment.endIndex, marker });
							}
						}

						insertions.sort((a, b) => b.index - a.index);

						const encoder = new TextEncoder();
						const responseBytes = encoder.encode(responseText);
						const parts: Uint8Array[] = [];
						let lastIndex = responseBytes.length;

						for (const ins of insertions) {
							const pos = Math.min(ins.index, lastIndex);
							parts.unshift(responseBytes.subarray(pos, lastIndex));
							parts.unshift(encoder.encode(ins.marker));
							lastIndex = pos;
						}
						parts.unshift(responseBytes.subarray(0, lastIndex));

						const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
						const finalBytes = new Uint8Array(totalLength);
						let offset = 0;
						for (const part of parts) {
							finalBytes.set(part, offset);
							offset += part.length;
						}
						responseText = new TextDecoder().decode(finalBytes);
					}

					if (sourceList.length > 0) {
						responseText += '\n\nSources:\n' + sourceList.join('\n');
					}
				}

				console.log(
					`[Executor] Web fetch result: ${responseText.length} chars, ${sourceList.length} sources`
				);
				result = {
					response: {
						success: true,
						content: responseText
					}
				};
			} catch (err: any) {
				console.error(`[Executor] Web fetch error:`, err.message);
				result = {
					response: { success: false, error: `Web fetch error: ${err.message}` }
				};
			}
			break;
		}

		case 'web_search': {
			const query = args.query as string;
			console.log(`[Executor] Web search: "${query}"`);
			try {
				const res = await fetchWithRetry('/api/agent-generate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model: 'gemini-3-flash-preview',
						contents: [{ role: 'user', parts: [{ text: query }] }],
						tools: [{ google_search: {} }]
					})
				});

				if (!res.ok) {
					const errText = await res.text();
					console.error(`[Executor] Web search API error ${res.status}:`, errText);
					result = {
						response: { success: false, error: `Web search failed (${res.status}): ${errText}` }
					};
					break;
				}

				const data = await res.json();
				const candidate = data?.candidates?.[0] || data?.response?.candidates?.[0];
				if (!candidate) {
					result = {
						response: { success: false, error: 'No candidate in web search response' }
					};
					break;
				}

				const textParts = (candidate.content?.parts || []).filter((p: any) => p.text);
				let responseText = textParts.map((p: any) => p.text).join('');

				if (!responseText.trim()) {
					result = {
						response: {
							success: true,
							content: `No search results found for: "${query}"`
						}
					};
					break;
				}

				// Process grounding metadata (citations + sources)
				const groundingMetadata = candidate.groundingMetadata;
				const sources = groundingMetadata?.groundingChunks as
					| { web?: { uri?: string; title?: string } }[]
					| undefined;
				const groundingSupports = groundingMetadata?.groundingSupports as
					| {
							segment?: { startIndex: number; endIndex: number };
							groundingChunkIndices?: number[];
					  }[]
					| undefined;

				const sourceList: string[] = [];

				if (sources && sources.length > 0) {
					sources.forEach(
						(source: { web?: { uri?: string; title?: string } }, index: number) => {
							const title = source.web?.title || 'Untitled';
							const uri = source.web?.uri || '';
							sourceList.push(`[${index + 1}] ${title} (${uri})`);
						}
					);

					// Insert citation markers at correct UTF-8 byte positions
					if (groundingSupports && groundingSupports.length > 0) {
						const insertions: { index: number; marker: string }[] = [];
						for (const support of groundingSupports) {
							if (support.segment && support.groundingChunkIndices) {
								const marker = support.groundingChunkIndices
									.map((i: number) => `[${i + 1}]`)
									.join('');
								insertions.push({ index: support.segment.endIndex, marker });
							}
						}

						// Sort descending so insertions don't shift positions
						insertions.sort((a, b) => b.index - a.index);

						const encoder = new TextEncoder();
						const responseBytes = encoder.encode(responseText);
						const parts: Uint8Array[] = [];
						let lastIndex = responseBytes.length;

						for (const ins of insertions) {
							const pos = Math.min(ins.index, lastIndex);
							parts.unshift(responseBytes.subarray(pos, lastIndex));
							parts.unshift(encoder.encode(ins.marker));
							lastIndex = pos;
						}
						parts.unshift(responseBytes.subarray(0, lastIndex));

						const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
						const finalBytes = new Uint8Array(totalLength);
						let offset = 0;
						for (const part of parts) {
							finalBytes.set(part, offset);
							offset += part.length;
						}
						responseText = new TextDecoder().decode(finalBytes);
					}

					if (sourceList.length > 0) {
						responseText += '\n\nSources:\n' + sourceList.join('\n');
					}
				}

				console.log(
					`[Executor] Web search result: ${responseText.length} chars, ${sourceList.length} sources`
				);
				result = {
					response: {
						success: true,
						content: responseText
					}
				};
			} catch (err: any) {
				console.error(`[Executor] Web search error:`, err.message);
				result = {
					response: { success: false, error: `Web search error: ${err.message}` }
				};
			}
			break;
		}

		case 'present_file': {
			const path = args.path as string;
			const label = (args.label as string) || getFilename(path);
			console.log(`[Executor] Present file: ${path} label="${label}"`);
			try {
				const bytes = await sandbox.readFileBytes(path);
				const mimeType = getMimeType(path);
				const blob = new Blob([bytes.buffer], { type: mimeType });
				const url = URL.createObjectURL(blob);
				const filename = getFilename(path);
				console.log(`[Executor] Artifact created: ${filename} (${bytes.byteLength} bytes, ${mimeType}) url=${url}`);
				result = {
					response: { success: true, path, label, filename, mimeType },
					artifact: { url, label, filename, mimeType }
				};
			} catch (err: any) {
				console.error(`[Executor] Present file error:`, err.message);
				result = {
					response: { success: false, error: err.message }
				};
			}
			break;
		}

		default:
			console.warn(`[Executor] Unknown tool: ${name}`);
			result = {
				response: { success: false, error: `Unknown tool: ${name}` }
			};
	}

	console.log(`[Executor] ── ${name} done (${(performance.now() - t0).toFixed(0)}ms) ── success=${result.response.success}`);
	return result;
}
