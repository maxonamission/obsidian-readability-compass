/**
 * Nederlands (BC_E1_S28). Eerste vertaling naast het Engelse origineel; de
 * eigenaar valideert deze taal zelf in de vault.
 *
 * De conclusiezin wordt hier zelfstandig opgebouwd, niet uit vertaalde
 * fragmenten geplakt: het Nederlands vraagt een eigen woordvolgorde en een
 * eigen meervoudsvorm ("1 lange sectie" / "2 lange secties").
 */

import { DiataxisCluster, StructureConclusionModel } from "../readability/structure";
import { Strings } from "./types";

/** Als zelfstandige aanhef van de conclusiezin (dus met hoofdletter). */
const VORM: Record<DiataxisCluster, string> = {
	procedural: "Stap voor stap",
	reference: "Scanbaar, naslagachtig",
	explanation: "Lopend betoog",
	mixed: "Gemengde structuur",
};

/** Als bijzin, na "leest als ..." (dus zonder hoofdletter). */
const VORM_ALS: Record<DiataxisCluster, string> = {
	procedural: "stap voor stap",
	reference: "scanbaar naslagwerk",
	explanation: "lopend betoog",
	mixed: "gemengde structuur",
};

export const NL: Strings = {
	panelEmpty:
		"Geen actieve notitie. Open een Markdown-notitie om de leesbaarheid te zien.",
	tooShortForScore: (minWords, found) =>
		`Voeg meer tekst toe voor een stabiele score (minimaal ${minWords} woorden; nu ${found}).`,
	scoreLabelLix: "LIX",
	onTarget: (maxLix) => `✓ op doel (max ${maxLix})`,
	aboveTarget: (maxLix) => `▲ boven doel (max ${maxLix})`,
	targetLine: (band, source) => `Doel ${band} · uit ${source}`,
	languageUnknown: "taal onbekend — alleen LIX",
	fleschLine: (name, score, label) => `${name} ${score} (${label})`,
	countWords: "Woorden",
	countSentences: "Zinnen",
	countWordsPerSentence: "Woorden per zin",
	countLongWords: "Lange woorden (>6 letters)",
	countParagraphs: "Alinea's",
	countReadingTime: "Leestijd",
	footnoteMeasured: (tablesIncluded) =>
		tablesIncluded
			? "Gemeten op lopende tekst inclusief tabellen — front matter, code, links en URL's tellen niet mee."
			: "Gemeten op lopende tekst — front matter, code, tabellen, links en URL's tellen niet mee.",

	notesSelected: (count) => (count === 1 ? "1 notitie" : `${count} notities`),
	backToCurrentNote: "Terug naar de huidige notitie",
	selectionTooShort: "Te weinig tekst in deze selectie voor een stabiele score.",
	scoreLabelLixCombined: "LIX (samen)",
	mixedTargets:
		"De notities hebben verschillende doelen — zie de tekens per notitie hieronder.",
	notesHardestFirst: "Notities (moeilijkste eerst)",
	clickToOpenNote: "Klik om deze notitie te openen",
	footnoteMulti:
		"Samengeteld over de geselecteerde notities; de tekens volgen het doel per notitie.",

	sectionsTitle: "Secties",
	sectionIntro: "(intro)",
	clickToJumpSection: "Klik om naar deze sectie te springen",
	sectionValue: (words, lix, mark) =>
		lix === null
			? `${words} w · te kort om te scoren`
			: `${words} w · LIX ${lix}${mark}`,

	structureTitle: "Structuur & samenhang",
	structureConclusion: (model) => conclusie(model),
	cohesionLabel: "Overlap tussen opeenvolgende zinnen",
	cohesionValue: (percent, topicShift) =>
		`${percent}%${topicShift ? " — zinnen wisselen vaak van onderwerp" : ""}`,
	connectivesLabel: "Dichtheid verbindingswoorden",
	headingsLabel: "Kopjes",
	headingsValue: (count, maxDepth, skips) =>
		`${count} (diepte ${maxDepth})${skips ? " · niveau overgeslagen" : ""}`,
	wallOfTextLabel: "Lange secties (zonder subkopje)",
	wallOfTextValue: (count, longestWords) => `${count} · tot ${longestWords} w`,
	diataxisLabel: "Diátaxis-passing",
	diataxisMatch: (declared) => `past bij '${declared}'`,
	diataxisMismatch: (declared, looksLike) =>
		`opgegeven '${declared}', leest als ${VORM_ALS[looksLike]}`,
	footnoteStructure:
		"Beschrijvende signalen, geen onderdeel van de LIX-score — structuur en samenhang zijn een aparte as die de formules missen.",

	hardestParagraphs: "Zwaarste alinea's",
	longestSentences: "Langste zinnen",
	paragraphPrefix: (lix, words) => `LIX ${lix} · ${words} w · `,
	sentencePrefix: (words, noteLabel) =>
		`${words} w · ${noteLabel !== null ? `${noteLabel} · ` : ""}`,
	clickToJumpParagraph: "Klik om naar deze alinea te springen",
	clickToJumpSentence: "Klik om naar deze zin te springen",
	showMore: (hidden) => `Toon meer (${hidden} verborgen)`,

	lixBand: {
		"very easy": "zeer makkelijk",
		easy: "makkelijk",
		average: "gemiddeld",
		difficult: "moeilijk",
		"very difficult": "zeer moeilijk",
	},
	fleschLabel: {
		"very easy": "zeer makkelijk",
		easy: "makkelijk",
		"fairly easy": "vrij makkelijk",
		plain: "eenvoudig",
		"fairly difficult": "vrij moeilijk",
		difficult: "moeilijk",
		"very difficult": "zeer moeilijk",
	},

	wordsSelected: (words) => `${words} w geselecteerd`,
	statusAria: "Leesbaarheid — klik voor details",
	statusAriaWithTarget: (band, maxLix, source) =>
		`Leesbaarheid — doel ${band} (LIX ≤ ${maxLix}) uit ${source} — klik voor details`,

	noticeTitleSelection: "Selectie",
	noticeTitleCurrentNote: "Huidige notitie",
	noticeTooShort: (minWords, found) =>
		`Te kort voor een stabiele score (minimaal ${minWords} woorden; nu ${found}).`,
	noticeTargetOn: (maxLix, sourceSuffix) => `op doel (max ${maxLix}${sourceSuffix})`,
	noticeTargetAbove: (maxLix, sourceSuffix) =>
		`boven doel (max ${maxLix}${sourceSuffix})`,
	noticeCounts: (words, sentences, wordsPerSentence) =>
		`${words} woorden · ${sentences} zinnen · ${wordsPerSentence} woorden/zin`,
	noticeLongWords: (percent, readingTime) =>
		`${percent} lange woorden · ${readingTime} lezen`,
	calloutTitle: (dateIso) => `Leesbaarheid — ${dateIso}`,
	targetSource: (source) => {
		switch (source.kind) {
			case "note":
				return "front matter van de notitie";
			case "diataxis":
				return source.detail ?? "diataxis-type";
			case "tag":
				return `tag ${source.detail}`.trim();
			case "folder":
				return `map ${source.detail}`.trim();
			case "global":
				return "de algemene instelling";
		}
	},
	propertiesUpdated: "Leesbaarheidseigenschappen bijgewerkt.",
	propertiesUnchanged: "Leesbaarheidseigenschappen waren al bijgewerkt.",
	propertiesBatch: (updated, total) =>
		`Leesbaarheidseigenschappen: ${updated} van ${total} notities bijgewerkt.`,
};

