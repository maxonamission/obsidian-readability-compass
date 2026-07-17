/**
 * The language registry: everything language-specific lives here, as data.
 *
 * LIX (the primary score) is language-independent; this registry only powers
 * the *secondary* layer — stopword-based auto-detection and the Flesch-family
 * formula per language. Adding a language is one `LanguageDefinition` entry:
 * a stopword set, a syllable heuristic and the published formula
 * coefficients. Everything downstream (detection, analysis, settings
 * dropdown, panel labels) derives from this list.
 *
 * Syllable counters are heuristics (vowel-group based) and the formulas are
 * marked indicative in the UI; when detection is not confident the caller
 * falls back to LIX only.
 */

export type LanguageCode =
	| "nl" | "en" | "de" | "es" | "fr" | "pt" | "it" | "ru" | "tr" | "cs";
export type DetectedLanguage = LanguageCode | "unknown";

/** Linear Flesch-family formula: base − perWps·(words/sentence) − perSpw·(syllables/word). */
export interface FleschFormula {
	/** Display name of the published variant (e.g. "Flesch-Douma"). */
	name: string;
	base: number;
	perWps: number;
	perSpw: number;
}

export interface LanguageDefinition {
	code: LanguageCode;
	/** English display label for the UI (settings dropdown, panel). */
	label: string;
	/** Distinctive function words used for auto-detection. */
	stopwords: ReadonlySet<string>;
	countSyllables: (word: string) => number;
	flesch: FleschFormula;
	/**
	 * Single-word discourse connectives, for the experimental connective-density
	 * signal (BC_E1_S23). Optional and only populated where a list exists;
	 * absent → no connective hint for that language. Multi-word markers (e.g.
	 * "in contrast") are out of scope for the single-token match.
	 */
	connectives?: ReadonlySet<string>;
}

interface VowelCounterOptions {
	/** Plain vowels (lowercase). A contiguous run counts as one group. */
	vowels: string;
	/** Vowels that always start a new group (diaeresis/accents). */
	marked?: string;
	/** Strip one silent final "e" before counting (French). */
	stripSilentFinalE?: boolean;
}

/** Build a vowel-group syllable counter. Shared by all non-English languages. */
export function makeVowelGroupCounter(
	options: VowelCounterOptions,
): (word: string) => number {
	const vowels = new Set(options.vowels);
	const marked = new Set(options.marked ?? "");
	return (word: string): number => {
		let w = word.toLowerCase();
		if (options.stripSilentFinalE) w = w.replace(/e$/, "");
		let count = 0;
		let previousWasVowel = false;
		for (const ch of w) {
			const startsNew = marked.has(ch);
			const isVowel = vowels.has(ch) || startsNew;
			if (isVowel && (!previousWasVowel || startsNew)) count++;
			previousWasVowel = isVowel;
		}
		if (count === 0 && /\p{L}/u.test(w)) return 1;
		return count;
	};
}

/** English syllable heuristic: vowel groups, with common silent endings removed. */
export function countSyllablesEn(word: string): number {
	let w = word.toLowerCase().replace(/[^a-z]/g, "");
	if (w.length === 0) return 0;
	if (w.length <= 3) return 1;
	w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
	return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length);
}

/** Dutch syllable heuristic: vowel groups; a diaeresis starts a new group (be-ëindigen). */
export const countSyllablesNl = makeVowelGroupCounter({
	vowels: "aeiouy",
	marked: "ëïöüäéáíóúèàù",
});

