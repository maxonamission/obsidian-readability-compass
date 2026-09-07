/**
 * The translatable surface of the feedback layer (BC_E1_S28).
 *
 * Three rules keep this maintainable:
 *
 * 1. **Every language implements this interface in full.** A missing or
 *    renamed key is a compile error, so translations cannot silently drift
 *    behind the English source.
 * 2. **Anything with a number, a plural or a joined clause is a function**,
 *    not a template with placeholders. Pluralization and word order differ per
 *    language; putting the composition inside the language module is the only
 *    way that stays correct (see `structureConclusion`).
 * 3. **Keys in, text out.** `LixBand`, `FleschLabel` and `DiataxisCluster` are
 *    canonical English keys produced by the analysis layer and persisted to
 *    front matter; they are translated here, at render time only.
 *
 * Out of scope by design: the settings tab and command names stay English, per
 * Obsidian's own UI guidance.
 */

import { LixBand, FleschLabel } from "../readability/scores";
import {
	DiataxisCluster,
	StructureConclusionModel,
} from "../readability/structure";

/** Where a resolved target came from, as data (the wording differs per language). */
export type TargetSourceKind =
	| { kind: "note" }
	| { kind: "diataxis"; detail: string | null }
	| { kind: "tag"; detail: string }
	| { kind: "folder"; detail: string }
	| { kind: "global" };

export interface Strings {
	// --- Panel: single note ---------------------------------------------------
	panelEmpty: string;
	/** Below the minimum word count there is no score, only this explanation. */
	tooShortForScore: (minWords: number, found: number) => string;
	scoreLabelLix: string;
	onTarget: (maxLix: number) => string;
	aboveTarget: (maxLix: number) => string;
	targetLine: (band: string, source: string) => string;
	languageUnknown: string;
	/** "Flesch-Douma 62 (plain)" — name and score are language-independent. */
	fleschLine: (name: string, score: number, label: string) => string;
	countWords: string;
	countSentences: string;
	countWordsPerSentence: string;
	countLongWords: string;
	countParagraphs: string;
	countReadingTime: string;
	footnoteMeasured: (tablesIncluded: boolean) => string;

	// --- Panel: explorer selection --------------------------------------------
	notesSelected: (count: number) => string;
	backToCurrentNote: string;
	selectionTooShort: string;
	scoreLabelLixCombined: string;
	mixedTargets: string;
	notesHardestFirst: string;
	clickToOpenNote: string;
	footnoteMulti: string;

	// --- Panel: sections -------------------------------------------------------
	sectionsTitle: string;
	sectionIntro: string;
	clickToJumpSection: string;
	/** "340 w · LIX 52 ✓" or "12 w · too short to score". */
	sectionValue: (words: number, lix: string | null, mark: string) => string;

	// --- Panel: structure & cohesion -------------------------------------------
	structureTitle: string;
	structureConclusion: (model: StructureConclusionModel) => string;
	cohesionLabel: string;
	cohesionValue: (percent: number, topicShift: boolean) => string;
	connectivesLabel: string;
	headingsLabel: string;
	headingsValue: (count: number, maxDepth: number, skips: boolean) => string;
	wallOfTextLabel: string;
	wallOfTextValue: (count: number, longestWords: number) => string;
	diataxisLabel: string;
	diataxisMatch: (declared: string) => string;
	diataxisMismatch: (declared: string, looksLike: DiataxisCluster) => string;
	footnoteStructure: string;

	// --- Panel: lists ----------------------------------------------------------
	hardestParagraphs: string;
	longestSentences: string;
	paragraphPrefix: (lix: string, words: number) => string;
	sentencePrefix: (words: number, noteLabel: string | null) => string;
	clickToJumpParagraph: string;
	clickToJumpSentence: string;
	showMore: (hidden: number) => string;

	// --- Bands (canonical keys → display text) ---------------------------------
	lixBand: Record<LixBand, string>;
	fleschLabel: Record<FleschLabel, string>;

	// --- Status bar -------------------------------------------------------------
	wordsSelected: (words: number) => string;
	statusAria: string;
	statusAriaWithTarget: (band: string, maxLix: number, source: string) => string;

	// --- Notices and the insertable report --------------------------------------
	noticeTitleSelection: string;
	noticeTitleCurrentNote: string;
	noticeTooShort: (minWords: number, found: number) => string;
	noticeTargetOn: (maxLix: number, sourceSuffix: string) => string;
	noticeTargetAbove: (maxLix: number, sourceSuffix: string) => string;
	noticeCounts: (
		words: number,
		sentences: number,
		wordsPerSentence: string,
	) => string;
	noticeLongWords: (percent: string, readingTime: string) => string;
	calloutTitle: (dateIso: string) => string;
	targetSource: (source: TargetSourceKind) => string;
	propertiesUpdated: string;
	propertiesUnchanged: string;
	propertiesBatch: (updated: number, total: number) => string;
}
