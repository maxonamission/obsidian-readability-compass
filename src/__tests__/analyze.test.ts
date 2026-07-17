import { describe, expect, it } from "vitest";
import { analyzeMarkdown, AnalyzeOptions } from "../readability/analyze";

const BASE: AnalyzeOptions = {
	language: "auto",
	minWords: 10,
	wordsPerMinute: 225,
	targetMaxLix: 45,
};

const DUTCH_SAMPLE = `# Leesbaarheid

Dit is een korte tekst die de leesbaarheid van een notitie meet. De plugin
gebruikt de LIX-index en een doelband. Korte zinnen helpen de lezer. Lange en
ingewikkelde formuleringen maken een tekst onnodig zwaar om te lezen.

- Een lijstpunt telt gewoon mee.
`;

describe("analyzeMarkdown", () => {
	it("produces a plausible report for a Dutch sample", () => {
		const report = analyzeMarkdown(DUTCH_SAMPLE, BASE);
		expect(report.language).toBe("nl");
		expect(report.lix).not.toBeNull();
		expect(report.lix as number).toBeGreaterThan(10);
		expect(report.lix as number).toBeLessThan(60);
		expect(report.band).not.toBeNull();
		expect(report.cefr).not.toBeNull();
		expect(report.flesch?.name).toBe("Flesch-Douma");
		expect(report.onTarget).not.toBeNull();
	});

	it("suppresses scores below the minimum word count but keeps counts", () => {
		const report = analyzeMarkdown("Slechts vier woorden hier.", {
			...BASE,
			minWords: 40,
		});
		expect(report.words).toBe(4);
		expect(report.lix).toBeNull();
		expect(report.band).toBeNull();
		expect(report.flesch).toBeNull();
		expect(report.onTarget).toBeNull();
	});

	it("marks a text above the ceiling as off target", () => {
		const hard =
			"Interdepartementale verantwoordelijkheidsverdeling veronderstelt buitengewoon " +
			"gedetailleerde afstemmingsprocedures. Beleidsvoorbereidingstrajecten vereisen " +
			"multidisciplinaire samenwerkingsverbanden.";
		const report = analyzeMarkdown(hard, { ...BASE, minWords: 5 });
		expect(report.lix as number).toBeGreaterThan(45);
		expect(report.onTarget).toBe(false);
	});

	it("returns the longest sentences first, with valid offsets", () => {
		const report = analyzeMarkdown(DUTCH_SAMPLE, BASE);
		const [first, second] = report.topSentences;
		expect(first.words).toBeGreaterThanOrEqual(second.words);
		expect(DUTCH_SAMPLE.slice(first.start, first.end)).toContain(
			first.text.split(" ")[0],
		);
	});

	it("selects the English Flesch variant for English text", () => {
		const english =
			"This is a short text that measures the readability of a note. " +
			"Short sentences help the reader. The plugin uses an index and a target band.";
		const report = analyzeMarkdown(english, BASE);
		expect(report.language).toBe("en");
		expect(report.flesch?.name).toBe("Flesch");
	});

	it("selects the Amstad variant for German text", () => {
		const german =
			"Das ist ein kurzer Text und der Leser versteht ihn sofort. " +
			"Kurze Sätze helfen beim Lesen. Der Text wird nicht schwer.";
		const report = analyzeMarkdown(german, BASE);
		expect(report.language).toBe("de");
		expect(report.flesch?.name).toBe("Flesch-Amstad");
	});

	it("selects the Bendová variant for Czech text", () => {
		const czech =
			"Před tím řekl že věty jsou krátké a čtenář text hned pochopí. " +
			"Což je také důležité při psaní. Krátké věty pomáhají.";
		const report = analyzeMarkdown(czech, { ...BASE, minWords: 5 });
		expect(report.language).toBe("cs");
		expect(report.flesch?.name).toBe("Flesch-Bendová");
	});

	it("honours a fixed language setting over detection", () => {
		const report = analyzeMarkdown(
			"Palabras claras ayudan mucho al lector en cada frase corta escrita aquí.",
			{ ...BASE, language: "es" },
		);
		expect(report.language).toBe("es");
		expect(report.flesch?.name).toBe("Fernández-Huerta");
	});

	it("counts paragraphs, ignoring code-only blocks", () => {
		const md = "Alinea een staat hier.\n\n```\ncode blok\n```\n\nAlinea twee staat hier.";
		const report = analyzeMarkdown(md, { ...BASE, minWords: 1 });
		expect(report.paragraphs).toBe(2);
	});

	it("ignores front matter, code and tables in every count", () => {
		const md =
			"---\ntags: [x]\n---\nEcht proza met precies acht woorden erin dus.\n\n" +
			"```\nfunction ignored() {}\n```\n\n| a | b |\n|---|---|\n";
		const report = analyzeMarkdown(md, { ...BASE, minWords: 1 });
		expect(report.words).toBe(8);
	});
});
