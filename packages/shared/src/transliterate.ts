/**
 * English → Thaana phonetic transliterator
 * Handles English pronunciation patterns (not Dhivehi romanization)
 */

const SUKUN = '\u07B0';
const ALIFU = '\u0787';

// --- Multi-letter patterns (longest first, order matters) ---
const multiPatterns: [string, string][] = [
	['tion', '\u079D\u07A6\u0782\u07B0'],
	['sion', '\u079D\u07A6\u0782\u07B0'],
	['ould', '\u07AA\u0791\u07B0'],
	['ight', '\u0787\u07A6\u0787\u07A8\u0793\u07B0'],
	['ough', '\u0787\u07AF'],
	['earch', '\u07A7\u0797\u07B0'],
	['ear', '\u07A8\u0787\u07A6\u0783'],
	['eer', '\u07A8\u0787\u07A6\u0783'],
	['air', '\u0787\u07AC\u0787\u07A6\u0783'],
	['are', '\u0787\u07AC\u0787\u07A6\u0783'],
	['dge', '\u0796\u07B0'],
	['ck', '\u0786\u07B0'],
	['nk', '\u0782\u07B0\u0786'],
	['qu', '\u0786\u07B0\u0788'],
	['wh', '\u0788'],
	['wr', '\u0783'],
	['kn', '\u0782'],
	['ph', '\u078A'],
	['ch', '\u0797'],
	['sh', '\u079D'],
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
	['oo', '\u07AB'],
	['ee', '\u07A9'],
	['ea', '\u07A9'],
	['ai', '\u07AD'],
	['ay', '\u07AD'],
	['ey', '\u07AD'],
	['oi', '\u07AE\u0787\u07A8'],
	['oy', '\u07AE\u0787\u07A8'],
	['ou', '\u0787\u07A6\u0787\u07AA'],
	['ow', '\u0787\u07A6\u0787\u07AA'],
	['aw', '\u07AF'],
];

// --- Consonant mappings ---
const consonantMap: Record<string, string> = {
	b: '\u0784', d: '\u0791', f: '\u078A', g: '\u078E', h: '\u0780',
	j: '\u0796', k: '\u0786', l: '\u078D', m: '\u0789', n: '\u0782',
	p: '\u0795', r: '\u0783', s: '\u0790', t: '\u0793', v: '\u0788',
	w: '\u0788', x: '\u0786\u07B0\u0790', y: '\u0794', z: '\u0792', q: '\u0786',
};

const vowelMap: Record<string, string> = {
	a: '\u07AC', e: '\u07AC', i: '\u07A8', o: '\u07AE', u: '\u07AA',
};

const longVowelMap: Record<string, string> = {
	a: '\u07A7', e: '\u07A9', i: '\u07A6\u07A8', o: '\u07AF', u: '\u07AB',
};

