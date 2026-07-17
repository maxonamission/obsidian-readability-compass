/**
 * Long-sentence detection for inline editor marking (BC_E1_S5).
 *
 * Reuses the offset-preserving stripping and sentence segmentation, so ranges
 * are valid document offsets and nothing inside code, front matter, tables or
 * URLs is ever marked. Pure TypeScript — no Obsidian/CodeMirror imports.
 */

import { stripMarkdown, StripOptions } from "./strip-markdown";
import { splitSentences } from "./sentences";
import { isLongWord, WORD_RE } from "./words";

export interface HighlightRange {
	/** Document offsets (inclusive start, exclusive end). */
	start: number;
	end: number;
	tier: "long" | "very-long";
	words: number;
}

/**
 * Derive the marking threshold (words per sentence) from the active LIX
 * ceiling. Heuristic: a sentence spending more than ~55% of the ceiling on
 * length alone leaves too little room for long words — ≈ B1 (40) ⇒ 22,
 * ≈ B2 (45) ⇒ 25 (the common long-sentence norm), ≈ C1 (55) ⇒ 30. This is
 * what couples the marking to the target profile instead of a loose knob.
 */
export function longSentenceThreshold(maxLix: number): number {
	return Math.max(8, Math.round(maxLix * 0.55));
}

/** Very long: half as much again past the threshold — the "nobody finishes this" tier. */
export function verySentenceThreshold(thresholdWords: number): number {
	return Math.round(thresholdWords * 1.5);
}

export function longSentenceRanges(
	markdown: string,
	thresholdWords: number,
	strip: StripOptions = {},
): HighlightRange[] {
	const veryLong = verySentenceThreshold(thresholdWords);
	return splitSentences(stripMarkdown(markdown, strip))
		.filter((sentence) => sentence.words > thresholdWords)
		.map((sentence) => ({
			start: sentence.start,
			end: sentence.end,
			tier: sentence.words > veryLong ? ("very-long" as const) : ("long" as const),
			words: sentence.words,
		}));
}

export interface WordRange {
	start: number;
	end: number;
}

/**
 * Every long word (> 6 letters, the LIX definition) as a document range —
 * the other half of "where does the LIX problem sit": keyword-heavy text
 * scores high without a single long sentence (BC_E1_S8).
 */
export function longWordRanges(markdown: string, strip: StripOptions = {}): WordRange[] {
	const clean = stripMarkdown(markdown, strip);
	const ranges: WordRange[] = [];
	WORD_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = WORD_RE.exec(clean)) !== null) {
		if (isLongWord(match[0])) {
			ranges.push({ start: match.index, end: match.index + match[0].length });
		}
	}
	return ranges;
}
