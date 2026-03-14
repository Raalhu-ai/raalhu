import React from 'react';

interface PresentFileRendererProps {
	args: Record<string, unknown>;
	result?: Record<string, unknown> | string;
	status: 'running' | 'done' | 'error';
}

export function PresentFileRenderer({ args, result, status }: PresentFileRendererProps) {
	const path = (args.path as string) || '';
	const isError = status === 'error';
	const errorMsg = isError && result
		? (typeof result === 'string' ? result : (result as Record<string, unknown>).error as string || '')
		: '';

	if (isError) {
		return <p className="text-xs text-destructive mt-1" dir="ltr">{errorMsg}</p>;
	}

	if (status === 'done') {
		return (
			<p className="text-[10px] text-green-400/80 mt-1">
				✓ <span className="font-mono" dir="ltr">{path}</span>
			</p>
		);
	}

	return null;
}
