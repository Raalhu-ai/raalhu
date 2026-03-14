import React, { useState, useMemo, useCallback } from 'react';

import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface CodeBlockProps {
	code: string;
	language?: string;
}

export function CodeBlock({ code, language = '' }: CodeBlockProps) {
	const [copied, setCopied] = useState(false);

	const highlightedHtml = useMemo(() => {
		const lang = language.toLowerCase().trim();
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(code, { language: lang }).value;
			} catch {
				return escapeHtml(code);
			}
		}
		try {
			return hljs.highlightAuto(code).value;
		} catch {
			return escapeHtml(code);
		}
	}, [code, language]);

	const copyCode = useCallback(() => {
		navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}, [code]);

	const displayLang = language ? language.toUpperCase() : '';

	return (
		<div className="code-block-wrapper relative group/code">
			{displayLang ? (
				<div className="flex items-center justify-between px-3 py-1 border-b border-border/50">
					<span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">
						{displayLang}
					</span>
					<button
						onClick={copyCode}
						className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors opacity-0 group-hover/code:opacity-100"
						title="Copy"
					>
						{copied ? (
							<span className="text-green-400 text-xs">✓</span>
						) : (
							<span className="text-xs">📋</span>
						)}
					</button>
				</div>
			) : (
				<button
					onClick={copyCode}
					className="absolute top-2 left-2 p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors opacity-0 group-hover/code:opacity-100 z-10"
					title="Copy"
				>
					{copied ? (
						<span className="text-green-400 text-xs">✓</span>
					) : (
						<span className="text-xs">📋</span>
					)}
				</button>
			)}
			<pre className="max-h-96 overflow-auto p-3">
				<code
					className="hljs"
					dir="ltr"
					dangerouslySetInnerHTML={{ __html: highlightedHtml }}
				/>
			</pre>
		</div>
	);
}
