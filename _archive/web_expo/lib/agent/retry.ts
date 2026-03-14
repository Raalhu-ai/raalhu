/**
 * Retry utilities adapted from google-gemini/gemini-cli.
 * Handles Google API 429 errors with proper classification and exponential backoff.
 */
import { getApiBase } from '@raalhu/shared';

interface ErrorInfo {
	'@type': 'type.googleapis.com/google.rpc.ErrorInfo';
	reason: string;
	domain: string;
	metadata: Record<string, string>;
}

interface RetryInfo {
	'@type': 'type.googleapis.com/google.rpc.RetryInfo';
	retryDelay: string;
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

function parseGoogleApiError(body: string): GoogleApiError | null {
	let parsed: any;
	try {
		parsed = JSON.parse(body);
	} catch {
		return null;
	}

	let errorObj = parsed?.error ?? parsed;
	if (Array.isArray(errorObj) && errorObj.length > 0) {
		errorObj = errorObj[0];
	}

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

export function classifyError(status: number, body: string): TerminalQuotaError | RetryableQuotaError | null {
	const googleApiError = parseGoogleApiError(body);

	if (status === 503) {
		const msg = googleApiError?.message || body.slice(0, 200);
		return new RetryableQuotaError(msg);
	}

	if (status !== 429) return null;

	if (!googleApiError || googleApiError.details.length === 0) {
		const errorMessage = googleApiError?.message || body.slice(0, 200);
		const match = errorMessage.match(/Please retry in ([0-9.]+(?:ms|s))/);
		if (match?.[1]) {
			const retryDelaySeconds = parseDurationInSeconds(match[1]);
			if (retryDelaySeconds !== null) {
				return new RetryableQuotaError(errorMessage, retryDelaySeconds);
			}
		}
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

	if (quotaFailure) {
		for (const violation of quotaFailure.violations) {
			const quotaId = violation.quotaId ?? '';
			if (quotaId.includes('PerDay') || quotaId.includes('Daily')) {
				return new TerminalQuotaError('You have exhausted your daily quota on this model.');
			}
		}
	}

	let delaySeconds: number | undefined;
	if (retryInfo?.retryDelay) {
		const parsed = parseDurationInSeconds(retryInfo.retryDelay);
		if (parsed) delaySeconds = parsed;
	}

	if (errorInfo?.domain && CLOUDCODE_DOMAINS.includes(errorInfo.domain)) {
		if (errorInfo.reason === 'RATE_LIMIT_EXCEEDED') {
			return new RetryableQuotaError(googleApiError.message, delaySeconds ?? 10);
		}
		if (errorInfo.reason === 'QUOTA_EXHAUSTED') {
			return new TerminalQuotaError(googleApiError.message, delaySeconds);
		}
	}

	if (retryInfo?.retryDelay && delaySeconds) {
		return new RetryableQuotaError(
			`${googleApiError.message}\nSuggested retry after ${retryInfo.retryDelay}.`,
			delaySeconds
		);
	}

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

	if (errorInfo?.metadata) {
		const quotaLimit = errorInfo.metadata['quota_limit'] ?? '';
		if (quotaLimit.includes('PerMinute')) {
			return new RetryableQuotaError(`${errorInfo.reason}\nSuggested retry after 60s.`, 60);
		}
	}

	return new RetryableQuotaError(googleApiError.message);
}

const MAX_ATTEMPTS = 10;
const INITIAL_DELAY_MS = 5000;
const MAX_DELAY_MS = 30000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
	let currentDelay = INITIAL_DELAY_MS;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		const fullUrl = url.startsWith('/') ? `${getApiBase()}${url}` : url;
		const res = await fetch(fullUrl, { ...init, credentials: 'include' });

		if (res.ok) return res;

		const errText = await res.text();

		if (res.status === 429 || res.status === 503) {
			const classified = classifyError(res.status, errText);

			if (classified instanceof TerminalQuotaError) {
				throw classified;
			}

			if (classified instanceof RetryableQuotaError) {
				if (attempt >= MAX_ATTEMPTS) {
					throw classified;
				}

				if (classified.retryDelayMs !== undefined) {
					currentDelay = Math.max(currentDelay, classified.retryDelayMs);
				}

				const jitter = currentDelay * 0.2 * Math.random();
				const delayWithJitter = currentDelay + jitter;

				console.warn(`[Retry] Attempt ${attempt}/${MAX_ATTEMPTS} got ${res.status}. Retrying in ${Math.round(delayWithJitter)}ms...`);
				await sleep(delayWithJitter);
				currentDelay = Math.min(MAX_DELAY_MS, currentDelay * 2);
				continue;
			}
		}

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

		return new Response(errText, {
			status: res.status,
			statusText: res.statusText,
			headers: res.headers
		});
	}

	throw new Error('Retry attempts exhausted');
}
