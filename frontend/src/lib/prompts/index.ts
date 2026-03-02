import type { PromptModule } from './types';
import agent from './agent';

export function getPromptModule(): PromptModule {
	return agent;
}

export type { PromptModule } from './types';
