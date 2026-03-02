/**
 * English → Thaana phonetic transliterator
 * Handles English pronunciation patterns (not Dhivehi romanization)
 */

const SUKUN = 'ް';
const ALIFU = 'އ';

// --- Multi-letter patterns (longest first, order matters) ---
const multiPatterns: [string, string][] = [
	['tion', 'ޝަން'],
	['sion', 'ޝަން'],
	['ould', 'ުޑް'],
	['ight', 'އައިޓް'],
	['ough', 'އޯ'],
	['earch', 'ާޗް'],
	['ear', 'ިއަރ'],
	['eer', 'ިއަރ'],
	['air', 'އެއަރ'],
	['are', 'އެއަރ'],
	['dge', 'ޖް'],
	['ck', 'ކް'],
	['nk', 'ންކ'],
	['qu', 'ކްވ'],
	['wh', 'ވ'],
	['wr', 'ރ'],
	['kn', 'ނ'],
	['ph', 'ފ'],
	['ch', 'ޗ'],
	['sh', 'ޝ'],
];

// Voiced "th" words — common English function words
const voicedThWords = new Set([
	'the', 'that', 'this', 'then', 'than', 'them', 'they',
	'there', 'their', 'these', 'those', 'though', 'thus',
	'therefore', 'thereby', 'thereafter',
]);

// Words where final 's' is voiced /z/
const voicedSWords = new Set([
	'is', 'his', 'has', 'was', 'as', 'these', 'those',
	'goes', 'does', 'because', 'always', 'sometimes',
	'please', 'cheese', 'use', 'rise', 'close', 'lose',
]);

// Words where 'g' stays hard before e/i/y (not /dʒ/)
const hardGWords = new Set([
	'get', 'gets', 'getting', 'give', 'gives', 'giving', 'given',
	'girl', 'girls', 'begin', 'begins', 'beginning', 'began',
	'gift', 'gifts', 'gear', 'gears', 'geek', 'gig', 'gigs',
	'giggle', 'gilt', 'giddy', 'gizzard', 'git',
	'together', 'target', 'tiger', 'finger', 'hunger', 'anger',
	'bigger', 'trigger', 'eager', 'linger', 'singer', 'longer',
]);

// --- Vowel digraphs ---
const vowelDigraphs: [string, string][] = [
	['oo', 'ޫ'],
	['ee', 'ީ'],
	['ea', 'ީ'],
	['ai', 'ޭ'],
	['ay', 'ޭ'],
	['ey', 'ޭ'],
	['oi', 'ޮއި'],
	['oy', 'ޮއި'],
	['ou', 'އައު'],
	['ow', 'އައު'],
	['aw', 'ޯ'],
];

// --- Consonant mappings ---
const consonantMap: Record<string, string> = {
	b: 'ބ', d: 'ޑ', f: 'ފ', g: 'ގ', h: 'ހ',
	j: 'ޖ', k: 'ކ', l: 'ލ', m: 'މ', n: 'ނ',
	p: 'ޕ', r: 'ރ', s: 'ސ', t: 'ޓ', v: 'ވ',
	w: 'ވ', x: 'ކްސ', y: 'ޔ', z: 'ޒ', q: 'ކ',
};

const vowelMap: Record<string, string> = {
	a: 'ެ', e: 'ެ', i: 'ި', o: 'ޮ', u: 'ު',
};

const longVowelMap: Record<string, string> = {
	a: 'ާ', e: 'ީ', i: 'ައި', o: 'ޯ', u: 'ޫ',
};

// Silent-e makes vowels shift: name=/eɪ/, time=/aɪ/, note=/oʊ/, cute=/juː/
const silentEVowelMap: Record<string, string> = {
	a: 'ޭ', e: 'ީ', i: 'ައި', o: 'ޯ', u: 'ޫ',
};

function isCons(ch: string): boolean {
	return /^[bcdfghjklmnpqrstvwxyz]$/.test(ch);
}

function isVow(ch: string): boolean {
	return /^[aeiou]$/.test(ch);
}

