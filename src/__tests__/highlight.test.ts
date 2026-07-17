import { describe, expect, it } from "vitest";
import {
	longSentenceRanges,
	longSentenceThreshold,
	verySentenceThreshold,
} from "../readability/highlight";

const words = (n: number): string => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

describe("longSentenceThreshold", () => {
	it("derives thresholds from the LIX ceiling (B1/B2/C1)", () => {
		expect(longSentenceThreshold(40)).toBe(22);
		expect(longSentenceThreshold(45)).toBe(25);
		expect(longSentenceThreshold(55)).toBe(30);
	});

	it("never drops below the noise floor", () => {
		expect(longSentenceThreshold(5)).toBe(8);
	});
});

describe("longSentenceRanges", () => {
	it("marks only sentences above the threshold", () => {
		const text = `${words(5)}. ${words(12)}. ${words(6)}.`;
		const ranges = longSentenceRanges(text, 10);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toMatchObject({ tier: "long", words: 12 });
		// The range points at the long sentence (incl. closing punctuation).
		expect(text.slice(ranges[0].start, ranges[0].end)).toBe(`${words(12)}.`);
	});

	it("promotes sentences past 1.5× threshold to the very-long tier", () => {
		expect(verySentenceThreshold(20)).toBe(30);
		const text = `${words(31)}.`;
		const ranges = longSentenceRanges(text, 20);
		expect(ranges[0].tier).toBe("very-long");
	});

	it("never marks inside code fences, front matter or tables", () => {
		const text = [
			"---",
			`title: ${words(3)}`,
			"---",
			"```",
			`${words(30)}`,
			"```",
			`| ${words(15)} | x |`,
			`${words(12)}.`,
		].join("\n");
		const ranges = longSentenceRanges(text, 10);
		expect(ranges).toHaveLength(1);
		expect(text.slice(ranges[0].start, ranges[0].end)).toBe(`${words(12)}.`);
	});

	it("keeps offsets valid when markdown noise precedes the sentence", () => {
		const text = `# Heading\n\n**${words(14)}**.`;
		const ranges = longSentenceRanges(text, 10);
		expect(ranges).toHaveLength(1);
		const slice = text.slice(ranges[0].start, ranges[0].end);
		expect(slice).toContain("w0");
		expect(slice).toContain("w13");
	});

	it("returns nothing for prose under the threshold", () => {
		expect(longSentenceRanges(`${words(9)}. ${words(8)}.`, 10)).toHaveLength(0);
	});
});
