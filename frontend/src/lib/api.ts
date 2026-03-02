export interface User {
	email: string;
	name: string;
	picture: string;
	project: string | null;
	tier: string | null;
}

export interface QuotaModel {
	modelId: string;
	remainingFraction: number;
	tokenType: string;
	resetTime: string;
}

export interface SetupResult {
	project: string;
	tier: string;
	status: string;
}

export async function fetchMe(): Promise<User | null> {
	try {
		const res = await fetch('/auth/me');
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

export async function startLogin(): Promise<{ authUrl: string; state: string }> {
	const res = await fetch('/auth/start');
	if (!res.ok) throw new Error('Failed to start login');
	return res.json();
}

export async function exchangeCode(code: string, state: string): Promise<void> {
	const res = await fetch('/auth/exchange', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code: code.trim(), state })
	});
	if (!res.ok) {
		const data = await res.json();
		throw new Error(data.error || 'Token exchange failed');
	}
}

export async function setupCodeAssist(): Promise<SetupResult> {
	const res = await fetch('/api/setup', { method: 'POST' });
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

export async function fetchQuota(): Promise<QuotaModel[]> {
	const res = await fetch('/api/quota');
	const data = await res.json();
	console.log('[Quota] Raw API response:', data);
	if (!res.ok) throw new Error(data.error || 'Failed to fetch quota');
	const buckets: QuotaModel[] = data.buckets || data.userQuota?.perModelQuotas || data.perModelQuotas || [];
	// Filter out _vertex duplicates
	return buckets.filter((b) => !b.modelId?.endsWith('_vertex'));
}

export async function logout(): Promise<void> {
	await fetch('/auth/logout', { method: 'POST' });
}
