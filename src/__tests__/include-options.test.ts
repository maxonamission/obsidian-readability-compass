import { describe, expect, it } from "vitest";
import { stripMarkdown } from "../readability/strip-markdown";
import { analyzeMarkdown } from "../readability/analyze";
import { longWordRanges } from "../readability/highlight";

const OPTIONS = {
	language: "auto" as const,
	minWords: 10,
	wordsPerMinute: 225,
	targetMaxLix: 45,
};

describe("stripMarkdown includeTables", () => {
	const table = [
		"| Question | Answer |",
		"| --- | --- |",
		"| What is the reading level of this sentence | forty two |",
	].join("\n");

	it("blanks tables by default", () => {
		const clean = stripMarkdown(table);
		expect(clean.trim()).toBe("");
	});

	it("keeps cell text at its offset when included", () => {
		const clean = stripMarkdown(table, { includeTables: true });
		expect(clean).toContain("What is the reading level of this sentence");
		expect(clean).not.toContain("|");
		expect(clean).not.toContain("---");
		// Offset preserved: the word sits where it sits in the source.
		expect(clean.indexOf("Question")).toBe(table.indexOf("Question"));
		expect(clean.length).toBe(table.length);
	});
});

describe("stripMarkdown includeCode", () => {
	const fenced = "```bash\nRun the installer and follow the instructions carefully\n```";

	it("blanks code by default", () => {
		expect(stripMarkdown(fenced).trim()).toBe("");
	});

	it("keeps fenced content but not the fence lines when included", () => {
		const clean = stripMarkdown(fenced, { includeCode: true });
		expect(clean).toContain("follow the instructions carefully");
		expect(clean).not.toContain("```");
		expect(clean).not.toContain("bash");
		expect(clean.length).toBe(fenced.length);
	});

	it("keeps inline code content without the backticks", () => {
		const clean = stripMarkdown("Use `npm install` first.", { includeCode: true });
		expect(clean).toContain("npm install");
		expect(clean).not.toContain("`");
	});
});

describe("stripMarkdown table fragments (selection starting mid-row)", () => {
	it("blanks pipes in row fragments when tables are included", () => {
		const fragment = "eerste cel | tweede cel | derde cel";
		const clean = stripMarkdown(fragment, { includeTables: true });
		expect(clean).not.toContain("|");
		expect(clean).toContain("tweede cel");
		expect(clean.length).toBe(fragment.length);
	});
});

describe("analyzeMarkdown include options", () => {
	const note = [
		"| Vraag | Antwoord |",
		"| --- | --- |",
		"| Welke leesbaarheidsscore hoort bij deze behoorlijk ingewikkelde vraag | tweeënveertig |",
	].join("\n");

	it("scores a table note only when tables are included", () => {
		expect(analyzeMarkdown(note, OPTIONS).words).toBe(0);
		const report = analyzeMarkdown(note, { ...OPTIONS, includeTables: true });
		expect(report.words).toBeGreaterThan(10);
		expect(report.tablesIncluded).toBe(true);
	});
});

describe("longWordRanges", () => {
	it("returns document offsets for words longer than six letters", () => {
		const text = "Een korte zin met leesbaarheidsproblemen erin.";
		const ranges = longWordRanges(text);
		const marked = ranges.map((r) => text.slice(r.start, r.end));
		expect(marked).toEqual(["leesbaarheidsproblemen"]);
	});

	it("skips code unless included", () => {
		const text = "`leesbaarheidsproblemen` gewone tekst";
		expect(longWordRanges(text)).toHaveLength(0);
		expect(longWordRanges(text, { includeCode: true })).toHaveLength(1);
	});
});
