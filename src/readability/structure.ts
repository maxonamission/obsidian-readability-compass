/**
 * Experimental structure & cohesion signals — BC_E1_S23 prototype.
 *
 * LIX and the Flesch variants read only word- and sentence-level surface
 * features. The comprehension literature (Meyer's top-level structure, Kintsch's
 * macrostructure, the signaling hypothesis; see
 * docs/verkenning-leesbaarheid.md §6) shows that organization and cohesion drive
 * comprehension on a *different* axis that those formulas ignore. This module
 * computes cheap, local proxies for that axis.
 *
 * Deliberate framing: these are **descriptive hints, never a second score and
 * never pass/fail**. The "right" amount of cohesion depends on the audience
 * (O'Reilly & McNamara 2007, reverse-cohesion effect), which the plugin cannot
 * measure. Everything here is language-independent except connective density,
 * which uses the per-language connective list when the language is known.
 */

import { stripMarkdown } from "./strip-markdown";
import { extractWords } from "./words";
import { splitSentences } from "./sentences";
import { DetectedLanguage, LANGUAGE_BY_CODE } from "./language";

/** The three structurally-distinguishable Diátaxis clusters (tutorial and
 * how-to are both "procedural" — their difference is intent, not shape). */
export type DiataxisCluster = "procedural" | "reference" | "explanation" | "mixed";

export interface DiataxisFit {
	/** The `diataxis:` value declared in the note's front matter, lowercased. */
	declared: string;
	/** The structural cluster the note's shape resembles. */
	looksLike: DiataxisCluster;
	/** False only on a *confident* mismatch; "mixed" never flags a mismatch. */
	matches: boolean;
}

export interface StructureReport {
	headings: { count: number; maxDepth: number; skips: boolean };
	/** Prose sections = the text between headings (or the whole note if none). */
	sections: { count: number; longestWords: number; wallOfText: number };
	/** Share of body lines that are list or table rows (0..1) — a scannability proxy. */
	listRatio: number;
	/**
	 * Mean adjacent-sentence content-word overlap (0..1): do consecutive
	 * sentences talk about the same things? A referential-cohesion-lite proxy.
	 * null when there are too few comparable sentence pairs.
	 */
	cohesion: number | null;
	/**
	 * Share of sentences carrying a discourse connective (0..1); null when the
	 * language is unknown or has no connective list.
	 */
	connectives: number | null;
	/** The structural cluster the note's shape resembles (always computed). */
	shape: DiataxisCluster;
	/** Present only when the note declares a `diataxis:` type. */
	diataxis: DiataxisFit | null;
}

export interface StructureOptions {
	/** Detected (or fixed) language; drives connective density and stopwords. */
	language: DetectedLanguage;
	/** The raw `diataxis:` front-matter value, if any. */
	declaredDiataxis?: string | null;
}

