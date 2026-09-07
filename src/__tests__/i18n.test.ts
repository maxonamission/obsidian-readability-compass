import { describe, expect, it } from "vitest";
import {
	EN,
	matchUiLanguage,
	resolvePanelStrings,
	stringsFor,
	UI_LANGUAGES,
} from "../i18n";
import { NL } from "../i18n/nl";
import { Strings } from "../i18n/types";
import { StructureConclusionModel } from "../readability/structure";
import { analyzeMarkdown } from "../readability/analyze";
import { formatCalloutReport, formatNoticeText, formatStatusBarText } from "../format";
import { lixBand, fleschLabel } from "../readability/scores";

const DUTCH =
	"Dit is een gewone tekst met korte zinnen. De lezer begrijpt het meteen. " +
	"Zo blijft het niveau netjes op peil en ook de toon blijft licht.";

function dutchReport() {
	return analyzeMarkdown(DUTCH, {
		language: "auto",
		minWords: 10,
		wordsPerMinute: 225,
		targetMaxLix: 45,
	});
}

describe("resolvePanelStrings", () => {
	it("follows the note's detected language by default", () => {
		expect(resolvePanelStrings("auto", "auto", "nl")).toBe(NL);
		expect(resolvePanelStrings("auto", "auto", "en")).toBe(EN);
	});

	it("falls back to English when detection is not confident", () => {
		expect(resolvePanelStrings("auto", "auto", "unknown")).toBe(EN);
	});

	it("falls back to English when no single note speaks (explorer selection)", () => {
		expect(resolvePanelStrings("auto", "auto", null)).toBe(EN);
	});

	it("lets an explicit feedback language win over the note", () => {
		expect(resolvePanelStrings("nl", "auto", "en")).toBe(NL);
		expect(resolvePanelStrings("en", "auto", "nl")).toBe(EN);
		// Even for a selection or an unreadably short note.
		expect(resolvePanelStrings("nl", "auto", null)).toBe(NL);
	});

	it("follows a pinned measurement language when the panel is on auto", () => {
		expect(resolvePanelStrings("auto", "nl", "en")).toBe(NL);
	});

	it("prefers the explicit feedback language over the pinned measurement one", () => {
		expect(resolvePanelStrings("en", "nl", "nl")).toBe(EN);
	});

	it("follows Obsidian's own interface language when asked to", () => {
		expect(resolvePanelStrings("obsidian", "auto", "en", "nl")).toBe(NL);
		expect(resolvePanelStrings("obsidian", "auto", "nl", "en")).toBe(EN);
	});

	it("ignores the region in Obsidian's locale", () => {
		expect(resolvePanelStrings("obsidian", "auto", null, "nl-NL")).toBe(NL);
		expect(resolvePanelStrings("obsidian", "auto", null, "nl_BE")).toBe(NL);
		expect(resolvePanelStrings("obsidian", "auto", null, "EN-GB")).toBe(EN);
	});

	it("reads English when Obsidian runs in an untranslated language", () => {
		expect(resolvePanelStrings("obsidian", "auto", "nl", "de")).toBe(EN);
		expect(resolvePanelStrings("obsidian", "auto", "nl", "zh-TW")).toBe(EN);
		expect(resolvePanelStrings("obsidian", "auto", "nl", null)).toBe(EN);
	});

	it("lets the host language win over note detection and the pinned measurement", () => {
		expect(resolvePanelStrings("obsidian", "nl", "nl", "en")).toBe(EN);
	});

	it("matches host locales directly", () => {
		expect(matchUiLanguage("nl")).toBe("nl");
		expect(matchUiLanguage("pt-BR")).toBe("unknown");
		expect(matchUiLanguage("")).toBe("unknown");
		expect(matchUiLanguage(null)).toBe("unknown");
	});

	it("serves English for a language that has no translation yet", () => {
		expect(stringsFor("de")).toBe(EN);
		expect(stringsFor("cs")).toBe(EN);
	});

	it("only advertises languages that are actually translated", () => {
		expect(UI_LANGUAGES).toEqual(["en", "nl"]);
		// Every advertised language must have its own catalogue — an entry that
		// silently resolved to the English fallback would be a half-translated UI.
		for (const code of UI_LANGUAGES.filter((c) => c !== "en")) {
			expect(stringsFor(code), code).not.toBe(EN);
		}
	});
});