/** Silent-e: vowel + single consonant + 'e' at word end → long vowel + consonant with sukun */
function checkSilentE(word: string, vPos: number): string | null {
	if (
		vPos + 2 === word.length - 1 &&
		isVow(word[vPos]) &&
		isCons(word[vPos + 1]) &&
		word[vPos + 1] !== 'r' && // -Vre endings (here, care, more) handled by vowel+r rules
		word[vPos + 2] === 'e'
	) {
		const vowel = silentEVowelMap[word[vPos]] ?? longVowelMap[word[vPos]];
		const mid = word[vPos + 1];
		// c/g before final 'e' are soft: c→ސ (place, nice), g→ޖ (large, page)
		let midCons: string;
		if (mid === 'c') midCons = 'ސ';
		else if (mid === 'g') midCons = 'ޖ';
		else midCons = consonantMap[mid] ?? mid;
		return (vowel ?? '') + midCons + SUKUN;
	}
	return null;
}

/** Should this vowel be long based on following consonant cluster? */
function shouldBeLong(word: string, pos: number): boolean {
	const ch = word[pos];
	if (!isVow(ch)) return false;
	const rest = word.substring(pos + 1);

	// Word-final open vowel is typically long (so, no, go, hi, menu)
	// But not single-letter words (a, I)
	if (rest.length === 0 && word.length > 1) return true;

	if (ch === 'a') {
		if (/^(sk|st|ss|sp|ft|nce|rch)/.test(rest)) return true;
	}
	if (ch === 'o') {
		if (/^(st|ld|lt|n[^aeiou]|r[^aeiou])/.test(rest)) return true;
		// open syllable: single consonant + vowel
		if (rest.length >= 2 && isCons(rest[0]) && isVow(rest[1]) && !isCons(rest[1])) return true;
	}
	if (ch === 'e') {
		if (/^(r[^aeiou])/.test(rest)) return true;
	}
	return false;
}

/** 'c' before e/i/y → ސ, otherwise ކ */
function resolveC(word: string, pos: number): string {
	const next = word[pos + 1];
	return (next === 'e' || next === 'i' || next === 'y') ? 'ސ' : 'ކ';
}

/** Resolve 'th' — voiced (ދ) for function words, voiceless (ތ) otherwise */
function resolveTh(word: string): string {
	return voicedThWords.has(word) ? 'ދ' : 'ތ';
}

/** Try matching a vowel digraph at position. Returns [thaana, length] or null */
function tryVowelDigraph(word: string, pos: number): [string, number] | null {
	for (const [dig, thaana] of vowelDigraphs) {
		if (word.startsWith(dig, pos)) return [thaana, dig.length];
	}
	return null;
}

