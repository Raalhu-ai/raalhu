import type { PyodideSandbox } from './sandbox';
import {
	createExecutor,
	getMimeType,
	getFilename,
} from '@raalhu/shared/src/agent';
import type { SandboxLike, ToolResult, PlatformAdapter } from '@raalhu/shared/src/agent';

const desktopAdapter: PlatformAdapter = {
	async presentFile(sandbox: SandboxLike, path: string, label: string): Promise<ToolResult> {
		const bytes = await sandbox.readFileBytes(path);
		const mimeType = getMimeType(path);
		const blob = new Blob([bytes.buffer], { type: mimeType });
		const uri = URL.createObjectURL(blob);
		const filename = getFilename(path);
		return {
			response: { success: true, path, label, filename, mimeType },
			artifact: { uri, label, filename, mimeType }
		};
	},

	async fetchApi(path: string, init: RequestInit): Promise<Response> {
		// Desktop uses configureAgent() for auth — not needed here
		return fetch(path, init);
	},
};

const sharedExecutor = createExecutor(desktopAdapter);

/** Desktop ToolResult uses `url` instead of shared `uri` for artifact */
export interface DesktopToolResult {
	response: Record<string, unknown>;
	artifact?: {
		url: string;
		label: string;
		filename: string;
		mimeType: string;
	};
}

export async function executeToolCall(
	sandbox: PyodideSandbox,
	name: string,
	args: Record<string, unknown>
): Promise<DesktopToolResult> {
	const result = await sharedExecutor(sandbox as SandboxLike, name, args);
	// Map shared `uri` field → desktop `url` field for backward compat
	if (result.artifact) {
		return {
			response: result.response,
			artifact: {
				url: result.artifact.uri,
				label: result.artifact.label,
				filename: result.artifact.filename,
				mimeType: result.artifact.mimeType,
			},
		};
	}
	return result as DesktopToolResult;
}

export type { ToolResult } from '@raalhu/shared/src/agent';
