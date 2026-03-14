import React, { useMemo } from 'react';

interface ListDirRendererProps {
	args: Record<string, unknown>;
	result?: Record<string, unknown> | string;
	status: 'running' | 'done' | 'error';
}

export function ListDirRenderer({ args, result, status }: ListDirRendererProps) {
	const isError = status === 'error';
	const errorMsg = isError && result
		? (typeof result === 'string' ? result : (result as Record<string, unknown>).error as string || '')
		: '';

	const entryCount = useMemo(() => {
		if (!result || isError) return 0;
		if (typeof result === 'string') {
			try {
				const parsed = JSON.parse(result);
				if (Array.isArray(parsed.entries)) return parsed.entries.length;
				if (Array.isArray(parsed)) return parsed.length;
			} catch {}
			return result.split('\n').filter(Boolean).length;
		}
		const r = result as Record<string, unknown>;
		if (Array.isArray(r.entries)) return r.entries.length;
		return 0;
	}, [result, isError]);

	if (isError) {
		return <p className="text-xs text-destructive mt-1" dir="ltr">{errorMsg}</p>;
	}

	if (status === 'done') {
		return (
			<p className="text-[10px] text-green-400/80 mt-1">
				✓ <span dir="ltr">{entryCount}</span>{' '}
				<span className="thaana">އެންޓްރީ</span>
			</p>
		);
	}

	return null;
}