/** Handle the vowel portion after a consonant has been emitted */
function consumeVowel(word: string, i: number): [string, number] {
	// Check vowel-initial multi-patterns first (prevents greedy vowel consumption)
	// e.g. r+ight → ރައިޓް not ރިގްހްޓް
	for (const [pat, thaana] of multiPatterns) {
		if (isVow(pat[0]) && word.startsWith(pat, i)) {
			const adapted = thaana.startsWith(ALIFU) ? thaana.slice(1) : thaana;
			return [adapted, pat.length];
		}
	}

	// "our" before consonant → ޯ (source, course, four, court)
	if (word[i] === 'o' && word[i + 1] === 'u' && word[i + 2] === 'r') {
		if (i + 3 === word.length) return ['ޯރް', 3]; // word-final "-our" (four, pour)
		if (i + 3 < word.length && isCons(word[i + 3])) return ['ޯ', 3]; // before consonant (source, court)
	}

	// Word-final "-ere" → ިއަރް (here, where, there → /ɪər/)
	if (word[i] === 'e' && word[i + 1] === 'r' && word[i + 2] === 'e' && i + 3 === word.length) {
		return ['ިއަރް', 3];
	}

	// Word-final "-ore" → ޯރް (more, before, core)
	if (word[i] === 'o' && word[i + 1] === 'r' && word[i + 2] === 'e' && i + 3 === word.length) {
		return ['ޯރް', 3];
	}

	// Word-final "-or" → ޯރް (for, or, floor)
	if (word[i] === 'o' && word[i + 1] === 'r' && i + 2 === word.length) {
		return ['ޯރް', 2];
	}

	// Word-final "-ar" → ާރް (car, star, far)
	if (word[i] === 'a' && word[i + 1] === 'r' && i + 2 === word.length) {
		return ['ާރް', 2];
	}

	// Word-final "-er" → ަރް (after, water, never, computer)
	if (word[i] === 'e' && word[i + 1] === 'r' && i + 2 === word.length) {
		return ['ަރް', 2];
	}

	// "or" before consonant → ޯ (form, north, sport, work)
	if (word[i] === 'o' && word[i + 1] === 'r' && i + 2 < word.length && isCons(word[i + 2])) {
		return ['ޯ', 2];
	}

	// "ar" before consonant → ާ (part, large, start, card)
	if (word[i] === 'a' && word[i + 1] === 'r' && i + 2 < word.length && isCons(word[i + 2])) {
		return ['ާ', 2];
	}

	// "ir"/"ur"/"er" before consonant → ާ (first, bird, turn, burn, term, nerve)
	if ((word[i] === 'i' || word[i] === 'u' || word[i] === 'e') &&
		word[i + 1] === 'r' && i + 2 < word.length && isCons(word[i + 2])) {
		return ['ާ', 2];
	}

	// "-ous" ending → ަސް (famous, various, nervous) — prevent 'ou' digraph from firing
	if (word[i] === 'o' && word[i + 1] === 'u' && word[i + 2] === 's' && i + 3 === word.length) {
		return ['ަސް', 3];
	}

	// Silent-e check
	const silentE = checkSilentE(word, i);
	if (silentE) return [silentE, 3];

	// Vowel digraph (includes 'ey' → ޭ for they, key)
	// Strip leading alifu when attached to a preceding consonant
	const vd = tryVowelDigraph(word, i);
	if (vd) {
		const adapted = vd[0].startsWith(ALIFU) ? vd[0].slice(1) : vd[0];
		return [adapted, vd[1]];
	}

	// Non-initial 'y' acting as vowel after a consonant
	if (word[i] === 'y' && i > 0) {
		if (i + 1 === word.length) {
			return [word.length <= 3 ? 'ައި' : 'ީ', 1];
		}
		return ['ި', 1];
	}

	// Past tense "-ed" at word end: silent 'e' after consonant (except t/d)
	// dropped → ޑްރޮޕްޑް, not ޑްރޮޕެޑް
	if (word[i] === 'e' && word[i + 1] === 'd' && i + 2 === word.length && i > 0) {
		const prev = word[i - 1];
		if (isCons(prev) && prev !== 't' && prev !== 'd') {
			return [SUKUN + (consonantMap['d'] ?? 'ޑ') + SUKUN, 2];
		}
	}

	// Word-final 'o' as /uː/ → ޫ (to, do, into, undo, who, two)
	if (word[i] === 'o' && i + 1 === word.length &&
		(word.endsWith('to') || word.endsWith('do') || word === 'who' || word === 'two')) {
		return ['ޫ', 1];
	}

	// 'a' after w/wh → ޮ (what, want, watch, wash, was)
	if (word[i] === 'a' && i > 0) {
		const prev = word[i - 1];
		if (prev === 'w' || (prev === 'h' && i >= 2 && word[i - 2] === 'w')) {
			return ['ޮ', 1];
		}
	}

	// Word-final 'e' after soft c/g → silent (force→ފޯސް, large→ލާޖް)
	// The 'e' only exists to soften the c/g, no vowel sound
	if (word[i] === 'e' && i + 1 === word.length && i > 0 && (word[i - 1] === 'c' || word[i - 1] === 'g')) {
		return [SUKUN, 1];
	}

	// Single vowel
	const long = shouldBeLong(word, i);
	const diac = long ? (longVowelMap[word[i]] ?? vowelMap[word[i]]) : vowelMap[word[i]];
	return [diac ?? '', 1];
}

// Irregular words that can't be rule-based
const irregularWords: Record<string, string> = {
	// Common function words
	'the': 'ދެ',
	'are': 'އާ',
	'were': 'ވާ',
	'there': 'ދެއަރް',
	'where': 'ވެއަރް',
	// Common words where u=/ʌ/ (not /ʊ/)
	'but': 'ބަޓް',
	'just': 'ޖަސްޓް',
	'much': 'މަޗް',
	'must': 'މަސްޓް',
	'such': 'ސަޗް',
	'up': 'އަޕް',
	'us': 'އަސް',
	'cut': 'ކަޓް',
	'cup': 'ކަޕް',
	'run': 'ރަން',
	'fun': 'ފަން',
	'sun': 'ސަން',
	'other': 'އަދަރް',
	'under': 'އަންޑަރް',
	'bonus': 'ބޯނަސް',
	'source': 'ސޯސް',
	'course': 'ކޯސް',
	'of': 'އޮފް',
	// "one" family — o=/w/, completely irregular
	'one': 'ވަން',
	'once': 'ވަންސް',
	// "some" family — o=/ʌ/
	'some': 'ސަމް',
	'someone': 'ސަމްވަން',
	'something': 'ސަމްތިންގް',
	'sometimes': 'ސަމްޓައިމްޒް',
	'somewhere': 'ސަމްވެއަރް',
	'somehow': 'ސަމްހައު',
	'somewhat': 'ސަމްވޮޓް',
	// "come/done" family — o=/ʌ/ + silent e
	'come': 'ކަމް',
	'done': 'ޑަން',
	'none': 'ނަން',
	'gone': 'ގޮން',
	'love': 'ލަވް',
	'move': 'މޫވް',
	'prove': 'ޕްރޫވް',
	'above': 'އަބަވް',
	// Foreign final-e pronounced
	'recipe': 'ރެސިޕީ',
};

