import { loadSettings, saveSettings } from './settings';

const GEMINI_API_KEY_HEADER = 'X-Gemini-API-Key';

export type ModelProvider = 'code-assist' | 'gemini-api';
export type GeminiApiKeyStatus = 'untested' | 'valid' | 'invalid';

export function getGeminiApiKey(): string {
	if (typeof localStorage === 'undefined') return '';
	return loadSettings().geminiApiKey.trim();
}

export function setGeminiApiKey(key: string): void {
	const settings = loadSettings();
	saveSettings({
		...settings,
		geminiApiKey: key.trim(),
		modelProvider: 'code-assist',
		geminiApiKeyStatus: 'untested'
	});
}

export function clearGeminiApiKey(): void {
	const settings = loadSettings();
	saveSettings({
		...settings,
		geminiApiKey: '',
		modelProvider: 'code-assist',
		geminiApiKeyStatus: 'untested'
	});
}

export function getModelProvider(): ModelProvider {
	if (typeof localStorage === 'undefined') return 'code-assist';
	return loadSettings().modelProvider;
}

export function setModelProvider(provider: ModelProvider): void {
	const settings = loadSettings();
	if (provider === 'gemini-api') {
		const hasValidKey = settings.geminiApiKey.trim() && settings.geminiApiKeyStatus === 'valid';
		saveSettings({ ...settings, modelProvider: hasValidKey ? 'gemini-api' : 'code-assist' });
		return;
	}
	saveSettings({ ...settings, modelProvider: 'code-assist' });
}

export function setGeminiApiKeyStatus(status: GeminiApiKeyStatus): void {
	const settings = loadSettings();
	saveSettings({
		...settings,
		geminiApiKeyStatus: status,
		modelProvider: status === 'valid' ? settings.modelProvider : 'code-assist'
	});
}

export function isGeminiApiActive(): boolean {
	if (typeof localStorage === 'undefined') return false;
	const settings = loadSettings();
	return (
		settings.modelProvider === 'gemini-api' &&
		settings.geminiApiKeyStatus === 'valid' &&
		!!settings.geminiApiKey.trim()
	);
}

export function getGeminiApiHeaders(): Record<string, string> {
	if (!isGeminiApiActive()) return {};
	const key = getGeminiApiKey();
	return key ? { [GEMINI_API_KEY_HEADER]: key } : {};
}
