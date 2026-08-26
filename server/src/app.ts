import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import {
	type SessionData,
	getSessionId,
	loadSession,
	saveSession,
	deleteSession,
	isCurrentSession,
	setSessionCookie,
	clearSessionCookie
} from './session';
import { generateModel, streamModel, type AiProvider, type ModelRoute } from './model-providers';
import {
	ANTIGRAVITY_PROTOCOL_VERSION,
	ANTIGRAVITY_SCOPES,
	AntigravityError,
	apiErrorBody,
	fetchAntigravityQuota,
	resolveClientVersion,
	setupAntigravity
} from './antigravity';

// --- Types ---

type Env = {
	Bindings: {
		AUTH_SESSIONS: KVNamespace;
		SESSIONS: KVNamespace;
		ANTIGRAVITY_OAUTH_CLIENT_ID: string;
		ANTIGRAVITY_OAUTH_CLIENT_SECRET: string;
		ANTIGRAVITY_REDIRECT_URI: string;
		ANTIGRAVITY_CLIENT_VERSION: string;
	};
	Variables: {
		session: SessionData;
		sessionId: string;
	};
};

const SCOPES = ANTIGRAVITY_SCOPES.join(' ');

const app = new Hono<Env>();

// --- CORS (for local dev where frontend is on a different port) ---
app.use(
	'*',
	cors({
		origin: (origin) => origin || 'http://localhost:5173',
		credentials: true,
		allowHeaders: [
			'Content-Type',
			'X-Session',
			'X-Model-Module',
			'X-AI-Provider',
			'X-AI-API-Key',
			'X-Gemini-API-Key'
		],
		exposeHeaders: ['Set-Cookie']
	})
);

// --- PKCE ---

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
	const verifier = [crypto.randomUUID(), crypto.randomUUID()].join('').replace(/-/g, '');

	const encoded = new TextEncoder().encode(verifier);
	const digest = await crypto.subtle.digest('SHA-256', encoded);
	const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');

	return { verifier, challenge };
}

// --- Helpers ---

/** Get valid access token, refreshing if needed. Returns null if session is dead. */
async function getValidAccessToken(
	sessionId: string,
	env: Env['Bindings'],
	forceRefresh = false
): Promise<{ token: string; session: SessionData } | null> {
	const session = await loadSession(sessionId, env.SESSIONS);
	if (!isCurrentSession(session)) return null;

	// Refresh if token expires within 60 seconds
	if (forceRefresh || Date.now() > session.expiresAt - 60_000) {
		const refreshStartedAt = Date.now();
		const res = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				refresh_token: session.refreshToken,
				client_id: env.ANTIGRAVITY_OAUTH_CLIENT_ID,
				client_secret: env.ANTIGRAVITY_OAUTH_CLIENT_SECRET,
				grant_type: 'refresh_token'
			})
		});

		if (!res.ok) {
			console.warn(JSON.stringify({ event: 'oauth_refresh', outcome: 'error', status: res.status, latencyMs: Date.now() - refreshStartedAt }));
			return null;
		}

		const refreshed: any = await res.json();
		session.accessToken = refreshed.access_token;
		session.expiresAt = Date.now() + refreshed.expires_in * 1000;

		await saveSession(sessionId, session, env.SESSIONS);
		console.log(JSON.stringify({ event: 'oauth_refresh', outcome: 'success', latencyMs: Date.now() - refreshStartedAt }));
	}

	return { token: session.accessToken, session };
}

/** Auth middleware — loads session, refreshes token if needed, attaches to context. */
async function authMiddleware(c: Context<Env>, next: Next) {
	const sessionId = getSessionId(c.req.raw);
	if (!sessionId) {
		return c.json({ error: 'Not authenticated' }, 401);
	}

	const result = await getValidAccessToken(sessionId, c.env);
	if (!result) {
		c.header('Set-Cookie', clearSessionCookie());
		return c.json(
			{ error: 'Your session must be refreshed. Please sign in again.', code: 'REAUTH_REQUIRED' },
			401
		);
	}

	c.set('session', result.session);
	c.set('sessionId', sessionId);
	await next();
}

