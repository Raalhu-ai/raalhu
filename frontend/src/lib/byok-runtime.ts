import type { AiProvider } from './settings';

export type ByokOperation = 'chat' | 'title' | 'web-search' | 'web-fetch';
export type ByokRuntimeEventKind = 'fallback' | 'stream-interrupted' | 'disabled';

export interface ByokRuntimeEvent {
	kind: ByokRuntimeEventKind;
	provider: AiProvider;
	failureCount: number;
	fallbackUsed: boolean;
	operation: ByokOperation;
	message: string;
}

const failureStreaks = new Map<AiProvider, number>();

export function getByokFailureCount(provider: AiProvider): number {
	return failureStreaks.get(provider) ?? 0;
}

export function recordByokFailure(provider: AiProvider): number {
	const nextCount = Math.min(3, getByokFailureCount(provider) + 1);
	failureStreaks.set(provider, nextCount);
	return nextCount;
}

export function canReplayByokStream(output: {
	rawPartCount: number;
	functionCallCount: number;
	textLength: number;
}): boolean {
	return output.rawPartCount === 0 && output.functionCallCount === 0 && output.textLength === 0;
}

export function resetByokFailureCount(provider: AiProvider): void {
	failureStreaks.delete(provider);
}

export function dispatchByokRuntimeEvent(detail: ByokRuntimeEvent): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent<ByokRuntimeEvent>('mogger-byok-runtime', { detail }));
}