/** Zie `conclusion()` in en.ts — zelfde opzet, eigen grammatica. */
function conclusie(model: StructureConclusionModel): string {
	const flags: string[] = [];
	if (model.cohesion === "loose") {
		flags.push("los verbonden (het onderwerp wisselt tussen zinnen)");
	} else if (model.cohesion === "tight") {
		flags.push("strak verbonden");
	}
	if (model.wallOfText > 0) {
		flags.push(
			model.wallOfText === 1
				? "1 lange sectie zonder subkopje"
				: `${model.wallOfText} lange secties zonder subkopjes`,
		);
	}
	if (model.headingSkip) flags.push("er wordt een kopniveau overgeslagen");
	if (model.noHeadings) flags.push("geen kopjes die de structuur aangeven");

	if (model.diataxis !== null) {
		const d = model.diataxis;
		const lead = d.matches
			? `De structuur past bij het opgegeven '${d.declared}'`
			: `Opgegeven '${d.declared}', maar leest als ${VORM_ALS[d.looksLike]}`;
		return flags.length > 0 ? `${lead} — ${flags.join("; ")}` : lead;
	}

	const lead = VORM[model.shape];
	return flags.length > 0 ? `${lead} — ${flags.join("; ")}` : `${lead}, goed verbonden`;
}
