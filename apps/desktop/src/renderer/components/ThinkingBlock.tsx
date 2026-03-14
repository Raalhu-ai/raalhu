import React, { useState, useMemo } from 'react';
import { englishToThaana } from '@raalhu/shared';
import { ChevronDown, ChevronLeft, Brain } from 'lucide-react';
import { parseMarkdown } from '../lib/markdown';

interface ThinkingBlockProps {
	content?: string;
}

export function ThinkingBlock({ content }: ThinkingBlockProps) {
	const [expanded, setExpanded] = useState(false);

	const thaanaContent = useMemo(() => content ? englishToThaana(content) : '', [content]);
	const segments = useMemo(() => thaanaContent ? parseMarkdown(thaanaContent) : [], [thaanaContent]);

	if (!content) return null;

	return (
		<div className="my-1">
			<button
				onClick={() => setExpanded(!expanded)}
				className="flex items-center gap-1.5 py-1 cursor-pointer bg-transparent border-none"
			>
				<Brain className="w-3.5 h-3.5 text-muted-foreground" />
				<span className="thaana text-xs text-muted-foreground">
					ވިސްނަނީ...
				</span>
				{expanded ? (
					<ChevronDown className="w-3 h-3 text-muted-foreground" />
				) : (
					<ChevronLeft className="w-3 h-3 text-muted-foreground" />
				)}
			</button>
			{expanded && (
				<div className="pl-4 border-l-2 border-border/30 ml-1.5">
					{segments.map((seg, i) => {
						if (seg.type === 'html') {
							return (
								<div
									key={i}
									className="thaana text-xs text-muted-foreground leading-relaxed break-words"
									dangerouslySetInnerHTML={{ __html: seg.content }}
								/>
							);
						}
						return (
							<pre key={i} className="text-xs text-muted-foreground font-mono whitespace-pre-wrap my-1 p-2 bg-muted/30 rounded">
								{seg.code}
							</pre>
						);
					})}
				</div>
			)}
		</div>
	);
}
