import type { PyodideSandbox } from './sandbox';
import type { RecipeData, WidgetData } from './types';
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

function processGroundingMetadata(candidate: any, responseText: string): { text: string; sources: string[] } {
	const groundingMetadata = candidate.groundingMetadata;
	const sources = groundingMetadata?.groundingChunks as
		| { web?: { uri?: string; title?: string } }[]
		| undefined;
	const groundingSupports = groundingMetadata?.groundingSupports as
		| { segment?: { startIndex: number; endIndex: number }; groundingChunkIndices?: number[] }[]
		| undefined;

	const sourceList: string[] = [];

	if (sources && sources.length > 0) {
		sources.forEach((source, index) => {
			const title = source.web?.title || 'Untitled';
			const uri = source.web?.uri || '';
			sourceList.push(`[${index + 1}] ${title} (${uri})`);
		});

		if (groundingSupports && groundingSupports.length > 0) {
			const insertions: { index: number; marker: string }[] = [];
			for (const support of groundingSupports) {
				if (support.segment && support.groundingChunkIndices) {
					const marker = support.groundingChunkIndices.map((i) => `[${i + 1}]`).join('');
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

	return { text: responseText, sources: sourceList };
}

export async function executeToolCall(
	sandbox: PyodideSandbox,
	name: string,
	args: Record<string, unknown>
): Promise<ToolResult> {
	let result: ToolResult;

	switch (name) {
		case 'read_skill': {
			const skillName = args.name as string;
			try {
				const content = await getSkillContent(skillName);
				result = { response: { success: true, content } };
			} catch (err: any) {
				result = { response: { success: false, error: err.message, available_skills: SKILLS.map((s) => s.name) } };
			}
			break;
		}

		case 'execute_python': {
			const code = args.code as string;
			try {
				const { stdout, stderr, result: pyResult } = await sandbox.execute(code);
				result = { response: { success: !stderr, stdout: stdout || '', stderr: stderr || '', result: pyResult || '' } };
			} catch (err: any) {
				result = { response: { success: false, error: err.message } };
			}
			break;
		}

		case 'write_file': {
			const path = args.path as string;
			const content = args.content as string;
			try {
				await sandbox.writeFile(path, content);
				result = { response: { success: true, path } };
			} catch (err: any) {
				result = { response: { success: false, error: err.message } };
			}
			break;
		}

		case 'read_file': {
			const path = args.path as string;
			try {
				const content = await sandbox.readFile(path);
				result = { response: { success: true, content } };
			} catch (err: any) {
				result = { response: { success: false, error: err.message } };
			}
			break;
		}

		case 'list_directory': {
			const path = args.path as string;
			try {
				const entries = await sandbox.listDir(path);
				result = { response: { success: true, entries } };
			} catch (err: any) {
				result = { response: { success: false, error: err.message } };
			}
			break;
		}

		case 'message_compose': {
			const kind = args.kind as string;
			const summaryTitle = args.summary_title as string;
			const variants = args.variants as { label: string; body: string; subject?: string }[];
			result = { response: { success: true, kind, summary_title: summaryTitle, variants } };
			break;
		}

		case 'recipe_display': {
			const title = args.title as string;
			const description = args.description as string | undefined;
			const ingredients = args.ingredients as RecipeData['ingredients'];
			const steps = args.steps as RecipeData['steps'];
			const base_servings = (args.base_servings as number) || 4;
			const notes = args.notes as string | undefined;
			result = { response: { success: true, title, description, ingredients, steps, base_servings, notes } };
			break;
		}

		case 'web_fetch': {
			const prompt = args.prompt as string;
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
					result = { response: { success: false, error: `Web fetch failed (${res.status}): ${errText}` } };
					break;
				}

				const data = await res.json();
				const candidate = data?.candidates?.[0] || data?.response?.candidates?.[0];
				if (!candidate) {
					result = { response: { success: false, error: 'No candidate in web fetch response' } };
					break;
				}

				const textParts = (candidate.content?.parts || []).filter((p: any) => p.text);
				let responseText = textParts.map((p: any) => p.text).join('');

				if (!responseText.trim()) {
					result = { response: { success: false, error: `Could not retrieve content from the URL(s)` } };
					break;
				}

				const processed = processGroundingMetadata(candidate, responseText);
				result = { response: { success: true, content: processed.text } };
			} catch (err: any) {
				result = { response: { success: false, error: `Web fetch error: ${err.message}` } };
			}
			break;
		}

		case 'web_search': {
			const query = args.query as string;
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
					result = { response: { success: false, error: `Web search failed (${res.status}): ${errText}` } };
					break;
				}

				const data = await res.json();
				const candidate = data?.candidates?.[0] || data?.response?.candidates?.[0];
				if (!candidate) {
					result = { response: { success: false, error: 'No candidate in web search response' } };
					break;
				}

				const textParts = (candidate.content?.parts || []).filter((p: any) => p.text);
				let responseText = textParts.map((p: any) => p.text).join('');

				if (!responseText.trim()) {
					result = { response: { success: true, content: `No search results found for: "${query}"` } };
					break;
				}

				const processed = processGroundingMetadata(candidate, responseText);
				result = { response: { success: true, content: processed.text } };
			} catch (err: any) {
				result = { response: { success: false, error: `Web search error: ${err.message}` } };
			}
			break;
		}

		case 'present_file': {
			const path = args.path as string;
			const label = (args.label as string) || getFilename(path);
			try {
				const bytes = await sandbox.readFileBytes(path);
				const mimeType = getMimeType(path);
				const blob = new Blob([bytes.buffer], { type: mimeType });
				const url = URL.createObjectURL(blob);
				const filename = getFilename(path);
				result = {
					response: { success: true, path, label, filename, mimeType },
					artifact: { url, label, filename, mimeType }
				};
			} catch (err: any) {
				result = { response: { success: false, error: err.message } };
			}
			break;
		}

		case 'show_widget': {
			const title = args.title as string;
			const widget_code = args.widget_code as string;
			const mode: 'html' | 'svg' = widget_code.trimStart().startsWith('<svg') ? 'svg' : 'html';
			result = { response: { success: true, title, widget_code, mode } };
			break;
		}

		default:
			result = { response: { success: false, error: `Unknown tool: ${name}` } };
	}

	return result;
}
