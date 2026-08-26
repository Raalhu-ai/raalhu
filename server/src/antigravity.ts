import type { SessionData, AccountType } from './session';
import type { GeminiRequestBody } from './model-providers';

export const ANTIGRAVITY_CONTROL_BASE = 'https://cloudcode-pa.googleapis.com';
export const ANTIGRAVITY_CONSUMER_BASE = 'https://daily-cloudcode-pa.googleapis.com';
export const ANTIGRAVITY_PROTOCOL_VERSION = 2 as const;
export const ANTIGRAVITY_MIN_CLIENT_VERSION = '2.9.1';
export const ANTIGRAVITY_SCOPES = [
	'https://www.googleapis.com/auth/cloud-platform',
	'https://www.googleapis.com/auth/userinfo.email',
	'https://www.googleapis.com/auth/userinfo.profile'
] as const;

const NODE_API_USER_AGENT = 'google-api-nodejs-client/10.3.0';
const GOOG_API_CLIENT = 'gl-node/22.21.1';
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
const PROJECT_DISCOVERY_ATTEMPTS = 5;
const PROJECT_DISCOVERY_DELAY_MS = 2000;

function emitMetric(event: string, fields: Record<string, unknown>): void {
	console.log(JSON.stringify({ event, ...fields }));
}

export type ApiErrorCode =
	| 'REAUTH_REQUIRED'
	| 'UNSUPPORTED_ACCOUNT'
	| 'TOS_REQUIRED'
	| 'ACCOUNT_VERIFICATION_REQUIRED'
	| 'REGION_UNSUPPORTED'
	| 'RATE_LIMITED'
	| 'MODEL_UNAVAILABLE'
	| 'UPSTREAM_UNAVAILABLE'
	| 'INVALID_REQUEST'
	| 'SETUP_FAILED';

export type ApiErrorBody = {
	error: string;
	code: ApiErrorCode;
	details?: string;
	actionUrl?: string;
	retryAfterMs?: number;
};

export class AntigravityError extends Error {
	status: number;
	code: ApiErrorCode;
	details?: string;
	actionUrl?: string;
	retryAfterMs?: number;
	accountType?: AccountType;

	constructor(
		status: number,
		code: ApiErrorCode,
		message: string,
		opts: {
			details?: string;
			actionUrl?: string;
			retryAfterMs?: number;
			accountType?: AccountType;
		} = {}
	) {
		super(message);
		this.name = 'AntigravityError';
		this.status = status;
		this.code = code;
		Object.assign(this, opts);
	}
}

export function apiErrorBody(error: AntigravityError): ApiErrorBody {
	return {
		error: error.message,
		code: error.code,
		...(error.details ? { details: error.details } : {}),
		...(error.actionUrl ? { actionUrl: error.actionUrl } : {}),
		...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {})
	};
}

