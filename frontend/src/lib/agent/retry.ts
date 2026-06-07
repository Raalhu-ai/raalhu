/**
 * Retry utilities adapted from google-gemini/gemini-cli.
 * Handles Google API 429 errors with proper classification and exponential backoff.
 *
 * See: https://github.com/google-gemini/gemini-cli/tree/main/packages/core/src/utils
 */

// ── Google API error types (from google/rpc/error_details.proto) ──

interface ErrorInfo {
	'@type': 'type.googleapis.com/google.rpc.ErrorInfo';
	reason: string;
	domain: string;
	metadata: Record<string, string>;
}

interface RetryInfo {
	'@type': 'type.googleapis.com/google.rpc.RetryInfo';
	retryDelay: string; // e.g. "34.074824224s", "900ms"
}

interface QuotaFailure {
	'@type': 'type.googleapis.com/google.rpc.QuotaFailure';
	violations: Array<{
		subject?: string;
		description?: string;
		quotaId?: string;
		quotaMetric?: string;
	}>;
}

type GoogleApiErrorDetail = ErrorInfo | RetryInfo | QuotaFailure | { '@type': string; [key: string]: unknown };

interface GoogleApiError {
	code: number;
	message: string;
	details: GoogleApiErrorDetail[];
}

// ── Error classification ──

export class TerminalQuotaError extends Error {
	retryDelayMs?: number;
	constructor(message: string, retryDelaySeconds?: number) {
		super(message);
		this.name = 'TerminalQuotaError';
		this.retryDelayMs = retryDelaySeconds ? retryDelaySeconds * 1000 : undefined;
	}
}

export class RetryableQuotaError extends Error {
	retryDelayMs?: number;
	constructor(message: string, retryDelaySeconds?: number) {
		super(message);
		this.name = 'RetryableQuotaError';
		this.retryDelayMs = retryDelaySeconds ? retryDelaySeconds * 1000 : undefined;
	}
}

/**
 * Parse a duration string like "34.074824224s" or "900ms" into seconds.
 */
function parseDurationInSeconds(duration: string): number | null {
	if (duration.endsWith('ms')) {
		const milliseconds = parseFloat(duration.slice(0, -2));
		return isNaN(milliseconds) ? null : milliseconds / 1000;
	}
	if (duration.endsWith('s')) {
		const seconds = parseFloat(duration.slice(0, -1));
		return isNaN(seconds) ? null : seconds;
	}
	return null;
}

/**
 * Parse a raw error body (string) into a structured GoogleApiError.
 * Handles nested JSON in message fields (Google sometimes wraps errors multiple levels deep).
 */
function parseGoogleApiError(body: string): GoogleApiError | null {
	let parsed: any;
	try {
		parsed = JSON.parse(body);
	} catch {
		return null;
	}

	// Unwrap { error: { ... } } envelope
	let errorObj = parsed?.error ?? parsed;

	// Handle case where error is an array
	if (Array.isArray(errorObj) && errorObj.length > 0) {
		errorObj = errorObj[0];
	}

	// Drill through nested stringified message fields (up to 10 levels, matching gemini-cli)
	let depth = 0;
	while (errorObj && typeof errorObj.message === 'string' && depth < 10) {
		try {
			const inner = JSON.parse(errorObj.message.replace(/\u00A0/g, '').replace(/\n/g, ' '));
			if (inner.error) {
				errorObj = inner.error;
				depth++;
			} else {
				break;
			}
		} catch {
			break;
		}
	}

	if (!errorObj || typeof errorObj.code !== 'number' || typeof errorObj.message !== 'string') {
		return null;
	}

	const details: GoogleApiErrorDetail[] = [];
	if (Array.isArray(errorObj.details)) {
		for (const detail of errorObj.details) {
			if (detail && typeof detail === 'object' && typeof detail['@type'] === 'string') {
				details.push(detail as GoogleApiErrorDetail);
			}
		}
	}

	return { code: errorObj.code, message: errorObj.message, details };
}

