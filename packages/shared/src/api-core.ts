/**
 * Configurable API client — works across all platforms.
 *
 * Each platform provides a SessionStorage adapter:
 * - Mobile: expo-secure-store
 * - Desktop/Extension: localStorage
 * - Web (SvelteKit): cookie-based (not using this module)
 */

export interface SessionStorage {
	get(): Promise<string | null> | string | null;
	set(id: string): Promise<void> | void;
	clear(): Promise<void> | void;
}

export interface ApiUser {
	email: string;
	name: string;
	picture: string;
	project: string | null;
	tier: string | null;
	authProvider: 'antigravity';
	accountType: 'unknown' | 'consumer' | 'enterprise' | 'paygo';
}

export interface ApiQuotaModel {
	modelId: string;
	remainingFraction: number;
	tokenType: string;
	resetTime: string;
}

export interface ApiSetupResult {
	project: string;
	tier: string;
	status: string;
	provider: 'antigravity';
	accountType: 'consumer';
}

export interface ApiErrorPayload {
	error: string;
	code?: string;
	details?: string;
	actionUrl?: string;
	retryAfterMs?: number;
}

export class ApiClientError extends Error {
	constructor(
		message: string,
		public status: number,
		public code?: string,
		public actionUrl?: string,
		public retryAfterMs?: number
	) {
		super(message);
		this.name = 'ApiClientError';
	}
}

export function createApiClient(baseUrl: string, storage: SessionStorage) {
	function getAuthHeaders(): Record<string, string> | Promise<Record<string, string>> {
		const session = storage.get();
		if (session instanceof Promise) {
			return session.then((s): Record<string, string> => (s ? { 'X-Session': s } : {}));
		}
		return session ? { 'X-Session': session } : {};
	}

	async function resolveHeaders(): Promise<Record<string, string>> {
		const h = getAuthHeaders();
		return h instanceof Promise ? h : h;
	}

	async function readApiError(res: Response): Promise<ApiClientError> {
		const data = (await res.json().catch(() => ({ error: `Request failed with ${res.status}` }))) as ApiErrorPayload;
		return new ApiClientError(
			data.error + (data.details ? `: ${data.details}` : ''),
			res.status,
			data.code,
			data.actionUrl,
			data.retryAfterMs
		);
	}

	async function startLogin(): Promise<{ authUrl: string; state: string }> {
		const res = await fetch(`${baseUrl}/auth/start`);
		if (!res.ok) throw new Error('Failed to start login');
		return res.json();
	}

	async function exchangeCode(code: string, state: string): Promise<void> {
		const res = await fetch(`${baseUrl}/auth/exchange`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code: code.trim(), state }),
		});
		const data = await res.json();
		if (!res.ok) {
			throw new Error(data.error || 'Token exchange failed');
		}
		if (data.sessionId) {
			await storage.set(data.sessionId);
		}
	}

	async function fetchMe(): Promise<ApiUser | null> {
		const session = await Promise.resolve(storage.get());
		if (!session) return null;
		try {
			const res = await fetch(`${baseUrl}/auth/me`, {
				headers: await resolveHeaders(),
			});
			if (!res.ok) {
				const error = await readApiError(res);
				if (error.code === 'REAUTH_REQUIRED') await storage.clear();
				return null;
			}
			return await res.json();
		} catch {
			return null;
		}
	}

	async function setupCodeAssist(): Promise<ApiSetupResult> {
		const res = await fetch(`${baseUrl}/api/setup`, {
			method: 'POST',
			headers: await resolveHeaders(),
		});
		const data = await res.json();
		if (!res.ok) {
			const err = data as ApiErrorPayload;
			if (err.code === 'REAUTH_REQUIRED') await storage.clear();
			if (err.code === 'TOS_REQUIRED' && err.actionUrl) throw new Error(`TOS_REQUIRED:${err.actionUrl}`);
			if (err.code === 'ACCOUNT_VERIFICATION_REQUIRED' && err.actionUrl) throw new Error(`VERIFICATION_REQUIRED:${err.actionUrl}`);
			throw new ApiClientError(
				err.error + (err.details ? ': ' + err.details : ''),
				res.status,
				err.code,
				err.actionUrl,
				err.retryAfterMs
			);
		}
		return data;
	}

	async function fetchQuota(): Promise<ApiQuotaModel[]> {
		const res = await fetch(`${baseUrl}/api/quota`, {
			headers: await resolveHeaders(),
		});
		const data = await res.json();
		if (!res.ok) {
			const error = new ApiClientError(
				data.error || 'Failed to fetch quota',
				res.status,
				data.code,
				data.actionUrl,
				data.retryAfterMs
			);
			if (error.code === 'REAUTH_REQUIRED') await storage.clear();
			throw error;
		}
		const buckets: ApiQuotaModel[] =
			data.buckets || data.userQuota?.perModelQuotas || data.perModelQuotas || [];
		return buckets.filter((b) => !b.modelId?.endsWith('_vertex'));
	}

	async function logout(): Promise<void> {
		await fetch(`${baseUrl}/auth/logout`, {
			method: 'POST',
			headers: await resolveHeaders(),
		});
		await storage.clear();
	}

	return {
		baseUrl,
		getAuthHeaders,
		startLogin,
		exchangeCode,
		fetchMe,
		setupCodeAssist,
		fetchQuota,
		logout,
		clearSession: () => storage.clear(),
	};
}
