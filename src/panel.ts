import { ItemView, WorkspaceLeaf } from "obsidian";
import { ParagraphSpan, ReadabilityReport } from "./readability/analyze";
import { StructureReport } from "./readability/structure";
import { SentenceSpan } from "./readability/sentences";
import { ResolvedTarget } from "./readability/target-profile";
import {
	formatLixValue,
	formatPercent,
	formatReadingTime,
	formatTargetBand,
	formatTargetSource,
} from "./format";
import { DetectedLanguage, LANGUAGES } from "./readability/language";
import { structureConclusionModel } from "./readability/structure";
import { Strings } from "./i18n";
import type ReadabilityCompassPlugin from "./main";
import type { MultiFileReport } from "./main";

export const VIEW_TYPE_READABILITY = "readability-compass-panel";

const SHOW_MORE_STEP = 10;

/** A longest-sentence entry that carries how to jump to it (captured at render time). */
interface SentenceListEntry {
	span: SentenceSpan;
	/** File basename in a multi-note report; null for the active note. */
	label: string | null;
	/** Runs the jump — closes over the file + offsets, so identical sentences never cross-resolve. */
	onSelect: () => void;
}

/** Language names stay in their English registry form ("Dutch", "German"). */
const LANGUAGE_LABEL: Record<string, string> = {};
for (const language of LANGUAGES) {
	LANGUAGE_LABEL[language.code] = language.label;
}

