import { describe, expect, test } from 'bun:test';
import {
	ANTIGRAVITY_CONSUMER_BASE,
	ANTIGRAVITY_CONTROL_BASE,
	ANTIGRAVITY_SCOPES,
	AntigravityError,
	buildAntigravityEnvelope,
	classifyAccountType,
	fetchAntigravityQuota,
	normalizeAvailableModels,
	proxyAntigravity,
	requestUserAgent,
	resolveClientVersion,
	setupAntigravity,
	stableSessionId
} from '../src/antigravity';
import { isCurrentSession, type SessionData } from '../src/session';
import app from '../src/app';

function session(overrides: Partial<SessionData> = {}): SessionData {
	return {
		schemaVersion: 2,
		authProvider: 'antigravity',
		accountType: 'consumer',
		accessToken: 'access-token',
		refreshToken: 'refresh-token',
		expiresAt: Date.now() + 60_000,
		email: 'user@example.com',
		name: 'User',
		picture: '',
		project: 'consumer-project',
		tier: 'free-tier',
		...overrides
	};
}

function jsonResponse(value: unknown, status = 200, headers?: HeadersInit): Response {
	const resolvedHeaders = new Headers(headers);
	resolvedHeaders.set('Content-Type', 'application/json');
	return new Response(JSON.stringify(value), { status, headers: resolvedHeaders });
}

function testEnv() {
	const authRecords = new Map<string, string>();
	const sessionRecords = new Map<string, string>();
	const kv = (records: Map<string, string>) => ({
		get: async (key: string) => records.get(key) ?? null,
		put: async (key: string, value: string) => { records.set(key, value); },
		delete: async (key: string) => { records.delete(key); }
	});
	return {
		authRecords,
		sessionRecords,
		env: {
			AUTH_SESSIONS: kv(authRecords),
			SESSIONS: kv(sessionRecords),
			ANTIGRAVITY_OAUTH_CLIENT_ID: 'developer-client-id',
			ANTIGRAVITY_OAUTH_CLIENT_SECRET: 'developer-client-secret',
			ANTIGRAVITY_REDIRECT_URI: 'https://codeassist.google.com/authcode',
			ANTIGRAVITY_CLIENT_VERSION: '2.9.1'
		} as any
	};
}

describe('Antigravity identity and sessions', () => {
	test('builds a PKCE login with consent and consumes state before token exchange', async () => {
		const fixture = testEnv();
		const startResponse = await app.request('/auth/start', {}, fixture.env);
		const start = await startResponse.json() as any;
		const authUrl = new URL(start.authUrl);
		expect(authUrl.searchParams.get('client_id')).toBe('developer-client-id');
		expect(authUrl.searchParams.get('redirect_uri')).toBe('https://codeassist.google.com/authcode');
		expect(authUrl.searchParams.get('prompt')).toBe('consent');
		expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256');
		for (const scope of ANTIGRAVITY_SCOPES) {
			expect(authUrl.searchParams.get('scope')?.split(' ')).toContain(scope);
		}
		expect(fixture.authRecords.has(start.state)).toBe(true);

		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async () => jsonResponse({ error: 'invalid_grant' }, 400)) as typeof fetch;
		try {
			const exchange = await app.request('/auth/exchange', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: 'one-time-code', state: start.state })
			}, fixture.env);
			expect(exchange.status).toBe(400);
			expect(fixture.authRecords.has(start.state)).toBe(false);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('lazily rejects and clears legacy browser sessions', async () => {
		const fixture = testEnv();
		fixture.sessionRecords.set('legacy-session', JSON.stringify({ accessToken: 'legacy' }));
		const response = await app.request('/auth/me', {
			headers: { Cookie: 'session=legacy-session' }
		}, fixture.env);
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ code: 'REAUTH_REQUIRED' });
		expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
	});

	test('pins invalid and outdated client versions to 2.9.1', () => {
		expect(resolveClientVersion(undefined)).toBe('2.9.1');
		expect(resolveClientVersion('2.8.9')).toBe('2.9.1');
		expect(resolveClientVersion('3.1.4')).toBe('3.1.4');
		expect(requestUserAgent('2.1.0')).toBe('antigravity/hub/2.9.1 darwin/arm64');
	});

	test('uses the required developer-owned OAuth scopes', () => {
		expect(ANTIGRAVITY_SCOPES).toContain('https://www.googleapis.com/auth/cclog');
		expect(ANTIGRAVITY_SCOPES).toContain('https://www.googleapis.com/auth/experimentsandconfigs');
		expect(ANTIGRAVITY_SCOPES).toContain('https://www.googleapis.com/auth/cloud-platform');
	});

	test('accepts only versioned Antigravity sessions', () => {
		expect(isCurrentSession(session())).toBe(true);
		expect(isCurrentSession({ ...session(), schemaVersion: undefined })).toBe(false);
		expect(isCurrentSession({ ...session(), authProvider: 'gemini-cli' })).toBe(false);
	});

	test('classifies only explicit enterprise and PayGo markers as unsupported', () => {
		expect(classifyAccountType({ currentTier: { id: 'free-tier' } })).toBe('consumer');
		expect(classifyAccountType({ entitlement: 'enterprise' })).toBe('enterprise');
		expect(classifyAccountType({ billing: 'pay_as_you_go' })).toBe('paygo');
		expect(classifyAccountType({ unfamiliar: true })).toBe('consumer');
	});
});

