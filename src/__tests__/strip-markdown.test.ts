import { describe, expect, it } from "vitest";
import { stripMarkdown } from "../readability/strip-markdown";
import { extractWords } from "../readability/words";

describe("stripMarkdown", () => {
	it("preserves length and line structure exactly", () => {
		const md = "---\ntitle: x\n---\n# Kop\n\nTekst met `code` en **vet**.\n";
		const clean = stripMarkdown(md);
		expect(clean.length).toBe(md.length);
		expect(clean.split("\n").length).toBe(md.split("\n").length);
	});

	it("removes front matter", () => {
		const clean = stripMarkdown("---\ntitle: geheim\ntags: [a, b]\n---\nEcht proza.");
		expect(clean).not.toContain("geheim");
		expect(clean).toContain("Echt proza.");
	});

	it("removes fenced code blocks and inline code", () => {
		const clean = stripMarkdown("Voor.\n```js\nconst x = 1;\n```\nNa `inline()` klaar.");
		expect(clean).not.toContain("const");
		expect(clean).not.toContain("inline()");
		expect(clean).toContain("Voor.");
		expect(clean).toContain("Na");
	});

	it("removes table rows", () => {
		const clean = stripMarkdown("Intro.\n| kolom | waarde |\n|---|---|\n| a | b |\nSlot.");
		expect(clean).not.toContain("kolom");
		expect(clean).toContain("Intro.");
		expect(clean).toContain("Slot.");
	});

	it("keeps link text at its original offset and drops the URL", () => {
		const md = "Zie [de uitleg](https://example.org/pad) hier.";
		const clean = stripMarkdown(md);
		expect(clean.indexOf("de uitleg")).toBe(md.indexOf("de uitleg"));
		expect(clean).not.toContain("example.org");
		expect(clean).not.toContain("https");
	});

	it("keeps the wikilink alias (or target) and drops the rest", () => {
		const md = "Zie [[Een Notitie|deze alias]] en [[Andere Notitie]].";
		const clean = stripMarkdown(md);
		expect(clean.indexOf("deze alias")).toBe(md.indexOf("deze alias"));
		expect(clean).not.toContain("Een Notitie");
		expect(clean).toContain("Andere Notitie");
	});

	it("removes images entirely", () => {
		const clean = stripMarkdown("Voor ![alt tekst](img.png) na.");
		expect(clean).not.toContain("alt tekst");
		expect(clean).not.toContain("img.png");
	});

	it("removes bare URLs, HTML and Obsidian comments", () => {
		const clean = stripMarkdown(
			"Ga naar https://voorbeeld.nl/lang/pad nu.\n<div class=\"x\">html</div>\n%%verborgen%% zichtbaar",
		);
		expect(clean).not.toContain("voorbeeld");
		expect(clean).not.toContain("div");
		expect(clean).not.toContain("verborgen");
		expect(clean).toContain("zichtbaar");
	});

	it("strips heading/list/quote/callout markers but keeps their text", () => {
		const md = "## Kop hier\n- punt een\n> citaat\n> [!note] titel\n1. genummerd";
		const clean = stripMarkdown(md);
		expect(clean).toContain("Kop hier");
		expect(clean).toContain("punt een");
		expect(clean).toContain("citaat");
		expect(clean).toContain("titel");
		expect(clean).toContain("genummerd");
		expect(clean).not.toContain("#");
		expect(clean).not.toContain(">");
		expect(clean).not.toContain("[!note]");
	});

	it("strips inline tags", () => {
		const clean = stripMarkdown("Tekst met #een-tag erin.");
		expect(extractWords(clean)).toEqual(["Tekst", "met", "erin"]);
	});
});
