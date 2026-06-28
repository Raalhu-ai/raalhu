export interface Settings {
	theme: 'light' | 'dark' | 'system';
	fontSize: 'small' | 'medium' | 'large';
	customInstructions: string;
	memories: string;
	byokKeys: Record<AiProvider, string>;
	byokKeyStatus: Record<AiProvider, ByokKeyStatus>;
	activeModelModule: ModelModule;
	activeAiProvider: AiProvider | '';
	lastByokError: string;
}

const STORAGE_KEY = 'mogger_settings';

export type AiProvider = 'google' | 'openai' | 'anthropic';
export type ByokKeyStatus = 'untested' | 'valid' | 'invalid';
export type ModelModule = 'proxy' | 'ai-sdk';

const DEFAULT_BYOK_KEYS: Record<AiProvider, string> = {
	google: '',
	openai: '',
	anthropic: ''
};

const DEFAULT_BYOK_KEY_STATUS: Record<AiProvider, ByokKeyStatus> = {
	google: 'untested',
	openai: 'untested',
	anthropic: 'untested'
};

const DEFAULTS: Settings = {
	theme: 'dark',
	fontSize: 'medium',
	customInstructions: '',
	memories: '',
	byokKeys: { ...DEFAULT_BYOK_KEYS },
	byokKeyStatus: { ...DEFAULT_BYOK_KEY_STATUS },
	activeModelModule: 'proxy',
	activeAiProvider: '',
	lastByokError: ''
};

const FONT_SIZES: Record<Settings['fontSize'], string> = {
	small: '16px',
	medium: '18.5px',
	large: '22px'
};

export function loadSettings(): Settings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return normalizeSettings(JSON.parse(raw));
	} catch {}
	return cloneDefaults();
}

export function saveSettings(settings: Settings): void {
	const normalized = normalizeSettings(settings);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('mogger-settings-changed', { detail: normalized }));
	}
}

function cloneDefaults(): Settings {
	return {
		...DEFAULTS,
		byokKeys: { ...DEFAULT_BYOK_KEYS },
		byokKeyStatus: { ...DEFAULT_BYOK_KEY_STATUS }
	};
}

function isAiProvider(value: unknown): value is AiProvider {
	return value === 'google' || value === 'openai' || value === 'anthropic';
}

function isByokKeyStatus(value: unknown): value is ByokKeyStatus {
	return value === 'untested' || value === 'valid' || value === 'invalid';
}

function isModelModule(value: unknown): value is ModelModule {
	return value === 'proxy' || value === 'ai-sdk';
}

function readProviderRecord(
	value: unknown,
	defaults: Record<AiProvider, string>
): Record<AiProvider, string> {
	const record = { ...defaults };
	if (!value || typeof value !== 'object') return record;
	for (const provider of Object.keys(record) as AiProvider[]) {
		const providerValue = (value as Record<string, unknown>)[provider];
		if (typeof providerValue === 'string') record[provider] = providerValue.trim();
	}
	return record;
}

function readStatusRecord(value: unknown): Record<AiProvider, ByokKeyStatus> {
	const record = { ...DEFAULT_BYOK_KEY_STATUS };
	if (!value || typeof value !== 'object') return record;
	for (const provider of Object.keys(record) as AiProvider[]) {
		const providerValue = (value as Record<string, unknown>)[provider];
		if (isByokKeyStatus(providerValue)) record[provider] = providerValue;
	}
	return record;
}

function normalizeSettings(value: unknown): Settings {
	const parsed = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
	const normalized = cloneDefaults();

	if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
		normalized.theme = parsed.theme;
	}
	if (parsed.fontSize === 'small' || parsed.fontSize === 'medium' || parsed.fontSize === 'large') {
		normalized.fontSize = parsed.fontSize;
	}
	if (typeof parsed.customInstructions === 'string') normalized.customInstructions = parsed.customInstructions;
	if (typeof parsed.memories === 'string') normalized.memories = parsed.memories;

	normalized.byokKeys = readProviderRecord(parsed.byokKeys, DEFAULT_BYOK_KEYS);
	normalized.byokKeyStatus = readStatusRecord(parsed.byokKeyStatus);

	// Migrate the previous Gemini-only settings into the generic provider registry.
	if (!normalized.byokKeys.google && typeof parsed.geminiApiKey === 'string') {
		normalized.byokKeys.google = parsed.geminiApiKey.trim();
	}
	if (
		normalized.byokKeyStatus.google === 'untested' &&
		isByokKeyStatus(parsed.geminiApiKeyStatus)
	) {
		normalized.byokKeyStatus.google = parsed.geminiApiKeyStatus;
	}

	const activeAiProvider = parsed.activeAiProvider;
	normalized.activeAiProvider = isAiProvider(activeAiProvider) ? activeAiProvider : '';

	const activeModelModule = parsed.activeModelModule;
	normalized.activeModelModule = isModelModule(activeModelModule) ? activeModelModule : 'proxy';

	if (
		parsed.modelProvider === 'gemini-api' &&
		normalized.byokKeys.google &&
		normalized.byokKeyStatus.google === 'valid'
	) {
		normalized.activeModelModule = 'ai-sdk';
		normalized.activeAiProvider = 'google';
	}

	if (
		normalized.activeModelModule === 'ai-sdk' &&
		(!normalized.activeAiProvider ||
			!normalized.byokKeys[normalized.activeAiProvider] ||
			normalized.byokKeyStatus[normalized.activeAiProvider] !== 'valid')
	) {
		normalized.activeModelModule = 'proxy';
		normalized.activeAiProvider = '';
	}

	if (typeof parsed.lastByokError === 'string') normalized.lastByokError = parsed.lastByokError;

	return normalized;
}

let mediaQuery: MediaQueryList | null = null;
let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

function setDark(dark: boolean): void {
	const el = document.documentElement;
	if (dark) {
		el.classList.add('dark');
	} else {
		el.classList.remove('dark');
	}
	// Update theme-color meta
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute('content', dark ? '#242526' : '#f7f8fa');

	const schemeMeta = document.querySelector('meta[name="color-scheme"]');
	if (schemeMeta) schemeMeta.setAttribute('content', dark ? 'dark' : 'light');
}

export function applyTheme(theme?: Settings['theme']): void {
	const t = theme ?? loadSettings().theme;

	// Clean up previous system listener
	if (mediaQuery && mediaHandler) {
		mediaQuery.removeEventListener('change', mediaHandler);
		mediaHandler = null;
	}

	if (t === 'light') {
		setDark(false);
	} else if (t === 'dark') {
		setDark(true);
	} else {
		// system
		mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		setDark(mediaQuery.matches);
		mediaHandler = (e) => setDark(e.matches);
		mediaQuery.addEventListener('change', mediaHandler);
	}
}

export function applyFontSize(size?: Settings['fontSize']): void {
	const s = size ?? loadSettings().fontSize;
	document.documentElement.style.setProperty('--chat-font-size', FONT_SIZES[s]);
}
