import { describe, expect, it } from "vitest";
import { analyzeStructure } from "../readability/structure";

describe("analyzeStructure — headings", () => {
	it("counts headings, depth and flags a skipped level", () => {
		const md = "# Title\n\n## Section\n\ntext here\n\n#### Deep\n\nmore text";
		const s = analyzeStructure(md, { language: "en" });
		expect(s.headings.count).toBe(3);
		expect(s.headings.maxDepth).toBe(4);
		expect(s.headings.skips).toBe(true); // ## → #### jumps a level
	});

	it("does not flag a clean heading ladder", () => {
		const md = "# A\n\n## B\n\n### C\n\ntext";
		const s = analyzeStructure(md, { language: "en" });
		expect(s.headings.skips).toBe(false);
	});

	it("ignores headings inside fenced code and front matter", () => {
		const md = "---\ntitle: x\n---\n\n# Real\n\n```\n# not a heading\n```\n\ntext";
		const s = analyzeStructure(md, { language: "en" });
		expect(s.headings.count).toBe(1);
	});
});

describe("analyzeStructure — sections", () => {
	it("flags a wall-of-text section", () => {
		const body = Array(260).fill("sentence").join(" ") + ".";
		const s = analyzeStructure(`# Heading\n\n${body}`, { language: "en" });
		expect(s.sections.wallOfText).toBe(1);
		expect(s.sections.longestWords).toBeGreaterThan(250);
	});
});

describe("analyzeStructure — cohesion", () => {
	it("scores a topically-linked passage above a disjoint one", () => {
		const linked =
			"Readability measures how difficult text becomes. " +
			"Difficult text frustrates readers quickly. " +
			"Readers abandon frustrating text often.";
		const disjoint =
			"Readability measures difficult text. " +
			"Bananas ripen quickly outside. " +
			"Volcanoes erupt near oceans.";
		const a = analyzeStructure(linked, { language: "en" });
		const b = analyzeStructure(disjoint, { language: "en" });
		expect(a.cohesion).not.toBeNull();
		expect(b.cohesion).not.toBeNull();
		expect(a.cohesion as number).toBeGreaterThan(b.cohesion as number);
		expect(b.cohesion as number).toBeLessThan(0.1);
	});

	it("returns null with too few sentences", () => {
		const s = analyzeStructure("Just one sentence here.", { language: "en" });
		expect(s.cohesion).toBeNull();
	});
});

describe("analyzeStructure — connectives", () => {
	it("counts the share of sentences carrying a connective (English)", () => {
		const md =
			"The plan works. However, costs rose. Therefore, we adjusted the budget.";
		const s = analyzeStructure(md, { language: "en" });
		expect(s.connectives).not.toBeNull();
		expect(s.connectives as number).toBeCloseTo(2 / 3, 2);
	});

	it("is null when the language has no connective list", () => {
		const s = analyzeStructure("Palabras claras ayudan mucho al lector.", {
			language: "es",
		});
		expect(s.connectives).toBeNull();
	});

	it("is null when the language is unknown", () => {
		const s = analyzeStructure("lorem ipsum dolor sit amet consectetur.", {
			language: "unknown",
		});
		expect(s.connectives).toBeNull();
	});
});

describe("analyzeStructure — shape", () => {
	it("classifies prose-heavy text as explanation, always exposing a shape", () => {
		const s = analyzeStructure(
			"This paragraph discusses the reasoning at length without any lists, " +
				"because the aim is understanding rather than quick lookup.",
			{ language: "en" },
		);
		expect(s.shape).toBe("explanation");
	});

	it("classifies a numbered step list as procedural", () => {
		const md = "1. First do this.\n2. Then do that.\n3. Finally finish up.";
		expect(analyzeStructure(md, { language: "en" }).shape).toBe("procedural");
	});
});

describe("analyzeStructure — Diátaxis conformance", () => {
	const prose =
		"This note explains why the design works. It discusses the trade-offs " +
		"at length and walks through the reasoning behind each decision.\n\n" +
		"The argument continues across several ordinary prose paragraphs without " +
		"any lists, because the point is understanding rather than lookup.";

	it("is null when no type is declared", () => {
		expect(analyzeStructure(prose, { language: "en" }).diataxis).toBeNull();
	});

	it("flags a reference declared on prose-heavy structure", () => {
		const s = analyzeStructure(prose, {
			language: "en",
			declaredDiataxis: "reference",
		});
		expect(s.diataxis?.looksLike).toBe("explanation");
		expect(s.diataxis?.matches).toBe(false);
	});

	it("accepts an explanation declared on prose-heavy structure", () => {
		const s = analyzeStructure(prose, {
			language: "en",
			declaredDiataxis: "explanation",
		});
		expect(s.diataxis?.matches).toBe(true);
	});

	it("reads a numbered step list as procedural (tutorial/how-to)", () => {
		const md =
			"# Deploy\n\n1. Clone the repository to your machine.\n" +
			"2. Install the dependencies with the package manager.\n" +
			"3. Run the build command and wait for it to finish.\n" +
			"4. Start the server and open the browser.";
		const s = analyzeStructure(md, {
			language: "en",
			declaredDiataxis: "how-to",
		});
		expect(s.diataxis?.looksLike).toBe("procedural");
		expect(s.diataxis?.matches).toBe(true);
	});
});