function antigravityErrorResponse(c: Context<Env>, error: unknown) {
	if (error instanceof AntigravityError) {
		if (error.code === 'REAUTH_REQUIRED') c.header('Set-Cookie', clearSessionCookie());
		return c.json(apiErrorBody(error), error.status as any);
	}
	const details = error instanceof Error ? error.message.slice(0, 500) : undefined;
	return c.json(
		{ error: 'Antigravity request failed.', code: 'UPSTREAM_UNAVAILABLE', ...(details ? { details } : {}) },
		500
	);
}

type MemoriesPayload = {
	global?: unknown;
	project?: unknown;
	projectName?: unknown;
};

function cleanMemory(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function buildMemoryBlock(memories: MemoriesPayload | undefined): string {
	if (!memories) return '';

	const globalMemory = cleanMemory(memories.global);
	const projectMemory = cleanMemory(memories.project);
	const projectName = cleanMemory(memories.projectName);

	if (!globalMemory && !projectMemory) return '';

	const sections = ['## ހަނދާންތައް'];
	if (globalMemory) {
		sections.push(`### އާންމު ހަނދާންތައް\n${globalMemory}`);
	}
	if (projectMemory) {
		const title = projectName
			? `### ޕްރޮޖެކްޓް ހަނދާންތައް: ${projectName}`
			: '### ޕްރޮޖެކްޓް ހަނދާންތައް';
		sections.push(`${title}\n${projectMemory}`);
	}

	return sections.join('\n\n');
}

function appendMemoriesToSystemInstruction(systemInstruction: unknown, memories: MemoriesPayload | undefined) {
	const memoryBlock = buildMemoryBlock(memories);
	if (!memoryBlock) return systemInstruction;

	const fallback = {
		role: 'user',
		parts: [{ text: memoryBlock }]
	};

	if (!systemInstruction || typeof systemInstruction !== 'object') return fallback;

	const source = systemInstruction as { role?: unknown; parts?: unknown };
	const parts = Array.isArray(source.parts) ? [...source.parts] : [];
	const textPartIndex = parts.findIndex(
		(part) => !!part && typeof part === 'object' && typeof (part as any).text === 'string'
	);

	if (textPartIndex >= 0) {
		const textPart = parts[textPartIndex] as { text: string };
		parts[textPartIndex] = { ...textPart, text: `${textPart.text}\n\n${memoryBlock}` };
	} else {
		parts.push({ text: memoryBlock });
	}

	return {
		...(systemInstruction as Record<string, unknown>),
		role: typeof source.role === 'string' ? source.role : 'user',
		parts
	};
}

function withMemorySystemInstruction<T extends Record<string, any>>(body: T): T {
	return {
		...body,
		systemInstruction: appendMemoriesToSystemInstruction(body.systemInstruction, body.memories)
	} as T;
}

function isAiProvider(value: string | undefined): value is AiProvider {
	return value === 'google' || value === 'openai' || value === 'anthropic';
}

function resolveModelRoute(c: Context<Env>): ModelRoute {
	const moduleHeader = c.req.header('X-Model-Module')?.trim();
	const providerHeader = c.req.header('X-AI-Provider')?.trim();
	const aiApiKey = c.req.header('X-AI-API-Key')?.trim();
	const legacyGeminiApiKey = c.req.header('X-Gemini-API-Key')?.trim();

	if ((moduleHeader === 'ai-sdk' || aiApiKey) && aiApiKey && isAiProvider(providerHeader)) {
		return { module: 'ai-sdk', provider: providerHeader, apiKey: aiApiKey };
	}

	if (legacyGeminiApiKey) {
		return { module: 'ai-sdk', provider: 'google', apiKey: legacyGeminiApiKey };
	}

	return { module: 'proxy' };
}

// ==================== AUTH ROUTES ====================

app.get('/auth/start', async (c) => {
	const { verifier, challenge } = await generatePKCE();
	const state = crypto.randomUUID();
	const redirectUri = c.env.ANTIGRAVITY_REDIRECT_URI;

	await c.env.AUTH_SESSIONS.put(state, JSON.stringify({ verifier, redirectUri }), {
		expirationTtl: 600 // 10 minutes
	});

	const params = new URLSearchParams({
		client_id: c.env.ANTIGRAVITY_OAUTH_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: SCOPES,
		access_type: 'offline',
		prompt: 'consent',
		include_granted_scopes: 'true',
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256'
	});

	const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

	return c.json({ authUrl, state });
});

app.post('/auth/exchange', async (c) => {
	const { code, state } = (await c.req.json()) as { code: string; state: string };

	if (!code || !state) {
		return c.json({ error: 'Missing code or state' }, 400);
	}

	// Retrieve and immediately invalidate the PKCE verifier
	const stored = await c.env.AUTH_SESSIONS.get(state);
	if (!stored) {
		return c.json(
			{ error: 'Session expired or invalid. Please start sign-in again.' },
			400
		);
	}
	const { verifier, redirectUri } = JSON.parse(stored) as { verifier: string; redirectUri: string };
	await c.env.AUTH_SESSIONS.delete(state);

	// Exchange the code for tokens
	const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: c.env.ANTIGRAVITY_OAUTH_CLIENT_ID,
			client_secret: c.env.ANTIGRAVITY_OAUTH_CLIENT_SECRET,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
			code_verifier: verifier
		})
	});

	if (!tokenRes.ok) {
		const detail = await tokenRes.text();
		console.error('Token exchange failed:', detail);
		return c.json(
			{ error: 'Token exchange failed. The code may have already been used or expired.' },
			400
		);
	}

	const tokens: any = await tokenRes.json();
	if (!tokens.refresh_token) {
		return c.json(
			{ error: 'Google did not return an offline refresh token. Please sign in again.', code: 'REAUTH_REQUIRED' },
			400
		);
	}

	// Fetch user info
	const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
		headers: { Authorization: `Bearer ${tokens.access_token}` }
	});
	const userInfo: any = await userInfoRes.json();

	// Persist session in KV
	const sessionId = crypto.randomUUID();
	const sessionData: SessionData = {
		schemaVersion: ANTIGRAVITY_PROTOCOL_VERSION,
		authProvider: 'antigravity',
		accountType: 'unknown',
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		expiresAt: Date.now() + tokens.expires_in * 1000,
		email: userInfo.email,
		name: userInfo.name,
		picture: userInfo.picture,
		project: null,
		tier: null
	};

	await saveSession(sessionId, sessionData, c.env.SESSIONS);

	c.header('Set-Cookie', setSessionCookie(sessionId));
	return c.json({ ok: true, sessionId });
});

