import { ItemView, WorkspaceLeaf } from "obsidian";
import { ParagraphSpan, ReadabilityReport } from "./readability/analyze";
import { DiataxisCluster, StructureReport } from "./readability/structure";
import { SentenceSpan } from "./readability/sentences";
import { ResolvedTarget } from "./readability/target-profile";
import {
	formatLixValue,
	formatPercent,
	formatReadingTime,
	formatTargetBand,
	formatTargetSource,
} from "./format";
import { LANGUAGES } from "./readability/language";
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

const LANGUAGE_LABEL: Record<string, string> = {
	unknown: "language unknown — LIX only",
};
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

		if (report === null || fileName === null) {
			root.createEl("p", {
				text: "No active note. Open a Markdown note to see its readability.",
				cls: "rc-empty",
			});
			return;
		}

		root.createDiv({ text: fileName, cls: "rc-file" });

		// Score card
		const card = root.createDiv({ cls: "rc-card" });
		if (report.lix === null) {
			card.createDiv({ text: "–", cls: "rc-score" });
			card.createDiv({
				text: `Add more text for a stable score (min ${report.minWords} words; found ${report.words}).`,
				cls: "rc-hint",
			});
		} else {
			card.createDiv({ text: formatLixValue(report.lix), cls: "rc-score" });
			card.createDiv({ text: "LIX", cls: "rc-score-label" });
			card.createDiv({
				text: `${report.band ?? ""} · ${report.cefr ?? ""}`,
				cls: "rc-band",
			});
			const onTarget = report.onTarget === true;
			card.createDiv({
				text: onTarget
					? `✓ on target (max ${report.targetMaxLix})`
					: `▲ above target (max ${report.targetMaxLix})`,
				cls: onTarget ? "rc-target rc-target-ok" : "rc-target rc-target-off",
			});
		}
		if (target !== null) {
			card.createDiv({
				text: `Target ${formatTargetBand(target)} · from ${formatTargetSource(target)}`,
				cls: "rc-target-source",
			});
		}

		// Secondary scores
		const secondary = root.createDiv({ cls: "rc-secondary" });
		if (report.flesch !== null) {
			secondary.createSpan({
				text: `${report.flesch.name} ${Math.round(report.flesch.score)} (${report.flesch.label})`,
			});
			secondary.createSpan({ text: " · " });
		}
		secondary.createSpan({
			text: LANGUAGE_LABEL[report.language] ?? report.language,
		});

		// Counts
		const counts = root.createDiv({ cls: "rc-counts" });
		const row = (label: string, value: string): void => {
			const el = counts.createDiv({ cls: "rc-count-row" });
			el.createSpan({ text: label, cls: "rc-count-label" });
			el.createSpan({ text: value, cls: "rc-count-value" });
		};
		row("Words", String(report.words));
		row("Sentences", String(report.sentences));
		row("Words per sentence", report.avgWordsPerSentence.toFixed(1));
		row("Long words (>6 letters)", `${report.longWords} (${formatPercent(report.longWordRatio)})`);
		row("Paragraphs", String(report.paragraphs));
		row("Reading time", formatReadingTime(report.readingMinutes));

		this.renderParagraphs(root, report.topParagraphs);
		this.renderSentenceList(
			root,
			report.topSentences.map((span) => ({
				span,
				label: null,
				onSelect: () => void this.plugin.jumpToSpan(span),
			})),
		);

		if (structure !== null) this.renderStructure(root, structure);

		root.createEl("p", {
			text: report.tablesIncluded
				? "Measured on running text incl. tables — front matter, code, links and URLs are excluded."
				: "Measured on running text — front matter, code, tables, links and URLs are excluded.",
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

		const header = root.createDiv({ cls: "rc-file rc-multi-header" });
		header.createSpan({ text: `${multi.combined.files} notes` });
		const back = header.createEl("button", {
			text: "Back to current note",
			cls: "rc-back-button",
		});
		this.registerDomEvent(back, "click", () => this.plugin.clearMultiReport());

		const combined = multi.combined;
		const card = root.createDiv({ cls: "rc-card" });
		if (combined.lix === null) {
			card.createDiv({ text: "–", cls: "rc-score" });
			card.createDiv({
				text: "Too little text in this selection for a stable score.",
				cls: "rc-hint",
			});
		} else {
			card.createDiv({ text: formatLixValue(combined.lix), cls: "rc-score" });
			card.createDiv({ text: "LIX (combined)", cls: "rc-score-label" });
			card.createDiv({
				text: `${combined.band ?? ""} · ${combined.cefr ?? ""}`,
				cls: "rc-band",
			});
			if (combined.onTarget !== null && combined.maxLix !== null) {
				const onTarget = combined.onTarget;
				card.createDiv({
					text: onTarget
						? `✓ on target (max ${combined.maxLix})`
						: `▲ above target (max ${combined.maxLix})`,
					cls: onTarget ? "rc-target rc-target-ok" : "rc-target rc-target-off",
				});
			} else {
				card.createDiv({
					text: "Notes have different targets — see the per-note marks below.",
					cls: "rc-target-source",
				});
			}
		}

		const counts = root.createDiv({ cls: "rc-counts" });
		const row = (label: string, value: string): void => {
			const el = counts.createDiv({ cls: "rc-count-row" });
			el.createSpan({ text: label, cls: "rc-count-label" });
			el.createSpan({ text: value, cls: "rc-count-value" });
		};
		row("Words", String(combined.words));
		row("Sentences", String(combined.sentences));
		row("Reading time", formatReadingTime(combined.readingMinutes));

		// Per-note rows, hardest first.
		root.createDiv({ text: "Notes (hardest first)", cls: "rc-section-title" });
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
			item.setAttribute("title", "Click to open this note");
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
		);

		root.createEl("p", {
			text: "Combined over the selected notes; per-note targets apply to the marks.",
			cls: "rc-footnote",
		});
	}

	// --- Structure & cohesion (experimental, BC_E1_S23) ------------------------

	/**
	 * Descriptive structure/cohesion hints. Deliberately *not* part of the LIX
	 * verdict and never pass/fail — the "right" amount of cohesion depends on the
	 * audience, which the plugin cannot measure (see verkenning §6).
	 */
	private renderStructure(root: HTMLElement, s: StructureReport): void {
		root.createDiv({ text: "Structure & cohesion", cls: "rc-section-title" });
		root.createDiv({ text: structureConclusion(s), cls: "rc-structure-read" });
		const box = root.createDiv({ cls: "rc-counts" });
		const row = (label: string, value: string): void => {
			const el = box.createDiv({ cls: "rc-count-row" });
			el.createSpan({ text: label, cls: "rc-count-label" });
			el.createSpan({ text: value, cls: "rc-count-value" });
		};

		if (s.cohesion !== null) {
			const pct = Math.round(s.cohesion * 100);
			const note = s.cohesion < 0.15 ? " — sentences often shift topic" : "";
			row("Sentence-to-sentence overlap", `${pct}%${note}`);
		}
		if (s.connectives !== null) {
			row("Connective density", `${Math.round(s.connectives * 100)}%`);
		}
		const structureBits = [`${s.headings.count} (depth ${s.headings.maxDepth})`];
		if (s.headings.skips) structureBits.push("skipped level");
		row("Headings", structureBits.join(" · "));
		if (s.sections.wallOfText > 0) {
			row(
				"Long sections (no subheading)",
				`${s.sections.wallOfText} · up to ${s.sections.longestWords} w`,
			);
		}

		if (s.diataxis !== null) {
			const d = s.diataxis;
			const el = box.createDiv({ cls: "rc-count-row" });
			el.createSpan({ text: "Diátaxis fit", cls: "rc-count-label" });
			el.createSpan({
				text: d.matches
					? `matches '${d.declared}'`
					: `declared '${d.declared}', reads as ${d.looksLike}`,
				cls: d.matches
					? "rc-count-value rc-target-ok"
					: "rc-count-value rc-target-off",
			});
		}

		root.createEl("p", {
			text: "Descriptive hints, not part of the LIX score — structure and cohesion are a separate axis the formulas miss.",
			cls: "rc-footnote",
		});
	}

	// --- Shared list sections ---------------------------------------------------

	private renderParagraphs(root: HTMLElement, paragraphs: ParagraphSpan[]): void {
		if (paragraphs.length === 0) return;
		const budget = this.listBudget();
		root.createDiv({ text: "Hardest paragraphs", cls: "rc-section-title" });
		const list = root.createEl("ol", { cls: "rc-sentences" });
		for (const paragraph of paragraphs.slice(0, budget)) {
			const item = list.createEl("li", { cls: "rc-sentence" });
			item.createSpan({
				text: `LIX ${formatLixValue(paragraph.lix)} · ${paragraph.words} w · `,
				cls: "rc-sentence-words",
			});
			item.createSpan({ text: truncate(paragraph.text, 140) });
			item.setAttribute("title", "Click to jump to this paragraph");
			this.registerDomEvent(item, "click", () => {
				void this.plugin.jumpToSpan(paragraph);
			});
		}
		this.renderShowMore(root, paragraphs.length - budget);
	}

	/**
	 * The longest-sentences list. Each entry carries its own jump closure
	 * (file + offsets captured here at render time), so two byte-identical
	 * sentences — even across two files — can never resolve to the wrong one
	 * (BC_E1_S16). One min-words filter, one place.
	 */
	private renderSentenceList(root: HTMLElement, entries: SentenceListEntry[]): void {
		const minWords = Math.max(1, this.plugin.settings.sentenceMinWords);
		const offenders = entries.filter((entry) => entry.span.words > minWords);
		if (offenders.length === 0) return;
		const budget = this.listBudget();
		root.createDiv({ text: "Longest sentences", cls: "rc-section-title" });
		const list = root.createEl("ol", { cls: "rc-sentences" });
		for (const entry of offenders.slice(0, budget)) {
			const item = list.createEl("li", { cls: "rc-sentence" });
			item.createSpan({
				text: `${entry.span.words} w · ${entry.label !== null ? `${entry.label} · ` : ""}`,
				cls: "rc-sentence-words",
			});
			item.createSpan({ text: truncate(entry.span.text, 140) });
			item.setAttribute("title", "Click to jump to this sentence");
			this.registerDomEvent(item, "click", () => {
				entry.onSelect();
			});
		}
		this.renderShowMore(root, offenders.length - budget);
	}

	private renderShowMore(root: HTMLElement, hidden: number): void {
		if (hidden <= 0) return;
		const button = root.createEl("button", {
			text: `Show more (${hidden} hidden)`,
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

const SHAPE_PHRASE: Record<DiataxisCluster, string> = {
	procedural: "Step-by-step",
	reference: "Scannable, reference-style",
	explanation: "Flowing prose",
	mixed: "Mixed structure",
};

/**
 * A one-line, synthesized characterization of the note's shape — the automated
 * "conclusion" over the raw structure numbers. Stays descriptive (never a
 * pass/fail verdict): it names the shape and flags the notable observations.
 */
function structureConclusion(s: StructureReport): string {
	const flags: string[] = [];
	if (s.cohesion !== null && s.cohesion < 0.15) {
		flags.push("loosely connected (topics shift between sentences)");
	} else if (s.cohesion !== null && s.cohesion >= 0.4) {
		flags.push("tightly connected");
	}
	if (s.sections.wallOfText > 0) {
		flags.push(
			`${s.sections.wallOfText} long section${s.sections.wallOfText > 1 ? "s" : ""} without subheadings`,
		);
	}
	if (s.headings.skips) flags.push("a heading level is skipped");
	if (s.headings.count === 0 && s.sections.longestWords > 200) {
		flags.push("no headings to signal structure");
	}

	if (s.diataxis !== null) {
		const d = s.diataxis;
		const lead = d.matches
			? `Structure matches the declared '${d.declared}'`
			: `Declared '${d.declared}', but reads as ${SHAPE_PHRASE[d.looksLike].toLowerCase()}`;
		return flags.length > 0 ? `${lead} — ${flags.join("; ")}` : lead;
	}

	const lead = SHAPE_PHRASE[s.shape];
	return flags.length > 0 ? `${lead} — ${flags.join("; ")}` : `${lead}, well connected`;
}
