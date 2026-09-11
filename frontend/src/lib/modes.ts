export interface Starter {
	id: string;
	labelDv: string;
	icon: string;
	starterText: string;
}

export const STARTERS: Starter[] = [
	{ id: 'generate', labelDv: 'ލިޔުން އުފެއްދުން', icon: 'FileText', starterText: 'ސިޓީއެއް / ލިޔުމެއް ލިޔެދީ: ' },
	{ id: 'rephrase', labelDv: 'އަލުން ލިޔުން', icon: 'RefreshCw', starterText: 'މި ލިޔުން ރީތިކޮށް އަލުން ލިޔެދީ:\n\n' },
	{ id: 'summarize', labelDv: 'ޚުލާސާ', icon: 'FileDown', starterText: 'މި ލިޔުން ކުރުކޮށް ޚުލާސާކޮށްދީ:\n\n' },
	{ id: 'translate', labelDv: 'ތަރުޖަމާ', icon: 'Languages', starterText: 'މި ލިޔުން ތަރުޖަމާކޮށްދީ:\n\n' },
	{ id: 'research', labelDv: 'ދިރާސާ', icon: 'Search', starterText: 'މި މައުޟޫޢާ ބެހޭގޮތުން ދިރާސާކޮށްދީ: ' },
	{ id: 'web_search', labelDv: 'ވެބް ސާޗް', icon: 'Globe', starterText: 'އިންޓަނެޓުން ހޯދައިދީ: ' },
	{ id: 'agent', labelDv: 'އޭޖެންޓް', icon: 'Bot', starterText: '' },
];

const MODEL_DISPLAY_NAMES: Record<string, string> = {
	'gemini-3-flash-preview': 'ޖެމިނީ 3 ފްލޭޝް',
	'gemini-2.5-flash': 'ޖެމިނީ 2.5 ފްލޭޝް',
	'gemini-2.5-flash-lite': 'ޖެމިނީ 2.5 ފްލޭޝް ލައިޓް',
	'gemini-2.5-pro': 'ޖެމިނީ 2.5 ޕްރޯ',
	'gemini-2.0-flash': 'ޖެމިނީ 2.0 ފްލޭޝް',
	'gemini-3-pro-preview': 'ޖެމިނީ 3 ޕްރޯ ޕްރީވިއު',
};

// Compose labels so new Gemini versions keep the same Dhivehi naming style.
const MODEL_NAME_PARTS: Record<string, string> = {
	gemini: 'ޖެމިނީ',
	flash: 'ފްލޭޝް',
	pro: 'ޕްރޯ',
	lite: 'ލައިޓް',
	preview: 'ޕްރީވިއު',
	agent: 'އޭޖެންޓް',
	thinking: 'ތިންކިންގް',
	image: 'އިމޭޖް',
	high: 'ހައި',
	medium: 'މީޑިއަމް',
	low: 'ލޯ',
	extra: 'އެކްސްޓްރާ',
	tiered: 'ޓިއަރޑް',
};

export function modelDisplayName(modelId: string): string {
	if (MODEL_DISPLAY_NAMES[modelId]) return MODEL_DISPLAY_NAMES[modelId];
	if (!modelId.startsWith('gemini-')) return modelId;
	return modelId.split('-').map((part) => MODEL_NAME_PARTS[part] ?? part).join(' ');
}
