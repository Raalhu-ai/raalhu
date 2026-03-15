import textProcessing from './text-processing';
import csvData from './csv-data';
import docx from './docx';
import pdf from './pdf';
import xlsx from './xlsx';
import pptx from './pptx';
import visualiser from './visualiser';

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
	{ name: 'visualiser', description: 'Inline visualizations via show_widget — SVG diagrams, Chart.js charts, HTML interactive explainers, flowcharts, architecture diagrams, comparisons, mockups' },
];

const SKILL_CONTENT: Record<string, string> = {
	'text-processing': textProcessing,
	'csv-data': csvData,
	docx,
	pdf,
	xlsx,
	pptx,
	visualiser,
};

export function getSkillContent(name: string): string {
	const content = SKILL_CONTENT[name];
	if (!content) {
		throw new Error(`Unknown skill: "${name}". Available: ${SKILLS.map((s) => s.name).join(', ')}`);
	}
	return content;
}

export function getSkillList(): string {
	return SKILLS.map((s) => `- ${s.name}: ${s.description}`).join('\n');
}
