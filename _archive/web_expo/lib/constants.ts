/** Dhivehi spinner verbs shown during streaming */
export const SPINNER_VERBS = [
	'ތައްޔާރުކުރަނީ', 'އުފައްދަނީ', 'ދިރުވަނީ', 'ގެނެސްދެނީ',
	'ރާވަނީ', 'ހޭލައްވަނީ', 'އެއްކުރަނީ', 'ބަދަލުކުރަނީ',
	'ތަރުތީބުކުރަނީ', 'ފިލްޓަރުކުރަނީ', 'ޖާދޫކުރަނީ', 'ހަދަނީ',
	'ވިސްނަނީ', 'ހޯދަނީ', 'ލިޔަނީ', 'ދިރާސާކުރަނީ',
	'ކުރިއަށް ދަނީ', 'ހިންގަނީ', 'ގުޅާލަނީ', 'ޗެކްކުރަނީ',
	'ލޯޑްކުރަނީ', 'ޕްރޮސެސްކުރަނީ', 'ކޮމްޕިއުޓްކުރަނީ',
];

export const TOOL_VERBS: Record<string, string> = {
	web_search: 'ވެބް ހޯދަނީ',
	web_fetch: 'ވެބް ލޯޑްކުރަނީ',
	execute_python: 'ކޯޑް ހިންގަނީ',
	write_file: 'ފައިލް ލިޔަނީ',
	read_file: 'ފައިލް ކިޔަނީ',
	list_directory: 'ފޯލްޑަރު ބަލަނީ',
	present_file: 'ފައިލް ތައްޔާރުކުރަނީ',
	message_compose: 'މެސެޖް ލިޔަނީ',
	recipe_display: 'ރެސިޕީ ތައްޔާރުކުރަނީ',
	show_widget: 'ވިޝުއަލް ހަދަނީ',
	read_skill: 'ސްކިލް ކިޔަނީ',
	ask_user_input: 'ސުވާލުކުރަނީ',
};

export const TOOL_LABELS: Record<string, string> = {
	web_search: 'ވެބް ސާޗް',
	web_fetch: 'ވެބް ފެޗް',
	execute_python: 'ޕައިތަން ކޯޑް',
	write_file: 'ފައިލް ލިޔުން',
	read_file: 'ފައިލް ކިޔުން',
	list_directory: 'ފޯލްޑަރު',
	present_file: 'ފައިލް ދެއްކުން',
	message_compose: 'މެސެޖް',
	recipe_display: 'ރެސިޕީ',
	show_widget: 'ވިޝުއަލައިޒް',
	read_skill: 'ސްކިލް',
	ask_user_input: 'ސުވާލު',
};

export const DEFAULT_MODEL = 'gemini-3-flash-preview';
