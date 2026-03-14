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
	{ name: 'csv-data', description: 'CSV/data processing with pandas or csv module' }
];

const skillModules: Record<string, () => Promise<string>> = {
	docx: () => fetch('/skills/docx.md').then(r => r.text()),
	pdf: () => fetch('/skills/pdf.md').then(r => r.text()),
	xlsx: () => fetch('/skills/xlsx.md').then(r => r.text()),
	pptx: () => fetch('/skills/pptx.md').then(r => r.text()),
	'text-processing': () => fetch('/skills/text-processing.md').then(r => r.text()),
	'csv-data': () => fetch('/skills/csv-data.md').then(r => r.text())
};

export async function getSkillContent(name: string): Promise<string> {
	const loader = skillModules[name];
	if (!loader) {
		throw new Error(`Unknown skill: "${name}". Available: ${SKILLS.map((s) => s.name).join(', ')}`);
	}
	return loader();
}

export function getSkillList(): string {
	return SKILLS.map((s) => `- ${s.name}: ${s.description}`).join('\n');
}