function transliterateWord(word: string): string {
	// Check irregular words first
	if (irregularWords[word]) return irregularWords[word];

	// Voiced final 's' → 'z' (is→iz, has→haz, was→waz)
	if (voicedSWords.has(word) && word.endsWith('s')) {
		word = word.slice(0, -1) + 'z';
	} else if (voicedSWords.has(word) && word.endsWith('se')) {
		word = word.slice(0, -2) + 'ze';
	}

	let result = '';
	let i = 0;
	const len = word.length;

	while (i < len) {
		// --- 1. "ng" at end or before consonant → ންގ ---
		if (word.startsWith('ng', i) && (i + 2 >= len || isCons(word[i + 2]))) {
			result += 'ންގ';
			i += 2;
			continue;
		}

		// --- 2. "th" with voiced/voiceless ---
		if (word.startsWith('th', i)) {
			result += resolveTh(word);
			i += 2;
			if (i < len && isVow(word[i])) {
				const [v, vl] = consumeVowel(word, i);
				result += v;
				i += vl;
			} else {
				result += SUKUN;
			}
			continue;
		}

		// --- 3. Other multi-letter patterns ---
		let matched = false;
		for (const [pat, thaana] of multiPatterns) {
			if (word.startsWith(pat, i)) {
				result += thaana;
				i += pat.length;
				// If output ends with a bare Thaana consonant (no sukun/vowel diacritic),
				// consume following vowel like a regular consonant
				// e.g. wh→ވ, ph→ފ, ch→ޗ, sh→ޝ, nk→ންކ, qu→ކްވ
				const lastCode = thaana.charCodeAt(thaana.length - 1);
				if (lastCode >= 0x0780 && lastCode <= 0x07A5) {
					if (i < len && (isVow(word[i]) || (word[i] === 'y' && i > 0))) {
						const [v, vl] = consumeVowel(word, i);
						result += v;
						i += vl;
					} else {
						result += SUKUN;
					}
				}
				matched = true;
				break;
			}
		}
		if (matched) continue;

		// --- 4. Double consonants → skip first ---
		if (i + 1 < len && isCons(word[i]) && word[i] === word[i + 1] && word[i] !== 'x') {
			i++;
			continue;
		}

		// --- 5. 'c' soft/hard ---
		if (word[i] === 'c') {
			result += resolveC(word, i);
			i++;
			if (i < len && isVow(word[i])) {
				const [v, vl] = consumeVowel(word, i);
				result += v;
				i += vl;
			} else {
				result += SUKUN;
			}
			continue;
		}

		// --- 6. 'g' soft/hard ---
		// g before e/i/y → ޖ (general, large, gem) EXCEPT common hard-g words (get, give, girl, etc.)
		if (word[i] === 'g') {
			const next = word[i + 1];
			const softG = (next === 'e' || next === 'i' || next === 'y') && !hardGWords.has(word);
			result += softG ? 'ޖ' : 'ގ';
			i++;
			if (i < len && (isVow(word[i]) || (word[i] === 'y' && i > 0))) {
				const [v, vl] = consumeVowel(word, i);
				result += v;
				i += vl;
			} else {
				result += SUKUN;
			}
			continue;
		}

		// --- 7. 's' between vowels → ޒ ---
		if (word[i] === 's' && i > 0 && i + 1 < len && isVow(word[i - 1]) && isVow(word[i + 1]) && word[i + 1] === 'e' && i + 1 === len - 1) {
			// word-final "-se" like "use" — voiced z + silent e
			result += 'ޒް';
			i += 2;
			continue;
		}

		// --- 7. Standalone "-ous" ending → ަސް (famous, various, nervous) ---
		if (word[i] === 'o' && word[i + 1] === 'u' && word[i + 2] === 's' && i + 3 === len) {
			result += ALIFU + 'ަސް';
			i += 3;
			continue;
		}

		// --- 7. Vowel digraphs (standalone, word-initial or after vowel) ---
		if (isVow(word[i]) && i + 1 < len) {
			const vd = tryVowelDigraph(word, i);
			if (vd) {
				const prev = i > 0 ? word[i - 1] : null;
				const standalone = i === 0 || (prev && isVow(prev));
				if (standalone && !vd[0].startsWith(ALIFU)) {
					result += ALIFU + vd[0];
				} else {
					result += vd[0];
				}
				i += vd[1];
				continue;
			}
		}

		// --- 8. Regular consonant ---
		const cons = consonantMap[word[i]];
		if (cons) {
			// 'y' word-initial is consonant ޔ, handle normally
			if (word[i] === 'y' && i > 0) {
				// Non-initial 'y' is a vowel — handle in step 9
			} else {
				result += cons;
				i++;
				if (i < len && (isVow(word[i]) || (word[i] === 'y' && i > 0))) {
					const [v, vl] = consumeVowel(word, i);
					result += v;
					i += vl;
				} else {
					result += SUKUN;
				}
				continue;
			}
		}

		// --- 9. 'y' as vowel (non-initial) ---
		if (word[i] === 'y' && i > 0) {
			if (i + 1 === len) {
				// Word-final y: short words (my, by, try) → ައި, longer (happy, clearly) → ީ
				result += word.length <= 3 ? 'ައި' : 'ީ';
			} else if (i + 1 < len && (isVow(word[i + 1]) || word[i + 1] === 'y')) {
				// y before vowel → consonant ޔ
				result += 'ޔ';
			} else {
				// y before consonant → ި
				result += 'ި';
			}
			i++;
			continue;
		}

		// --- 10. Standalone single vowel ---
		if (isVow(word[i])) {
			// Pronoun "i" → އައި
			if (word === 'i' && len === 1) {
				result += ALIFU + 'ައި';
				i++;
				continue;
			}
			if (word[i] === 'e' && i === len - 1 && i > 0) {
				i++; // silent final e
				continue;
			}
			const long = shouldBeLong(word, i);
			const diac = long ? (longVowelMap[word[i]] ?? vowelMap[word[i]]) : vowelMap[word[i]];
			result += ALIFU + (diac ?? '');
			i++;
			continue;
		}

		// --- 10. Pass through ---
		result += word[i];
		i++;
	}

	return result;
}