export const LANGUAGES: readonly LanguageDefinition[] = [
	{
		code: "nl",
		label: "Dutch",
		stopwords: new Set([
			"het", "een", "niet", "ook", "maar", "voor", "naar", "deze", "wordt",
			"geen", "zijn", "wel", "nog", "bij", "uit", "aan", "dan", "omdat",
			"tussen", "onder",
		]),
		countSyllables: countSyllablesNl,
		// Douma (1960), the Dutch adaptation of Flesch Reading Ease.
		flesch: { name: "Flesch-Douma", base: 206.84, perWps: 0.93, perSpw: 77 },
		connectives: new Set([
			"echter", "daarom", "omdat", "hoewel", "bovendien", "daarnaast",
			"bijgevolg", "ondertussen", "niettemin", "desondanks", "terwijl",
			"immers", "anderzijds", "enerzijds", "vervolgens", "namelijk",
			"zodat", "doordat", "waardoor", "kortom", "bijvoorbeeld", "aangezien",
			"tevens", "eveneens", "weliswaar",
		]),
	},
	{
		code: "en",
		label: "English",
		stopwords: new Set([
			"the", "and", "of", "you", "that", "with", "this", "from", "they",
			"have", "not", "but", "are", "was", "which", "their", "would",
			"there", "been", "what",
		]),
		countSyllables: countSyllablesEn,
		// Flesch (1948), the original Reading Ease formula.
		flesch: { name: "Flesch", base: 206.835, perWps: 1.015, perSpw: 84.6 },
		connectives: new Set([
			"however", "therefore", "because", "although", "though", "moreover",
			"furthermore", "consequently", "meanwhile", "nevertheless",
			"nonetheless", "thus", "hence", "whereas", "besides", "instead",
			"otherwise", "similarly", "accordingly", "additionally", "conversely",
			"specifically", "indeed", "likewise", "subsequently", "ultimately",
			"regardless",
		]),
	},
	{
		code: "de",
		label: "German",
		stopwords: new Set([
			"der", "die", "das", "und", "ist", "nicht", "mit", "für", "auf",
			"ein", "eine", "sich", "auch", "werden", "oder", "aber", "wird",
			"dass", "durch", "beim",
		]),
		countSyllables: makeVowelGroupCounter({ vowels: "aeiouyäöü" }),
		// Amstad (1978), the German adaptation of Flesch Reading Ease.
		flesch: { name: "Flesch-Amstad", base: 180, perWps: 1, perSpw: 58.5 },
	},
	{
		code: "es",
		label: "Spanish",
		stopwords: new Set([
			"el", "los", "las", "una", "pero", "más", "muy", "cuando", "donde",
			"aunque", "mientras", "después", "así", "esto", "eso", "usted",
			"también", "porque", "hasta", "sobre",
		]),
		countSyllables: makeVowelGroupCounter({
			vowels: "aeiouü",
			marked: "áéíóú",
		}),
		// Fernández-Huerta (1959), the Spanish adaptation of Flesch Reading Ease.
		flesch: { name: "Fernández-Huerta", base: 206.84, perWps: 1.02, perSpw: 60 },
	},
	{
		code: "fr",
		label: "French",
		stopwords: new Set([
			"le", "les", "des", "une", "est", "dans", "pour", "que", "qui",
			"avec", "sur", "pas", "plus", "par", "comme", "être", "cette",
			"vous", "nous", "sont",
		]),
		countSyllables: makeVowelGroupCounter({
			vowels: "aeiouyœ",
			marked: "éèêëàâîïôûù",
			stripSilentFinalE: true,
		}),
		// Kandel & Moles (1958), the French adaptation of Flesch Reading Ease.
		flesch: { name: "Kandel-Moles", base: 209, perWps: 1.15, perSpw: 68 },
	},
	{
		code: "pt",
		label: "Portuguese",
		stopwords: new Set([
			"não", "uma", "com", "mas", "como", "ele", "ela", "você", "também",
			"já", "são", "muito", "quando", "entre", "sem", "isso", "mesmo",
			"ainda", "depois", "essa",
		]),
		countSyllables: makeVowelGroupCounter({
			vowels: "aeiou",
			marked: "áéíóúâêôãõà",
		}),
		// Martins et al. (1996), the Portuguese adaptation of Flesch Reading Ease.
		flesch: { name: "Flesch-Martins", base: 248.835, perWps: 1.015, perSpw: 84.6 },
	},
	{
		code: "it",
		label: "Italian",
		stopwords: new Set([
			"il", "gli", "della", "degli", "nella", "dello", "sono", "anche",
			"perché", "più", "questo", "questa", "quando", "molto", "come",
			"con", "che", "non", "delle", "negli",
		]),
		// Accents stay inside the vowel group (città, più), not a new group —
		// Italian diphthongs (più, può) would otherwise over-count.
		countSyllables: makeVowelGroupCounter({ vowels: "aeiouàèéìíòóùú" }),
		// Franchina & Vacca (1972), the Italian adaptation of Flesch Reading
		// Ease (F = 206 − 0.65·syllables-per-100-words − words-per-sentence).
		flesch: { name: "Flesch-Vacca", base: 206, perWps: 1, perSpw: 65 },
	},
	{
		code: "ru",
		label: "Russian",
		stopwords: new Set([
			"это", "что", "как", "для", "его", "она", "они", "но", "не", "же",
			"бы", "или", "также", "потому", "когда", "чтобы", "очень", "всех",
			"этот", "может",
		]),
		// Russian syllables = number of vowels: every vowel starts its own
		// group (adjacent vowels like поэт → по-эт count separately), so the
		// whole vowel set is "marked".
		countSyllables: makeVowelGroupCounter({
			vowels: "аеёиоуыэюя",
			marked: "аеёиоуыэюя",
		}),
		// Oborneva (2006), the Russian adaptation of Flesch Reading Ease.
		flesch: { name: "Flesch-Oborneva", base: 206.835, perWps: 1.52, perSpw: 65.14 },
	},
	{
		code: "tr",
		label: "Turkish",
		stopwords: new Set([
			"bir", "bu", "ve", "için", "ile", "çok", "daha", "gibi", "kadar",
			"sonra", "ama", "değil", "olan", "olarak", "her", "ancak", "veya",
			"şey", "diğer", "hepsi",
		]),
		// Turkish is (near-)phonemic: syllables = number of vowels, and vowel
		// clusters like "saat" (sa-at) are two syllables, so every vowel is
		// "marked" and counts on its own.
		countSyllables: makeVowelGroupCounter({
			vowels: "aeıioöuü",
			marked: "aeıioöuü",
		}),
		// Ateşman (1997), the Turkish adaptation of Flesch Reading Ease. Its
		// coefficients weight words-per-sentence and syllables-per-word
		// differently from English, kept in their published slots.
		flesch: { name: "Ateşman", base: 198.825, perWps: 2.61, perSpw: 40.175 },
	},
	{
		code: "cs",
		label: "Czech",
		// Distinctive Czech function words; the ř/ě/ů/ž/č-carrying ones don't
		// occur in the other registry languages, so detection is unambiguous.
		stopwords: new Set([
			"že", "však", "před", "při", "přes", "protože", "může", "ještě",
			"něco", "řekl", "přece", "žádný", "což", "či", "jsem", "jsou", "už",
			"také", "děti", "který",
		]),
		// Czech syllable nucleus = a vowel (accents and "ě" included);
		// contiguous vowels form one group, so the diphthongs ou/au/eu count
		// once. A vowelless word carried by a syllabic r/l (vlk, krk) falls
		// back to 1. Off by ±1 on rare hiatus and syllabic consonants — LIX
		// stays the main score.
		countSyllables: makeVowelGroupCounter({ vowels: "aáeéěiíoóuúůyý" }),
		// Bendová & Cinková (2021), a Flesch Reading Ease recalibration for
		// Czech fitted on the InterCorp EN↔CS parallel corpus (TSD 2021 /
		// Jazykovedný časopis 70(2)). The base is Flesch's 206.835 held fixed
		// while the two coefficients were fitted (the paper misprints it as
		// 206.935); the genuinely-Czech numbers are perWps 1.672, perSpw 62.18.
		flesch: { name: "Flesch-Bendová", base: 206.835, perWps: 1.672, perSpw: 62.18 },
	},
];

