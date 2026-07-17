/**
 * Score formulas and their interpretation bands.
 *
 * LIX is the primary score, matching the normative implementation in
 * `codebase-standards/profiles/diataxis/check_readability.py`:
 *
 *     LIX = words / sentences + 100 * longWords / words
 *
 * Bands (Björnsson): <30 very easy · 30–40 easy · 40–50 average ·
 * 50–60 difficult · >60 very difficult. House norm: clear B2 ⇒ LIX ≤ 45.
 *
 * The CEFR labels are an *indicative* translation of those bands, anchored on
 * that norm; they estimate the audience a text suits, not a certified level.
 */

import { FleschFormula } from "./language";

export function lixScore(
	wordCount: number,
	sentenceCount: number,
	longWordCount: number,
): number | null {
	if (wordCount === 0) return null;
	return wordCount / Math.max(1, sentenceCount) + (100 * longWordCount) / wordCount;
}

export type LixBand =
	| "very easy"
	| "easy"
	| "average"
	| "difficult"
	| "very difficult";

export function lixBand(lix: number): LixBand {
	if (lix < 30) return "very easy";
	if (lix < 40) return "easy";
	if (lix < 50) return "average";
	if (lix < 60) return "difficult";
	return "very difficult";
}

/** Indicative CEFR audience for a LIX score (see module docblock). */
export function cefrIndication(lix: number): string {
	if (lix <= 40) return "≈ B1";
	if (lix <= 45) return "≈ B2";
	if (lix <= 55) return "≈ C1";
	return "≈ C2";
}

export type TargetBand = "b1" | "b2" | "c1" | "custom";

export const TARGET_MAX_LIX: Record<Exclude<TargetBand, "custom">, number> = {
	b1: 40,
	b2: 45,
	c1: 55,
};

export function targetMaxLix(band: TargetBand, customMaxLix: number): number {
	return band === "custom" ? customMaxLix : TARGET_MAX_LIX[band];
}

export interface FleschResult {
	/** Display name of the published variant (e.g. "Flesch-Douma"). */
	name: string;
	score: number;
	label: string;
}

/**
 * Evaluate a Flesch-family formula (coefficients live in the language
 * registry): base − perWps·(words/sentence) − perSpw·(syllables/word).
 */
export function fleschScore(
	formula: FleschFormula,
	wordsPerSentence: number,
	syllablesPerWord: number,
): number {
	return (
		formula.base -
		formula.perWps * wordsPerSentence -
		formula.perSpw * syllablesPerWord
	);
}

export function fleschLabel(score: number): string {
	if (score >= 90) return "very easy";
	if (score >= 80) return "easy";
	if (score >= 70) return "fairly easy";
	if (score >= 60) return "plain";
	if (score >= 50) return "fairly difficult";
	if (score >= 30) return "difficult";
	return "very difficult";
}
