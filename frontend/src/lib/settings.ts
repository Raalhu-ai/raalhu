export interface Settings {
	theme: 'light' | 'dark' | 'system';
	fontSize: 'small' | 'medium' | 'large';
	customInstructions: string;
}

const STORAGE_KEY = 'mogger_settings';

const DEFAULTS: Settings = {
	theme: 'dark',
	fontSize: 'medium',
	customInstructions: ''
};

const FONT_SIZES: Record<Settings['fontSize'], string> = {
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