export const LANGUAGE_BY_CODE: ReadonlyMap<LanguageCode, LanguageDefinition> =
	new Map(LANGUAGES.map((language) => [language.code, language]));

const MIN_HITS = 3;

/**
 * Stopword-based detection over the whole registry. The winner needs at
 * least MIN_HITS hits and strictly more than every other language; anything
 * less returns "unknown" (→ LIX only).
 */
export function detectLanguage(words: readonly string[]): DetectedLanguage {
	const hits = new Map<LanguageCode, number>();
	for (const word of words) {
		const lower = word.toLowerCase();
		for (const language of LANGUAGES) {
			if (language.stopwords.has(lower)) {
				hits.set(language.code, (hits.get(language.code) ?? 0) + 1);
			}
		}
	}
	let best: LanguageCode | null = null;
	let bestHits = 0;
	let contested = false;
	for (const [code, count] of hits) {
		if (count > bestHits) {
			best = code;
			bestHits = count;
			contested = false;
		} else if (count === bestHits) {
			contested = true;
		}
	}
	if (best === null || bestHits < MIN_HITS || contested) return "unknown";
	return best;
}

export function averageSyllablesPerWord(
	words: readonly string[],
	countSyllables: (word: string) => number,
): number {
	if (words.length === 0) return 0;
	let total = 0;
	for (const word of words) total += countSyllables(word);
	return total / words.length;
}
