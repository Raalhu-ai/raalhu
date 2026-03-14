import React from 'react';

interface DefaultRendererProps {
	result?: Record<string, unknown> | string;
}

export function DefaultRenderer({ result }: DefaultRendererProps) {
	if (!result) return null;

	return (
		<pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto mt-1 max-h-[200px] overflow-y-auto" dir="ltr">
			{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
		</pre>
	);
}
