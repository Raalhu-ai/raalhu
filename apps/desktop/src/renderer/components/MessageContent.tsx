import React from 'react';
import { parseMarkdown } from '../lib/markdown';
import { CodeBlock } from './CodeBlock';

interface MessageContentProps {
	content: string;
}

export function MessageContent({ content }: MessageContentProps) {
	if (!content) return null;

	const segments = parseMarkdown(content);

	return (
		<div className="pt-1">
			{segments.map((seg, i) => {
				if (seg.type === 'html') {
					return (
						<div
							key={i}
							className="prose-chat thaana break-words"
							dangerouslySetInnerHTML={{ __html: seg.content }}
						/>
					);
				}
				return (
					<CodeBlock key={i} code={seg.code} language={seg.language} />
				);
			})}
		</div>
	);
}