const CLOUDCODE_DOMAINS = [
	'cloudcode-pa.googleapis.com',
	'staging-cloudcode-pa.googleapis.com',
	'autopush-cloudcode-pa.googleapis.com'
];

/**
 * Classify a 429 error as terminal or retryable.
 * Logic matches google-gemini/gemini-cli classifyGoogleError().
 */
export function classifyError(status: number, body: string): TerminalQuotaError | RetryableQuotaError | null {
	const googleApiError = parseGoogleApiError(body);

	// 503 is always retryable
	if (status === 503) {
		const msg = googleApiError?.message || body.slice(0, 200);
		return new RetryableQuotaError(msg);
	}

	if (status !== 429) return null;

	// No structured details — try regex fallback, then bare 429
	if (!googleApiError || googleApiError.details.length === 0) {
		const errorMessage = googleApiError?.message || body.slice(0, 200);

		// "Please retry in 34.074824224s" / "Please retry in 900ms"
		const match = errorMessage.match(/Please retry in ([0-9.]+(?:ms|s))/);
		if (match?.[1]) {
			const retryDelaySeconds = parseDurationInSeconds(match[1]);
			if (retryDelaySeconds !== null) {
				return new RetryableQuotaError(errorMessage, retryDelaySeconds);
			}
		}

		// Bare 429 with no parsable delay — retryable with default timing
		return new RetryableQuotaError(errorMessage);
	}

	const quotaFailure = googleApiError.details.find(
		(d): d is QuotaFailure => d['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure'
	);
	const errorInfo = googleApiError.details.find(
		(d): d is ErrorInfo => d['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo'
	);
	const retryInfo = googleApiError.details.find(
		(d): d is RetryInfo => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
	);

	// 1. Check for daily/long-term limits in QuotaFailure → terminal
	if (quotaFailure) {
		for (const violation of quotaFailure.violations) {
			const quotaId = violation.quotaId ?? '';
			if (quotaId.includes('PerDay') || quotaId.includes('Daily')) {
				return new TerminalQuotaError('You have exhausted your daily quota on this model.');
			}
		}
	}

	// Parse retryDelay from RetryInfo if present
	let delaySeconds: number | undefined;
	if (retryInfo?.retryDelay) {
		const parsed = parseDurationInSeconds(retryInfo.retryDelay);
		if (parsed) delaySeconds = parsed;
	}

	// 2. Cloud Code API domain-specific classification
	if (errorInfo?.domain && CLOUDCODE_DOMAINS.includes(errorInfo.domain)) {
		if (errorInfo.reason === 'RATE_LIMIT_EXCEEDED') {
			return new RetryableQuotaError(googleApiError.message, delaySeconds ?? 10);
		}
		if (errorInfo.reason === 'QUOTA_EXHAUSTED') {
			return new TerminalQuotaError(googleApiError.message, delaySeconds);
		}
	}

	// 3. RetryInfo with parsed delay → retryable
	if (retryInfo?.retryDelay && delaySeconds) {
		return new RetryableQuotaError(
			`${googleApiError.message}\nSuggested retry after ${retryInfo.retryDelay}.`,
			delaySeconds
		);
	}

	// 4. Per-minute limits in QuotaFailure → retryable with 60s
	if (quotaFailure) {
		for (const violation of quotaFailure.violations) {
			const quotaId = violation.quotaId ?? '';
			if (quotaId.includes('PerMinute')) {
				return new RetryableQuotaError(
					`${googleApiError.message}\nSuggested retry after 60s.`,
					60
				);
			}
		}
	}

	// 5. Per-minute in ErrorInfo metadata → retryable with 60s
	if (errorInfo?.metadata) {
		const quotaLimit = errorInfo.metadata['quota_limit'] ?? '';
		if (quotaLimit.includes('PerMinute')) {
			return new RetryableQuotaError(`${errorInfo.reason}\nSuggested retry after 60s.`, 60);
		}
	}

	// 6. Bare 429 with structured details but no specific match → retryable
	return new RetryableQuotaError(googleApiError.message);
}

// ── Retry with backoff ──

const MAX_ATTEMPTS = 10;
const INITIAL_DELAY_MS = 5000;
const MAX_DELAY_MS = 30000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasGeminiApiKeyHeader(headers: RequestInit['headers']): boolean {
	if (!headers) return false;
	if (headers instanceof Headers) return !!headers.get('X-Gemini-API-Key');
	if (Array.isArray(headers)) {
		return headers.some(([key, value]) => key.toLowerCase() === 'x-gemini-api-key' && !!value);
	}
	return Object.entries(headers).some(
		([key, value]) => key.toLowerCase() === 'x-gemini-api-key' && !!value
	);
}

export interface RetryResult {
	response: Response;
	wasRetried: boolean;
}

/**
 * Fetch with retry and exponential backoff, matching Gemini CLI's retryWithBackoff().
 *
 * - Up to 10 attempts
 * - Exponential backoff: 5s → 10s → 20s → 30s (capped)
 * - RetryableQuotaError: uses API-suggested delay as minimum, +20% positive jitter
 * - TerminalQuotaError (daily quota): throws immediately, no retry
 * - 5xx: retries with standard backoff (±30% jitter)
 * - Other errors: throws immediately
 */
export async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
	let currentDelay = INITIAL_DELAY_MS;
	const skipRetry = hasGeminiApiKeyHeader(init.headers);

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		const res = await fetch(url, init);

		if (res.ok) return res;

		const errText = await res.text();

		if (skipRetry) {
			return new Response(errText, {
				status: res.status,
				statusText: res.statusText,
				headers: res.headers
			});
		}

		// Classify the error
		if (res.status === 429 || res.status === 503) {
			const classified = classifyError(res.status, errText);

			if (classified instanceof TerminalQuotaError) {
				console.error(`[Retry] Terminal quota error: ${classified.message}`);
				throw classified;
			}

			if (classified instanceof RetryableQuotaError) {
				if (attempt >= MAX_ATTEMPTS) {
					console.error(`[Retry] Max attempts (${MAX_ATTEMPTS}) reached, giving up`);
					throw classified;
				}

				// Use API-suggested delay as minimum if available
				if (classified.retryDelayMs !== undefined) {
					currentDelay = Math.max(currentDelay, classified.retryDelayMs);
				}

				// Positive jitter up to +20% while respecting server minimum delay
				const jitter = currentDelay * 0.2 * Math.random();
				const delayWithJitter = currentDelay + jitter;

				console.warn(`[Retry] Attempt ${attempt}/${MAX_ATTEMPTS} got ${res.status}. Retrying in ${Math.round(delayWithJitter)}ms...`);
				await sleep(delayWithJitter);
				currentDelay = Math.min(MAX_DELAY_MS, currentDelay * 2);
				continue;
			}
		}

		// 5xx server errors — retry with standard backoff
		if (res.status >= 500 && res.status < 600) {
			if (attempt >= MAX_ATTEMPTS) {
				throw new Error(`Server error ${res.status} after ${MAX_ATTEMPTS} attempts: ${errText.slice(0, 200)}`);
			}

			const jitter = currentDelay * 0.3 * (Math.random() * 2 - 1);
			const delayWithJitter = Math.max(0, currentDelay + jitter);

			console.warn(`[Retry] Attempt ${attempt}/${MAX_ATTEMPTS} got ${res.status}. Retrying in ${Math.round(delayWithJitter)}ms...`);
			await sleep(delayWithJitter);
			currentDelay = Math.min(MAX_DELAY_MS, currentDelay * 2);
			continue;
		}

		// Non-retryable error — return as-is for caller to handle
		// We need to reconstruct a Response since we already consumed the body
		return new Response(errText, {
			status: res.status,
			statusText: res.statusText,
			headers: res.headers
		});
	}

	throw new Error('Retry attempts exhausted');
}
