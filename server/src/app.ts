import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import {
	type SessionData,
	getSessionId,
	loadSession,
	saveSession,
	deleteSession,
	setSessionCookie,
	clearSessionCookie
} from './session';

// --- Types ---

type Env = {
	Bindings: {
		AUTH_SESSIONS: KVNamespace;
		SESSIONS: KVNamespace;
		OAUTH_CLIENT_ID: string;
		OAUTH_CLIENT_SECRET: string;
	};
	Variables: {
		session: SessionData;
		sessionId: string;
	};
};

const CODE_ASSIST_BASE = 'https://cloudcode-pa.googleapis.com/v1internal';
const RESOURCE_MANAGER_BASE = 'https://cloudresourcemanager.googleapis.com/v3';

const REDIRECT_URI = 'https://codeassist.google.com/authcode';

const SCOPES = [
	'https://www.googleapis.com/auth/cloud-platform',
	'https://www.googleapis.com/auth/userinfo.email',
	'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

const app = new Hono<Env>();

// --- CORS (for local dev where frontend is on a different port) ---
app.use(
	'*',
	cors({
		origin: (origin) => origin || 'http://localhost:5173',
		credentials: true,
		allowHeaders: ['Content-Type', 'X-Session'],
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
	env: Env['Bindings']
): Promise<{ token: string; session: SessionData } | null> {
	const session = await loadSession(sessionId, env.SESSIONS);
	if (!session) return null;

	// Refresh if token expires within 60 seconds
	if (Date.now() > session.expiresAt - 60_000) {
		const res = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				refresh_token: session.refreshToken,
				client_id: env.OAUTH_CLIENT_ID,
				client_secret: env.OAUTH_CLIENT_SECRET,
				grant_type: 'refresh_token'
			})
		});

		if (!res.ok) {
			console.error('[refresh] Token refresh failed:', res.status);
			return null;
		}

		const refreshed: any = await res.json();
		session.accessToken = refreshed.access_token;
		session.expiresAt = Date.now() + refreshed.expires_in * 1000;

		await saveSession(sessionId, session, env.SESSIONS);
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
		return c.json({ error: 'Not authenticated' }, 401);
	}

	c.set('session', result.session);
	c.set('sessionId', sessionId);
	await next();
}

/** Label project as mogger (fire-and-forget). */
async function labelProjectAsMogger(projectId: string, accessToken: string) {
	try {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		};

		const getRes = await fetch(`${RESOURCE_MANAGER_BASE}/projects/${projectId}`, { headers });
		if (!getRes.ok) {
			console.warn(`[labelProject] Failed to read project ${projectId}:`, getRes.status);
			return;
		}
		const project: any = await getRes.json();
		const labels = { ...(project.labels || {}), 'created-by': 'mogger' };

		const patchRes = await fetch(
			`${RESOURCE_MANAGER_BASE}/projects/${projectId}?updateMask=labels`,
			{
				method: 'PATCH',
				headers,
				body: JSON.stringify({ labels })
			}
		);
		if (!patchRes.ok) {
			console.warn(`[labelProject] Failed to label project ${projectId}:`, patchRes.status);
		} else {
			console.log(`[labelProject] Labeled project ${projectId} with created-by=mogger`);
		}
	} catch (err: any) {
		console.warn(`[labelProject] Error:`, err.message);
	}
}

function extractProject(val: any): string | null {
	if (!val) return null;
	if (typeof val === 'string') return val;
	return val.id || val.name || null;
}

// ==================== AUTH ROUTES ====================

