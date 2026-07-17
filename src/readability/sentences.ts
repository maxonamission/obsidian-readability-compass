/**
 * Sentence segmentation with source offsets.
 *
 * Boundaries are runs of `.` `!` `?` and line breaks. Treating a line break
 * as a boundary means headings and list items count as their own short
 * "sentence" instead of gluing onto the next paragraph — a deliberate
 * deviation from `check_readability.py`, documented in
 * docs/verkenning-leesbaarheid.md §5.
 *
 * Offsets index into the cleaned text, which is offset-identical to the
 * original document (see strip-markdown.ts), so they can drive the editor.
 */

import { extractWords, isLongWord } from "./words";

export interface SentenceSpan {
	/** Start offset (inclusive) into the original document. */
	start: number;
	/** End offset (exclusive) into the original document. */
	end: number;
	/** Display text: trimmed, inner whitespace collapsed. */
	text: string;
	words: number;
	longWords: number;
}

const BOUNDARY_RE = /[.!?]+|\n/g;

export function splitSentences(clean: string): SentenceSpan[] {
	const spans: SentenceSpan[] = [];
	let cursor = 0;

	const flush = (endExclusive: number): void => {
		const segment = clean.slice(cursor, endExclusive);
		const words = extractWords(segment);
		if (words.length > 0) {
			const leading = segment.length - segment.trimStart().length;
			const trailing = segment.length - segment.trimEnd().length;
			spans.push({
				start: cursor + leading,
				end: endExclusive - trailing,
				text: segment.trim().replace(/\s+/g, " "),
				words: words.length,
				longWords: words.filter(isLongWord).length,
			});
		}
	};

	BOUNDARY_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = BOUNDARY_RE.exec(clean)) !== null) {
		const isNewline = match[0] === "\n";
		flush(isNewline ? match.index : match.index + match[0].length);
		cursor = BOUNDARY_RE.lastIndex;
	}
	flush(clean.length);
	return spans;
}
