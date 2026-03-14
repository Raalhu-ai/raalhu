import { getSystemPrompt as _getSystemPrompt } from '@raalhu/shared/src/agent';

/**
 * Mobile-specific wrapper — preserves the old signature.
 * Mobile has sandbox available, so hasSandbox defaults to true.
 */
export function getSystemPrompt(customInstructions?: string): string {
	return _getSystemPrompt({ hasSandbox: true, customInstructions });
}
