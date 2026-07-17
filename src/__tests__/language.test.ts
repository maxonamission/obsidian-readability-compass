import { describe, expect, it } from "vitest";
import {
	countSyllablesEn,
	countSyllablesNl,
	detectLanguage,
	LANGUAGE_BY_CODE,
	LANGUAGES,
} from "../readability/language";

function syllables(
	code: "de" | "es" | "fr" | "pt" | "it" | "ru" | "tr" | "cs",
	word: string,
): number {
	const definition = LANGUAGE_BY_CODE.get(code);
	if (definition === undefined) throw new Error(`missing language ${code}`);
	return definition.countSyllables(word);
}

describe("detectLanguage", () => {
	it("detects Dutch", () => {
		const words = "de tekst is een voorbeeld van het niet zo moeilijke geval".split(" ");
		expect(detectLanguage(words)).toBe("nl");
	});

	it("detects English", () => {
		const words = "the text is an example of the not so difficult case".split(" ");
		expect(detectLanguage(words)).toBe("en");
	});

	it("detects German", () => {
		const words = "das ist ein Beispiel und der Text wird nicht schwer".split(" ");
		expect(detectLanguage(words)).toBe("de");
	});

	it("detects Spanish", () => {
		const words = "el texto es muy claro pero también corto cuando lo lees".split(" ");
		expect(detectLanguage(words)).toBe("es");
	});

	it("detects French", () => {
		const words = "le texte est dans une page pour vous avec plus de mots".split(" ");
		expect(detectLanguage(words)).toBe("fr");
	});

	it("detects Portuguese", () => {
		const words = "o texto não é difícil mas você também já sabe isso".split(" ");
		expect(detectLanguage(words)).toBe("pt");
	});

	it("detects Italian", () => {
		const words = "il testo non è molto difficile ma anche chiaro quando lo leggi con calma".split(" ");
		expect(detectLanguage(words)).toBe("it");
	});

	it("detects Russian", () => {
		const words = "это очень простой текст но не сложный и его может читать каждый когда захочет".split(" ");
		expect(detectLanguage(words)).toBe("ru");
	});

	it("detects Turkish", () => {
		const words = "bu metin çok zor değil ama daha kısa ve herkes için okunabilir bir örnek".split(" ");
		expect(detectLanguage(words)).toBe("tr");
	});

	it("detects Czech", () => {
		const words = "před tím řekl že věty jsou krátké a čtenář hned pochopí což je také důležité při psaní".split(" ");
		expect(detectLanguage(words)).toBe("cs");
	});

	it("returns unknown when there is too little signal", () => {
		expect(detectLanguage(["lorem", "ipsum", "dolor", "sit", "amet"])).toBe("unknown");
		expect(detectLanguage([])).toBe("unknown");
	});
});

describe("registry", () => {
	it("defines a published Flesch variant per language", () => {
		expect(LANGUAGES.map((l) => l.flesch.name)).toEqual([
			"Flesch-Douma",
			"Flesch",
			"Flesch-Amstad",
			"Fernández-Huerta",
			"Kandel-Moles",
			"Flesch-Martins",
			"Flesch-Vacca",
			"Flesch-Oborneva",
			"Ateşman",
			"Flesch-Bendová",
		]);
	});
});

describe("countSyllablesEn", () => {
	it("counts common cases within heuristic tolerance", () => {
		expect(countSyllablesEn("cat")).toBe(1);
		expect(countSyllablesEn("table")).toBe(2);
		expect(countSyllablesEn("readable")).toBe(3);
		expect(countSyllablesEn("running")).toBe(2);
		expect(countSyllablesEn("")).toBe(0);
	});
});

describe("countSyllablesNl", () => {
	it("treats vowel clusters as one syllable", () => {
		expect(countSyllablesNl("boom")).toBe(1);
		expect(countSyllablesNl("mooi")).toBe(1);
		expect(countSyllablesNl("leesbaarheid")).toBe(3);
	});

	it("starts a new syllable at a diaeresis", () => {
		expect(countSyllablesNl("beëindigen")).toBe(4);
	});

	it("never returns 0 for a word with letters", () => {
		expect(countSyllablesNl("brr")).toBe(1);
	});
});

describe("syllable heuristics for the added languages", () => {
	it("counts German vowel groups (umlauts included)", () => {
		expect(syllables("de", "Haus")).toBe(1);
		expect(syllables("de", "Sonne")).toBe(2);
		expect(syllables("de", "Universität")).toBe(5);
	});

	it("counts Spanish vowel groups (accents start a group)", () => {
		expect(syllables("es", "casa")).toBe(2);
		expect(syllables("es", "pero")).toBe(2);
		expect(syllables("es", "número")).toBe(3);
	});

	it("counts French vowel groups (silent final e stripped)", () => {
		expect(syllables("fr", "maison")).toBe(2);
		expect(syllables("fr", "table")).toBe(1);
		expect(syllables("fr", "liberté")).toBe(3);
	});

	it("counts Portuguese vowel groups (nasal accents start a group)", () => {
		expect(syllables("pt", "casa")).toBe(2);
		expect(syllables("pt", "coração")).toBe(3);
		expect(syllables("pt", "país")).toBe(2);
	});

	it("counts Italian vowel groups (accented diphthongs stay one group)", () => {
		expect(syllables("it", "casa")).toBe(2);
		expect(syllables("it", "italiano")).toBe(4);
		expect(syllables("it", "città")).toBe(2);
		expect(syllables("it", "più")).toBe(1);
	});

	it("counts Russian syllables as vowel count (adjacent vowels split)", () => {
		expect(syllables("ru", "молоко")).toBe(3);
		expect(syllables("ru", "текст")).toBe(1);
		expect(syllables("ru", "язык")).toBe(2);
		expect(syllables("ru", "поэт")).toBe(2);
	});

	it("counts Turkish syllables as vowel count (clusters split, saat → 2)", () => {
		expect(syllables("tr", "kitap")).toBe(2);
		expect(syllables("tr", "araba")).toBe(3);
		expect(syllables("tr", "saat")).toBe(2);
		expect(syllables("tr", "güzel")).toBe(2);
	});

	it("counts Czech vowel groups (ě counts, ou merges, syllabic vlk → 1)", () => {
		expect(syllables("cs", "žena")).toBe(2);
		expect(syllables("cs", "člověk")).toBe(2);
		expect(syllables("cs", "mouka")).toBe(2);
		expect(syllables("cs", "vlk")).toBe(1);
	});
});