const HEADING_RE = /^(#{1,6})\s+\S/;
const LIST_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;
const ORDERED_RE = /^\s*\d+[.)]\s+/;
const TABLE_RE = /^\s*\|.*\|/;
const FENCE_RE = /^\s*(?:```|~~~)/;

/** A section counts as a "wall of text" above this many words with no subheading. */
const WALL_WORDS = 250;
/** Below this share of list/table lines a note reads as prose-dominant. */
const PROSE_LIST_MAX = 0.15;
/** At/above this share of list/table lines a note reads as reference-like. */
const REFERENCE_LIST_MIN = 0.4;
/** At/above this share of ordered-list lines a note reads as procedural. */
const PROCEDURAL_ORDERED_MIN = 0.15;
/** A content word: not a stopword and longer than this many letters. */
const MIN_CONTENT_LETTERS = 3;

interface BodyLine {
	text: string;
	isHeading: boolean;
	headingLevel: number;
	isList: boolean;
	isOrdered: boolean;
	isTable: boolean;
}

/**
 * Split the markdown into content lines, dropping YAML front matter and fenced
 * code (their lines are not part of the document's prose structure).
 */
function bodyLines(markdown: string): BodyLine[] {
	const lines = markdown.split("\n");
	const out: BodyLine[] = [];
	let inFrontMatter = false;
	let inFence = false;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (i === 0 && /^---\s*$/.test(line)) {
			inFrontMatter = true;
			continue;
		}
		if (inFrontMatter) {
			if (/^---\s*$/.test(line)) inFrontMatter = false;
			continue;
		}
		if (FENCE_RE.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const heading = HEADING_RE.exec(line);
		out.push({
			text: line,
			isHeading: heading !== null,
			headingLevel: heading !== null ? heading[1].length : 0,
			isList: LIST_RE.test(line),
			isOrdered: ORDERED_RE.test(line),
			isTable: TABLE_RE.test(line),
		});
	}
	return out;
}

function analyzeHeadings(body: BodyLine[]): StructureReport["headings"] {
	const levels = body.filter((l) => l.isHeading).map((l) => l.headingLevel);
	let skips = false;
	for (let i = 1; i < levels.length; i++) {
		if (levels[i] > levels[i - 1] + 1) skips = true;
	}
	return {
		count: levels.length,
		maxDepth: levels.length === 0 ? 0 : Math.max(...levels),
		skips,
	};
}

/** Word counts of the prose sections between headings (heading lines excluded). */
function analyzeSections(body: BodyLine[]): StructureReport["sections"] {
	const sectionWordCounts: number[] = [];
	let current: string[] = [];
	const flush = (): void => {
		if (current.length === 0) return;
		const words = extractWords(stripMarkdown(current.join("\n"), {})).length;
		if (words > 0) sectionWordCounts.push(words);
		current = [];
	};
	for (const line of body) {
		if (line.isHeading) {
			flush();
		} else {
			current.push(line.text);
		}
	}
	flush();
	return {
		count: sectionWordCounts.length,
		longestWords: sectionWordCounts.length === 0 ? 0 : Math.max(...sectionWordCounts),
		wallOfText: sectionWordCounts.filter((w) => w > WALL_WORDS).length,
	};
}

function listRatio(body: BodyLine[]): number {
	const content = body.filter((l) => !l.isHeading && l.text.trim() !== "");
	if (content.length === 0) return 0;
	const listy = content.filter((l) => l.isList || l.isTable).length;
	return listy / content.length;
}

function orderedRatio(body: BodyLine[]): number {
	const content = body.filter((l) => !l.isHeading && l.text.trim() !== "");
	if (content.length === 0) return 0;
	return content.filter((l) => l.isOrdered).length / content.length;
}

/**
 * Mean adjacent-sentence overlap of content words (overlap coefficient:
 * shared / smaller set). Pairs where either sentence has no content word are
 * skipped. null when fewer than one comparable pair remains.
 */
function cohesion(clean: string, stopwords: ReadonlySet<string>): number | null {
	const sets = splitSentences(clean)
		.map((sentence) => contentWords(sentence.text, stopwords))
		.filter((set) => set.size > 0);
	if (sets.length < 2) return null;
	let total = 0;
	let pairs = 0;
	for (let i = 1; i < sets.length; i++) {
		const a = sets[i - 1];
		const b = sets[i];
		let shared = 0;
		for (const word of a) if (b.has(word)) shared++;
		total += shared / Math.min(a.size, b.size);
		pairs++;
	}
	return pairs === 0 ? null : total / pairs;
}

function contentWords(text: string, stopwords: ReadonlySet<string>): Set<string> {
	const set = new Set<string>();
	for (const word of extractWords(text)) {
		const lower = word.toLowerCase();
		if (lower.length > MIN_CONTENT_LETTERS && !stopwords.has(lower)) set.add(lower);
	}
	return set;
}

function connectiveRatio(
	clean: string,
	connectives: ReadonlySet<string> | undefined,
): number | null {
	if (connectives === undefined || connectives.size === 0) return null;
	const sentences = splitSentences(clean);
	if (sentences.length === 0) return null;
	let hits = 0;
	for (const sentence of sentences) {
		const has = extractWords(sentence.text).some((word) =>
			connectives.has(word.toLowerCase()),
		);
		if (has) hits++;
	}
	return hits / sentences.length;
}

/** Map a declared Diátaxis mode to its expected structural cluster, or null. */
function expectedCluster(declared: string): DiataxisCluster | null {
	switch (declared) {
		case "tutorial":
		case "how-to":
		case "howto":
			return "procedural";
		case "reference":
			return "reference";
		case "explanation":
			return "explanation";
		default:
			// state/log/intent and anything unknown carry no structural expectation.
			return null;
	}
}

/** Classify the note's structural shape into a cluster. */
function classifyCluster(list: number, ordered: number): DiataxisCluster {
	if (ordered >= PROCEDURAL_ORDERED_MIN) return "procedural";
	if (list >= REFERENCE_LIST_MIN) return "reference";
	if (list <= PROSE_LIST_MAX) return "explanation";
	return "mixed";
}

function diataxisFit(
	declaredRaw: string | null | undefined,
	shape: DiataxisCluster,
): DiataxisFit | null {
	if (declaredRaw == null || declaredRaw.trim() === "") return null;
	const declared = declaredRaw.trim().toLowerCase();
	const expected = expectedCluster(declared);
	// Only a confident, different cluster counts as a mismatch; "mixed" and
	// types without a structural expectation never nag.
	const matches = expected === null || shape === "mixed" || shape === expected;
	return { declared, looksLike: shape, matches };
}

export function analyzeStructure(
	markdown: string,
	options: StructureOptions,
): StructureReport {
	const body = bodyLines(markdown);
	const clean = stripMarkdown(markdown, {});
	const definition =
		options.language === "unknown"
			? undefined
			: LANGUAGE_BY_CODE.get(options.language);
	const stopwords = definition?.stopwords ?? new Set<string>();
	const list = listRatio(body);
	const ordered = orderedRatio(body);
	const shape = classifyCluster(list, ordered);
	return {
		headings: analyzeHeadings(body),
		sections: analyzeSections(body),
		listRatio: list,
		cohesion: cohesion(clean, stopwords),
		connectives: connectiveRatio(clean, definition?.connectives),
		shape,
		diataxis: diataxisFit(options.declaredDiataxis, shape),
	};
}