/** Check if text is Latin-script (English name) */
export function isLatinText(text: string): boolean {
	return /^[a-zA-Z\s\-'.]+$/.test(text.trim());
}

// Contraction suffixes → their consonant sounds (not full words)
const contractionSounds: Record<string, string> = {
	's': 'ސް',
	've': 'ވް',
	're': 'ރް',
	'll': 'ލް',
	't': 'ޓް',
	'd': 'ޑް',
	'm': 'މް',
};

/** Transliterate a token that may contain hyphens or apostrophes */
function transliterateToken(token: string): string {
	// Strip leading/trailing punctuation, transliterate the word, reattach
	const punctMatch = token.match(/^([^a-z'-]*)([a-z'-]+)([^a-z'-]*)$/);
	if (!punctMatch) return token;
	const [, leading, core, trailing] = punctMatch;

	// Handle contractions: split off apostrophe suffix ('s, 've, 're, 'll, 't, 'd, 'm)
	const apoMatch = core.match(/^(.+?)'(s|ve|re|ll|t|d|m)$/);
	if (apoMatch) {
		return leading + transliterateWord(apoMatch[1]) + (contractionSounds[apoMatch[2]] ?? transliterateWord(apoMatch[2])) + trailing;
	}

	// Handle hyphens: transliterate each part separately
	if (core.includes('-')) {
		return leading + core.split('-').map(transliterateWord).join('-') + trailing;
	}

	return leading + transliterateWord(core) + trailing;
}

/** Transliterate English text to Thaana script */
export function englishToThaana(input: string): string {
	// Split into segments: preserve code fences, inline code, and URLs as-is
	return input.replace(
		/(```\w*\n[\s\S]*?\n```|`[^`]+`|https?:\/\/\S+)|(\S+)/g,
		(_, preserve, word) => preserve ? preserve : transliterateToken(word.toLowerCase())
	);
}
