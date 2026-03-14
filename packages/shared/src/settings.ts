import type { Settings } from './types';

const STORAGE_KEY = 'mogger_settings';

const DEFAULTS: Settings = {
	theme: 'dark',
	fontSize: 'medium',
	customInstructions: ''
};

export const FONT_SIZES: Record<Settings['fontSize'], string> = {
	small: '16px',
	medium: '18.5px',
	large: '22px'
};

export function loadSettings(): Settings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
	} catch {}
	return { ...DEFAULTS };
}

export function saveSettings(settings: Settings): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
