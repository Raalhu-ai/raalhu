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
}

export function createApiClient(baseUrl: string, storage: SessionStorage) {
	function getAuthHeaders(): Record<string, string> | Promise<Record<string, string>> {
		const session = storage.get();
		if (session instanceof Promise) {
			return session.then((s) => (s ? { 'X-Session': s } : {}));
		}
		return session ? { 'X-Session': session } : {};
	}

	async function resolveHeaders(): Promise<Record<string, string>> {
		const h = getAuthHeaders();
		return h instanceof Promise ? h : h;
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
			if (!res.ok) return null;
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
			const err = data as { error: string; details?: string; tosUrl?: string };
			if (res.status === 428 && err.tosUrl) {
				throw new Error(`TOS_REQUIRED:${err.tosUrl}`);
			}
			throw new Error(err.error + (err.details ? ': ' + err.details : ''));
		}
		return data;
	}

	async function fetchQuota(): Promise<ApiQuotaModel[]> {
		const res = await fetch(`${baseUrl}/api/quota`, {
			headers: await resolveHeaders(),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.error || 'Failed to fetch quota');
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
