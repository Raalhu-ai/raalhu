/**
 * KV-based session management for Cloudflare Workers.
 * Sessions are stored in a SESSIONS KV namespace, referenced by a UUID cookie.
 */

export type AccountType = 'unknown' | 'consumer' | 'enterprise' | 'paygo';

export interface SessionData {
	schemaVersion: 2;
	authProvider: 'antigravity';
	accountType: AccountType;
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	email: string;
	name: string;
	picture: string;
	project: string | null;
	tier: string | null;
}

/** Legacy Gemini CLI sessions deliberately fail this check and must reauthenticate. */
export function isCurrentSession(value: unknown): value is SessionData {
	if (!value || typeof value !== 'object') return false;
	const session = value as Partial<SessionData>;
	return session.schemaVersion === 2 && session.authProvider === 'antigravity';
}

const COOKIE_NAME = 'session';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

/** Read session ID from Cookie header or X-Session header (for desktop/mobile). */
export function getSessionId(request: Request): string | null {
	const headerSession = request.headers.get('X-Session');
	if (headerSession) return headerSession;
	const cookie = request.headers.get('Cookie') ?? '';
	const match = cookie.match(/session=([^;]+)/);
	return match ? match[1] : null;
}

/** Load session data from KV. */
export async function loadSession(
	sessionId: string,
	kv: KVNamespace
): Promise<SessionData | null> {
	const raw = await kv.get(sessionId);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

/** Save session data to KV. */
export async function saveSession(
	sessionId: string,
	data: SessionData,
	kv: KVNamespace
): Promise<void> {
	await kv.put(sessionId, JSON.stringify(data), { expirationTtl: SESSION_TTL });
}

/** Delete session from KV. */
export async function deleteSession(sessionId: string, kv: KVNamespace): Promise<void> {
	await kv.delete(sessionId);
}

/** Build Set-Cookie header to create a session cookie. */
export function setSessionCookie(sessionId: string): string {
	return `${COOKIE_NAME}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/`;
}

/** Build Set-Cookie header to clear the session cookie. */
export function clearSessionCookie(): string {
	return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