export class ReadabilityPanelView extends ItemView {
	/** Extra list entries revealed via "Show more"; resets when the subject changes. */
	private extraEntries = 0;
	private renderedSubject: string | null = null;
	/** Last render inputs, so "Show more" can re-render in place. */
	private lastRender: (() => void) | null = null;
	/** The multi report currently on screen; used to skip a mid-jump rebuild (BC_E1_S16). */
	private renderedMulti: MultiFileReport | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: ReadabilityCompassPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_READABILITY;
	}

	getDisplayText(): string {
		return "Readability";
	}

	getIcon(): string {
		return "gauge";
	}

	onOpen(): Promise<void> {
		this.plugin.refreshUi();
		return Promise.resolve();
	}

	private listBudget(): number {
		return this.plugin.settings.topSentencesShown + this.extraEntries;
	}

	/**
	 * The feedback language for what is on screen (BC_E1_S28). `detected` is
	 * null for an explorer selection: several notes can speak several
	 * languages, so that case resolves to English unless the user pinned one.
	 */
	private strings(detected: DetectedLanguage | null): Strings {
		return this.plugin.strings(detected);
	}

	private resetForSubject(subject: string): void {
		if (this.renderedSubject !== subject) {
			this.renderedSubject = subject;
			this.extraEntries = 0;
		}
	}

	// --- Single note ----------------------------------------------------------

	render(
		report: ReadabilityReport | null,
		fileName: string | null,
		target: ResolvedTarget | null = null,
		structure: StructureReport | null = null,
	): void {
		this.resetForSubject(`file:${fileName ?? ""}`);
		this.renderedMulti = null;
		this.lastRender = () => this.render(report, fileName, target, structure);

		const root = this.contentEl;
		root.empty();
		root.addClass("rc-panel");

		const t = this.strings(report?.language ?? null);

		if (report === null || fileName === null) {
			root.createEl("p", { text: t.panelEmpty, cls: "rc-empty" });
			return;
		}

		root.createDiv({ text: fileName, cls: "rc-file" });

		// Score card
		const card = root.createDiv({ cls: "rc-card" });
		if (report.lix === null) {
			card.createDiv({ text: "–", cls: "rc-score" });
			card.createDiv({
				text: t.tooShortForScore(report.minWords, report.words),
				cls: "rc-hint",
			});
		} else {
			card.createDiv({ text: formatLixValue(report.lix), cls: "rc-score" });
			card.createDiv({ text: t.scoreLabelLix, cls: "rc-score-label" });
			card.createDiv({
				text: `${report.band === null ? "" : t.lixBand[report.band]} · ${report.cefr ?? ""}`,
				cls: "rc-band",
			});
			const onTarget = report.onTarget === true;
			card.createDiv({
				text: onTarget
					? t.onTarget(report.targetMaxLix)
					: t.aboveTarget(report.targetMaxLix),
				cls: onTarget ? "rc-target rc-target-ok" : "rc-target rc-target-off",
			});
		}
		if (target !== null) {
			card.createDiv({
				text: t.targetLine(formatTargetBand(target), formatTargetSource(target, t)),
				cls: "rc-target-source",
			});
		}

		// Secondary scores
		const secondary = root.createDiv({ cls: "rc-secondary" });
		if (report.flesch !== null) {
			secondary.createSpan({
				text: t.fleschLine(
					report.flesch.name,
					Math.round(report.flesch.score),
					t.fleschLabel[report.flesch.label],
				),
			});
			secondary.createSpan({ text: " · " });
		}
		secondary.createSpan({
			text: LANGUAGE_LABEL[report.language] ?? t.languageUnknown,
		});

		// Counts
		const counts = root.createDiv({ cls: "rc-counts" });
		const row = (label: string, value: string): void => {
			const el = counts.createDiv({ cls: "rc-count-row" });
			el.createSpan({ text: label, cls: "rc-count-label" });
			el.createSpan({ text: value, cls: "rc-count-value" });
		};
		row(t.countWords, String(report.words));
		row(t.countSentences, String(report.sentences));
		row(t.countWordsPerSentence, report.avgWordsPerSentence.toFixed(1));
		row(
			t.countLongWords,
			`${report.longWords} (${formatPercent(report.longWordRatio)})`,
		);
		row(t.countParagraphs, String(report.paragraphs));
		row(t.countReadingTime, formatReadingTime(report.readingMinutes));

		this.renderSections(root, report, t);
		this.renderParagraphs(root, report.topParagraphs, t);
		this.renderSentenceList(
			root,
			report.topSentences.map((span) => ({
				span,
				label: null,
				onSelect: () => void this.plugin.jumpToSpan(span),
			})),
			t,
		);

		if (structure !== null) this.renderStructure(root, structure, t);

		root.createEl("p", {
			text: t.footnoteMeasured(report.tablesIncluded),
			cls: "rc-footnote",
		});
	}

	// --- Explorer selection (BC_E1_S10) ----------------------------------------

	renderMulti(multi: MultiFileReport): void {
		// The jump's own active-leaf-change re-enters here with the same report
		// object; the DOM is already correct, so skip the rebuild. A real
		// rescore always builds a new object and re-renders (BC_E1_S16).
		if (this.renderedMulti === multi) return;
		this.renderedMulti = multi;
		this.resetForSubject(`multi:${multi.rows.map((r) => r.file.path).join("|")}`);
		this.lastRender = () => this.renderMulti(multi);

		const root = this.contentEl;
		root.empty();
		root.addClass("rc-panel");

		// A selection can mix languages, so there is no single note to follow.
		const t = this.strings(null);

		const header = root.createDiv({ cls: "rc-file rc-multi-header" });
		header.createSpan({ text: t.notesSelected(multi.combined.files) });
		const back = header.createEl("button", {
			text: t.backToCurrentNote,
			cls: "rc-back-button",
		});
		this.registerDomEvent(back, "click", () => this.plugin.clearMultiReport());

		const combined = multi.combined;
		const card = root.createDiv({ cls: "rc-card" });
		if (combined.lix === null) {
			card.createDiv({ text: "–", cls: "rc-score" });
			card.createDiv({ text: t.selectionTooShort, cls: "rc-hint" });
		} else {
			card.createDiv({ text: formatLixValue(combined.lix), cls: "rc-score" });
			card.createDiv({ text: t.scoreLabelLixCombined, cls: "rc-score-label" });
			card.createDiv({
				text: `${combined.band === null ? "" : t.lixBand[combined.band]} · ${combined.cefr ?? ""}`,
				cls: "rc-band",
			});
			if (combined.onTarget !== null && combined.maxLix !== null) {
				const onTarget = combined.onTarget;
				card.createDiv({
					text: onTarget ? t.onTarget(combined.maxLix) : t.aboveTarget(combined.maxLix),
					cls: onTarget ? "rc-target rc-target-ok" : "rc-target rc-target-off",
				});
			} else {
				card.createDiv({ text: t.mixedTargets, cls: "rc-target-source" });
			}
		}

		const counts = root.createDiv({ cls: "rc-counts" });
		const row = (label: string, value: string): void => {
			const el = counts.createDiv({ cls: "rc-count-row" });
			el.createSpan({ text: label, cls: "rc-count-label" });
			el.createSpan({ text: value, cls: "rc-count-value" });
		};
		row(t.countWords, String(combined.words));
		row(t.countSentences, String(combined.sentences));
		row(t.countReadingTime, formatReadingTime(combined.readingMinutes));

		// Per-note rows, hardest first.
		root.createDiv({ text: t.notesHardestFirst, cls: "rc-section-title" });
		const list = root.createDiv({ cls: "rc-multi-files" });
		for (const entry of multi.rows) {
			const item = list.createDiv({ cls: "rc-count-row rc-multi-file" });
			item.createSpan({ text: entry.file.basename, cls: "rc-count-label" });
			const mark =
				entry.onTarget === null ? "" : entry.onTarget ? " ✓" : " ▲";
			item.createSpan({
				text:
					entry.lix === null
						? `${entry.words} w · –`
						: `${entry.words} w · LIX ${formatLixValue(entry.lix)}${mark}`,
				cls: "rc-count-value",
			});
			item.setAttribute("title", t.clickToOpenNote);
			this.registerDomEvent(item, "click", () => {
				void this.plugin.jumpToFileSpan(entry.file);
			});
		}

		this.renderSentenceList(
			root,
			multi.sentences.map((entry) => ({
				span: entry.span,
				label: entry.file.basename,
				onSelect: () => void this.plugin.jumpToFileSpan(entry.file, entry.span),
			})),
			t,
		);

		root.createEl("p", { text: t.footnoteMulti, cls: "rc-footnote" });
	}

	// --- Per-section scores (BC_E2_S2) -----------------------------------------

	/**
	 * One row per heading section, in document order, with the section's own
	 * LIX and target check. Only shown when the note actually has sections to
	 * compare (≥ 2) — a single-section note is just the note-level score again.
	 */
	private renderSections(
		root: HTMLElement,
		report: ReadabilityReport,
		t: Strings,
	): void {
		if (!this.plugin.settings.showSectionScores) return;
		if (report.sections.length < 2) return;
		root.createDiv({ text: t.sectionsTitle, cls: "rc-section-title" });
		const list = root.createDiv({ cls: "rc-multi-files" });
		for (const section of report.sections) {
			const item = list.createDiv({ cls: "rc-count-row rc-multi-file" });
			item.createSpan({
				text: section.level === 0 ? t.sectionIntro : section.heading,
				cls: "rc-count-label",
			});
			const mark =
				section.onTarget === null ? "" : section.onTarget ? " ✓" : " ▲";
			item.createSpan({
				text: t.sectionValue(
					section.words,
					section.lix === null ? null : formatLixValue(section.lix),
					mark,
				),
				cls: "rc-count-value",
			});
			item.setAttribute("title", t.clickToJumpSection);
			this.registerDomEvent(item, "click", () => {
				void this.plugin.jumpToSpan(section);
			});
		}
	}

	// --- Structure & cohesion (experimental, BC_E1_S23) ------------------------

	/**
	 * Descriptive structure/cohesion hints. Deliberately *not* part of the LIX
	 * verdict and never pass/fail — the "right" amount of cohesion depends on the
	 * audience, which the plugin cannot measure (see verkenning §6).
	 */
	private renderStructure(
		root: HTMLElement,
		s: StructureReport,
		t: Strings,
	): void {
		root.createDiv({ text: t.structureTitle, cls: "rc-section-title" });
		root.createDiv({
			text: t.structureConclusion(structureConclusionModel(s)),
			cls: "rc-structure-read",
		});
		const box = root.createDiv({ cls: "rc-counts" });
		const row = (label: string, value: string): void => {
			const el = box.createDiv({ cls: "rc-count-row" });
			el.createSpan({ text: label, cls: "rc-count-label" });
			el.createSpan({ text: value, cls: "rc-count-value" });
		};

		if (s.cohesion !== null) {
			row(
				t.cohesionLabel,
				t.cohesionValue(Math.round(s.cohesion * 100), s.cohesion < 0.15),
			);
		}
		if (s.connectives !== null) {
			row(t.connectivesLabel, `${Math.round(s.connectives * 100)}%`);
		}
		row(
			t.headingsLabel,
			t.headingsValue(s.headings.count, s.headings.maxDepth, s.headings.skips),
		);
		if (s.sections.wallOfText > 0) {
			row(
				t.wallOfTextLabel,
				t.wallOfTextValue(s.sections.wallOfText, s.sections.longestWords),
			);
		}

		if (s.diataxis !== null) {
			const d = s.diataxis;
			const el = box.createDiv({ cls: "rc-count-row" });
			el.createSpan({ text: t.diataxisLabel, cls: "rc-count-label" });
			el.createSpan({
				text: d.matches
					? t.diataxisMatch(d.declared)
					: t.diataxisMismatch(d.declared, d.looksLike),
				cls: d.matches
					? "rc-count-value rc-target-ok"
					: "rc-count-value rc-target-off",
			});
		}

		root.createEl("p", { text: t.footnoteStructure, cls: "rc-footnote" });
	}

	// --- Shared list sections ---------------------------------------------------

	private renderParagraphs(
		root: HTMLElement,
		paragraphs: ParagraphSpan[],
		t: Strings,
	): void {
		if (paragraphs.length === 0) return;
		const budget = this.listBudget();
		root.createDiv({ text: t.hardestParagraphs, cls: "rc-section-title" });
		const list = root.createEl("ol", { cls: "rc-sentences" });
		for (const paragraph of paragraphs.slice(0, budget)) {
			const item = list.createEl("li", { cls: "rc-sentence" });
			item.createSpan({
				text: t.paragraphPrefix(formatLixValue(paragraph.lix), paragraph.words),
				cls: "rc-sentence-words",
			});
			item.createSpan({ text: truncate(paragraph.text, 140) });
			item.setAttribute("title", t.clickToJumpParagraph);
			this.registerDomEvent(item, "click", () => {
				void this.plugin.jumpToSpan(paragraph);
			});
		}
		this.renderShowMore(root, paragraphs.length - budget, t);
	}

	/**
	 * The longest-sentences list. Each entry carries its own jump closure
	 * (file + offsets captured here at render time), so two byte-identical
	 * sentences — even across two files — can never resolve to the wrong one
	 * (BC_E1_S16). One min-words filter, one place.
	 */
	private renderSentenceList(
		root: HTMLElement,
		entries: SentenceListEntry[],
		t: Strings,
	): void {
		const minWords = Math.max(1, this.plugin.settings.sentenceMinWords);
		const offenders = entries.filter((entry) => entry.span.words > minWords);
		if (offenders.length === 0) return;
		const budget = this.listBudget();
		root.createDiv({ text: t.longestSentences, cls: "rc-section-title" });
		const list = root.createEl("ol", { cls: "rc-sentences" });
		for (const entry of offenders.slice(0, budget)) {
			const item = list.createEl("li", { cls: "rc-sentence" });
			item.createSpan({
				text: t.sentencePrefix(entry.span.words, entry.label),
				cls: "rc-sentence-words",
			});
			item.createSpan({ text: truncate(entry.span.text, 140) });
			item.setAttribute("title", t.clickToJumpSentence);
			this.registerDomEvent(item, "click", () => {
				entry.onSelect();
			});
		}
		this.renderShowMore(root, offenders.length - budget, t);
	}

	private renderShowMore(root: HTMLElement, hidden: number, t: Strings): void {
		if (hidden <= 0) return;
		const button = root.createEl("button", {
			text: t.showMore(hidden),
			cls: "rc-show-more",
		});
		this.registerDomEvent(button, "click", () => {
			this.extraEntries += SHOW_MORE_STEP;
			// Force the re-render even for the same multi report (bypass the guard).
			this.renderedMulti = null;
			this.lastRender?.();
		});
	}
}

function truncate(text: string, max: number): string {
	return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";
}

// The structure conclusion moved into the string catalogues (BC_E1_S28): the
// sentence is grammar-bound, so each language composes it from the model in
// `structureConclusionModel()` rather than from translated fragments.