app.get('/auth/me', async (c) => {
	const sessionId = getSessionId(c.req.raw);
	if (!sessionId) return c.json({ error: 'Not authenticated' }, 401);

	const session = await loadSession(sessionId, c.env.SESSIONS);
	if (!isCurrentSession(session)) {
		c.header('Set-Cookie', clearSessionCookie());
		return c.json(
			{ error: 'Your session must be refreshed. Please sign in again.', code: 'REAUTH_REQUIRED' },
			401
		);
	}

	return c.json({
		email: session.email,
		name: session.name,
		picture: session.picture,
		project: session.project,
		tier: session.tier,
		authProvider: session.authProvider,
		accountType: session.accountType
	});
});

app.post('/auth/logout', async (c) => {
	const sessionId = getSessionId(c.req.raw);
	if (sessionId) {
		await deleteSession(sessionId, c.env.SESSIONS);
	}
	c.header('Set-Cookie', clearSessionCookie());
	return c.json({ ok: true });
});

// ==================== API ROUTES ====================

app.post('/api/setup', authMiddleware, async (c) => {
	let session = c.get('session');
	const sessionId = c.get('sessionId');
	const startedAt = Date.now();

	try {
		const version = resolveClientVersion(c.env.ANTIGRAVITY_CLIENT_VERSION);
		let result;
		try {
			result = await setupAntigravity(session, version);
		} catch (error) {
			if (!(error instanceof AntigravityError) || error.code !== 'REAUTH_REQUIRED') throw error;
			const refreshed = await getValidAccessToken(sessionId, c.env, true);
			if (!refreshed) throw error;
			session = refreshed.session;
			result = await setupAntigravity(session, version);
		}
		await saveSession(sessionId, session, c.env.SESSIONS);
		console.log(JSON.stringify({ event: 'antigravity_setup', outcome: 'ready', accountType: session.accountType, latencyMs: Date.now() - startedAt }));
		return c.json(result);
	} catch (error) {
		if (session.accountType === 'enterprise' || session.accountType === 'paygo') {
			await saveSession(sessionId, session, c.env.SESSIONS);
		}
		console.warn(JSON.stringify({ event: 'antigravity_setup', outcome: 'error', code: error instanceof AntigravityError ? error.code : 'UNKNOWN', accountType: session.accountType, latencyMs: Date.now() - startedAt }));
		return antigravityErrorResponse(c, error);
	}
});