app.get('/auth/start', async (c) => {
	const { verifier, challenge } = await generatePKCE();
	const state = crypto.randomUUID();

	await c.env.AUTH_SESSIONS.put(state, JSON.stringify({ verifier }), {
		expirationTtl: 600 // 10 minutes
	});

	const params = new URLSearchParams({
		client_id: c.env.OAUTH_CLIENT_ID,
		redirect_uri: REDIRECT_URI,
		response_type: 'code',
		scope: SCOPES,
		access_type: 'offline',
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
	const { verifier } = JSON.parse(stored) as { verifier: string };
	await c.env.AUTH_SESSIONS.delete(state);

	// Exchange the code for tokens
	const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: c.env.OAUTH_CLIENT_ID,
			client_secret: c.env.OAUTH_CLIENT_SECRET,
			redirect_uri: REDIRECT_URI,
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

	// Fetch user info
	const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
		headers: { Authorization: `Bearer ${tokens.access_token}` }
	});
	const userInfo: any = await userInfoRes.json();

	// Persist session in KV
	const sessionId = crypto.randomUUID();
	const sessionData: SessionData = {
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
	if (!session) return c.json({ error: 'Not authenticated' }, 401);

	return c.json({
		email: session.email,
		name: session.name,
		picture: session.picture,
		project: session.project,
		tier: session.tier
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
	const session = c.get('session');
	const sessionId = c.get('sessionId');
	const { accessToken } = session;
	const headers: Record<string, string> = {
		Authorization: `Bearer ${accessToken}`,
		'Content-Type': 'application/json',
		'x-goog-api-client': 'gl-node mogger/1.0.0'
	};

	try {
		// Step 1: loadCodeAssist
		const loadRes = await fetch(`${CODE_ASSIST_BASE}:loadCodeAssist`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				metadata: { ideType: 'GEMINI_CLI' }
			})
		});

		if (!loadRes.ok) {
			const errBody = await loadRes.text();
			if (errBody.includes('TERMS_OF_SERVICE') || errBody.includes('tos')) {
				return c.json(
					{
						error: 'Terms of Service acceptance required',
						details: errBody,
						tosUrl: 'https://console.cloud.google.com/terms'
					},
					428
				);
			}
			return c.json({ error: 'loadCodeAssist failed', details: errBody }, loadRes.status as any);
		}

		const loadData: any = await loadRes.json();
		console.log('[loadCodeAssist] response:', JSON.stringify(loadData, null, 2));

		// Check if user already has a project
		const existingProject = extractProject(loadData.cloudaicompanionProject);
		if (existingProject) {
			session.project = existingProject;
			session.tier = loadData.currentTier?.id || 'free';
			await saveSession(sessionId, session, c.env.SESSIONS);
			return c.json({
				project: existingProject,
				tier: session.tier,
				status: 'ready'
			});
		}

		// Step 2: Pick tier
		const allowedTiers = loadData.allowedTiers || [];
		const tier = allowedTiers.find((t: any) => t.isDefault) || allowedTiers[0] || null;
		if (!tier) {
			return c.json({ error: 'No allowed tiers returned', details: loadData }, 400);
		}

		// Step 3: onboardUser
		const onboardRes = await fetch(`${CODE_ASSIST_BASE}:onboardUser`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				tierId: tier.id,
				metadata: { ideType: 'GEMINI_CLI' }
			})
		});

		if (!onboardRes.ok) {
			const errBody = await onboardRes.text();
			return c.json({ error: 'onboardUser failed', details: errBody }, onboardRes.status as any);
		}

		const onboardData: any = await onboardRes.json();
		console.log('[onboardUser] response:', JSON.stringify(onboardData, null, 2));

		// Poll for operation completion
		if (onboardData.name && !onboardData.done) {
			let opResult = onboardData;
			for (let i = 0; i < 30; i++) {
				await new Promise((r) => setTimeout(r, 2000));
				const pollRes = await fetch(
					`https://cloudcode-pa.googleapis.com/${opResult.name}`,
					{ headers }
				);
				if (!pollRes.ok) continue;
				opResult = await pollRes.json();
				console.log(`[onboardUser] poll #${i + 1}:`, JSON.stringify(opResult, null, 2));
				if (opResult.done) break;
			}

			if (opResult.done && opResult.response) {
				const project = extractProject(opResult.response.cloudaicompanionProject);
				session.project = project;
				session.tier = opResult.response.tierId || 'free';
				await saveSession(sessionId, session, c.env.SESSIONS);
				labelProjectAsMogger(project!, accessToken);
				return c.json({ project, tier: session.tier, status: 'ready' });
			} else {
				return c.json({ error: 'Onboarding timed out', details: opResult }, 504);
			}
		}

		// Operation completed immediately
		const project = extractProject(
			onboardData.response?.cloudaicompanionProject || onboardData.cloudaicompanionProject
		);
		session.project = project;
		session.tier = onboardData.response?.tierId || onboardData.tierId || 'free';
		await saveSession(sessionId, session, c.env.SESSIONS);
		labelProjectAsMogger(project!, accessToken);
		return c.json({ project, tier: session.tier, status: 'ready' });
	} catch (err: any) {
		console.error('Setup error:', err);
		return c.json({ error: 'Setup failed', details: err.message }, 500);
	}
});

