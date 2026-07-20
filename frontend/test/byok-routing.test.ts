import { beforeEach, describe, expect, test } from 'bun:test';
import {
	fetchWithModelFallback,
	markResolvedByokRequestSucceeded,
	setProviderKey,
	updateProviderKeyStatus
} from '../src/lib/gemini-api';
import {
	canReplayByokStream,
	getByokFailureCount,
	resetByokFailureCount
} from '../src/lib/byok-runtime';
import { loadSettings } from '../src/lib/settings';

class MemoryStorage implements Storage {
	private values = new Map<string, string>();
	get length() { return this.values.size; }
	clear() { this.values.clear(); }
	getItem(key: string) { return this.values.get(key) ?? null; }
	key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
	removeItem(key: string) { this.values.delete(key); }
	setItem(key: string, value: string) { this.values.set(key, value); }
}

Object.defineProperty(globalThis, 'localStorage', {
	configurable: true,
	value: new MemoryStorage()
});

const MODEL = 'gemini-3-flash-preview';

function activateGoogleKey() {
	setProviderKey('google', 'test-key');
	updateProviderKeyStatus('google', 'valid');
}

function hasByokKey(init?: RequestInit): boolean {
	return new Headers(init?.headers).has('X-AI-API-Key');
}

beforeEach(() => {
	localStorage.clear();
	resetByokFailureCount('google');
	resetByokFailureCount('openai');
	resetByokFailureCount('anthropic');
	activateGoogleKey();
});

describe('temporary BYOK fallback', () => {
	test('falls back for the first two provider failures without disabling the key', async () => {
		let byokAttempts = 0;
		let proxyAttempts = 0;
		const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
			if (hasByokKey(init)) {
				byokAttempts++;
				return new Response('provider unavailable', {
					status: 502,
					headers: { 'X-BYOK-Error-Origin': 'provider' }
				});
			}
			proxyAttempts++;
			return new Response('proxy response');
		}) as typeof fetch;

		for (let expectedCount = 1; expectedCount <= 2; expectedCount++) {
			const response = await fetchWithModelFallback('/api/generate', {}, MODEL, fetcher);
			expect(await response.text()).toBe('proxy response');
			expect(response.headers.get('X-Resolved-Model-Module')).toBe('proxy');
			expect(getByokFailureCount('google')).toBe(expectedCount);
			expect(loadSettings().byokKeyStatus.google).toBe('valid');
			expect(loadSettings().activeModelModule).toBe('ai-sdk');
		}

		expect(byokAttempts).toBe(2);
		expect(proxyAttempts).toBe(2);
	});

	test('disables BYOK on the third consecutive provider failure', async () => {
		const attemptedRoutes: string[] = [];
		const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
			if (hasByokKey(init)) {
				attemptedRoutes.push('byok');
				return new Response('invalid provider response', {
					status: 502,
					headers: { 'X-BYOK-Error-Origin': 'provider' }
				});
			}
			attemptedRoutes.push('proxy');
			return new Response('proxy response');
		}) as typeof fetch;

		await fetchWithModelFallback('/api/generate', {}, MODEL, fetcher);
		await fetchWithModelFallback('/api/generate', {}, MODEL, fetcher);
		await fetchWithModelFallback('/api/generate', {}, MODEL, fetcher);

		const settings = loadSettings();
		expect(getByokFailureCount('google')).toBe(3);
		expect(settings.byokKeyStatus.google).toBe('invalid');
		expect(settings.activeModelModule).toBe('proxy');
		expect(settings.byokKeys.google).toBe('test-key');

		await fetchWithModelFallback('/api/generate', {}, MODEL, fetcher);
		expect(attemptedRoutes).toEqual([
			'byok', 'proxy',
			'byok', 'proxy',
			'byok', 'proxy',
			'proxy'
		]);
	});

	test('a successful BYOK response resets the failure streak', async () => {
		let shouldFail = true;
		const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
			if (!hasByokKey(init)) return new Response('proxy response');
			if (shouldFail) {
				return new Response('provider unavailable', {
					status: 502,
					headers: { 'X-BYOK-Error-Origin': 'provider' }
				});
			}
			return new Response('byok response');
		}) as typeof fetch;

		await fetchWithModelFallback('/api/generate', {}, MODEL, fetcher);
		expect(getByokFailureCount('google')).toBe(1);

		shouldFail = false;
		await fetchWithModelFallback('/api/generate', {}, MODEL, fetcher);
		expect(getByokFailureCount('google')).toBe(0);

		shouldFail = true;
		await fetchWithModelFallback('/api/generate', {}, MODEL, fetcher);
		expect(getByokFailureCount('google')).toBe(1);
	});

	test('does not count or fall back for unclassified and network failures', async () => {
		let attempts = 0;
		const authFetcher = (async () => {
			attempts++;
			return new Response('not authenticated', { status: 401 });
		}) as typeof fetch;

		const authResponse = await fetchWithModelFallback('/api/generate', {}, MODEL, authFetcher);
		expect(authResponse.status).toBe(401);
		expect(attempts).toBe(1);
		expect(getByokFailureCount('google')).toBe(0);

		const networkFetcher = (async () => {
			throw new TypeError('offline');
		}) as typeof fetch;
		await expect(fetchWithModelFallback('/api/generate', {}, MODEL, networkFetcher)).rejects.toThrow('offline');
		expect(getByokFailureCount('google')).toBe(0);
	});

	test('defers stream success until the stream consumer confirms completion', async () => {
		const failingFetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
			if (!hasByokKey(init)) return new Response('proxy response');
			return new Response('provider unavailable', {
				status: 502,
				headers: { 'X-BYOK-Error-Origin': 'provider' }
			});
		}) as typeof fetch;
		await fetchWithModelFallback('/api/generate', {}, MODEL, failingFetcher);
		expect(getByokFailureCount('google')).toBe(1);

		const streamFetcher = (async () => new Response('data: [DONE]\n\n')) as typeof fetch;
		const response = await fetchWithModelFallback(
			'/api/stream',
			{},
			MODEL,
			streamFetcher,
			{ completion: 'stream' }
		);
		expect(getByokFailureCount('google')).toBe(1);
		markResolvedByokRequestSucceeded(response);
		expect(getByokFailureCount('google')).toBe(0);
	});

	test('only replays a stream when no output has been emitted', () => {
		expect(canReplayByokStream({ rawPartCount: 0, functionCallCount: 0, textLength: 0 })).toBe(true);
		expect(canReplayByokStream({ rawPartCount: 1, functionCallCount: 0, textLength: 0 })).toBe(false);
		expect(canReplayByokStream({ rawPartCount: 0, functionCallCount: 1, textLength: 0 })).toBe(false);
		expect(canReplayByokStream({ rawPartCount: 0, functionCallCount: 0, textLength: 1 })).toBe(false);
	});
});
