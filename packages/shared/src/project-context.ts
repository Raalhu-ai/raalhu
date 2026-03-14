import type { ProjectFile } from './types';

export interface ProjectContext {
	name: string;
	instructions: string;
	memory: string;
	files: ProjectFile[];
}

function isTextMime(mime: string): boolean {
	return (
		mime.startsWith('text/') ||
		mime === 'application/json' ||
		mime === 'application/xml' ||
		mime === 'application/javascript' ||
		mime === 'application/typescript'
	);
}

export async function injectProjectContext(basePrompt: string, ctx: ProjectContext): Promise<string> {
	let additions = '';

	if (ctx.memory.trim()) {
		additions += `\n\n## \u0795\u07B0\u0783\u07AE\u0796\u07AC\u0786\u07B0\u0793\u07B0 \u0789\u07AC\u0789\u07AE\u0783\u07A9\n`;
		additions += ctx.memory.trim();
	}

	if (ctx.instructions.trim()) {
		additions += `\n\n## \u0795\u07B0\u0783\u07AE\u0796\u07AC\u0786\u07B0\u0793\u07B0: ${ctx.name} \u2014 \u0786\u07A6\u0790\u07B0\u0793\u07A6\u0789\u07B0 \u0787\u07A8\u0783\u07AA\u079D\u07A7\u078B\u07AA\u078C\u07A6\u0787\u07B0\n`;
		additions += ctx.instructions.trim();
	}

	const textFiles = ctx.files.filter((f) => isTextMime(f.mimeType));
	if (textFiles.length > 0) {
		additions += `\n\n## \u0795\u07B0\u0783\u07AE\u0796\u07AC\u0786\u07B0\u0793\u07B0 \u078A\u07A6\u07A8\u078D\u07B0\u078C\u07A6\u0787\u07B0\n`;
		additions += `\u078C\u07A8\u0783\u07A9\u078E\u07A6\u07A8\u0788\u07A7 \u078A\u07A6\u07A8\u078D\u07B0\u078C\u07A6\u0786\u07A6\u0786\u07A9 \u0795\u07B0\u0783\u07AE\u0796\u07AC\u0786\u07B0\u0793\u07A7 \u078E\u07AA\u0785\u07AD \u0783\u07AC\u078A\u07AC\u0783\u07AC\u0782\u07B0\u0790\u07B0 \u078A\u07A6\u07A8\u078D\u07B0\u078C\u07A6\u0786\u07AC\u0788\u07AC:\n\n`;
		for (const file of textFiles) {
			try {
				const f = await file.handle.getFile();
				const text = await f.text();
				additions += `### ${file.name}\n\`\`\`\n${text}\n\`\`\`\n\n`;
			} catch {
				additions += `### ${file.name}\n(\u078A\u07A6\u07A8\u078D\u07B0 \u0786\u07A8\u0794\u07AC\u0782\u07B0 \u0782\u07AC\u078C\u07B0 \u2014 \u078A\u07A6\u07A8\u078D\u07B0 \u0784\u07A6\u078B\u07A6\u078D\u07AA\u0788\u07AC\u078A\u07A6\u07A8 \u0782\u07AA\u0788\u07A6\u078C\u07A6 \u0782\u07AC\u078C\u07A8\u078A\u07A6\u07A8 \u0788\u07AC\u078B\u07A7\u0782\u07AC)\n\n`;
			}
		}
	}

	const binaryFiles = ctx.files.filter((f) => !isTextMime(f.mimeType));
	if (binaryFiles.length > 0) {
		additions += `\n\u0784\u07A6\u07A8\u0782\u07A6\u0783\u07A9 \u078A\u07A6\u07A8\u078D\u07B0\u078C\u07A6\u0787\u07B0 (\u0783\u07AC\u078A\u07AC\u0783\u07AC\u0782\u07B0\u0790\u07B0): `;
		additions += binaryFiles.map((f) => f.name).join('\u060C ');
		additions += '\n';
	}

	return basePrompt + additions;
}
