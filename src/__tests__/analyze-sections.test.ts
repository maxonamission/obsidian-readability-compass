import { describe, expect, it } from "vitest";
import { analyzeMarkdown, AnalyzeOptions } from "../readability/analyze";

const BASE: AnalyzeOptions = {
	language: "auto",
	minWords: 10,
	wordsPerMinute: 225,
	targetMaxLix: 45,
};

const SHORT_PROSE =
	"Korte zinnen helpen de lezer. Dit stuk bevat genoeg woorden voor een score van deze sectie.";

const HARD_PROSE =
	"Buitengewoon gecompliceerde formuleringen produceren onvermijdelijk aanzienlijk verhoogde leesbaarheidsindexwaarden, aangezien uitzonderlijk langgerekte zinsconstructies gecombineerd met veelvuldige meerlettergrepige terminologie doorgaans substantieel bovengemiddelde moeilijkheidsniveaus veroorzaken.";

const TWO_SECTIONS = `# Eenvoudig deel

${SHORT_PROSE}

## Moeilijk deel

${HARD_PROSE}
`;

describe("per-section scores (BC_E2_S2)", () => {
	it("scores each heading section in document order with its own verdict", () => {
		const report = analyzeMarkdown(TWO_SECTIONS, BASE);
		expect(report.sections).toHaveLength(2);

		const [easy, hard] = report.sections;
		expect(easy.heading).toBe("Eenvoudig deel");
		expect(easy.level).toBe(1);
		expect(easy.lix).not.toBeNull();
		expect(easy.onTarget).toBe(true);

		expect(hard.heading).toBe("Moeilijk deel");
		expect(hard.level).toBe(2);
		expect(hard.lix).not.toBeNull();
		expect(hard.lix as number).toBeGreaterThan(45);
		expect(hard.onTarget).toBe(false);
	});

	it("anchors each section at its heading line for the jump", () => {
		const report = analyzeMarkdown(TWO_SECTIONS, BASE);
		const [easy, hard] = report.sections;
		expect(TWO_SECTIONS.slice(easy.start, easy.end)).toBe("# Eenvoudig deel");
		expect(TWO_SECTIONS.slice(hard.start, hard.end)).toBe("## Moeilijk deel");
	});

	it("includes text before the first heading as a level-0 intro section", () => {
		const markdown = `${SHORT_PROSE}\n\n# Kop\n\n${SHORT_PROSE}\n`;
		const report = analyzeMarkdown(markdown, BASE);
		expect(report.sections).toHaveLength(2);
		expect(report.sections[0].level).toBe(0);
		expect(report.sections[0].heading).toBe("");
		expect(report.sections[0].words).toBeGreaterThan(0);
	});

	it("suppresses the score of sections below minWords without a verdict", () => {
		const markdown = "# Kort\n\nDrie woorden maar.\n\n# Lang\n\n" + SHORT_PROSE + "\n";
		const report = analyzeMarkdown(markdown, { ...BASE, minWords: 10 });
		const [short, long] = report.sections;
		expect(short.words).toBe(3);
		expect(short.lix).toBeNull();
		expect(short.onTarget).toBeNull();
		expect(long.lix).not.toBeNull();
	});

	it("ignores heading look-alikes inside code fences", () => {
		const markdown = `# Echte kop\n\n${SHORT_PROSE}\n\n\`\`\`\n# geen kop maar code\n\`\`\`\n\n# Tweede kop\n\n${SHORT_PROSE}\n`;
		const report = analyzeMarkdown(markdown, BASE);
		expect(report.sections.map((section) => section.heading)).toEqual([
			"Echte kop",
			"Tweede kop",
		]);
	});

	it("returns no sections for a note without headings", () => {
		const report = analyzeMarkdown(`${SHORT_PROSE}\n\n${SHORT_PROSE}\n`, BASE);
		expect(report.sections).toEqual([]);
	});
});
