import type { Message } from '@ai-sdk/svelte';

export interface PromptModule {
	getSystemPrompt(data?: Record<string, string>): string;
	getInitialMessages(data?: Record<string, string>): Message[];
	buildPrompt(data: Record<string, string>): string;
}
