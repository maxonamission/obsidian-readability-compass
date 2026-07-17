/**
 * Combine per-note reports into one score for an explorer selection
 * (BC_E1_S10). The combined LIX is computed over the summed counts — not an
 * average of per-note scores — so short notes do not weigh as much as long
 * ones. Pure TypeScript — no Obsidian imports.
 */

import { cefrIndication, LixBand, lixBand, lixScore } from "./scores";

export interface FileCounts {
	words: number;
	sentences: number;
	longWords: number;
	/** The note's own LIX ceiling (its resolved target profile). */
	maxLix: number;
}

export interface CombinedScore {
	files: number;
	words: number;
	sentences: number;
	longWords: number;
	readingMinutes: number;
	/** null below the minimum word count. */
	lix: number | null;
	band: LixBand | null;
	cefr: string | null;
	/**
	 * Target verdict — only when every note resolves to the same ceiling;
	 * null (with maxLix null) when the selection mixes target profiles.
	 */
	onTarget: boolean | null;
	maxLix: number | null;
}

export function combineCounts(
	files: FileCounts[],
	minWords: number,
	wordsPerMinute: number,
): CombinedScore {
	const words = files.reduce((sum, file) => sum + file.words, 0);
	const sentences = files.reduce((sum, file) => sum + file.sentences, 0);
	const longWords = files.reduce((sum, file) => sum + file.longWords, 0);
	const lix = words >= minWords ? lixScore(words, sentences, longWords) : null;
	const ceilings = new Set(files.map((file) => file.maxLix));
	const maxLix = ceilings.size === 1 ? files[0].maxLix : null;
	return {
		files: files.length,
		words,
		sentences,
		longWords,
		readingMinutes: words / Math.max(1, wordsPerMinute),
		lix,
		band: lix === null ? null : lixBand(lix),
		cefr: lix === null ? null : cefrIndication(lix),
		onTarget: lix === null || maxLix === null ? null : lix <= maxLix,
		maxLix,
	};
}
