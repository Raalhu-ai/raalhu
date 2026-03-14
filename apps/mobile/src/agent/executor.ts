import type { PyodideSandbox } from './sandbox';
import { File as ExpoFile, Paths } from 'expo-file-system';
import {
	createExecutor,
	getMimeType,
	getFilename,
	configureAgent,
} from '@raalhu/shared/src/agent';
import type { SandboxLike, ToolResult, PlatformAdapter } from '@raalhu/shared/src/agent';
import { API_BASE, getAuthHeaders } from '../api';

// Configure the shared retry module with mobile's auth
configureAgent({
	apiBase: API_BASE,
	getAuthHeaders,
});

const mobileAdapter: PlatformAdapter = {
	async presentFile(sandbox: SandboxLike, path: string, label: string): Promise<ToolResult> {
		const bytes = await sandbox.readFileBytes(path);
		const mimeType = getMimeType(path);
		const filename = getFilename(path);
		const file = new ExpoFile(Paths.cache, filename);
		file.write(new Uint8Array(bytes));
		const uri = file.uri;

		return {
			response: { success: true, path, label, filename, mimeType },
			artifact: { uri, label, filename, mimeType }
		};
	},

	async fetchApi(path: string, init: RequestInit): Promise<Response> {
		const headers = await getAuthHeaders();
		return fetch(`${API_BASE}${path}`, {
			...init,
			headers: { ...headers, ...(init.headers as Record<string, string> || {}) },
		});
	},
};

const sharedExecutor = createExecutor(mobileAdapter);

/**
 * Execute a tool call and return the result.
 * Delegates to shared executor with mobile-specific adapter for present_file.
 */
export async function executeToolCall(
	sandbox: PyodideSandbox | null,
	name: string,
	args: Record<string, unknown>
): Promise<ToolResult> {
	return sharedExecutor(sandbox as SandboxLike | null, name, args);
}

// Re-export ToolResult type for existing imports
export type { ToolResult } from '@raalhu/shared/src/agent';
