import React from 'react';

interface SkillRendererProps {
	result?: Record<string, unknown> | string;
	status: 'running' | 'done' | 'error';
}

export function SkillRenderer({ result, status }: SkillRendererProps) {
	if (status !== 'error' || !result) return null;

	const errorMsg = typeof result === 'string'
		? result
		: (result as Record<string, unknown>).error as string || '';

	if (!errorMsg) return null;

	return <p className="text-xs text-destructive mt-1" dir="ltr">{errorMsg}</p>;
}
