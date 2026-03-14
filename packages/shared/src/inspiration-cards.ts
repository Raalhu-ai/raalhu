import type { InspirationCard } from './types';

export const inspirationCards: InspirationCard[] = [
	{
		id: 'writing-editor',
		title: 'ލިޔުން އެޑިޓަރު',
		category: 'creative',
		bg: 'from-emerald-900/60 to-emerald-800/30',
		description: 'ތިބާގެ ލިޔުންތައް ރަނގަޅުކޮށް ގްރެމާ ޗެކްކުރާ ޓޫލެއް',
		prompt: 'ލިޔުން ރަނގަޅުކުރާ HTML އެޕެއް ހަދާދީ. ޔޫޒަރު ޓެކްސްޓް ލިޔާ ޓެކްސްޓް އޭރިއާއެއް ހުންނަންވާނެ. ލިޔާ ލިޔާ ހެން ގޯސް ބަސްތައް ރަތް ކުލައިން ދައްކާ، ރަނގަޅު ގޮތް ފެހި ކުލައިން ދައްކާ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'document-gen',
		title: 'ޕްރޮޓޮޓައިޕް',
		category: 'creative',
		bg: 'from-sky-900/60 to-sky-800/30',
		description: 'ޕްރޮޑަކްޓް ރިކުއާމެންޓް ޑޮކް އިން ޕްރޮޓޮޓައިޕެއް ހެދޭ',
		prompt: 'PRD އިން ޕްރޮޓޮޓައިޕް ހަދާ HTML އެޕެއް ބިލްޑްކޮށްދީ. ޔޫޒަރު ޓެކްސްޓް އޭރިއާއެއްގައި PRD ޕޭސްޓް ކުރީމާ، އެ PRD ގެ މައުލޫމާތު ބޭނުންކޮށް ރީތި ޕްރޮޓޮޓައިޕް UI އެއް ޖެނެރޭޓް ކުރޭ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'note-transform',
		title: 'ނޯޓް ބަދަލުކުރާ',
		category: 'creative',
		bg: 'from-teal-900/50 to-emerald-800/25',
		description: 'ރޯ ނޯޓްސް ތައް ރީތި ޑޮކިއުމެންޓަކަށް ބަދަލުކުރޭ',
		prompt: 'ނޯޓް ބަދަލުކުރާ HTML އެޕެއް ހަދާދީ. ވާތް ފަޅީގައި ރޯ ނޯޓްސް ލިޔާ ޓެކްސްޓް އޭރިއާއެއް، ކަނާތް ފަޅީގައި ފޯމެޓް ކުރެވިފައި ހުންނަ ޑޮކިއުމެންޓް ޕްރީވިއު. ހެޑިންގް ތައް، ބުލެޓް ޕޮއިންޓް ތައް، ޕެރެގްރާފް ތައް ރީތިކޮށް ތަރުތީބުކުރޭ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'brainstorm',
		title: 'ހިޔާލު ޖެނެރޭޓަރު',
		category: 'creative',
		bg: 'from-cyan-900/60 to-teal-800/30',
		description: 'މައުޟޫޢެއް ދިނީމާ ކްރިއޭޓިވް ހިޔާލުތައް ޖެނެރޭޓް ކުރޭ',
		prompt: 'ހިޔާލު ޖެނެރޭޓް ކުރާ HTML އެޕެއް ހަދާދީ. ޔޫޒަރު މައުޟޫޢެއް ލިޔާ އިންޕުޓެއް ހުންނަންވާނެ. ބަޓަން ފިއްތީމާ މައިންޑް މެޕް ސްޓައިލް ގައި ހިޔާލު ތައް ދައްކާ — ކޮންމެ ހިޔާލެއް ކާޑެއްގައި ދައްކާ، ކްލިކް ކުރީމާ އިތުރު ތަފްސީލް ފެނޭ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'project-insights',
		title: 'ޕްރޮޖެކްޓް އިންސައިޓް',
		category: 'learn',
		bg: 'from-violet-900/60 to-indigo-800/30',
		description: 'ޕްރޮޖެކްޓް ޑޭޓާ އެނެލައިޒް ކޮށް އިންސައިޓް ދައްކާ',
		prompt: 'ޕްރޮޖެކްޓް އިންސައިޓް ޑޭޝްބޯޑް HTML އެޕެއް ހަދާދީ. ޔޫޒަރު ޕްރޮޖެކްޓް ނަމާއި ޓީމް މެމްބަރުން ލިޔީމާ، ޕްރޮގްރެސް ޗާޓް، ޓާސްކް ލިސްޓް، ޓައިމްލައިން ދައްކާ ރީތި ޑޭޝްބޯޑެއް ޖެނެރޭޓް ކުރޭ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'flashcards',
		title: 'ފްލެޝްކާޑް',
		category: 'learn',
		bg: 'from-blue-900/60 to-indigo-800/30',
		description: 'ކޮންމެ މައުޟޫޢަކަށް ފްލެޝްކާޑް ހެދޭ',
		prompt: 'ފްލެޝްކާޑް އެޕެއް ހަދާދީ. ޔޫޒަރު މައުޟޫޢެއް ލިޔީމާ ފްލެޝްކާޑް ތައް ޖެނެރޭޓް ކުރޭ. ކޮންމެ ކާޑެއްގައި ކުރިމަތި ފަޅީގައި ސުވާލު، ފަހަތު ފަޅީގައި ޖަވާބު. ކްލިކް ކޮށް ފުރޮޅޭ، ކުރިއަށް/ފަހަތަށް ދެވޭ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'quiz-maker',
		title: 'ކުއިޒް ހައްދާ',
		category: 'learn',
		bg: 'from-amber-900/50 to-orange-800/25',
		description: 'މައުޟޫޢަކާ ގުޅޭ ކުއިޒެއް ޖެނެރޭޓް ކުރޭ',
		prompt: 'ކުއިޒް HTML އެޕެއް ހަދާދީ. ޔޫޒަރު މައުޟޫޢެއް ލިޔީމާ 10 ސުވާލުގެ މަލްޓިޕަލް ޗޮއިސް ކުއިޒެއް ޖެނެރޭޓް ކުރޭ. ކޮންމެ ސުވާލަކަށް 4 ޗޮއިސް، ރަނގަޅު ޖަވާބު ފެހި ކުލައިން ދައްކާ، ނިމުނީމާ ސްކޯ ދައްކާ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'unit-converter',
		title: 'ޔުނިޓް ބަދަލުކުރާ',
		category: 'tips',
		bg: 'from-rose-900/50 to-pink-800/25',
		description: 'ޓެމްޕރޭޗަރ، ބަރުދަން، ދިގުމިން ބަދަލުކުރޭ',
		prompt: 'ޔުނިޓް ކޮންވާޓަރ HTML އެޕެއް ހަދާދީ. ޓެމްޕރޭޗަރ (°C/°F/K)، ބަރުދަން (kg/lb/oz)، ދިގުމިން (m/ft/cm/inch) ބަދަލުކުރެވޭ. ރީތި UI އެއް، ނަމްބަރ ޖެހީމާ ވަގުތުން ބަދަލުވޭ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'budget-tracker',
		title: 'ބަޖެޓް ޓްރެކަރު',
		category: 'tips',
		bg: 'from-lime-900/50 to-green-800/25',
		description: 'ޚަރަދުތައް ޓްރެކް ކޮށް ޗާޓުން ދައްކާ',
		prompt: 'ބަޖެޓް ޓްރެކް ކުރާ HTML އެޕެއް ހަދާދީ. ޚަރަދު އެޑް ކުރެވޭ ފޯމެއް (ނަން، ޢަދަދު، ކެޓެގަރީ). ޚަރަދު ތައް ލިސްޓެއްގައި ދައްކާ، ބާ ޗާޓެއްގައި ކެޓެގަރީ ވައިސް ދައްކާ، ޖުމްލަ ދައްކާ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'meal-planner',
		title: 'ކެއުން ޕްލޭނަރު',
		category: 'tips',
		bg: 'from-orange-900/50 to-amber-800/25',
		description: 'ހަފްތާގެ ކެއުން ޕްލޭން ކުރާ',
		prompt: 'ހަފްތާގެ ކެއުން ޕްލޭން ކުރާ HTML އެޕެއް ހަދާދީ. 7 ދުވަހުގެ ގްރިޑެއް ދައްކާ، ކޮންމެ ދުވަހަކަށް ހެނދުނު/މެންދުރު/ރޭގަނޑު ކެއުން ސެޓް ކުރެވޭ. ޕްލޭން ރީތިކޮށް ޕްރިންޓް ކުރެވޭ ގޮތަށް. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'tic-tac-toe',
		title: 'ޓިކް ޓެކް ޓޯ',
		category: 'game',
		bg: 'from-fuchsia-900/50 to-purple-800/25',
		description: 'ކްލެސިކް ޓިކް ޓެކް ޓޯ ގޭމް',
		prompt: 'ޓިކް ޓެކް ޓޯ ގޭމެއް HTML/CSS/JS ބޭނުންކޮށް ހަދާދީ. 3x3 ގްރިޑް، X އާއި O ބަދަލުވެ ކުޅެވޭ، މޮޅުވީމާ ދައްކާ، ރީސެޓް ބަޓަން. ކޮމްޕިއުޓަރ އާ ދެކޮޅަށް ކުޅެވޭ ގޮތަށް AI ހިމަނާ. write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'memory-game',
		title: 'މެމޮރީ ގޭމް',
		category: 'game',
		bg: 'from-pink-900/50 to-rose-800/25',
		description: 'ކާޑު ޖޯޑުކުރާ މެމޮރީ ގޭމް',
		prompt: 'މެމޮރީ ކާޑް ގޭމެއް ހަދާދީ. 4x4 ގްރިޑެއްގައި 8 ޖޯޑު ކާޑު، ފުރޮޅާ ޖޯޑު ހޯދާ. މޫވް ކައުންޓް، ޓައިމަރ، ނިމުނީމާ ސްކޯ ދައްކާ. ރީތި ފްލިޕް އެނިމޭޝަން. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'snake-game',
		title: 'ސްނޭކް ގޭމް',
		category: 'game',
		bg: 'from-green-900/50 to-emerald-800/25',
		description: 'ކްލެސިކް ސްނޭކް ގޭމް',
		prompt: 'ސްނޭކް ގޭމެއް HTML/CSS/JS ބޭނުންކޮށް ހަދާދީ. ކީބޯޑް އެރޯ ކީ ތަކުން ކޮންޓްރޯލް ކުރެވޭ، ކާއެއްޗެހި ކެއީމާ ދިގުވޭ، ސްކޯ ދައްކާ، ފާރުގައި ޖެހުނީމާ ގޭމް އޯވާ. write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'breathing',
		title: 'ނޭވާލުމުގެ ކަސްރަތު',
		category: 'relax',
		bg: 'from-sky-900/50 to-cyan-800/25',
		description: 'ނޭވާލުމުގެ ކަސްރަތާ އެކު ހިތްހަމަޖެހޭ',
		prompt: 'ނޭވާލުމުގެ ކަސްރަތު HTML އެޕެއް ހަދާދީ. ބޮޑު ދައިރާއެއް ނޭވާ ލާއިރު ބޮޑުވެ، ނޭވާ ދޫކޮށްލާއިރު ކުޑަވެ، އެނިމޭޓް ވާ ގޮތަށް. 4-7-8 ބްރީތިން ޓެކްނިކް — 4ސ ނޭވާ ލާ، 7ސ ހިފަހައްޓާ، 8ސ ދޫކޮށްލާ. ސައުންޑް ނުލާ ވިޝުއަލް ގައިޑް. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'color-palette',
		title: 'ކުލަ ޕެލެޓް',
		category: 'relax',
		bg: 'from-indigo-900/50 to-violet-800/25',
		description: 'ރީތި ކުލަ ޕެލެޓް ޖެނެރޭޓް ކުރޭ',
		prompt: 'ކުލަ ޕެލެޓް ޖެނެރޭޓަރ HTML އެޕެއް ހަދާދީ. ސްޕޭސް ބާ ނުވަތަ ބަޓަން ފިއްތީމާ 5 ކުލައިގެ ހާމަނީ ޕެލެޓެއް ޖެނެރޭޓް ކުރޭ. ކޮންމެ ކުލައެއްގެ HEX ކޯޑް ދައްކާ، ކްލިކް ކޮށް ކޮޕީ ކުރެވޭ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	},
	{
		id: 'nature-sounds',
		title: 'ޤުދުރަތީ އަޑުތައް',
		category: 'relax',
		bg: 'from-teal-900/50 to-cyan-800/25',
		description: 'ޤުދުރަތީ އަޑުތައް މިކްސް ކޮށް ރިލެކްސް ވޭ',
		prompt: 'ޤުދުރަތީ އަޑުތައް މިކްސް ކުރާ HTML އެޕެއް ހަދާދީ. ވާރޭ، ކަނޑު ރާޅު، ދޫނި، ވައި — ކޮންމެ އަޑެއް ސްލައިޑަރ އަކުން ވޮލިއުމް ކޮންޓްރޯލް ކުރެވޭ. Web Audio API ބޭނުންކޮށް ސިންތެޓިކް ވައިޓް ނޮއިސް / ބްރައުން ނޮއިސް ޖެނެރޭޓް ކުރޭ. HTML/CSS/JS ބޭނުންކޮށް write_file ޓޫލުން /output/index.html ގައި ލިޔެ present_file ކުރޭ.'
	}
];

export function getInspirationCard(id: string): InspirationCard | undefined {
	return inspirationCards.find((c) => c.id === id);
}
