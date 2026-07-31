import { describe, expect, it } from "vitest";
import { analyzeMarkdown, AnalyzeOptions } from "../readability/analyze";
import {
	applyReadabilityProperties,
	isValidPropertyPrefix,
	propertyKeys,
} from "../bases-properties";

const BASE: AnalyzeOptions = {
	language: "auto",
	minWords: 10,
	wordsPerMinute: 225,
	targetMaxLix: 45,
};

const PROSE =
	"Korte zinnen helpen de lezer. Dit stuk bevat ruim voldoende woorden voor een stabiele score.";

describe("propertyKeys / isValidPropertyPrefix", () => {
	it("derives the three property names from the prefix", () => {
		expect(propertyKeys("readability")).toEqual({
			lix: "readability-lix",
			band: "readability-band",
			onTarget: "readability-on-target",
		});
	});

	it("rejects prefixes that break YAML keys or Bases ids", () => {
		expect(isValidPropertyPrefix("readability")).toBe(true);
		expect(isValidPropertyPrefix("rc2")).toBe(true);
		expect(isValidPropertyPrefix("")).toBe(false);
		expect(isValidPropertyPrefix("has space")).toBe(false);
		expect(isValidPropertyPrefix("a:b")).toBe(false);
		expect(isValidPropertyPrefix("a.b")).toBe(false);
		expect(isValidPropertyPrefix("a#b")).toBe(false);
	});
});

describe("applyReadabilityProperties (BC_E2_S4)", () => {
	it("writes lix, band and on-target for a scored note", () => {
		const report = analyzeMarkdown(PROSE, BASE);
		const frontmatter: Record<string, unknown> = { existing: "stays" };
		const changed = applyReadabilityProperties(frontmatter, report, "readability");
		expect(changed).toBe(true);
		expect(frontmatter.existing).toBe("stays");
		expect(typeof frontmatter["readability-lix"]).toBe("number");
		expect(frontmatter["readability-lix"]).toBe(
			Math.round((report.lix as number) * 10) / 10,
		);
		expect(frontmatter["readability-band"]).toBe(report.band);
		expect(frontmatter["readability-on-target"]).toBe(true);
	});

	it("is idempotent: a second apply reports no change", () => {
		const report = analyzeMarkdown(PROSE, BASE);
		const frontmatter: Record<string, unknown> = {};
		expect(applyReadabilityProperties(frontmatter, report, "readability")).toBe(true);
		expect(applyReadabilityProperties(frontmatter, report, "readability")).toBe(false);
	});

	it("removes the keys when the note falls below minWords", () => {
		const scoreless = analyzeMarkdown("Drie woorden maar.", { ...BASE, minWords: 40 });
		const frontmatter: Record<string, unknown> = {
			"readability-lix": 42,
			"readability-band": "average",
			"readability-on-target": true,
			other: "stays",
		};
		const changed = applyReadabilityProperties(frontmatter, scoreless, "readability");
		expect(changed).toBe(true);
		expect("readability-lix" in frontmatter).toBe(false);
		expect("readability-band" in frontmatter).toBe(false);
		expect("readability-on-target" in frontmatter).toBe(false);
		expect(frontmatter.other).toBe("stays");
	});

	it("reports no change for a scoreless note without the keys", () => {
		const scoreless = analyzeMarkdown("Drie woorden maar.", { ...BASE, minWords: 40 });
		expect(applyReadabilityProperties({}, scoreless, "readability")).toBe(false);
	});

	it("honours a custom prefix", () => {
		const report = analyzeMarkdown(PROSE, BASE);
		const frontmatter: Record<string, unknown> = {};
		applyReadabilityProperties(frontmatter, report, "rc");
		expect(Object.keys(frontmatter).sort()).toEqual([
			"rc-band",
			"rc-lix",
			"rc-on-target",
		]);
	});
});
