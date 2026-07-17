import { describe, expect, it } from "vitest";
import {
	cefrIndication,
	fleschLabel,
	fleschScore,
	lixBand,
	lixScore,
	targetMaxLix,
} from "../readability/scores";
import { LANGUAGE_BY_CODE, LanguageCode } from "../readability/language";

function formula(code: LanguageCode) {
	const definition = LANGUAGE_BY_CODE.get(code);
	if (definition === undefined) throw new Error(`missing language ${code}`);
	return definition.flesch;
}

describe("lixScore", () => {
	it("implements words/sentences + 100*longWords/words", () => {
		// 8 words, 2 sentences, 1 long word: 4 + 12.5 = 16.5
		expect(lixScore(8, 2, 1)).toBeCloseTo(16.5);
	});

	it("returns null for empty text and guards against zero sentences", () => {
		expect(lixScore(0, 0, 0)).toBeNull();
		expect(lixScore(5, 0, 0)).toBeCloseTo(5);
	});
});

describe("lixBand", () => {
	it("matches the Björnsson band boundaries", () => {
		expect(lixBand(29.9)).toBe("very easy");
		expect(lixBand(30)).toBe("easy");
		expect(lixBand(40)).toBe("average");
		expect(lixBand(50)).toBe("difficult");
		expect(lixBand(60)).toBe("very difficult");
	});
});

describe("cefrIndication and targets", () => {
	it("anchors B2 on the house norm LIX <= 45", () => {
		expect(cefrIndication(45)).toBe("≈ B2");
		expect(cefrIndication(45.1)).toBe("≈ C1");
		expect(cefrIndication(38)).toBe("≈ B1");
		expect(cefrIndication(60)).toBe("≈ C2");
	});

	it("resolves target bands to LIX ceilings", () => {
		expect(targetMaxLix("b1", 99)).toBe(40);
		expect(targetMaxLix("b2", 99)).toBe(45);
		expect(targetMaxLix("c1", 99)).toBe(55);
		expect(targetMaxLix("custom", 42)).toBe(42);
	});
});

describe("Flesch variants (formulas from the language registry)", () => {
	// All at 15 words/sentence and 1.5 syllables/word.
	it("computes Flesch Reading Ease (English)", () => {
		expect(fleschScore(formula("en"), 15, 1.5)).toBeCloseTo(64.71, 2);
	});

	it("computes Flesch-Douma (Dutch)", () => {
		expect(fleschScore(formula("nl"), 15, 1.5)).toBeCloseTo(77.39, 2);
	});

	it("computes Flesch-Amstad (German)", () => {
		// 180 - 15 - 87.75 = 77.25
		expect(fleschScore(formula("de"), 15, 1.5)).toBeCloseTo(77.25, 2);
	});

	it("computes Fernández-Huerta (Spanish)", () => {
		// 206.84 - 15.3 - 90 = 101.54
		expect(fleschScore(formula("es"), 15, 1.5)).toBeCloseTo(101.54, 2);
	});

	it("computes Kandel-Moles (French)", () => {
		// 209 - 17.25 - 102 = 89.75
		expect(fleschScore(formula("fr"), 15, 1.5)).toBeCloseTo(89.75, 2);
	});

	it("computes Flesch-Martins (Portuguese)", () => {
		// 248.835 - 15.225 - 126.9 = 106.71
		expect(fleschScore(formula("pt"), 15, 1.5)).toBeCloseTo(106.71, 2);
	});

	it("labels the standard bands", () => {
		expect(fleschLabel(95)).toBe("very easy");
		expect(fleschLabel(65)).toBe("plain");
		expect(fleschLabel(20)).toBe("very difficult");
	});
});
