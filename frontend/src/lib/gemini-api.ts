import {
	loadSettings,
	saveSettings,
	type AiProvider,
	type ByokKeyStatus,
	type ModelModule,
	type Settings
} from './settings';
import {
	dispatchByokRuntimeEvent,
	recordByokFailure,
	resetByokFailureCount,
	type ByokOperation,
	type ByokRuntimeEventKind
} from './byok-runtime';

const AI_PROVIDER_HEADER = 'X-AI-Provider';
const AI_API_KEY_HEADER = 'X-AI-API-Key';
const MODEL_MODULE_HEADER = 'X-Model-Module';
const LEGACY_GEMINI_API_KEY_HEADER = 'X-Gemini-API-Key';
const RESOLVED_MODEL_MODULE_HEADER = 'X-Resolved-Model-Module';
const RESOLVED_AI_PROVIDER_HEADER = 'X-Resolved-AI-Provider';
const MODEL_FALLBACK_HEADER = 'X-Model-Fallback';
const BYOK_ERROR_ORIGIN_HEADER = 'X-BYOK-Error-Origin';

export interface ModelRequestOptions {
	operation?: ByokOperation;
	completion?: 'response' | 'stream';
}

export interface ByokFailureResult {
	failureCount: number;
	disabled: boolean;
}

export type { AiProvider, ByokKeyStatus, ModelModule };
export type ModelProvider = ModelModule;

export interface AiProviderConfig {
	id: AiProvider;
	name: string;
	keyLabel: string;
	placeholder: string;
	enabled: boolean;
	modelPrefixes: string[];
}

export interface ModelRouteDecision {
	module: ModelModule;
	provider?: AiProvider;
	headers: Record<string, string>;
	reason: string;
}

export const AI_PROVIDERS: Record<AiProvider, AiProviderConfig> = {
	google: {
		id: 'google',
		name: 'Google AI Studio',
		keyLabel: 'Gemini API key',
		placeholder: 'AIzaSyxxxxxxxxxxxxxxxx',
		enabled: true,
		modelPrefixes: ['gemini-']
	},
	openai: {
		id: 'openai',
		name: 'OpenAI',
		keyLabel: 'OpenAI API key',
		placeholder: 'sk-proj-xxxxxxxxxxxxxxxx',
		enabled: false,
		modelPrefixes: ['gpt-', 'o1', 'o3', 'o4']
	},
	anthropic: {
		id: 'anthropic',
		name: 'Anthropic',
		keyLabel: 'Anthropic API key',
		placeholder: 'sk-ant-api03-xxxxxxxxxxxxxxxx',
		enabled: false,
		modelPrefixes: ['claude-']
	}
};

function isAiProvider(value: string | null): value is AiProvider {
	return value === 'google' || value === 'openai' || value === 'anthropic';
}

export function getProviderForModel(modelId: string): AiProvider | undefined {
	return (Object.values(AI_PROVIDERS) as AiProviderConfig[]).find((provider) =>
		provider.modelPrefixes.some((prefix) => modelId.startsWith(prefix))
	)?.id;
}

export function resolveModelRoute(modelId: string): ModelRouteDecision {
	const settings = loadSettings();
	const provider = getProviderForModel(modelId);

	if (!provider) {
		return syncActiveRoute(settings, {
			module: 'proxy',
			headers: {},
			reason: `No BYOK provider is mapped for model ${modelId}`
		});
	}

	const providerConfig = AI_PROVIDERS[provider];
	if (!providerConfig.enabled) {
		return syncActiveRoute(settings, {
			module: 'proxy',
			provider,
			headers: {},
			reason: `${providerConfig.name} BYOK is not enabled yet`
		});
	}

	const key = settings.byokKeys[provider]?.trim();
	const status = settings.byokKeyStatus[provider];
	if (!key) {
		return syncActiveRoute(settings, {
			module: 'proxy',
			provider,
			headers: {},
			reason: `${providerConfig.name} key is not saved`
		});
	}

	if (status !== 'valid') {
		return syncActiveRoute(settings, {
			module: 'proxy',
			provider,
			headers: {},
			reason: `${providerConfig.name} key is ${status}`
		});
	}

	return syncActiveRoute(settings, {
		module: 'ai-sdk',
		provider,
		headers: {
			[MODEL_MODULE_HEADER]: 'ai-sdk',
			[AI_PROVIDER_HEADER]: provider,
			[AI_API_KEY_HEADER]: key
		},
		reason: `${providerConfig.name} key is valid`
	});
}

