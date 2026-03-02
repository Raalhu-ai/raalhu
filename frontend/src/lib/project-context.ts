import type { ProjectFile } from '$lib/db';

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
		additions += `\n\n## ޕްރޮޖެކްޓް މެމޮރީ\n`;
		additions += ctx.memory.trim();
	}

	if (ctx.instructions.trim()) {
		additions += `\n\n## ޕްރޮޖެކްޓް: ${ctx.name} — ކަސްޓަމް އިރުޝާދުތައް\n`;
		additions += ctx.instructions.trim();
	}

	const textFiles = ctx.files.filter((f) => isTextMime(f.mimeType));
	if (textFiles.length > 0) {
		additions += `\n\n## ޕްރޮޖެކްޓް ފައިލްތައް\n`;
		additions += `ތިރީގައިވާ ފައިލްތަކަކީ ޕްރޮޖެކްޓާ ގުޅޭ ރެފެރެންސް ފައިލްތަކެވެ:\n\n`;
		for (const file of textFiles) {
			try {
				const f = await file.handle.getFile();
				const text = await f.text();
				additions += `### ${file.name}\n\`\`\`\n${text}\n\`\`\`\n\n`;
			} catch {
				additions += `### ${file.name}\n(ފައިލް ކިޔެން ނެތް — ފައިލް ބަދަލުވެފައި ނުވަތަ ނެތިފައި ވެދާނެ)\n\n`;
			}
		}
	}

	const binaryFiles = ctx.files.filter((f) => !isTextMime(f.mimeType));
	if (binaryFiles.length > 0) {
		additions += `\nބައިނަރީ ފައިލްތައް (ރެފެރެންސް): `;
		additions += binaryFiles.map((f) => f.name).join('، ');
		additions += '\n';
	}

	return basePrompt + additions;
}