app.post('/api/generate', authMiddleware, async (c) => {
	const session = c.get('session');
	const route = resolveModelRoute(c);

	const rawBody = await c.req.json();
	const hasMemories = !!buildMemoryBlock((rawBody as any).memories);
	const body = withMemorySystemInstruction(rawBody as any);
	const { model, tools } = body;
	const resolvedModel = model || 'gemini-3-flash-preview';
	const startedAt = Date.now();
	const routing = route.module === 'ai-sdk' ? 'byok' : 'antigravity';

	try {
		const response = await generateModel(route, body, session, {
			version: resolveClientVersion(c.env.ANTIGRAVITY_CLIENT_VERSION),
			refreshSession: async () => (await getValidAccessToken(c.get('sessionId'), c.env, true))?.session || null
		});
		console.log(JSON.stringify({ event: 'model_request', mode: 'generate', routing, provider: route.provider, model: resolvedModel, tools: !!tools, memories: hasMemories, outcome: 'ok', status: response.status, latencyMs: Date.now() - startedAt }));
		return response;
	} catch (err: any) {
		console.warn(JSON.stringify({ event: 'model_request', mode: 'generate', routing, provider: route.provider, model: resolvedModel, outcome: 'error', code: err instanceof AntigravityError ? err.code : 'UNKNOWN', status: err instanceof AntigravityError ? err.status : 500, latencyMs: Date.now() - startedAt }));
		return antigravityErrorResponse(c, err);
	}
});

app.post('/api/stream', authMiddleware, async (c) => {
	const session = c.get('session');
	const route = resolveModelRoute(c);

	const rawBody = await c.req.json();
	const hasMemories = !!buildMemoryBlock((rawBody as any).memories);
	const body = withMemorySystemInstruction(rawBody as any);
	const { model, tools } = body;
	const resolvedModel = model || 'gemini-3-flash-preview';
	const startedAt = Date.now();
	const routing = route.module === 'ai-sdk' ? 'byok' : 'antigravity';

	try {
		const response = await streamModel(route, body, session, {
			version: resolveClientVersion(c.env.ANTIGRAVITY_CLIENT_VERSION),
			refreshSession: async () => (await getValidAccessToken(c.get('sessionId'), c.env, true))?.session || null
		});
		console.log(JSON.stringify({ event: 'model_request', mode: 'stream', routing, provider: route.provider, model: resolvedModel, tools: !!tools, memories: hasMemories, outcome: 'ok', status: response.status, latencyMs: Date.now() - startedAt }));
		return response;
	} catch (err: any) {
		console.warn(JSON.stringify({ event: 'model_request', mode: 'stream', routing, provider: route.provider, model: resolvedModel, outcome: 'error', code: err instanceof AntigravityError ? err.code : 'UNKNOWN', status: err instanceof AntigravityError ? err.status : 500, latencyMs: Date.now() - startedAt }));
		return antigravityErrorResponse(c, err);
	}
});

app.get('/api/quota', authMiddleware, async (c) => {
	let session = c.get('session');

	try {
		const version = resolveClientVersion(c.env.ANTIGRAVITY_CLIENT_VERSION);
		let buckets;
		try {
			buckets = await fetchAntigravityQuota(session, version);
		} catch (error) {
			if (!(error instanceof AntigravityError) || error.code !== 'REAUTH_REQUIRED') throw error;
			const refreshed = await getValidAccessToken(c.get('sessionId'), c.env, true);
			if (!refreshed) throw error;
			session = refreshed.session;
			buckets = await fetchAntigravityQuota(session, version);
		}
		return c.json({ buckets });
	} catch (error) {
		return antigravityErrorResponse(c, error);
	}
});

export default app;