describe('Antigravity setup and quota', () => {
	test('loads existing projects from the production control plane', async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
			calls.push({ url: String(input), init });
			return jsonResponse({
				cloudaicompanionProject: { id: 'existing-project' },
				currentTier: { id: 'free-tier' }
			});
		}) as typeof fetch;

		const active = session({ project: null, tier: null, accountType: 'unknown' });
		const result = await setupAntigravity(active, '2.9.1', fetcher);

		expect(calls).toHaveLength(1);
		expect(calls[0].url).toBe(`${ANTIGRAVITY_CONTROL_BASE}/v1internal:loadCodeAssist`);
		expect(JSON.parse(String(calls[0].init?.body))).toEqual({ metadata: { ideType: 'ANTIGRAVITY' } });
		expect(new Headers(calls[0].init?.headers).get('User-Agent')).toContain('antigravity/hub/2.9.1');
		expect(result).toEqual({
			project: 'existing-project',
			tier: 'free-tier',
			status: 'ready',
			provider: 'antigravity',
			accountType: 'consumer'
		});
	});

	test('onboards new consumers only through the daily host with native metadata', async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const responses = [
			jsonResponse({ allowedTiers: [{ id: 'free-tier', isDefault: true }] }),
			jsonResponse({ done: true, response: { cloudaicompanionProject: 'new-project', tier_id: 'free-tier' } })
		];
		const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
			calls.push({ url: String(input), init });
			return responses.shift()!;
		}) as typeof fetch;

		await setupAntigravity(session({ project: null, tier: null, accountType: 'unknown' }), '2.9.1', fetcher);
		expect(calls[1].url).toBe(`${ANTIGRAVITY_CONSUMER_BASE}/v1internal:onboardUser`);
		expect(new Headers(calls[1].init?.headers).get('X-Goog-Api-Client')).toBe('gl-node/22.21.1');
		expect(JSON.parse(String(calls[1].init?.body))).toEqual({
			tier_id: 'free-tier',
			metadata: { ide_type: 'ANTIGRAVITY', ide_name: 'ANTIGRAVITY', ide_version: '2.9.1' }
		});
	});

	test('rejects explicit enterprise accounts before onboarding', async () => {
		const fetcher = (async () => jsonResponse({ entitlement: 'enterprise' })) as typeof fetch;
		const active = session({ project: null, accountType: 'unknown' });
		await expect(setupAntigravity(active, '2.9.1', fetcher)).rejects.toMatchObject({
			status: 403,
			code: 'UNSUPPORTED_ACCOUNT',
			accountType: 'enterprise'
		});
		expect(active.accountType).toBe('enterprise');
	});

	test('normalizes fetchAvailableModels into the existing quota contract', async () => {
		const fixture = {
			models: {
				'gemini-3-flash': {
					model: 'gemini-3-flash',
					quotaInfo: { remainingFraction: 0.75, resetTime: '2026-08-27T00:00:00Z' }
				},
				'gemini-3-flash_vertex': { quotaInfo: { remainingFraction: 1 } }
			}
		};
		expect(normalizeAvailableModels(fixture)).toEqual([
			{
				modelId: 'gemini-3-flash',
				remainingFraction: 0.75,
				tokenType: 'requests',
				resetTime: '2026-08-27T00:00:00Z'
			}
		]);

		const calls: string[] = [];
		const fetcher = (async (input: RequestInfo | URL) => {
			calls.push(String(input));
			return jsonResponse(fixture);
		}) as typeof fetch;
		await fetchAntigravityQuota(session(), '2.9.1', fetcher);
		expect(calls).toEqual([`${ANTIGRAVITY_CONSUMER_BASE}/v1internal:fetchAvailableModels`]);
	});
});

