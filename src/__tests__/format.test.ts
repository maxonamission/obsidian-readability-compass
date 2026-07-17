import { describe, expect, it } from "vitest";
import { analyzeMarkdown } from "../readability/analyze";
import {
	formatCalloutReport,
	formatNoticeText,
	formatReadingTime,
	formatStatusBarText,
	StatusBarSegments,
} from "../format";

const ALL_SEGMENTS: StatusBarSegments = {
	lix: true,
	band: true,
	target: true,
	words: true,
	readingTime: true,
};

function sampleReport(minWords = 10) {
	const text =
		"Dit is een gewone tekst met korte zinnen. De lezer begrijpt het meteen. " +
		"Zo blijft het niveau netjes op peil en ook de toon blijft licht.";
	return analyzeMarkdown(text, {
		language: "auto",
		minWords,
		wordsPerMinute: 225,
		targetMaxLix: 45,
	});
}

describe("formatStatusBarText", () => {
	it("renders the configured segments for a document report", () => {
		const text = formatStatusBarText(sampleReport(), null, ALL_SEGMENTS);
		expect(text).toMatch(/^LIX \d+ · ≈ [BC]\d · [✓▲] · \d+ w · (~\d+ min|<1 min)$/u);
	});

	it("omits disabled segments", () => {
		const text = formatStatusBarText(sampleReport(), null, {
			lix: true,
			band: false,
			target: false,
			words: false,
			readingTime: false,
		});
		expect(text).toMatch(/^LIX \d+$/);
	});

	it("prefers the selection over the document", () => {
		const text = formatStatusBarText(
			sampleReport(),
			{ words: 12, lix: null },
			ALL_SEGMENTS,
		);
		expect(text).toBe("12 w selected");
	});

	it("shows the selection LIX when available", () => {
		const text = formatStatusBarText(
			sampleReport(),
			{ words: 60, lix: 41.4 },
			ALL_SEGMENTS,
		);
		expect(text).toBe("60 w selected · LIX 41");
	});

	it("shows a dash when the note is too short for a score", () => {
		const text = formatStatusBarText(sampleReport(500), null, ALL_SEGMENTS);
		expect(text).toContain("LIX –");
	});

	it("returns an empty string without a report", () => {
		expect(formatStatusBarText(null, null, ALL_SEGMENTS)).toBe("");
	});
});

describe("formatNoticeText", () => {
	it("summarises the score, counts and Flesch variant", () => {
		const text = formatNoticeText(sampleReport(), "Notitie");
		expect(text).toContain("Notitie");
		expect(text).toContain("LIX");
		expect(text).toContain("words/sentence");
		expect(text).toContain("Flesch-Douma");
	});

	it("explains when the text is too short", () => {
		const text = formatNoticeText(sampleReport(500), "Notitie");
		expect(text).toContain("Too short for a stable score");
	});
});

describe("formatCalloutReport", () => {
	it("emits a well-formed callout with the date", () => {
		const callout = formatCalloutReport(sampleReport(), "2026-07-14");
		expect(callout.startsWith("> [!info] Readability — 2026-07-14\n")).toBe(true);
		for (const line of callout.trimEnd().split("\n")) {
			expect(line.startsWith("> ")).toBe(true);
		}
		expect(callout).toContain("**LIX ");
		expect(callout.endsWith("\n")).toBe(true);
	});
});

describe("formatReadingTime", () => {
	it("rounds to minutes with a <1 floor", () => {
		expect(formatReadingTime(0.3)).toBe("<1 min");
		expect(formatReadingTime(2.4)).toBe("~2 min");
	});
});
