export interface SkillInfo {
	name: string;
	description: string;
}

export const SKILLS: SkillInfo[] = [
	{ name: 'docx', description: 'Word document (.docx) creation, reading, and editing — reports, memos, letters, templates, tables of contents, formatted documents' },
	{ name: 'pdf', description: 'PDF creation, reading, merging, splitting, rotating, encrypting — reports, charts, combined documents' },
	{ name: 'xlsx', description: 'Spreadsheet (.xlsx) creation, reading, styling, charts, formulas, data validation, conditional formatting' },
	{ name: 'pptx', description: 'PowerPoint (.pptx) creation — presentations, slide decks, Thaana text, charts, tables, images, embedded fonts' },
	{ name: 'text-processing', description: 'Text manipulation and Thaana handling' },
	{ name: 'csv-data', description: 'CSV/data processing with pandas or csv module' },
	{ name: 'visualiser', description: 'Inline visualizations via show_widget — SVG diagrams, Chart.js charts, HTML interactive explainers, flowcharts, architecture diagrams, comparisons, mockups' }
];

const skillModules: Record<string, () => Promise<string>> = {
	docx: () => import('./docx.md?raw').then((m) => m.default),
	pdf: () => import('./pdf.md?raw').then((m) => m.default),
	xlsx: () => import('./xlsx.md?raw').then((m) => m.default),
	pptx: () => import('./pptx.md?raw').then((m) => m.default),
	'text-processing': () => import('./text-processing.md?raw').then((m) => m.default),
	'csv-data': () => import('./csv-data.md?raw').then((m) => m.default),
	'visualiser': () => import('./visualiser.md?raw').then((m) => m.default)
};

/**
 * Load skill content by name. Returns the markdown string.
 */
export async function getSkillContent(name: string): Promise<string> {
	const loader = skillModules[name];
	if (!loader) {
		throw new Error(`Unknown skill: "${name}". Available: ${SKILLS.map((s) => s.name).join(', ')}`);
	}
	return loader();
}

/**
 * Get a formatted list of available skills for the system prompt.
 */
export function getSkillList(): string {
	return SKILLS.map((s) => `- ${s.name}: ${s.description}`).join('\n');
}
