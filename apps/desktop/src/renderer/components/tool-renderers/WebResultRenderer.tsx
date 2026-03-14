import React, { useMemo } from 'react';
import { parseMarkdown } from '../../lib/markdown';
import { CodeBlock } from '../CodeBlock';

interface WebResultRendererProps {
	result?: Record<string, unknown> | string;
}

export function WebResultRenderer({ result }: WebResultRendererProps) {
	const rawContent = useMemo(() => {
		if (!result) return '';
		if (typeof result === 'string') return result;
		return (result.content as string) || '';
	}, [result]);

	const { contentHtml, sourcesList } = useMemo(() => {
		const text = rawContent;
		const map: Record<string, string> = {};
		const sourcesIdx = text.lastIndexOf('\nSources:\n');

		if (sourcesIdx !== -1) {
			const sourcesBlock = text.slice(sourcesIdx);
			const re = /\[(\d+)\]\s+(.+?)\s+\((\S+)\)/g;
			let m;
			while ((m = re.exec(sourcesBlock)) !== null) {
				map[m[1]] = m[3];
			}
		}

		let body = sourcesIdx !== -1 ? text.slice(0, sourcesIdx) : text;

		// Make [N] citations clickable
		body = body.replace(/\[(\d+)\]/g, (_match, num) => {
			const url = map[num];
			if (url) {
				return `<a href="${url}" target="_blank" rel="noopener noreferrer"><sup>[${num}]</sup></a>`;
			}
			return `<sup>[${num}]</sup>`;
		});

		// Build sources list
		const entries: { num: string; title: string; url: string }[] = [];
		if (sourcesIdx !== -1) {
			const sourcesBlock = text.slice(sourcesIdx);
			const re = /\[(\d+)\]\s+(.+?)\s+\((\S+)\)/g;
			let m;
			while ((m = re.exec(sourcesBlock)) !== null) {
				entries.push({ num: m[1], title: m[2], url: m[3] });
			}
		}

		return { contentHtml: body, sourcesList: entries };
	}, [rawContent]);

	const segments = useMemo(() => parseMarkdown(contentHtml), [contentHtml]);

	if (!contentHtml) return null;

	return (
		<div>
			<div className="web-result-box mt-1.5 rounded-lg border border-border/50 bg-muted/30 p-3" dir="ltr">
				{segments.map((seg, i) => {
					if (seg.type === 'html') {
						return <div key={i} dangerouslySetInnerHTML={{ __html: seg.content }} />;
					}
					return <CodeBlock key={i} code={seg.code} language={seg.language} />;
				})}

				{sourcesList.length > 0 && (
					<div className="mt-3 pt-2 border-t border-border/30">
						<div className="text-[10px] font-medium text-muted-foreground/70 mb-1">Sources</div>
						{sourcesList.map(src => (
							<div key={src.num} className="text-[10px] leading-4 truncate">
								<span className="text-primary/70">[{src.num}]</span>{' '}
								<a href={src.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-primary hover:underline">
									{src.title}
								</a>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
