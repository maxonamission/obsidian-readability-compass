/**
 * Word tokenisation shared by all metrics.
 *
 * A word is a run of letters, optionally joined by apostrophes or hyphens
 * ("auto's", "e-mail" count as one word). This deliberately deviates from the
 * CI script `check_readability.py` (which splits on those characters); the
 * deviation is documented in docs/verkenning-leesbaarheid.md §5.
 */

export const WORD_RE = /\p{L}+(?:[’'-]\p{L}+)*/gu;

/** A long word (LIX definition, Björnsson) has more than 6 letters. */
export const LONG_WORD_LEN = 6;

export function extractWords(text: string): string[] {
	return text.match(WORD_RE) ?? [];
}

/** Number of letters in a word, ignoring joiners like ' and -. */
export function letterCount(word: string): number {
	return (word.match(/\p{L}/gu) ?? []).length;
}

export function isLongWord(word: string): boolean {
	return letterCount(word) > LONG_WORD_LEN;
}
