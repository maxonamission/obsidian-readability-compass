/**
 * Pure text formatting for the status bar, notices and the insertable report.
 * Kept free of Obsidian imports so it is unit-testable.
 *
 * Every function takes the string catalogue as its last argument (BC_E1_S28),
 * defaulting to English so a caller that has no note context stays correct.
 */

import { ReadabilityReport } from "./readability/analyze";
import { ResolvedTarget } from "./readability/target-profile";
import { EN, Strings, TargetSourceKind } from "./i18n";

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

/** The target's origin as data, so each language can word it itself. */
function targetSourceKind(target: ResolvedTarget): TargetSourceKind {
	switch (target.source) {
		case "note":
			return { kind: "note" };
		case "diataxis":
			return { kind: "diataxis", detail: target.detail };
		case "tag":
			return { kind: "tag", detail: target.detail ?? "" };
		case "folder":
			return { kind: "folder", detail: target.detail ?? "" };
		case "global":
			return { kind: "global" };
	}
}

/** Where the active target comes from, e.g. "folder blog/" or "global setting". */
export function formatTargetSource(target: ResolvedTarget, t: Strings = EN): string {
	return t.targetSource(targetSourceKind(target));
}

/** Compact suffix for notices/callouts; empty for the global setting. */
function targetSourceSuffix(target: ResolvedTarget | null, t: Strings): string {
	if (target === null || target.source === "global") return "";
	return ` · ${formatTargetSource(target, t)}`;
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
	t: Strings = EN,
): string {
	if (selection !== null) {
		const parts = [t.wordsSelected(selection.words)];
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
	t: Strings = EN,
): string {
	const lines: string[] = [title];
	if (report.lix === null) {
		lines.push(t.noticeTooShort(report.minWords, report.words));
	} else {
		const suffix = targetSourceSuffix(targetInfo, t);
		const target = report.onTarget
			? t.noticeTargetOn(report.targetMaxLix, suffix)
			: t.noticeTargetAbove(report.targetMaxLix, suffix);
		const band = report.band === null ? "" : t.lixBand[report.band];
		lines.push(
			`LIX ${formatLixValue(report.lix)} (${band}) · ${report.cefr ?? ""} · ${target}`,
		);
	}
	lines.push(
		t.noticeCounts(
			report.words,
			report.sentences,
			report.avgWordsPerSentence.toFixed(1),
		),
	);
	lines.push(
		t.noticeLongWords(
			formatPercent(report.longWordRatio),
			formatReadingTime(report.readingMinutes),
		),
	);
	if (report.flesch !== null) {
		lines.push(
			t.fleschLine(
				report.flesch.name,
				Math.round(report.flesch.score),
				t.fleschLabel[report.flesch.label],
			),
		);
	}
	return lines.join("\n");
}

/** Markdown callout block for the "insert report" command. */
export function formatCalloutReport(
	report: ReadabilityReport,
	dateIso: string,
	targetInfo: ResolvedTarget | null = null,
	t: Strings = EN,
): string {
	const lines: string[] = [`> [!info] ${t.calloutTitle(dateIso)}`];
	if (report.lix === null) {
		lines.push(`> ${t.noticeTooShort(report.minWords, report.words)}`);
	} else {
		const suffix = targetSourceSuffix(targetInfo, t);
		const target = report.onTarget
			? t.noticeTargetOn(report.targetMaxLix, suffix)
			: t.noticeTargetAbove(report.targetMaxLix, suffix);
		const band = report.band === null ? "" : t.lixBand[report.band];
		lines.push(
			`> **LIX ${formatLixValue(report.lix)}** (${band}) · ${report.cefr ?? ""} · ${target}`,
		);
	}
	lines.push(
		`> ${t.noticeCounts(
			report.words,
			report.sentences,
			report.avgWordsPerSentence.toFixed(1),
		)} · ${t.noticeLongWords(
			formatPercent(report.longWordRatio),
			formatReadingTime(report.readingMinutes),
		)}`,
	);
	if (report.flesch !== null) {
		lines.push(
			`> ${t.fleschLine(
				report.flesch.name,
				Math.round(report.flesch.score),
				t.fleschLabel[report.flesch.label],
			)}`,
		);
	}
	return lines.join("\n") + "\n";
}
