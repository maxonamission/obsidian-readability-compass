/**
 * English — the reference catalogue and the fallback for every language that
 * has no translation yet. The wording here is the pre-i18n UI text verbatim,
 * so extracting the strings changed no English output (BC_E1_S28).
 */

import { DiataxisCluster, StructureConclusionModel } from "../readability/structure";
import { Strings } from "./types";

const SHAPE_PHRASE: Record<DiataxisCluster, string> = {
	procedural: "Step-by-step",
	reference: "Scannable, reference-style",
	explanation: "Flowing prose",
	mixed: "Mixed structure",
};

export const EN: Strings = {
	panelEmpty: "No active note. Open a Markdown note to see its readability.",
	tooShortForScore: (minWords, found) =>
		`Add more text for a stable score (min ${minWords} words; found ${found}).`,
	scoreLabelLix: "LIX",
	onTarget: (maxLix) => `✓ on target (max ${maxLix})`,
	aboveTarget: (maxLix) => `▲ above target (max ${maxLix})`,
	targetLine: (band, source) => `Target ${band} · from ${source}`,
	languageUnknown: "language unknown — LIX only",
	fleschLine: (name, score, label) => `${name} ${score} (${label})`,
	countWords: "Words",
	countSentences: "Sentences",
	countWordsPerSentence: "Words per sentence",
	countLongWords: "Long words (>6 letters)",
	countParagraphs: "Paragraphs",
	countReadingTime: "Reading time",
	footnoteMeasured: (tablesIncluded) =>
		tablesIncluded
			? "Measured on running text incl. tables — front matter, code, links and URLs are excluded."
			: "Measured on running text — front matter, code, tables, links and URLs are excluded.",

	notesSelected: (count) => `${count} notes`,
	backToCurrentNote: "Back to current note",
	selectionTooShort: "Too little text in this selection for a stable score.",
	scoreLabelLixCombined: "LIX (combined)",
	mixedTargets: "Notes have different targets — see the per-note marks below.",
	notesHardestFirst: "Notes (hardest first)",
	clickToOpenNote: "Click to open this note",
	footnoteMulti:
		"Combined over the selected notes; per-note targets apply to the marks.",

	sectionsTitle: "Sections",
	sectionIntro: "(intro)",
	clickToJumpSection: "Click to jump to this section",
	sectionValue: (words, lix, mark) =>
		lix === null ? `${words} w · too short to score` : `${words} w · LIX ${lix}${mark}`,

	structureTitle: "Structure & cohesion",
	structureConclusion: (model) => conclusion(model),
	cohesionLabel: "Sentence-to-sentence overlap",
	cohesionValue: (percent, topicShift) =>
		`${percent}%${topicShift ? " — sentences often shift topic" : ""}`,
	connectivesLabel: "Connective density",
	headingsLabel: "Headings",
	headingsValue: (count, maxDepth, skips) =>
		`${count} (depth ${maxDepth})${skips ? " · skipped level" : ""}`,
	wallOfTextLabel: "Long sections (no subheading)",
	wallOfTextValue: (count, longestWords) => `${count} · up to ${longestWords} w`,
	diataxisLabel: "Diátaxis fit",
	diataxisMatch: (declared) => `matches '${declared}'`,
	diataxisMismatch: (declared, looksLike) =>
		`declared '${declared}', reads as ${looksLike}`,
	footnoteStructure:
		"Descriptive hints, not part of the LIX score — structure and cohesion are a separate axis the formulas miss.",

	hardestParagraphs: "Hardest paragraphs",
	longestSentences: "Longest sentences",
	paragraphPrefix: (lix, words) => `LIX ${lix} · ${words} w · `,
	sentencePrefix: (words, noteLabel) =>
		`${words} w · ${noteLabel !== null ? `${noteLabel} · ` : ""}`,
	clickToJumpParagraph: "Click to jump to this paragraph",
	clickToJumpSentence: "Click to jump to this sentence",
	showMore: (hidden) => `Show more (${hidden} hidden)`,

	lixBand: {
		"very easy": "very easy",
		easy: "easy",
		average: "average",
		difficult: "difficult",
		"very difficult": "very difficult",
	},
	fleschLabel: {
		"very easy": "very easy",
		easy: "easy",
		"fairly easy": "fairly easy",
		plain: "plain",
		"fairly difficult": "fairly difficult",
		difficult: "difficult",
		"very difficult": "very difficult",
	},

	wordsSelected: (words) => `${words} w selected`,
	statusAria: "Readability — click for details",
	statusAriaWithTarget: (band, maxLix, source) =>
		`Readability — target ${band} (LIX ≤ ${maxLix}) from ${source} — click for details`,

	noticeTitleSelection: "Selection",
	noticeTitleCurrentNote: "Current note",
	noticeTooShort: (minWords, found) =>
		`Too short for a stable score (min ${minWords} words; found ${found}).`,
	noticeTargetOn: (maxLix, sourceSuffix) => `on target (max ${maxLix}${sourceSuffix})`,
	noticeTargetAbove: (maxLix, sourceSuffix) =>
		`above target (max ${maxLix}${sourceSuffix})`,
	noticeCounts: (words, sentences, wordsPerSentence) =>
		`${words} words · ${sentences} sentences · ${wordsPerSentence} words/sentence`,
	noticeLongWords: (percent, readingTime) =>
		`${percent} long words · ${readingTime} read`,
	calloutTitle: (dateIso) => `Readability — ${dateIso}`,
	targetSource: (source) => {
		switch (source.kind) {
			case "note":
				return "note front matter";
			case "diataxis":
				return source.detail ?? "diataxis type";
			case "tag":
				return `tag ${source.detail}`.trim();
			case "folder":
				return `folder ${source.detail}`.trim();
			case "global":
				return "global setting";
		}
	},
	propertiesUpdated: "Readability properties updated.",
	propertiesUnchanged: "Readability properties already up to date.",
	propertiesBatch: (updated, total) =>
		`Readability properties: ${updated} of ${total} notes updated.`,
};

/**
 * The one-line characterization of the note's shape. Stays descriptive (never
 * pass/fail): it names the shape and appends the notable observations.
 */
function conclusion(model: StructureConclusionModel): string {
	const flags: string[] = [];
	if (model.cohesion === "loose") {
		flags.push("loosely connected (topics shift between sentences)");
	} else if (model.cohesion === "tight") {
		flags.push("tightly connected");
	}
	if (model.wallOfText > 0) {
		flags.push(
			`${model.wallOfText} long section${model.wallOfText > 1 ? "s" : ""} without subheadings`,
		);
	}
	if (model.headingSkip) flags.push("a heading level is skipped");
	if (model.noHeadings) flags.push("no headings to signal structure");

	if (model.diataxis !== null) {
		const d = model.diataxis;
		const lead = d.matches
			? `Structure matches the declared '${d.declared}'`
			: `Declared '${d.declared}', but reads as ${SHAPE_PHRASE[d.looksLike].toLowerCase()}`;
		return flags.length > 0 ? `${lead} — ${flags.join("; ")}` : lead;
	}

	const lead = SHAPE_PHRASE[model.shape];
	return flags.length > 0 ? `${lead} — ${flags.join("; ")}` : `${lead}, well connected`;
}
