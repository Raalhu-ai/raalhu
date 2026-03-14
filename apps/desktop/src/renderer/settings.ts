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

export function applyFontSize(size?: Settings['fontSize']): void {
  const s = size ?? loadSettings().fontSize;
  document.documentElement.style.setProperty('--chat-font-size', FONT_SIZES[s]);
}

export function applyTheme(theme?: Settings['theme']): void {
  const t = theme ?? loadSettings().theme;
  const root = document.documentElement;

  if (t === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('light', !prefersDark);
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('light', t === 'light');
    root.classList.toggle('dark', t === 'dark');
  }
}
