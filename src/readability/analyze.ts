/**
 * The analysis orchestrator: Markdown in, one ReadabilityReport out.
 * Pure TypeScript — no Obsidian imports — so the whole engine is unit-testable.
 */

import { stripMarkdown, StripOptions } from "./strip-markdown";
import { extractWords, isLongWord } from "./words";
import { splitSentences, SentenceSpan } from "./sentences";
import {
	detectLanguage,
	averageSyllablesPerWord,
	DetectedLanguage,
	LanguageCode,
	LANGUAGE_BY_CODE,
} from "./language";
import {
	lixScore,
	lixBand,
	cefrIndication,
	fleschScore,
	fleschLabel,
	LixBand,
	FleschResult,
} from "./scores";

export interface AnalyzeOptions {
	/** "auto" detects the language from stopwords; unknown → LIX only. */
	language: "auto" | LanguageCode;
	/** Below this word count LIX/Flesch are suppressed (too erratic). */
	minWords: number;
	wordsPerMinute: number;
	/** The active LIX ceiling the text should stay under. */
	targetMaxLix: number;
	/** How many longest sentences to report. */
	topSentenceCount?: number;
	/** Measure the text inside Markdown tables too (default false). */
	includeTables?: boolean;
	/** Measure the text inside code fences/inline code too (default false). */
	includeCode?: boolean;
}

export interface ParagraphSpan {
	/** Document offsets (inclusive start, exclusive end). */
	start: number;
	end: number;
	/** Display text: trimmed, inner whitespace collapsed. */
	text: string;
	words: number;
	lix: number;
}

export interface SectionScore {
	/** Heading text (from the original markdown, without the #-markers). */
	heading: string;
	/** 1–6; the preamble before the first heading is level 0 with an empty heading. */
	level: number;
	/** Document offsets of the heading line — the jump target. The preamble points at the note start. */
	start: number;
	end: number;
	words: number;
	/** null below the note's minWords threshold (too erratic — same guard as the note score). */
	lix: number | null;
	/** null when lix is null; otherwise lix <= targetMaxLix. */
	onTarget: boolean | null;
}

export interface ReadabilityReport {
	words: number;
	sentences: number;
	paragraphs: number;
	characters: number;
	longWords: number;
	/** 0..1 share of long words. */
	longWordRatio: number;
	avgWordsPerSentence: number;
	language: DetectedLanguage;
	/** null when words < minWords. */
	lix: number | null;
	band: LixBand | null;
	cefr: string | null;
	/** null when the language is unknown or the text is too short. */
	flesch: FleschResult | null;
	readingMinutes: number;
	/**
	 * Per-heading-section scores, in document order (BC_E2_S2). Empty when the
	 * note has no headings — the note-level score already covers it.
	 */
	sections: SectionScore[];
	/** Longest sentences first; offsets are valid in the original document. */
	topSentences: SentenceSpan[];
	/** Highest-LIX paragraphs first (only paragraphs of ≥ 20 words). */
	topParagraphs: ParagraphSpan[];
	/** null when there is no score; otherwise lix <= targetMaxLix. */
	onTarget: boolean | null;
	targetMaxLix: number;
	minWords: number;
	/** Whether table text was part of this measurement. */
	tablesIncluded: boolean;
}

const DEFAULT_TOP_SENTENCES = 5;

/**
 * Below this, a paragraph LIX is mostly noise (the note-level guard uses 40;
 * paragraphs get a lower floor so the list stays useful on shorter prose).
 */
const MIN_PARAGRAPH_WORDS = 20;

/**
 * A list-item line (BC_E1_S15). Any indentation (spaces or tabs, so nested
 * lists count), a bullet (`-` `*` `+`) or a number (`1.` / `1)`), then
 * whitespace. Bulleted, numbered and nested lists are treated identically.
 * Detected on the *original* markdown, since stripping erases the marker.
 */
const LIST_LINE_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]/;

/**
 * Blocks of consecutive prose lines (non-blank and not a list item), with
 * document offsets. A list interrupts a prose block, exactly like a blank
 * line — so a bullet list is not ranked as a "paragraph" while the prose
 * around it still is. `original` aligns line-for-line with `clean` (stripping
 * preserves length and newlines).
 */
function paragraphBlocks(
	clean: string,
	original: string,
): Array<{ start: number; end: number }> {
	const blocks: Array<{ start: number; end: number }> = [];
	const sourceLines = original.split("\n");
	let offset = 0;
	let start = -1;
	let end = -1;
	let index = 0;
	for (const line of clean.split("\n")) {
		const isProse = /\S/.test(line) && !LIST_LINE_RE.test(sourceLines[index] ?? "");
		if (isProse) {
			if (start === -1) start = offset;
			end = offset + line.length;
		} else if (start !== -1) {
			blocks.push({ start, end });
			start = -1;
		}
		offset += line.length + 1;
		index++;
	}
	if (start !== -1) blocks.push({ start, end });
	return blocks;
}

function topParagraphs(clean: string, original: string, count: number): ParagraphSpan[] {
	const spans: ParagraphSpan[] = [];
	for (const block of paragraphBlocks(clean, original)) {
		const text = clean.slice(block.start, block.end);
		const words = extractWords(text);
		if (words.length < MIN_PARAGRAPH_WORDS) continue;
		const sentences = splitSentences(text);
		const lix = lixScore(
			words.length,
			sentences.length,
			words.filter(isLongWord).length,
		);
		if (lix === null) continue;
		spans.push({
			start: block.start,
			end: block.end,
			text: text.trim().replace(/\s+/g, " "),
			words: words.length,
			lix,
		});
	}
	return spans.sort((a, b) => b.lix - a.lix).slice(0, count);
}

