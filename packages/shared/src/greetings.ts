import { isLatinText, englishToThaana } from './transliterate';

export interface Greeting {
	heading: string;
	subtitle: string;
}

const morningGreetings: Greeting[] = [
	{ heading: 'ސަލާމް', subtitle: 'މިއަދު ކޮންކަމެއް ކޮށްދޭންވީ؟' },
	{ heading: 'ބާއްޖަވެރި ހެނދުނެއް', subtitle: 'ތައްޔާރު؟ ފަށަމާ' },
	{ heading: 'އާ ދުވަހެއް އާ ފެށުމެއް', subtitle: 'ކިހިނެއް އެހީވެދޭންވީ؟' },
	{ heading: 'ކޮބާ ކިހިނެއް', subtitle: 'ކޮފީ ބޮއިފިން؟ ދެން ފަށަމާ' },
];

const afternoonGreetings: Greeting[] = [
	{ heading: 'ސަލާމް', subtitle: 'ކޮންކަމެއް ކޮށްދޭންވީ؟' },
	{ heading: 'ބާއްޖަވެރި ދުވަހެއް', subtitle: 'ކޮންކަމެއް ކޮށްދެންތަ؟' },
	{ heading: 'ކޮބާ ކިހިނެއް', subtitle: 'މިއޮތީ ތައްޔާރަށް' },
	{ heading: 'ކީކުރަނީ', subtitle: 'އެހީއެއް ބޭނުންތަ؟' },
];

const eveningGreetings: Greeting[] = [
	{ heading: 'ސަލާމް', subtitle: 'މިރޭ ކޮންކަމެއް ކޮށްދޭންވީ؟' },
	{ heading: 'ރީތި ހަވީރެއް', subtitle: 'ކޮންކަމެއް ކޮށްދެންތަ؟' },
	{ heading: 'ބާއްޖަވެރި ހަވީރެއް', subtitle: 'އެހީއެއް ބޭނުންތަ؟' },
	{ heading: 'ކޮބާ ކިހިނެއް', subtitle: 'ކޮންކަމެއް ފަށަންވީ؟' },
];

const nightGreetings: Greeting[] = [
	{ heading: 'ސަލާމް', subtitle: 'މިރޭ ކޮންކަމެއް ކޮށްދޭންވީ؟' },
	{ heading: 'އަދިވެސް ހޭލާ', subtitle: 'ކޮންކަމެއް ކޮށްދެންތަ؟' },
	{ heading: 'ހަމަހިމޭން ރެއެއް', subtitle: 'ކޮންކަމެއް ކުރަންވީ؟' },
	{ heading: 'ކޮބާ ކިހިނެއް', subtitle: 'ނުނިދާ ކީއްކުރަނީ؟ އެހީވެދެން' },
];

function getTimePeriodGreetings(): Greeting[] {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 12) return morningGreetings;
	if (hour >= 12 && hour < 17) return afternoonGreetings;
	if (hour >= 17 && hour < 21) return eveningGreetings;
	return nightGreetings;
}

export function getGreeting(): Greeting {
	const greetings = getTimePeriodGreetings();
	return greetings[Math.floor(Math.random() * greetings.length)];
}

export function getFirstName(fullName: string): string {
	const first = fullName.split(' ')[0] || fullName;
	if (isLatinText(first)) {
		return englishToThaana(first);
	}
	return first;
}