app.post('/api/generate', authMiddleware, async (c) => {
	const session = c.get('session');
	const { accessToken, project } = session;
	if (!project) return c.json({ error: 'No project set up' }, 400);

	const body = await c.req.json();
	const { model, contents, generationConfig, tools, systemInstruction, toolConfig, userPromptId } =
		body;
	const resolvedModel = model || 'gemini-3-flash-preview';
	console.log(`[generate] model=${resolvedModel} tools=${tools ? 'yes' : 'no'}`);

	try {
		const apiRes = await fetch(`${CODE_ASSIST_BASE}:generateContent`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				project,
				model: model || 'gemini-3-flash-preview',
				...(userPromptId && { user_prompt_id: userPromptId }),
				request: {
					contents,
					generationConfig: generationConfig || { maxOutputTokens: 8192 },
					...(tools && { tools }),
					...(systemInstruction && { systemInstruction }),
					...(toolConfig && { toolConfig })
				}
			})
		});

		if (!apiRes.ok) {
			const errBody = await apiRes.text();
			// Pass through Google's error body directly (not wrapped in JSON)
			// so the client can parse retry-after patterns from 429 responses
			return new Response(errBody, {
				status: apiRes.status,
				headers: { 'Content-Type': 'text/plain' }
			});
		}

		const data = await apiRes.json();
		return c.json(data);
	} catch (err: any) {
		console.error('Generate error:', err);
		return c.json({ error: 'Generate failed', details: err.message }, 500);
	}
});

app.post('/api/stream', authMiddleware, async (c) => {
	const session = c.get('session');
	const { accessToken, project } = session;
	if (!project) return c.json({ error: 'No project set up' }, 400);

	const body = await c.req.json();
	const { model, contents, generationConfig, tools, systemInstruction, toolConfig, userPromptId } =
		body;
	const resolvedModel = model || 'gemini-3-flash-preview';
	console.log(`[stream] model=${resolvedModel} tools=${tools ? 'yes' : 'no'}`);

	try {
		const apiRes = await fetch(
			`${CODE_ASSIST_BASE}:streamGenerateContent?alt=sse`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					project,
					model: model || 'gemini-3-flash-preview',
					...(userPromptId && { user_prompt_id: userPromptId }),
					request: {
						contents,
						generationConfig: generationConfig || { maxOutputTokens: 8192 },
						...(tools && { tools }),
						...(systemInstruction && { systemInstruction }),
						...(toolConfig && { toolConfig })
					}
				})
			}
		);

		if (!apiRes.ok) {
			const errBody = await apiRes.text();
			// Pass through Google's error body directly (not wrapped in JSON)
			// so the client can parse retry-after patterns from 429 responses
			return new Response(errBody, {
				status: apiRes.status,
				headers: { 'Content-Type': 'text/plain' }
			});
		}

		// Stream SSE passthrough
		return new Response(apiRes.body, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no'
			}
		});
	} catch (err: any) {
		console.error('Stream error:', err);
		return c.json({ error: 'Stream failed', details: err.message }, 500);
	}
});

app.get('/api/quota', authMiddleware, async (c) => {
	const session = c.get('session');
	const { accessToken, project } = session;
	console.log('[Quota] Request received — project:', project);

	try {
		const quotaRes = await fetch(`${CODE_ASSIST_BASE}:retrieveUserQuota`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ project })
		});

		console.log('[Quota] API response status:', quotaRes.status);

		if (!quotaRes.ok) {
			const errBody = await quotaRes.text();
			console.error('[Quota] API error body:', errBody);
			return c.json(
				{ error: 'retrieveUserQuota failed', details: errBody },
				quotaRes.status as any
			);
		}

		const data = await quotaRes.json();
		console.log('[Quota] API response data:', JSON.stringify(data, null, 2));
		return c.json(data);
	} catch (err: any) {
		console.error('Quota error:', err);
		return c.json({ error: 'Quota failed', details: err.message }, 500);
	}
});

export default app;