describe("catalogue completeness", () => {
	const catalogues: [string, Strings][] = [
		["en", EN],
		["nl", NL],
	];

	it.each(catalogues)("%s has exactly the reference keys", (_name, catalogue) => {
		expect(Object.keys(catalogue).sort()).toEqual(Object.keys(EN).sort());
	});

	it.each(catalogues)("%s has no empty strings", (_name, catalogue) => {
		for (const [key, value] of Object.entries(catalogue)) {
			if (typeof value === "string") {
				expect(value.trim(), key).not.toBe("");
			}
		}
	});

	it.each(catalogues)("%s translates every band key", (_name, catalogue) => {
		expect(Object.keys(catalogue.lixBand).sort()).toEqual(
			Object.keys(EN.lixBand).sort(),
		);
		expect(Object.keys(catalogue.fleschLabel).sort()).toEqual(
			Object.keys(EN.fleschLabel).sort(),
		);
	});
});

describe("Dutch rendering", () => {
	it("writes the notice in Dutch", () => {
		const text = formatNoticeText(dutchReport(), "Notitie", null, NL);
		expect(text).toContain("woorden");
		expect(text).toContain("zinnen");
		expect(text).toMatch(/op doel|boven doel/u);
		expect(text).not.toMatch(/\bwords\b|\bsentences\b|on target/u);
	});

	it("writes the inserted callout in Dutch", () => {
		const callout = formatCalloutReport(dutchReport(), "2026-08-27", null, NL);
		expect(callout).toContain("> [!info] Leesbaarheid — 2026-08-27");
		expect(callout).toContain("woorden/zin");
	});

	it("labels a selection in Dutch in the status bar", () => {
		const text = formatStatusBarText(
			null,
			{ words: 12, lix: 40 },
			{ lix: true, band: true, target: true, words: true, readingTime: true },
			null,
			NL,
		);
		expect(text).toBe("12 w geselecteerd · LIX 40");
	});

	it("keeps English output byte-identical when no catalogue is passed", () => {
		const report = dutchReport();
		expect(formatNoticeText(report, "Note")).toBe(
			formatNoticeText(report, "Note", null, EN),
		);
	});
});

describe("structure conclusion", () => {
	const base: StructureConclusionModel = {
		shape: "explanation",
		cohesion: null,
		wallOfText: 0,
		headingSkip: false,
		noHeadings: false,
		diataxis: null,
	};

	it("names the shape when there is nothing to flag", () => {
		expect(EN.structureConclusion(base)).toBe("Flowing prose, well connected");
		expect(NL.structureConclusion(base)).toBe("Lopend betoog, goed verbonden");
	});

	it("uses the right Dutch plural for long sections", () => {
		expect(NL.structureConclusion({ ...base, wallOfText: 1 })).toContain(
			"1 lange sectie zonder subkopje",
		);
		expect(NL.structureConclusion({ ...base, wallOfText: 2 })).toContain(
			"2 lange secties zonder subkopjes",
		);
	});

	it("joins several observations", () => {
		const text = NL.structureConclusion({
			...base,
			cohesion: "loose",
			headingSkip: true,
		});
		expect(text).toContain("los verbonden");
		expect(text).toContain("kopniveau");
		expect(text).toContain(";");
	});

	it("leads with the Diátaxis verdict when a type is declared", () => {
		const declared: StructureConclusionModel = {
			...base,
			diataxis: { declared: "tutorial", looksLike: "procedural", matches: true },
		};
		expect(EN.structureConclusion(declared)).toBe(
			"Structure matches the declared 'tutorial'",
		);
		expect(NL.structureConclusion(declared)).toBe(
			"De structuur past bij het opgegeven 'tutorial'",
		);
	});

	it("describes a mismatch in the reader's language", () => {
		const mismatch: StructureConclusionModel = {
			...base,
			diataxis: { declared: "reference", looksLike: "explanation", matches: false },
		};
		expect(EN.structureConclusion(mismatch)).toBe(
			"Declared 'reference', but reads as flowing prose",
		);
		expect(NL.structureConclusion(mismatch)).toBe(
			"Opgegeven 'reference', maar leest als lopend betoog",
		);
	});
});

describe("canonical keys stay English", () => {
	it("keeps the band keys the analysis layer produces untranslated", () => {
		// bases-properties.ts writes these into front matter: they must stay
		// stable and queryable no matter what language the panel speaks.
		expect(lixBand(35)).toBe("easy");
		expect(fleschLabel(65)).toBe("plain");
	});

	it("translates them only at render time", () => {
		expect(NL.lixBand[lixBand(35)]).toBe("makkelijk");
		expect(NL.fleschLabel[fleschLabel(65)]).toBe("eenvoudig");
	});
});
