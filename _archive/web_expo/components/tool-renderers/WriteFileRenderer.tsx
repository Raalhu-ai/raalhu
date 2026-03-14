import React from 'react';
import { Check } from 'lucide-react';

interface WriteFileRendererProps {
	args: Record<string, unknown>;
	result?: Record<string, unknown> | string;
	status: 'running' | 'done' | 'error';
}

export function WriteFileRenderer({ args, result, status }: WriteFileRendererProps) {
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
			<p className="text-[10px] text-green-400/80 mt-1 flex items-center gap-1">
				<Check size={10} /> <span className="thaana">ފައިލް ލިޔެވިއްޖެ:</span>{' '}
				<span className="font-mono" dir="ltr">{path}</span>
			</p>
		);
	}

	return null;
}