// Silent-e makes vowels shift: name=/eɪ/, time=/aɪ/, note=/oʊ/, cute=/juː/
const silentEVowelMap: Record<string, string> = {
	a: '\u07AD', e: '\u07A9', i: '\u07A6\u07A8', o: '\u07AF', u: '\u07AB',
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
		word[vPos + 1] !== 'r' &&
		word[vPos + 2] === 'e'
	) {
		const vowel = silentEVowelMap[word[vPos]] ?? longVowelMap[word[vPos]];
		const mid = word[vPos + 1];
		let midCons: string;
		if (mid === 'c') midCons = '\u0790';
		else if (mid === 'g') midCons = '\u0796';
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

	if (rest.length === 0 && word.length > 1) return true;

	if (ch === 'a') {
		if (/^(sk|st|ss|sp|ft|nce|rch)/.test(rest)) return true;
	}
	if (ch === 'o') {
		if (/^(st|ld|lt|n[^aeiou]|r[^aeiou])/.test(rest)) return true;
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
	return (next === 'e' || next === 'i' || next === 'y') ? '\u0790' : '\u0786';
}

/** Resolve 'th' — voiced (ދ) for function words, voiceless (ތ) otherwise */
function resolveTh(word: string): string {
	return voicedThWords.has(word) ? '\u078B' : '\u078C';
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
	for (const [pat, thaana] of multiPatterns) {
		if (isVow(pat[0]) && word.startsWith(pat, i)) {
			const adapted = thaana.startsWith(ALIFU) ? thaana.slice(1) : thaana;
			return [adapted, pat.length];
		}
	}

	if (word[i] === 'o' && word[i + 1] === 'u' && word[i + 2] === 'r') {
		if (i + 3 === word.length) return ['\u07AF\u0783\u07B0', 3];
		if (i + 3 < word.length && isCons(word[i + 3])) return ['\u07AF', 3];
	}

	if (word[i] === 'e' && word[i + 1] === 'r' && word[i + 2] === 'e' && i + 3 === word.length) {
		return ['\u07A8\u0787\u07A6\u0783\u07B0', 3];
	}

	if (word[i] === 'o' && word[i + 1] === 'r' && word[i + 2] === 'e' && i + 3 === word.length) {
		return ['\u07AF\u0783\u07B0', 3];
	}

	if (word[i] === 'o' && word[i + 1] === 'r' && i + 2 === word.length) {
		return ['\u07AF\u0783\u07B0', 2];
	}

	if (word[i] === 'a' && word[i + 1] === 'r' && i + 2 === word.length) {
		return ['\u07A7\u0783\u07B0', 2];
	}

	if (word[i] === 'e' && word[i + 1] === 'r' && i + 2 === word.length) {
		return ['\u07A6\u0783\u07B0', 2];
	}

	if (word[i] === 'o' && word[i + 1] === 'r' && i + 2 < word.length && isCons(word[i + 2])) {
		return ['\u07AF', 2];
	}

	if (word[i] === 'a' && word[i + 1] === 'r' && i + 2 < word.length && isCons(word[i + 2])) {
		return ['\u07A7', 2];
	}

	if ((word[i] === 'i' || word[i] === 'u' || word[i] === 'e') &&
		word[i + 1] === 'r' && i + 2 < word.length && isCons(word[i + 2])) {
		return ['\u07A7', 2];
	}

	if (word[i] === 'o' && word[i + 1] === 'u' && word[i + 2] === 's' && i + 3 === word.length) {
		return ['\u07A6\u0790\u07B0', 3];
	}

	const silentE = checkSilentE(word, i);
	if (silentE) return [silentE, 3];

	const vd = tryVowelDigraph(word, i);
	if (vd) {
		const adapted = vd[0].startsWith(ALIFU) ? vd[0].slice(1) : vd[0];
		return [adapted, vd[1]];
	}

	if (word[i] === 'y' && i > 0) {
		if (i + 1 === word.length) {
			return [word.length <= 3 ? '\u07A6\u07A8' : '\u07A9', 1];
		}
		return ['\u07A8', 1];
	}

	if (word[i] === 'e' && word[i + 1] === 'd' && i + 2 === word.length && i > 0) {
		const prev = word[i - 1];
		if (isCons(prev) && prev !== 't' && prev !== 'd') {
			return [SUKUN + (consonantMap['d'] ?? '\u0791') + SUKUN, 2];
		}
	}

	if (word[i] === 'o' && i + 1 === word.length &&
		(word.endsWith('to') || word.endsWith('do') || word === 'who' || word === 'two')) {
		return ['\u07AB', 1];
	}

	if (word[i] === 'a' && i > 0) {
		const prev = word[i - 1];
		if (prev === 'w' || (prev === 'h' && i >= 2 && word[i - 2] === 'w')) {
			return ['\u07AE', 1];
		}
	}

	if (word[i] === 'e' && i + 1 === word.length && i > 0 && (word[i - 1] === 'c' || word[i - 1] === 'g')) {
		return [SUKUN, 1];
	}

	const long = shouldBeLong(word, i);
	const diac = long ? (longVowelMap[word[i]] ?? vowelMap[word[i]]) : vowelMap[word[i]];
	return [diac ?? '', 1];
}

// Irregular words that can't be rule-based
const irregularWords: Record<string, string> = {
	'the': '\u078B\u07AC',
	'are': '\u0787\u07A7',
	'were': '\u0788\u07A7',
	'there': '\u078B\u07AC\u0787\u07A6\u0783\u07B0',
	'where': '\u0788\u07AC\u0787\u07A6\u0783\u07B0',
	'but': '\u0784\u07A6\u0793\u07B0',
	'just': '\u0796\u07A6\u0790\u07B0\u0793\u07B0',
	'much': '\u0789\u07A6\u0797\u07B0',
	'must': '\u0789\u07A6\u0790\u07B0\u0793\u07B0',
	'such': '\u0790\u07A6\u0797\u07B0',
	'up': '\u0787\u07A6\u0795\u07B0',
	'us': '\u0787\u07A6\u0790\u07B0',
	'cut': '\u0786\u07A6\u0793\u07B0',
	'cup': '\u0786\u07A6\u0795\u07B0',
	'run': '\u0783\u07A6\u0782\u07B0',
	'fun': '\u078A\u07A6\u0782\u07B0',
	'sun': '\u0790\u07A6\u0782\u07B0',
	'other': '\u0787\u07A6\u078B\u07A6\u0783\u07B0',
	'under': '\u0787\u07A6\u0782\u07B0\u0791\u07A6\u0783\u07B0',
	'bonus': '\u0784\u07AF\u0782\u07A6\u0790\u07B0',
	'source': '\u0790\u07AF\u0790\u07B0',
	'course': '\u0786\u07AF\u0790\u07B0',
	'of': '\u0787\u07AE\u078A\u07B0',
	'one': '\u0788\u07A6\u0782\u07B0',
	'once': '\u0788\u07A6\u0782\u07B0\u0790\u07B0',
	'some': '\u0790\u07A6\u0789\u07B0',
	'someone': '\u0790\u07A6\u0789\u07B0\u0788\u07A6\u0782\u07B0',
	'something': '\u0790\u07A6\u0789\u07B0\u078C\u07A8\u0782\u07B0\u078E\u07B0',
	'sometimes': '\u0790\u07A6\u0789\u07B0\u0793\u07A6\u07A8\u0789\u07B0\u0792\u07B0',
	'somewhere': '\u0790\u07A6\u0789\u07B0\u0788\u07AC\u0787\u07A6\u0783\u07B0',
	'somehow': '\u0790\u07A6\u0789\u07B0\u0780\u07A6\u07A8',
	'somewhat': '\u0790\u07A6\u0789\u07B0\u0788\u07AE\u0793\u07B0',
	'come': '\u0786\u07A6\u0789\u07B0',
	'done': '\u0791\u07A6\u0782\u07B0',
	'none': '\u0782\u07A6\u0782\u07B0',
	'gone': '\u078E\u07AE\u0782\u07B0',
	'love': '\u078D\u07A6\u0788\u07B0',
	'move': '\u0789\u07AB\u0788\u07B0',
	'prove': '\u0795\u07B0\u0783\u07AB\u0788\u07B0',
	'above': '\u0787\u07A6\u0784\u07A6\u0788\u07B0',
	'recipe': '\u0783\u07AC\u0790\u07A8\u0795\u07A9',
};

function transliterateWord(word: string): string {
	if (irregularWords[word]) return irregularWords[word];

	if (voicedSWords.has(word) && word.endsWith('s')) {
		word = word.slice(0, -1) + 'z';
	} else if (voicedSWords.has(word) && word.endsWith('se')) {
		word = word.slice(0, -2) + 'ze';
	}

	let result = '';
	let i = 0;
	const len = word.length;

	while (i < len) {
		if (word.startsWith('ng', i) && (i + 2 >= len || isCons(word[i + 2]))) {
			result += '\u0782\u07B0\u078E';
			i += 2;
			continue;
		}

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

		let matched = false;
		for (const [pat, thaana] of multiPatterns) {
			if (word.startsWith(pat, i)) {
				result += thaana;
				i += pat.length;
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

		if (i + 1 < len && isCons(word[i]) && word[i] === word[i + 1] && word[i] !== 'x') {
			i++;
			continue;
		}

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

		if (word[i] === 'g') {
			const next = word[i + 1];
			const softG = (next === 'e' || next === 'i' || next === 'y') && !hardGWords.has(word);
			result += softG ? '\u0796' : '\u078E';
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

		if (word[i] === 's' && i > 0 && i + 1 < len && isVow(word[i - 1]) && isVow(word[i + 1]) && word[i + 1] === 'e' && i + 1 === len - 1) {
			result += '\u0792\u07B0';
			i += 2;
			continue;
		}

		if (word[i] === 'o' && word[i + 1] === 'u' && word[i + 2] === 's' && i + 3 === len) {
			result += ALIFU + '\u07A6\u0790\u07B0';
			i += 3;
			continue;
		}

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

		const cons = consonantMap[word[i]];
		if (cons) {
			if (word[i] === 'y' && i > 0) {
				// Non-initial 'y' is a vowel — handle below
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

		if (word[i] === 'y' && i > 0) {
			if (i + 1 === len) {
				result += word.length <= 3 ? '\u07A6\u07A8' : '\u07A9';
			} else if (i + 1 < len && (isVow(word[i + 1]) || word[i + 1] === 'y')) {
				result += '\u0794';
			} else {
				result += '\u07A8';
			}
			i++;
			continue;
		}

		if (isVow(word[i])) {
			if (word === 'i' && len === 1) {
				result += ALIFU + '\u07A6\u07A8';
				i++;
				continue;
			}
			if (word[i] === 'e' && i === len - 1 && i > 0) {
				i++;
				continue;
			}
			const long = shouldBeLong(word, i);
			const diac = long ? (longVowelMap[word[i]] ?? vowelMap[word[i]]) : vowelMap[word[i]];
			result += ALIFU + (diac ?? '');
			i++;
			continue;
		}

		result += word[i];
		i++;
	}

	return result;
}

/** Check if text is Latin-script (English name) */
export function isLatinText(text: string): boolean {
	return /^[a-zA-Z\s\-'.]+$/.test(text.trim());
}

// Contraction suffixes → their consonant sounds
const contractionSounds: Record<string, string> = {
	's': '\u0790\u07B0',
	've': '\u0788\u07B0',
	're': '\u0783\u07B0',
	'll': '\u078D\u07B0',
	't': '\u0793\u07B0',
	'd': '\u0791\u07B0',
	'm': '\u0789\u07B0',
};

/** Transliterate a token that may contain hyphens or apostrophes */
function transliterateToken(token: string): string {
	const punctMatch = token.match(/^([^a-z'-]*)([a-z'-]+)([^a-z'-]*)$/);
	if (!punctMatch) return token;
	const [, leading, core, trailing] = punctMatch;

	const apoMatch = core.match(/^(.+?)'(s|ve|re|ll|t|d|m)$/);
	if (apoMatch) {
		return leading + transliterateWord(apoMatch[1]) + (contractionSounds[apoMatch[2]] ?? transliterateWord(apoMatch[2])) + trailing;
	}

	if (core.includes('-')) {
		return leading + core.split('-').map(transliterateWord).join('-') + trailing;
	}

	return leading + transliterateWord(core) + trailing;
}

/** Transliterate English text to Thaana script */
export function englishToThaana(input: string): string {
	return input.replace(
		/(```\w*\n[\s\S]*?\n```|`[^`]+`|https?:\/\/\S+)|(\S+)/g,
		(_, preserve, word) => preserve ? preserve : transliterateToken(word.toLowerCase())
	);
}