const HEADING_LINE_RE = /^(#{1,6})\s+(.+?)\s*$/;

/**
 * Per-heading-section scores (BC_E2_S2): a heading starts a section that runs
 * until the next heading. Text before the first heading becomes a level-0
 * preamble entry (only when it contains words). Headings are detected on the
 * original markdown; the aligned `clean` line must still carry text, which
 * excludes look-alikes inside stripped regions (code fences).
 */
function sectionScores(
	clean: string,
	original: string,
	options: AnalyzeOptions,
): SectionScore[] {
	interface Boundary {
		heading: string;
		level: number;
		start: number;
		end: number;
		contentStart: number;
	}
	const boundaries: Boundary[] = [];
	const cleanLines = clean.split("\n");
	const sourceLines = original.split("\n");
	let offset = 0;
	for (let index = 0; index < sourceLines.length; index++) {
		const match = HEADING_LINE_RE.exec(sourceLines[index]);
		const lineLength = sourceLines[index].length;
		if (match !== null && /\S/.test(cleanLines[index] ?? "")) {
			boundaries.push({
				heading: match[2],
				level: match[1].length,
				start: offset,
				end: offset + lineLength,
				contentStart: offset + lineLength + 1,
			});
		}
		offset += lineLength + 1;
	}
	if (boundaries.length === 0) return [];

	const scored = (
		heading: string,
		level: number,
		start: number,
		end: number,
		contentStart: number,
		contentEnd: number,
	): SectionScore => {
		const text = clean.slice(contentStart, contentEnd);
		const words = extractWords(text);
		const lix =
			words.length >= options.minWords
				? lixScore(
						words.length,
						splitSentences(text).length,
						words.filter(isLongWord).length,
					)
				: null;
		return {
			heading,
			level,
			start,
			end,
			words: words.length,
			lix,
			onTarget: lix === null ? null : lix <= options.targetMaxLix,
		};
	};

	const sections: SectionScore[] = [];
	const preamble = scored("", 0, 0, 0, 0, boundaries[0].start);
	if (preamble.words > 0) sections.push(preamble);
	for (let index = 0; index < boundaries.length; index++) {
		const boundary = boundaries[index];
		const contentEnd =
			index + 1 < boundaries.length ? boundaries[index + 1].start : clean.length;
		sections.push(
			scored(
				boundary.heading,
				boundary.level,
				boundary.start,
				boundary.end,
				boundary.contentStart,
				contentEnd,
			),
		);
	}
	return sections;
}

export function analyzeMarkdown(
	markdown: string,
	options: AnalyzeOptions,
): ReadabilityReport {
	const strip: StripOptions = {
		includeTables: options.includeTables === true,
		includeCode: options.includeCode === true,
	};
	const clean = stripMarkdown(markdown, strip);
	const words = extractWords(clean);
	const sentences = splitSentences(clean);

	const wordCount = words.length;
	const sentenceCount = sentences.length;
	const longWords = words.filter(isLongWord).length;
	const characters = clean.replace(/\s/g, "").length;
	const paragraphs = clean
		.split(/\n\s*\n/)
		.filter((block) => extractWords(block).length > 0).length;

	const language: DetectedLanguage =
		options.language === "auto" ? detectLanguage(words) : options.language;

	const scorable = wordCount >= options.minWords;
	const lix = scorable ? lixScore(wordCount, sentenceCount, longWords) : null;

	let flesch: FleschResult | null = null;
	const definition =
		language === "unknown" ? undefined : LANGUAGE_BY_CODE.get(language);
	if (scorable && definition !== undefined) {
		const wps = wordCount / Math.max(1, sentenceCount);
		const spw = averageSyllablesPerWord(words, definition.countSyllables);
		const score = fleschScore(definition.flesch, wps, spw);
		flesch = {
			name: definition.flesch.name,
			score,
			label: fleschLabel(score),
		};
	}

	const topCount = options.topSentenceCount ?? DEFAULT_TOP_SENTENCES;
	const topSentences = [...sentences]
		.sort((a, b) => b.words - a.words)
		.slice(0, topCount);

	return {
		words: wordCount,
		sentences: sentenceCount,
		paragraphs,
		characters,
		longWords,
		longWordRatio: wordCount === 0 ? 0 : longWords / wordCount,
		avgWordsPerSentence: wordCount === 0 ? 0 : wordCount / Math.max(1, sentenceCount),
		language,
		lix,
		band: lix === null ? null : lixBand(lix),
		cefr: lix === null ? null : cefrIndication(lix),
		flesch,
		readingMinutes: wordCount / Math.max(1, options.wordsPerMinute),
		sections: sectionScores(clean, markdown, options),
		topSentences,
		topParagraphs: topParagraphs(clean, markdown, topCount),
		onTarget: lix === null ? null : lix <= options.targetMaxLix,
		targetMaxLix: options.targetMaxLix,
		minWords: options.minWords,
		tablesIncluded: strip.includeTables === true,
	};
}