export async function validateProviderKey(provider: AiProvider): Promise<ByokKeyStatus> {
	const settings = loadSettings();
	const key = settings.byokKeys[provider]?.trim();
	if (!key || !AI_PROVIDERS[provider].enabled) {
		updateProviderKeyStatus(provider, 'invalid', 'Missing or disabled provider key');
		return 'invalid';
	}

	try {
		const res = await fetch('/api/byok-test', {
			method: 'POST',
			headers: {
				[AI_PROVIDER_HEADER]: provider,
				[AI_API_KEY_HEADER]: key
			}
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			updateProviderKeyStatus(provider, 'invalid', data?.error || 'Provider key test failed');
			return 'invalid';
		}
		updateProviderKeyStatus(provider, 'valid', '');
		return 'valid';
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		updateProviderKeyStatus(provider, 'invalid', message);
		return 'invalid';
	}
}

export function markByokRequestSucceeded(provider: AiProvider): void {
	resetByokFailureCount(provider);
}

export function markResolvedByokRequestSucceeded(response: Response): void {
	if (response.headers.get(RESOLVED_MODEL_MODULE_HEADER) !== 'ai-sdk') return;
	const provider = response.headers.get(RESOLVED_AI_PROVIDER_HEADER);
	if (isAiProvider(provider)) markByokRequestSucceeded(provider);
}

export function recordByokRuntimeFailure(
	provider: AiProvider,
	error: unknown,
	options: {
		fallbackUsed: boolean;
		operation: ByokOperation;
		kind?: Exclude<ByokRuntimeEventKind, 'disabled'>;
	}
): ByokFailureResult {
	const message = error instanceof Error ? error.message : String(error);
	const failureCount = recordByokFailure(provider);
	const disabled = failureCount >= 3;

	if (disabled) {
		updateProviderKeyStatus(provider, 'invalid', message || 'BYOK request failed three times');
	}

	dispatchByokRuntimeEvent({
		kind: disabled ? 'disabled' : (options.kind ?? 'fallback'),
		provider,
		failureCount,
		fallbackUsed: options.fallbackUsed,
		operation: options.operation,
		message: message || 'BYOK request failed'
	});

	return { failureCount, disabled };
}

export async function fetchWithModelFallback(
	input: RequestInfo | URL,
	init: RequestInit,
	modelId: string,
	fetcher: typeof fetch = fetch,
	options: ModelRequestOptions = {}
): Promise<Response> {
	const route = resolveModelRoute(modelId);
	const operation = options.operation ?? 'chat';
	const completion = options.completion ?? 'response';
	const withRouteHeaders = {
		...(init.headers as Record<string, string> | undefined),
		...route.headers
	};
	let response: Response;
	try {
		response = await fetcher(input, {
			...init,
			headers: withRouteHeaders
		});
	} catch (err) {
		// A browser/relay/network exception cannot be attributed to the provider.
		// Do not penalize the key or silently change routes.
		throw err;
	}

	if (response.ok) {
		if (route.module === 'ai-sdk' && route.provider && completion === 'response') {
			markByokRequestSucceeded(route.provider);
		}
		return tagResolvedResponse(response, route.module, route.provider);
	}
	if (route.module !== 'ai-sdk' || !route.provider) {
		return tagResolvedResponse(response, route.module, route.provider);
	}
	if (response.headers.get(BYOK_ERROR_ORIGIN_HEADER) !== 'provider') {
		return tagResolvedResponse(response, route.module, route.provider);
	}

	const errorText = await response.text().catch(() => '');
	recordByokRuntimeFailure(
		route.provider,
		errorText || `BYOK request failed with ${response.status}`,
		{ fallbackUsed: true, operation }
	);

	return fetchProxyFallback(input, init, fetcher);
}

export async function fetchProxyFallback(
	input: RequestInfo | URL,
	init: RequestInit,
	fetcher: typeof fetch = fetch
): Promise<Response> {
	const proxyResponse = await fetcher(input, {
		...init,
		headers: proxyHeaders(init.headers)
	});
	return tagResolvedResponse(proxyResponse, 'proxy', undefined, true);
}

function proxyHeaders(headers: RequestInit['headers']): Record<string, string> {
	const sourceEntries =
		headers instanceof Headers
			? Array.from(headers.entries())
			: Array.isArray(headers)
				? headers
				: Object.entries(headers || {});
	const routeHeaderNames = new Set([
		MODEL_MODULE_HEADER.toLowerCase(),
		AI_PROVIDER_HEADER.toLowerCase(),
		AI_API_KEY_HEADER.toLowerCase(),
		LEGACY_GEMINI_API_KEY_HEADER.toLowerCase()
	]);
	const nextHeaders: Record<string, string> = {};
	for (const [key, value] of sourceEntries) {
		if (!routeHeaderNames.has(key.toLowerCase())) nextHeaders[key] = value;
	}
	return nextHeaders;
}

function tagResolvedResponse(
	response: Response,
	module: ModelModule,
	provider?: AiProvider,
	fallback = false
): Response {
	const headers = new Headers(response.headers);
	headers.set(RESOLVED_MODEL_MODULE_HEADER, module);
	if (provider) headers.set(RESOLVED_AI_PROVIDER_HEADER, provider);
	if (fallback) headers.set(MODEL_FALLBACK_HEADER, 'byok');
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

export function setProviderKey(provider: AiProvider, key: string): void {
	resetByokFailureCount(provider);
	const settings = loadSettings();
	saveSettings({
		...settings,
		byokKeys: { ...settings.byokKeys, [provider]: key.trim() },
		byokKeyStatus: { ...settings.byokKeyStatus, [provider]: 'untested' },
		activeModelModule: 'proxy',
		activeAiProvider: '',
		lastByokError: ''
	});
}

export function clearProviderKey(provider: AiProvider): void {
	resetByokFailureCount(provider);
	const settings = loadSettings();
	saveSettings({
		...settings,
		byokKeys: { ...settings.byokKeys, [provider]: '' },
		byokKeyStatus: { ...settings.byokKeyStatus, [provider]: 'untested' },
		activeModelModule:
			settings.activeAiProvider === provider ? 'proxy' : settings.activeModelModule,
		activeAiProvider: settings.activeAiProvider === provider ? '' : settings.activeAiProvider,
		lastByokError: settings.activeAiProvider === provider ? '' : settings.lastByokError
	});
}

export function updateProviderKeyStatus(
	provider: AiProvider,
	status: ByokKeyStatus,
	error = ''
): void {
	if (status === 'valid') resetByokFailureCount(provider);
	const settings = loadSettings();
	const hasValidKey = status === 'valid' && !!settings.byokKeys[provider]?.trim();
	saveSettings({
		...settings,
		byokKeyStatus: { ...settings.byokKeyStatus, [provider]: status },
		activeModelModule: hasValidKey ? 'ai-sdk' : 'proxy',
		activeAiProvider: hasValidKey ? provider : '',
		lastByokError: error
	});
}

export function switchToProxy(error = ''): void {
	const settings = loadSettings();
	saveSettings({
		...settings,
		activeModelModule: 'proxy',
		activeAiProvider: '',
		lastByokError: error || settings.lastByokError
	});
}

function syncActiveRoute(settings: Settings, route: ModelRouteDecision): ModelRouteDecision {
	const nextModule = route.module;
	const nextProvider = route.module === 'ai-sdk' ? (route.provider ?? '') : '';
	if (
		settings.activeModelModule !== nextModule ||
		settings.activeAiProvider !== nextProvider ||
		(route.module === 'ai-sdk' && settings.lastByokError)
	) {
		saveSettings({
			...settings,
			activeModelModule: nextModule,
			activeAiProvider: nextProvider,
			lastByokError: route.module === 'ai-sdk' ? '' : settings.lastByokError
		});
	}
	return route;
}

// Backward-compatible wrappers while older call sites are migrated.
export function getGeminiApiKey(): string {
	return loadSettings().byokKeys.google.trim();
}

export function setGeminiApiKey(key: string): void {
	setProviderKey('google', key);
}

export function clearGeminiApiKey(): void {
	clearProviderKey('google');
}

export function getModelProvider(): ModelProvider {
	return loadSettings().activeModelModule;
}

export function setModelProvider(provider: ModelProvider | 'code-assist' | 'gemini-api'): void {
	if (provider === 'ai-sdk' || provider === 'gemini-api') {
		updateProviderKeyStatus('google', loadSettings().byokKeyStatus.google);
		return;
	}
	switchToProxy();
}

export function setGeminiApiKeyStatus(status: ByokKeyStatus): void {
	updateProviderKeyStatus('google', status);
}

export function isGeminiApiActive(): boolean {
	return resolveModelRoute('gemini-3-flash-preview').module === 'ai-sdk';
}

export function getGeminiApiHeaders(modelId = 'gemini-3-flash-preview'): Record<string, string> {
	return resolveModelRoute(modelId).headers;
}

export function getLegacyGeminiApiHeaderName(): string {
	return LEGACY_GEMINI_API_KEY_HEADER;
}
