/**
 * Pure text formatting for the status bar, notices and the insertable report.
 * Kept free of Obsidian imports so it is unit-testable.
 */

import { ReadabilityReport } from "./readability/analyze";
import { ResolvedTarget } from "./readability/target-profile";

export interface StatusBarSegments {
	lix: boolean;
	band: boolean;
	target: boolean;
	words: boolean;
	readingTime: boolean;
}

/** "≈ B1" for a band, "LIX ≤ 42" for a custom ceiling. */
export function formatTargetBand(target: ResolvedTarget): string {
	return target.band === "custom"
		? `LIX ≤ ${Math.round(target.maxLix)}`
		: `≈ ${target.band.toUpperCase()}`;
}

/** Where the active target comes from, e.g. "folder blog/" or "global setting". */
export function formatTargetSource(target: ResolvedTarget): string {
	switch (target.source) {
		case "note":
			return "note front matter";
		case "diataxis":
			return target.detail ?? "diataxis type";
		case "tag":
			return `tag ${target.detail ?? ""}`.trim();
		case "folder":
			return `folder ${target.detail ?? ""}`.trim();
		case "global":
			return "global setting";
	}
}

/** Compact suffix for notices/callouts; empty for the global setting. */
function targetSourceSuffix(target: ResolvedTarget | null): string {
	if (target === null || target.source === "global") return "";
	return ` · ${formatTargetSource(target)}`;
}

export interface SelectionStats {
	words: number;
	lix: number | null;
}

export function formatLixValue(lix: number): string {
	return String(Math.round(lix));
}

export function formatReadingTime(minutes: number): string {
	if (minutes < 1) return "<1 min";
	return `~${Math.round(minutes)} min`;
}

export function formatPercent(ratio: number): string {
	return `${Math.round(ratio * 100)}%`;
}

const ON_TARGET = "✓";
const OFF_TARGET = "▲";

/**
 * Compose the status bar text. A non-empty selection wins over the document
 * report (the better-word-count behaviour people expect).
 */
export function formatStatusBarText(
	report: ReadabilityReport | null,
	selection: SelectionStats | null,
	segments: StatusBarSegments,
	target: ResolvedTarget | null = null,
): string {
	if (selection !== null) {
		const parts = [`${selection.words} w selected`];
		if (selection.lix !== null && segments.lix) {
			parts.push(`LIX ${formatLixValue(selection.lix)}`);
		}
		return parts.join(" · ");
	}
	if (report === null) return "";

	const parts: string[] = [];
	if (segments.lix) {
		parts.push(report.lix === null ? "LIX –" : `LIX ${formatLixValue(report.lix)}`);
	}
	if (segments.band && report.cefr !== null) {
		parts.push(report.cefr);
	}
	if (segments.target && report.onTarget !== null) {
		const mark = report.onTarget ? ON_TARGET : OFF_TARGET;
		// When a profile rule set the target, show which band applies so the
		// context-dependence is visible at a glance (source lives in the tooltip).
		parts.push(
			target !== null && target.source !== "global"
				? `${mark} ${formatTargetBand(target)}`
				: mark,
		);
	}
	if (segments.words) {
		parts.push(`${report.words} w`);
	}
	if (segments.readingTime && report.words > 0) {
		parts.push(formatReadingTime(report.readingMinutes));
	}
	return parts.join(" · ");
}

/** Multi-line summary for the "score current note/selection" notices. */
export function formatNoticeText(
	report: ReadabilityReport,
	title: string,
	targetInfo: ResolvedTarget | null = null,
): string {
	const lines: string[] = [title];
	if (report.lix === null) {
		lines.push(
			`Too short for a stable score (min ${report.minWords} words; found ${report.words}).`,
		);
	} else {
		const target = report.onTarget
			? `on target (max ${report.targetMaxLix}${targetSourceSuffix(targetInfo)})`
			: `above target (max ${report.targetMaxLix}${targetSourceSuffix(targetInfo)})`;
		lines.push(
			`LIX ${formatLixValue(report.lix)} (${report.band ?? ""}) · ${report.cefr ?? ""} · ${target}`,
		);
	}
	lines.push(
		`${report.words} words · ${report.sentences} sentences · ` +
			`${report.avgWordsPerSentence.toFixed(1)} words/sentence`,
	);
	lines.push(
		`${formatPercent(report.longWordRatio)} long words · ${formatReadingTime(report.readingMinutes)} read`,
	);
	if (report.flesch !== null) {
		lines.push(
			`${report.flesch.name} ${Math.round(report.flesch.score)} (${report.flesch.label})`,
		);
	}
	return lines.join("\n");
}

/** Markdown callout block for the "insert report" command. */
export function formatCalloutReport(
	report: ReadabilityReport,
	dateIso: string,
	targetInfo: ResolvedTarget | null = null,
): string {
	const lines: string[] = [`> [!info] Readability — ${dateIso}`];
	if (report.lix === null) {
		lines.push(
			`> Too short for a stable score (min ${report.minWords} words; found ${report.words}).`,
		);
	} else {
		const target = report.onTarget
			? `on target (max ${report.targetMaxLix}${targetSourceSuffix(targetInfo)})`
			: `above target (max ${report.targetMaxLix}${targetSourceSuffix(targetInfo)})`;
		lines.push(
			`> **LIX ${formatLixValue(report.lix)}** (${report.band ?? ""}) · ${report.cefr ?? ""} · ${target}`,
		);
	}
	lines.push(
		`> ${report.words} words · ${report.sentences} sentences · ` +
			`${report.avgWordsPerSentence.toFixed(1)} words/sentence · ` +
			`${formatPercent(report.longWordRatio)} long words · ` +
			`${formatReadingTime(report.readingMinutes)} read`,
	);
	if (report.flesch !== null) {
		lines.push(
			`> ${report.flesch.name} ${Math.round(report.flesch.score)} (${report.flesch.label})`,
		);
	}
	return lines.join("\n") + "\n";
}