describe('Antigravity generation envelope', () => {
	test('builds stable consumer envelopes and sanitizes only schema locations', () => {
		const body = {
			model: 'gemini-3-flash',
			conversationId: 'chat-123',
			contents: [
				{ role: 'user', parts: [{ text: 'hello', thoughtSignature: '' }] },
				{ role: 'model', parts: [{ functionCall: { name: 'lookup', args: { format: 'raw', default: true } }, thoughtSignature: 'valid' }] },
				{ role: 'user', parts: [{ functionResponse: { name: 'lookup', response: { ok: true } } }] }
			],
			generationConfig: { temperature: 0.2 },
			tools: [{
				functionDeclarations: [{
					name: 'lookup',
					parameters: {
						type: ['OBJECT', 'NULL'],
						title: 'unsupported',
						properties: { value: { type: 'STRING', format: 'uri', default: 'x' } },
						required: ['value']
					}
				}]
			}],
			toolConfig: { functionCallingConfig: { mode: 'AUTO' } }
		};

		const envelope = buildAntigravityEnvelope(session(), body);
		expect(envelope.project).toBe('consumer-project');
		expect(envelope.userAgent).toBe('antigravity');
		expect(envelope.requestType).toBe('agent');
		expect(envelope.request.requestId).toBeUndefined();
		expect(envelope.request.sessionId).toBe(stableSessionId('chat-123'));
		expect(envelope.request.contents[0].parts[0].thoughtSignature).toBeUndefined();
		expect(envelope.request.contents[1].parts[0].thoughtSignature).toBe('valid');
		expect(envelope.request.contents[1].parts[0].functionCall.args).toEqual({ format: 'raw', default: true });
		expect(envelope.request.tools[0].functionDeclarations[0].parameters).toEqual({
			type: 'OBJECT',
			nullable: true,
			properties: { value: { type: 'STRING' } },
			required: ['value']
		});
		expect(envelope.request.toolConfig).toEqual({ functionCallingConfig: { mode: 'AUTO' } });
		expect(envelope.request.generationConfig).toEqual({ temperature: 0.2 });
	});

	test('rejects orphaned or misordered function responses', () => {
		expect(() => buildAntigravityEnvelope(session(), {
			contents: [{ role: 'user', parts: [{ functionResponse: { name: 'orphan', response: {} } }] }]
		})).toThrow('Function responses must immediately match');
	});
});

describe('Antigravity proxy transport', () => {
	test('refreshes once on 401 and never changes away from the daily host', async () => {
		const calls: Array<{ url: string; authorization: string | null }> = [];
		const responses = [
			jsonResponse({ error: { message: 'expired' } }, 401),
			jsonResponse({ candidates: [] })
		];
		const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
			calls.push({ url: String(input), authorization: new Headers(init?.headers).get('Authorization') });
			return responses.shift()!;
		}) as typeof fetch;
		const refreshed = session({ accessToken: 'fresh-token' });

		const result = await proxyAntigravity(
			session(),
			{ contents: [{ role: 'user', parts: [{ text: 'hello' }] }] },
			'2.9.1',
			false,
			async () => refreshed,
			fetcher
		);

		expect(result.status).toBe(200);
		expect(calls.map((call) => call.url)).toEqual([
			`${ANTIGRAVITY_CONSUMER_BASE}/v1internal:generateContent`,
			`${ANTIGRAVITY_CONSUMER_BASE}/v1internal:generateContent`
		]);
		expect(calls[1].authorization).toBe('Bearer fresh-token');
	});

	test('returns structured rate-limit metadata without cross-host fallback', async () => {
		let calls = 0;
		const fetcher = (async () => {
			calls++;
			return jsonResponse({ error: { message: 'quota exhausted' } }, 429, { 'Retry-After': '12' });
		}) as typeof fetch;

		try {
			await proxyAntigravity(
				session(),
				{ contents: [{ role: 'user', parts: [{ text: 'hello' }] }] },
				'2.9.1',
				false,
				async () => null,
				fetcher
			);
			throw new Error('expected proxy to reject');
		} catch (error) {
			expect(error).toBeInstanceOf(AntigravityError);
			expect(error).toMatchObject({ code: 'RATE_LIMITED', status: 429, retryAfterMs: 12_000 });
		}
		expect(calls).toBe(1);
	});
});
