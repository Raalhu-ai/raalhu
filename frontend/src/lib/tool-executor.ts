/**
 * Executes a custom function call locally and returns the result as a string.
 * Legacy: was used by ChatView generate mode. Kept as stub for api/chat route.
 */
export function executeFunctionCall(name: string, _args: Record<string, unknown>): string {
	return JSON.stringify({ error: `Unknown function: ${name}` });
}
