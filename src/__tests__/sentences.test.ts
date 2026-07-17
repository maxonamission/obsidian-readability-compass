import { describe, expect, it } from "vitest";
import { splitSentences } from "../readability/sentences";

describe("splitSentences", () => {
	it("splits on sentence punctuation", () => {
		const spans = splitSentences("Dit is een. Dit is twee! En drie?");
		expect(spans.map((s) => s.text)).toEqual([
			"Dit is een.",
			"Dit is twee!",
			"En drie?",
		]);
	});

	it("treats a line break as a boundary (headings count separately)", () => {
		const spans = splitSentences("Kop zonder punt\nEerste zin erna.");
		expect(spans).toHaveLength(2);
		expect(spans[0].text).toBe("Kop zonder punt");
	});

	it("skips segments without words", () => {
		const spans = splitSentences("Echte zin.  \n\n 123 \n?!");
		expect(spans).toHaveLength(1);
	});

	it("reports offsets that index the original string", () => {
		const text = "Eerste zin hier. Tweede zin daar.";
		const spans = splitSentences(text);
		const second = spans[1];
		expect(text.slice(second.start, second.end)).toBe("Tweede zin daar.");
	});

	it("counts words and long words per sentence", () => {
		const spans = splitSentences("Buitengewoon indrukwekkende zin met kracht.");
		expect(spans[0].words).toBe(5);
		// Buitengewoon (12), indrukwekkende (14) — long; zin/met/kracht not.
		expect(spans[0].longWords).toBe(2);
	});

	it("counts a final sentence without terminal punctuation", () => {
		const spans = splitSentences("Afgemaakt. En dit loopt gewoon door");
		expect(spans).toHaveLength(2);
	});
});
