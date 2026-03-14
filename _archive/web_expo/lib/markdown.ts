import { marked } from 'marked';

export type MarkdownSegment =
	| { type: 'html'; content: string }
	| { type: 'code'; code: string; language: string };

export function parseMarkdown(content: string): MarkdownSegment[] {
	const tokens = marked.lexer(content);
	const segments: MarkdownSegment[] = [];
	let htmlTokens: typeof tokens = [];

	function flushHtml() {
		if (htmlTokens.length > 0) {
			const html = marked.parser(htmlTokens);
			if (html.trim()) {
				segments.push({ type: 'html', content: html });
			}
			htmlTokens = [];
		}
	}

	for (const token of tokens) {
		if (token.type === 'code') {
			flushHtml();
			segments.push({
				type: 'code',
				code: token.text,
				language: token.lang || ''
			});
		} else {
			htmlTokens.push(token);
		}
	}

	flushHtml();
	return segments;
}