function versionParts(version: string): [number, number, number] | null {
	const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
	return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function compareVersions(a: [number, number, number], b: [number, number, number]): number {
	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return 0;
}

export function resolveClientVersion(configured: string | undefined): string {
	const minimum = versionParts(ANTIGRAVITY_MIN_CLIENT_VERSION)!;
	const candidate = configured ? versionParts(configured) : null;
	if (!candidate || compareVersions(candidate, minimum) < 0) {
		return ANTIGRAVITY_MIN_CLIENT_VERSION;
	}
	return configured!.trim();
}

export function requestUserAgent(version: string): string {
	return `antigravity/hub/${resolveClientVersion(version)} darwin/arm64`;
}

export function onboardUserAgent(version: string): string {
	return `${requestUserAgent(version)} ${NODE_API_USER_AGENT}`;
}

export function extractProject(value: unknown): string | null {
	if (!value) return null;
	if (typeof value === 'string') return value;
	if (typeof value !== 'object') return null;
	const source = value as Record<string, unknown>;
	return typeof source.id === 'string'
		? source.id
		: typeof source.name === 'string'
			? source.name
			: null;
}

export function extractProjectFromPayload(value: unknown): string | null {
	if (!isRecord(value)) return extractProject(value);
	for (const key of [
		'cloudaicompanionProject',
		'cloudaicompanion_project',
		'projectId',
		'project_id',
		'project'
	]) {
		const project = extractProject(value[key]);
		if (project) return project;
	}
	return isRecord(value.response) ? extractProjectFromPayload(value.response) : null;
}

function safeShape(value: unknown): string {
	if (!isRecord(value)) return typeof value;
	return Object.keys(value).sort().slice(0, 20).join(',') || '(empty object)';
}

function entitlementText(value: unknown): string {
	try {
		return JSON.stringify(value).toLowerCase();
	} catch {
		return '';
	}
}

export function classifyAccountType(loadData: unknown): AccountType {
	const source = isRecord(loadData) ? loadData : {};
	// Do not inspect allowedTiers: consumer responses may advertise tiers that are not
	// the account's active entitlement. Only explicit current-account markers count.
	const text = entitlementText({
		currentTier: source.currentTier || source.current_tier,
		entitlement: source.entitlement || source.entitlements,
		userTier: source.userTier || source.user_tier,
		accountType: source.accountType || source.account_type,
		billing: source.billing || source.billingType || source.billing_type
	});
	if (/pay[\s_-]?go|pay[\s_-]?as[\s_-]?you[\s_-]?go/.test(text)) return 'paygo';
	if (/enterprise/.test(text)) return 'enterprise';
	return 'consumer';
}

function detailsFromBody(body: string): string | undefined {
	if (!body) return undefined;
	try {
		const parsed = JSON.parse(body) as any;
		const message = parsed?.error?.message || parsed?.message || parsed?.error;
		if (typeof message === 'string') return message.slice(0, 500);
	} catch {
		// Fall through to a short plain-text summary.
	}
	return body.replace(/\s+/g, ' ').trim().slice(0, 500) || undefined;
}

function actionUrlFromBody(body: string): string | undefined {
	const urls = body.match(/https:\/\/[^\s"'<>]+/g) || [];
	return urls.find((url) => /accounts\.google\.com|console\.cloud\.google\.com/.test(url));
}

function retryAfterFromBody(body: string): number | undefined {
	try {
		const parsed = JSON.parse(body) as any;
		const retryDelay =
			parsed?.error?.details?.find?.((item: any) => item?.retryDelay)?.retryDelay ||
			parsed?.error?.retryDelay;
		if (typeof retryDelay === 'string') {
			const seconds = Number(retryDelay.replace(/s$/, ''));
			if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
		}
	} catch {
		// Ignore malformed error JSON.
	}
	return undefined;
}

export function classifyUpstreamError(
	status: number,
	body: string,
	headers?: Headers
): AntigravityError {
	const details = detailsFromBody(body);
	const lower = `${details || ''} ${body}`.toLowerCase();
	const actionUrl = actionUrlFromBody(body);
	if (status === 401) {
		return new AntigravityError(401, 'REAUTH_REQUIRED', 'Your Google session has expired. Please sign in again.', { details });
	}
	if (status === 428 || lower.includes('terms_of_service') || lower.includes('terms of service')) {
		return new AntigravityError(428, 'TOS_REQUIRED', 'Terms of Service acceptance is required.', {
			details,
			actionUrl: actionUrl || 'https://console.cloud.google.com/terms'
		});
	}
	if (status === 403 && (lower.includes('validation_required') || lower.includes('verify your account') || actionUrl)) {
		return new AntigravityError(403, 'ACCOUNT_VERIFICATION_REQUIRED', 'Google requires account verification before continuing.', {
			details,
			actionUrl
		});
	}
	if (lower.includes('user location is not supported')) {
		return new AntigravityError(400, 'REGION_UNSUPPORTED', 'Antigravity is not available from the current region.', { details });
	}
	if (status === 429) {
		const headerSeconds = Number(headers?.get('Retry-After'));
		const retryAfterMs = Number.isFinite(headerSeconds)
			? Math.max(0, headerSeconds * 1000)
			: retryAfterFromBody(body);
		return new AntigravityError(429, 'RATE_LIMITED', 'Antigravity quota is temporarily exhausted.', {
			details,
			retryAfterMs
		});
	}
	if (status === 404) {
		return new AntigravityError(404, 'MODEL_UNAVAILABLE', 'The selected model is not available for this account.', { details });
	}
	return new AntigravityError(
		status >= 400 && status < 600 ? status : 502,
		'UPSTREAM_UNAVAILABLE',
		'Antigravity is temporarily unavailable.',
		{ details }
	);
}

function unsupportedAccountError(accountType: AccountType): AntigravityError {
	return new AntigravityError(
		403,
		'UNSUPPORTED_ACCOUNT',
		'Enterprise and PayGo accounts are not supported yet. Use Google BYOK or contact the developers.',
		{ accountType }
	);
}

function setupHeaders(version: string, onboard = false): Record<string, string> {
	return {
		'Content-Type': 'application/json',
		'User-Agent': onboard ? onboardUserAgent(version) : requestUserAgent(version),
		...(onboard ? { 'X-Goog-Api-Client': GOOG_API_CLIENT } : {})
	};
}

async function readError(response: Response): Promise<never> {
	throw classifyUpstreamError(response.status, await response.text(), response.headers);
}

export type AntigravitySetupResult = {
	project: string;
	tier: string;
	status: 'ready';
	provider: 'antigravity';
	accountType: 'consumer';
};

export async function setupAntigravity(
	session: SessionData,
	version: string,
	fetcher: typeof fetch = fetch,
	sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<AntigravitySetupResult> {
	const authHeaders = { Authorization: `Bearer ${session.accessToken}` };
	const loadCodeAssist = async (): Promise<any> => {
		const response = await fetcher(`${ANTIGRAVITY_CONTROL_BASE}/v1internal:loadCodeAssist`, {
			method: 'POST',
			headers: { ...setupHeaders(version), ...authHeaders },
			body: JSON.stringify({ metadata: { ideType: 'ANTIGRAVITY' } })
		});
		if (!response.ok) await readError(response);
		return response.json();
	};

	const loadData = await loadCodeAssist();
	const accountType = classifyAccountType(loadData);
	session.accountType = accountType;
	if (accountType !== 'consumer') throw unsupportedAccountError(accountType);

	const existingProject = extractProjectFromPayload(loadData);
	if (existingProject) {
		const tier = loadData.currentTier?.id || loadData.current_tier?.id || 'free';
		session.project = existingProject;
		session.tier = tier;
		return { project: existingProject, tier, status: 'ready', provider: 'antigravity', accountType: 'consumer' };
	}

	const allowedTiers = loadData.allowedTiers || loadData.allowed_tiers || [];
	const tier = allowedTiers.find((item: any) => item.isDefault || item.is_default) || allowedTiers[0];
	if (!tier?.id) {
		throw new AntigravityError(400, 'SETUP_FAILED', 'No consumer tier is available for this account.');
	}

	const resolvedVersion = resolveClientVersion(version);
	const onboardRes = await fetcher(`${ANTIGRAVITY_CONSUMER_BASE}/v1internal:onboardUser`, {
		method: 'POST',
		headers: { ...setupHeaders(resolvedVersion, true), ...authHeaders },
		body: JSON.stringify({
			tier_id: tier.id,
			metadata: {
				ide_type: 'ANTIGRAVITY',
				ide_name: 'ANTIGRAVITY',
				ide_version: resolvedVersion
			}
		})
	});
	if (!onboardRes.ok) await readError(onboardRes);

	let onboardData = (await onboardRes.json()) as any;
	if (onboardData.name && !onboardData.done) {
		for (let attempt = 0; attempt < 30 && !onboardData.done; attempt++) {
			await sleep(2000);
			const operationName = String(onboardData.name).replace(/^\//, '');
			const pollRes = await fetcher(`${ANTIGRAVITY_CONSUMER_BASE}/${operationName}`, {
				headers: { ...setupHeaders(resolvedVersion, true), ...authHeaders }
			});
			if (!pollRes.ok) await readError(pollRes);
			onboardData = await pollRes.json();
		}
		if (!onboardData.done) {
			throw new AntigravityError(504, 'SETUP_FAILED', 'Antigravity onboarding timed out.');
		}
	}

	const response = onboardData.response || onboardData;
	let project = extractProjectFromPayload(onboardData);
	let discoveredLoadData: any = null;
	for (let attempt = 0; !project && attempt < PROJECT_DISCOVERY_ATTEMPTS; attempt++) {
		await sleep(PROJECT_DISCOVERY_DELAY_MS);
		discoveredLoadData = await loadCodeAssist();
		const discoveredAccountType = classifyAccountType(discoveredLoadData);
		session.accountType = discoveredAccountType;
		if (discoveredAccountType !== 'consumer') throw unsupportedAccountError(discoveredAccountType);
		project = extractProjectFromPayload(discoveredLoadData);
	}
	if (!project) {
		throw new AntigravityError(502, 'SETUP_FAILED', 'Antigravity onboarding did not return a project.', {
			details: `onboard keys: ${safeShape(onboardData)}; response keys: ${safeShape(response)}; loadCodeAssist keys: ${safeShape(discoveredLoadData)}`
		});
	}
	const tierId =
		response.tierId ||
		response.tier_id ||
		discoveredLoadData?.currentTier?.id ||
		discoveredLoadData?.current_tier?.id ||
		tier.id ||
		'free';
	session.project = project;
	session.tier = tierId;
	return { project, tier: tierId, status: 'ready', provider: 'antigravity', accountType: 'consumer' };
}

export type QuotaModel = {
	modelId: string;
	remainingFraction: number;
	tokenType: string;
	resetTime: string;
};

export function normalizeAvailableModels(data: any): QuotaModel[] {
	const models = data?.models && typeof data.models === 'object' ? data.models : {};
	return Object.entries(models)
		.map(([key, raw]) => {
			const model = raw as any;
			const quota = model.quotaInfo || model.quota_info || {};
			return {
				modelId: model.model || model.modelId || key,
				remainingFraction: Number(quota.remainingFraction ?? quota.remaining_fraction ?? model.remainingFraction ?? 0),
				tokenType: quota.tokenType || quota.token_type || model.tokenType || 'requests',
				resetTime: quota.resetTime || quota.reset_time || model.resetTime || ''
			};
		})
		.filter((model) => model.modelId && !model.modelId.endsWith('_vertex'));
}

export async function fetchAntigravityQuota(
	session: SessionData,
	version: string,
	fetcher: typeof fetch = fetch
): Promise<QuotaModel[]> {
	if (!session.project) {
		throw new AntigravityError(400, 'SETUP_FAILED', 'No Antigravity project has been set up.');
	}
	if (session.accountType === 'enterprise' || session.accountType === 'paygo') {
		throw unsupportedAccountError(session.accountType);
	}
	const response = await fetcher(`${ANTIGRAVITY_CONSUMER_BASE}/v1internal:fetchAvailableModels`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${session.accessToken}`,
			...setupHeaders(version)
		},
		body: JSON.stringify({ project: session.project })
	});
	if (!response.ok) await readError(response);
	return normalizeAvailableModels(await response.json());
}

function isRecord(value: unknown): value is Record<string, any> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function schemaType(value: unknown): { type?: string; nullable?: boolean } {
	if (typeof value === 'string') {
		if (value.toLowerCase() === 'null') return { nullable: true };
		return { type: value };
	}
	if (Array.isArray(value)) {
		const nonNull = value.find((item) => typeof item === 'string' && item.toLowerCase() !== 'null');
		return { ...(typeof nonNull === 'string' ? { type: nonNull } : {}), nullable: value.some((item) => typeof item === 'string' && item.toLowerCase() === 'null') };
	}
	return {};
}

function mergeAllOf(items: unknown[], defs: Record<string, any>, seen: Set<string>): Record<string, any> {
	const merged: Record<string, any> = { type: 'OBJECT', properties: {}, required: [] };
	for (const item of items) {
		const clean = cleanSchema(item, defs, seen);
		if (isRecord(clean?.properties)) Object.assign(merged.properties, clean.properties);
		if (Array.isArray(clean?.required)) merged.required.push(...clean.required);
	}
	merged.required = [...new Set(merged.required)];
	if (!merged.required.length) delete merged.required;
	return merged;
}

function cleanSchema(value: unknown, defs: Record<string, any>, seen = new Set<string>()): any {
	if (!isRecord(value)) return value;
	if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
		const name = value.$ref.split('/').pop()!;
		if (!seen.has(name) && defs[name]) {
			const nextSeen = new Set(seen).add(name);
			return cleanSchema({ ...defs[name], description: value.description || defs[name].description }, defs, nextSeen);
		}
	}
	if (Array.isArray(value.allOf)) return mergeAllOf(value.allOf, defs, seen);
	const union = Array.isArray(value.anyOf) ? value.anyOf : Array.isArray(value.oneOf) ? value.oneOf : null;
	if (union) {
		const nonNull = union.filter((item) => !(isRecord(item) && String(item.type).toLowerCase() === 'null'));
		const selected = cleanSchema(nonNull.find((item) => isRecord(item) && item.type === 'OBJECT') || nonNull[0] || {}, defs, seen);
		return { ...selected, ...(nonNull.length !== union.length ? { nullable: true } : {}), ...(value.description ? { description: value.description } : {}) };
	}

	const type = schemaType(value.type);
	const result: Record<string, any> = { ...type };
	if (typeof value.description === 'string') result.description = value.description;
	if (Array.isArray(value.enum)) {
		const enumValues = value.enum.filter((item) => typeof item === 'string');
		if (enumValues.length) result.enum = enumValues;
	}
	if (value.nullable === true) result.nullable = true;
	if (isRecord(value.properties)) {
		result.properties = Object.fromEntries(Object.entries(value.properties).map(([key, child]) => [key, cleanSchema(child, defs, seen)]));
	}
	if (value.items !== undefined) result.items = cleanSchema(value.items, defs, seen);
	if (Array.isArray(value.required)) result.required = value.required.filter((item) => typeof item === 'string');
	if (value.additionalProperties === false) result.additionalProperties = false;
	return result;
}

export function sanitizeAntigravityTools(tools: unknown): unknown {
	if (!Array.isArray(tools)) return tools;
	return tools.map((tool) => {
		if (!isRecord(tool) || !Array.isArray(tool.functionDeclarations)) return tool;
		return {
			...tool,
			functionDeclarations: tool.functionDeclarations.map((declaration: any) => {
				const source = declaration.parametersJsonSchema || declaration.parameters || { type: 'OBJECT', properties: {} };
				const defs = isRecord(source) ? (source.$defs || source.definitions || {}) : {};
				return { ...declaration, parameters: cleanSchema(source, defs), parametersJsonSchema: undefined };
			})
		};
	});
}

function sanitizeParts(contents: GeminiRequestBody['contents']): GeminiRequestBody['contents'] {
	return contents.map((content) => ({
		...content,
		parts: content.parts.map((part) => {
			if (!isRecord(part)) return part;
			const next = { ...part };
			if (next.thoughtSignature === '' || next.thought_signature === '') {
				delete next.thoughtSignature;
				delete next.thought_signature;
			}
			return next;
		})
	}));
}

export function validateToolTurns(contents: GeminiRequestBody['contents']): void {
	let pending: string[] = [];
	for (const content of contents) {
		const calls = content.parts.filter((part) => isRecord(part) && isRecord(part.functionCall)).map((part: any) => String(part.functionCall.name || ''));
		const responses = content.parts.filter((part) => isRecord(part) && isRecord(part.functionResponse)).map((part: any) => String(part.functionResponse.name || ''));
		if (calls.length) {
			if (pending.length || responses.length || content.role !== 'model') {
				throw new AntigravityError(400, 'INVALID_REQUEST', 'Malformed function-call history.');
			}
			pending = calls;
		}
		if (responses.length) {
			if (content.role !== 'user' || responses.length !== pending.length || responses.some((name, index) => name !== pending[index])) {
				throw new AntigravityError(400, 'INVALID_REQUEST', 'Function responses must immediately match the preceding function calls.');
			}
			pending = [];
		} else if (pending.length && !calls.length) {
			throw new AntigravityError(400, 'INVALID_REQUEST', 'A function-call turn is missing its matching responses.');
		}
	}
	if (pending.length) {
		throw new AntigravityError(400, 'INVALID_REQUEST', 'A function-call turn is missing its matching responses.');
	}
}

function firstUserText(contents: GeminiRequestBody['contents']): string {
	for (const content of contents) {
		if (content.role !== 'user') continue;
		for (const part of content.parts) {
			if (typeof part.text === 'string' && part.text) return part.text;
		}
	}
	return JSON.stringify(contents[0] || {});
}

export function stableSessionId(seed: string): string {
	let hash = 1469598103934665603n;
	for (const byte of new TextEncoder().encode(seed)) {
		hash ^= BigInt(byte);
		hash = BigInt.asUintN(64, hash * 1099511628211n);
	}
	return `-${(hash & 0x7fffffffffffffffn).toString()}`;
}

export function buildAntigravityEnvelope(session: SessionData, body: GeminiRequestBody): Record<string, any> {
	if (!session.project) throw new AntigravityError(400, 'SETUP_FAILED', 'No Antigravity project has been set up.');
	if (session.accountType === 'enterprise' || session.accountType === 'paygo') {
		throw unsupportedAccountError(session.accountType);
	}
	const contents = sanitizeParts(body.contents);
	validateToolTurns(contents);
	const model = body.model || 'gemini-3-flash-preview';
	const isImage = model.toLowerCase().includes('image');
	const sessionId = stableSessionId(body.conversationId?.trim() || firstUserText(contents));
	return {
		project: session.project,
		model,
		userAgent: 'antigravity',
		requestType: isImage ? 'image_gen' : 'agent',
		requestId: isImage ? `image_gen/${Date.now()}/${crypto.randomUUID()}/12` : `agent-${crypto.randomUUID()}`,
		request: {
			contents,
			...(body.generationConfig ? { generationConfig: body.generationConfig } : {}),
			...(body.tools ? { tools: sanitizeAntigravityTools(body.tools) } : {}),
			...(body.systemInstruction ? { systemInstruction: body.systemInstruction } : {}),
			...(body.toolConfig ? { toolConfig: body.toolConfig } : {}),
			sessionId
		}
	};
}

export type RefreshSession = () => Promise<SessionData | null>;

async function performRequest(
	session: SessionData,
	body: GeminiRequestBody,
	version: string,
	stream: boolean,
	fetcher: typeof fetch
): Promise<Response> {
	const envelope = buildAntigravityEnvelope(session, body);
	return fetcher(
		`${ANTIGRAVITY_CONSUMER_BASE}/v1internal:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${session.accessToken}`,
				'Content-Type': 'application/json',
				'User-Agent': requestUserAgent(version),
				...(stream ? { Accept: 'text/event-stream' } : {})
			},
			body: JSON.stringify(envelope)
		}
	);
}

export async function proxyAntigravity(
	session: SessionData,
	body: GeminiRequestBody,
	version: string,
	stream: boolean,
	refreshSession: RefreshSession,
	fetcher: typeof fetch = fetch
): Promise<Response> {
	let activeSession = session;
	let refreshed = false;
	let transientRetried = false;
	let attempt = 0;
	while (true) {
		let upstream: Response;
		const startedAt = Date.now();
		attempt++;
		try {
			upstream = await performRequest(activeSession, body, version, stream, fetcher);
		} catch (error) {
			emitMetric('antigravity_upstream', {
				operation: stream ? 'streamGenerateContent' : 'generateContent',
				outcome: 'network_error',
				attempt,
				latencyMs: Date.now() - startedAt
			});
			if (!transientRetried) {
				transientRetried = true;
				continue;
			}
			throw new AntigravityError(502, 'UPSTREAM_UNAVAILABLE', 'Could not reach Antigravity.', {
				details: error instanceof Error ? error.message.slice(0, 500) : undefined
			});
		}

		emitMetric('antigravity_upstream', {
			operation: stream ? 'streamGenerateContent' : 'generateContent',
			outcome: upstream.ok ? 'ok' : 'error',
			status: upstream.status,
			attempt,
			latencyMs: Date.now() - startedAt
		});

		if (upstream.status === 401 && !refreshed) {
			refreshed = true;
			const nextSession = await refreshSession();
			emitMetric('antigravity_refresh', { outcome: nextSession ? 'success' : 'failed' });
			if (nextSession) {
				activeSession = nextSession;
				continue;
			}
		}
		if (TRANSIENT_STATUSES.has(upstream.status) && !transientRetried) {
			transientRetried = true;
			await upstream.body?.cancel();
			continue;
		}
		if (!upstream.ok) {
			throw classifyUpstreamError(upstream.status, await upstream.text(), upstream.headers);
		}

		if (stream) {
			return new Response(upstream.body, {
				status: upstream.status,
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'X-Accel-Buffering': 'no'
				}
			});
		}
		return new Response(await upstream.text(), {
			status: upstream.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
