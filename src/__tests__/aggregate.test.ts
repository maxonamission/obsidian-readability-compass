import { describe, expect, it } from "vitest";
import { combineCounts, FileCounts } from "../readability/aggregate";
import { analyzeMarkdown } from "../readability/analyze";

const OPTIONS = {
	language: "auto" as const,
	minWords: 10,
	wordsPerMinute: 225,
	targetMaxLix: 45,
};

function file(overrides: Partial<FileCounts> = {}): FileCounts {
	return { words: 100, sentences: 10, longWords: 20, maxLix: 45, ...overrides };
}

describe("combineCounts", () => {
	it("computes the combined LIX over summed counts, not averaged scores", () => {
		// 150 words, 15 sentences, 30 long words → 10 + 20 = 30.
		const combined = combineCounts([file(), file({ words: 50, sentences: 5, longWords: 10 })], 40, 225);
		expect(combined.files).toBe(2);
		expect(combined.words).toBe(150);
		expect(combined.lix).toBeCloseTo(30, 5);
		expect(combined.band).toBe("easy");
	});

	it("gives a target verdict only when every note shares the same ceiling", () => {
		const uniform = combineCounts([file(), file()], 40, 225);
		expect(uniform).toMatchObject({ maxLix: 45, onTarget: true });

		const mixed = combineCounts([file(), file({ maxLix: 40 })], 40, 225);
		expect(mixed.maxLix).toBeNull();
		expect(mixed.onTarget).toBeNull();
	});

	it("suppresses the score below the minimum word count", () => {
		const combined = combineCounts([file({ words: 20 })], 40, 225);
		expect(combined.lix).toBeNull();
		expect(combined.band).toBeNull();
	});
});

describe("analyzeMarkdown topParagraphs", () => {
	const easy = Array.from({ length: 25 }, () => "de kat zat er").join(" ");
	const hard = Array.from(
		{ length: 25 },
		() => "buitengewoon ingewikkelde leesbaarheidsproblematiek",
	).join(" ");

	it("ranks paragraphs by LIX, hardest first, with document offsets", () => {
		const text = `${easy}\n\n${hard}`;
		const report = analyzeMarkdown(text, OPTIONS);
		expect(report.topParagraphs.length).toBe(2);
		expect(report.topParagraphs[0].lix).toBeGreaterThan(report.topParagraphs[1].lix);
		const top = report.topParagraphs[0];
		expect(text.slice(top.start, top.end)).toContain("leesbaarheidsproblematiek");
	});

	it("skips paragraphs under twenty words", () => {
		const report = analyzeMarkdown("Een korte alinea.\n\n" + hard, OPTIONS);
		expect(report.topParagraphs).toHaveLength(1);
	});
});

describe("analyzeMarkdown topParagraphs — lists are not paragraphs (BC_E1_S15)", () => {
	const item = "buitengewoon ingewikkelde leesbaarheidsproblematiek";
	const bulletList = Array.from({ length: 8 }, () => `- ${item}`).join("\n");
	const numberedList = Array.from({ length: 8 }, (_, i) => `${i + 1}. ${item}`).join("\n");
	const parenList = Array.from({ length: 8 }, (_, i) => `${i + 1}) ${item}`).join("\n");
	const nestedList = Array.from({ length: 8 }, () => `    - ${item}`).join("\n");
	const prose = Array.from({ length: 25 }, () => item).join(" ");

	it("excludes a tight bullet list from the ranking", () => {
		expect(analyzeMarkdown(bulletList, OPTIONS).topParagraphs).toHaveLength(0);
	});

	it("treats numbered, paren and nested lists the same", () => {
		for (const list of [numberedList, parenList, nestedList]) {
			expect(analyzeMarkdown(list, OPTIONS).topParagraphs).toHaveLength(0);
		}
	});

	it("keeps prose around a list, list excluded", () => {
		const report = analyzeMarkdown(`${prose}\n\n${bulletList}`, OPTIONS);
		expect(report.topParagraphs).toHaveLength(1);
		expect(report.topParagraphs[0].text).not.toContain("- ");
	});

	it("still counts list text in the note score (only the ranking changes)", () => {
		// The list is not a "paragraph" but its words still drive LIX.
		const report = analyzeMarkdown(bulletList, OPTIONS);
		expect(report.words).toBeGreaterThan(20);
		expect(report.lix).not.toBeNull();
	});

	it("does not mistake a horizontal rule or setext underline for a list", () => {
		const report = analyzeMarkdown(`${prose}\n\n---`, OPTIONS);
		expect(report.topParagraphs).toHaveLength(1);
	});
});
