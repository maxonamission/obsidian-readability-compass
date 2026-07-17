import {
	debounce,
	Editor,
	getAllTags,
	MarkdownView,
	Notice,
	Platform,
	Plugin,
	TAbstractFile,
	TFile,
	TFolder,
	WorkspaceLeaf,
} from "obsidian";
import { Extension } from "@codemirror/state";
import { analyzeMarkdown, AnalyzeOptions, ReadabilityReport } from "./readability/analyze";
import { analyzeStructure, StructureReport } from "./readability/structure";
import { CombinedScore, combineCounts } from "./readability/aggregate";
import { SentenceSpan } from "./readability/sentences";
import { NoteContext, ResolvedTarget, resolveTarget } from "./readability/target-profile";
import { longSentenceExtension } from "./editor-highlight";
import {
	formatCalloutReport,
	formatNoticeText,
	formatStatusBarText,
	formatTargetBand,
	formatTargetSource,
	SelectionStats,
} from "./format";
import {
	DEFAULT_SETTINGS,
	ReadabilityCompassSettings,
	ReadabilityCompassSettingTab,
} from "./settings";
import { ReadabilityPanelView, VIEW_TYPE_READABILITY } from "./panel";

/** A sentence in a multi-note report, tied to the note it lives in. */
export interface MultiSentence {
	file: TFile;
	span: SentenceSpan;
}

export interface MultiFileRow {
	file: TFile;
	words: number;
	lix: number | null;
	onTarget: boolean | null;
}

/** Panel state for an explorer selection ("score selected notes"). */
export interface MultiFileReport {
	combined: CombinedScore;
	rows: MultiFileRow[];
	sentences: MultiSentence[];
}

/** Upper bound for the longest-sentences/hardest-paragraphs lists ("Show more" reveals up to here). */
export const TOP_LIST_CAP = 50;

/** Auto-follow reads every selected note on each selection change; larger sets go via the menu. */
const AUTO_FOLLOW_MAX_NOTES = 50;

export default class ReadabilityCompassPlugin extends Plugin {
	settings: ReadabilityCompassSettings = DEFAULT_SETTINGS;
	private statusBarEl: HTMLElement | null = null;
	/** Last markdown view with content, so the panel keeps working when focused. */
	private lastMarkdownView: MarkdownView | null = null;
	/** Mutable container for registerEditorExtension; contents swap on settings changes. */
	private editorExtensions: Extension[] = [];
	/** When set, the panel shows this explorer selection instead of the active note. */
	multiReport: MultiFileReport | null = null;
	/** Whether the current multi report came from auto-follow (vs the context menu). */
	private multiAuto = false;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_READABILITY,
			(leaf) => new ReadabilityPanelView(leaf, this),
		);

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass("rc-status", "mod-clickable");
		this.statusBarEl.setAttribute("aria-label", "Readability — click for details");
		this.registerDomEvent(this.statusBarEl, "click", () => {
			void this.activatePanel();
		});

		this.addSettingTab(new ReadabilityCompassSettingTab(this.app, this));
		this.addCommands();

		this.registerEditorExtension(this.editorExtensions);
		this.syncEditorExtensions();

		// Explorer integration (BC_E1_S10): score a multi-selection or a folder.
		this.registerEvent(
			this.app.workspace.on("files-menu", (menu, files) => {
				const notes = this.markdownFiles(files);
				if (notes.length < 2) return;
				menu.addItem((item) =>
					item
						.setTitle(`Score readability of ${notes.length} notes`)
						.setIcon("gauge")
						.onClick(() => void this.scoreFiles(notes, { reveal: true, auto: false })),
				);
			}),
		);
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFolder)) return;
				const notes = this.markdownFiles([file]);
				if (notes.length === 0) return;
				menu.addItem((item) =>
					item
						.setTitle(`Score readability of folder (${notes.length} notes)`)
						.setIcon("gauge")
						.onClick(() => void this.scoreFiles(notes, { reveal: true, auto: false })),
				);
			}),
		);

		// Auto-follow the explorer selection (BC_E1_S13): no right-click needed.
		const followSoon = debounce(() => void this.followExplorerSelection(), 300, true);
		this.app.workspace.onLayoutReady(() => {
			for (const leaf of this.app.workspace.getLeavesOfType("file-explorer")) {
				this.registerDomEvent(leaf.view.containerEl, "click", followSoon);
				this.registerDomEvent(leaf.view.containerEl, "keyup", followSoon);
			}
		});

		const refreshSoon = debounce(() => void this.editedRefresh(), 400, true);
		const refreshStatusSoon = debounce(() => this.refreshStatusBar(), 200, true);
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				// Tapping our own panel makes it the active leaf but changes
				// nothing to show. Skipping the refresh here means a panel
				// click/tap is not destroyed by a rebuild under the pointer —
				// which is what lets the list use plain click handlers (needed
				// on mobile) instead of mousedown (BC_E1_S18).
				if (leaf !== null && leaf.view instanceof ReadabilityPanelView) return;
				this.refreshUi();
			}),
		);
		this.registerEvent(this.app.workspace.on("editor-change", refreshSoon));
		// Front matter and tags feed the target profile; the metadata cache
		// updates shortly after the editor, so refresh again when it lands.
		this.registerEvent(this.app.metadataCache.on("changed", refreshSoon));
		this.registerDomEvent(document, "selectionchange", refreshStatusSoon);

		this.app.workspace.onLayoutReady(() => this.refreshUi());
	}

	async loadSettings(): Promise<void> {
		const stored: unknown = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);
		this.settings.statusBar = Object.assign(
			{},
			DEFAULT_SETTINGS.statusBar,
			(stored as Partial<ReadabilityCompassSettings> | null)?.statusBar,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.syncEditorExtensions();
		this.refreshUi();
	}

	/** (Un)install the editor marking; updateOptions rebuilds the editors. */
	private syncEditorExtensions(): void {
		this.editorExtensions.length = 0;
		if (this.settings.markLongSentences || this.settings.markLongWords) {
			this.editorExtensions.push(longSentenceExtension(this));
		}
		this.app.workspace.updateOptions();
	}

	// --- Analysis -----------------------------------------------------------

	/** Resolve which target applies to a file (front matter > diataxis > tag > folder > global). */
	resolveTargetFor(file: TFile | null): ResolvedTarget {
		let context: NoteContext | null = null;
		if (file !== null) {
			const cache = this.app.metadataCache.getFileCache(file);
			context = {
				path: file.path,
				tags: cache === null ? [] : (getAllTags(cache) ?? []),
				frontmatter: cache?.frontmatter ?? null,
			};
		}
		return resolveTarget(context, {
			deriveFromDiataxis: this.settings.deriveFromDiataxis,
			tagRules: this.settings.tagRules,
			folderRules: this.settings.folderRules,
			globalBand: this.settings.targetBand,
			globalCustomMaxLix: this.settings.customMaxLix,
		});
	}

	/** Note-level table inclusion: front matter `readability-tables` wins over the setting. */
	includeTablesFor(file: TFile | null): boolean {
		if (file !== null) {
			const frontmatter: Record<string, unknown> | undefined =
				this.app.metadataCache.getFileCache(file)?.frontmatter;
			const value: unknown = frontmatter?.["readability-tables"];
			if (typeof value === "boolean") return value;
			if (typeof value === "string") {
				const text = value.trim().toLowerCase();
				if (text === "true" || text === "include") return true;
				if (text === "false" || text === "exclude") return false;
			}
		}
		return this.settings.includeTables;
	}

	private analyzeOptions(target: ResolvedTarget, file: TFile | null): AnalyzeOptions {
		return {
			language: this.settings.language,
			minWords: this.settings.minWords,
			wordsPerMinute: this.settings.wordsPerMinute,
			targetMaxLix: target.maxLix,
			includeTables: this.includeTablesFor(file),
			topSentenceCount: TOP_LIST_CAP,
		};
	}

	/** A manual selection means "measure this" — tables and code included. */
	private selectionAnalyzeOptions(target: ResolvedTarget): AnalyzeOptions {
		return {
			language: this.settings.language,
			minWords: this.settings.minWords,
			wordsPerMinute: this.settings.wordsPerMinute,
			targetMaxLix: target.maxLix,
			includeTables: true,
			includeCode: true,
		};
	}

	private activeMarkdownView(): MarkdownView | null {
		const active = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (active !== null) {
			this.lastMarkdownView = active;
			return active;
		}
		// Keep the previous view (e.g. while the panel or settings has focus),
		// as long as it is still attached to the workspace.
		if (this.lastMarkdownView !== null && this.lastMarkdownView.file !== null) {
			return this.lastMarkdownView;
		}
		this.lastMarkdownView = null;
		return null;
	}

	private analyzeView(view: MarkdownView, target: ResolvedTarget): ReadabilityReport {
		return analyzeMarkdown(
			view.editor.getValue(),
			this.analyzeOptions(target, view.file),
		);
	}

	/**
	 * The selected text. Live Preview renders tables as widgets whose cells are
	 * separate sub-editors: a selection across cells reaches the editor as only
	 * the first cell. The visible DOM selection inside this view does carry the
	 * whole selection, so prefer it when it is the richer of the two
	 * (owner-test finding, BC_E1_S9).
	 */
	private selectedText(view: MarkdownView): string {
		const editorSelection = view.editor.somethingSelected()
			? view.editor.getSelection()
			: "";
		const domSelection = view.containerEl.ownerDocument.getSelection();
		if (
			domSelection !== null &&
			!domSelection.isCollapsed &&
			view.containerEl.contains(domSelection.anchorNode)
		) {
			const domText = domSelection.toString();
			if (domText.length > editorSelection.length) return domText;
		}
		return editorSelection;
	}

	private selectionStats(
		view: MarkdownView | null,
		target: ResolvedTarget,
	): SelectionStats | null {
		if (view === null) return null;
		const text = this.selectedText(view);
		if (text.trim() === "") return null;
		const report = analyzeMarkdown(text, this.selectionAnalyzeOptions(target));
		if (report.words === 0) return null;
		return { words: report.words, lix: report.lix };
	}

	// --- UI refresh ---------------------------------------------------------

	/**
	 * Refresh after an edit. A live explorer-selection report is recomputed in
	 * place when you edit one of its notes (it used to freeze on first score,
	 * BC_E1_S14); otherwise the usual single-note refresh runs.
	 */
	private async editedRefresh(): Promise<void> {
		if (this.multiReport !== null) {
			const active = this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
			const inSet =
				active != null &&
				this.multiReport.rows.some((row) => row.file.path === active.path);
			if (inSet) {
				await this.rescoreMulti();
				return;
			}
		}
		this.refreshUi();
	}

	/** Recompute the active explorer-selection report from the notes' current text. */
	private async rescoreMulti(): Promise<void> {
		if (this.multiReport === null) return;
		const files = this.multiReport.rows
			.map((row) => row.file)
			.filter((file) => this.app.vault.getAbstractFileByPath(file.path) instanceof TFile);
		if (files.length < 1) {
			this.clearMultiReport();
			return;
		}
		await this.scoreFiles(files, { reveal: false, auto: this.multiAuto });
	}

	refreshUi(): void {
		this.maybeReleaseMultiReport();
		const view = this.activeMarkdownView();
		const target = this.resolveTargetFor(view?.file ?? null);
		const report = view === null ? null : this.analyzeView(view, target);
		this.renderStatusBar(view, report, target);
		this.renderPanels(view, report, target);
	}

	private refreshStatusBar(): void {
		const view = this.activeMarkdownView();
		const target = this.resolveTargetFor(view?.file ?? null);
		this.renderStatusBar(
			view,
			view === null ? null : this.analyzeView(view, target),
			target,
		);
	}

	private renderStatusBar(
		view: MarkdownView | null,
		report: ReadabilityReport | null,
		target: ResolvedTarget,
	): void {
		if (this.statusBarEl === null) return;
		if (!this.settings.showStatusBar) {
			this.statusBarEl.setText("");
			this.statusBarEl.hide();
			return;
		}
		const text = formatStatusBarText(
			report,
			this.selectionStats(view, target),
			this.settings.statusBar,
			target,
		);
		this.statusBarEl.setText(text);
		this.statusBarEl.setAttribute(
			"aria-label",
			`Readability — target ${formatTargetBand(target)} (LIX ≤ ${Math.round(
				target.maxLix,
			)}) from ${formatTargetSource(target)} — click for details`,
		);
		if (text === "") {
			this.statusBarEl.hide();
		} else {
			this.statusBarEl.show();
		}
	}

	private renderPanels(
		view: MarkdownView | null,
		report: ReadabilityReport | null,
		target: ResolvedTarget,
	): void {
		const fileName = view?.file?.basename ?? null;
		const structure = this.structureFor(view, report);
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_READABILITY)) {
			if (leaf.view instanceof ReadabilityPanelView) {
				if (this.multiReport !== null) {
					leaf.view.renderMulti(this.multiReport);
				} else {
					leaf.view.render(report, fileName, target, structure);
				}
			}
		}
	}

	/** The raw `diataxis:` front-matter value, for the structure conformance hint. */
	private declaredDiataxis(file: TFile | null): string | null {
		if (file === null) return null;
		const frontmatter: Record<string, unknown> | undefined =
			this.app.metadataCache.getFileCache(file)?.frontmatter;
		const value: unknown = frontmatter?.["diataxis"];
		return typeof value === "string" ? value : null;
	}

	/** Experimental structure/cohesion hints for the single active note (opt-in). */
	private structureFor(
		view: MarkdownView | null,
		report: ReadabilityReport | null,
	): StructureReport | null {
		if (!this.settings.showStructureHints || view === null || report === null) {
			return null;
		}
		return analyzeStructure(view.editor.getValue(), {
			language: report.language,
			declaredDiataxis: this.declaredDiataxis(view.file),
		});
	}

	// --- Multi-note scoring (BC_E1_S10) ---------------------------------------

	/** Markdown files in the selection, folders expanded recursively. */
	private markdownFiles(selection: TAbstractFile[]): TFile[] {
		const notes: TFile[] = [];
		const walk = (item: TAbstractFile): void => {
			if (item instanceof TFile) {
				if (item.extension === "md") notes.push(item);
			} else if (item instanceof TFolder) {
				for (const child of item.children) walk(child);
			}
		};
		for (const item of selection) walk(item);
		return notes;
	}

	/**
	 * Explorer multi-selection via the file explorer's internal tree state —
	 * there is no public API for it. Typed narrowly and guarded, so a future
	 * Obsidian change degrades to "context menu only" instead of breaking.
	 */
	private explorerSelection(): TFile[] {
		const files: TFile[] = [];
		for (const leaf of this.app.workspace.getLeavesOfType("file-explorer")) {
			const tree = (
				leaf.view as unknown as {
					tree?: { selectedDoms?: Set<{ file?: TAbstractFile }> };
				}
			).tree;
			const doms = tree?.selectedDoms;
			if (!(doms instanceof Set)) continue;
			for (const dom of doms) {
				if (dom.file instanceof TFile && dom.file.extension === "md") {
					files.push(dom.file);
				}
			}
		}
		return files;
	}

	/**
	 * Auto-score the explorer selection (BC_E1_S13); large sets stay on the
	 * menu. The explorer owns the multi view: any new selection replaces it,
	 * a single-file click releases it — also when it was pinned via the menu.
	 */
	private async followExplorerSelection(): Promise<void> {
		if (!this.settings.followExplorerSelection) return;
		const files = this.explorerSelection();
		if (files.length >= 2 && files.length <= AUTO_FOLLOW_MAX_NOTES) {
			await this.scoreFiles(files, { reveal: false, auto: true });
		} else if (this.multiReport !== null && files.length < 2) {
			this.clearMultiReport();
		}
	}

	/** An open note's live editor buffer (ahead of disk while editing); else the vault copy. */
	private async readFileText(file: TFile): Promise<string> {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.file?.path === file.path) {
				return view.editor.getValue();
			}
		}
		return this.app.vault.cachedRead(file);
	}

	private async scoreFiles(
		files: TFile[],
		options: { reveal: boolean; auto: boolean },
	): Promise<void> {
		const rows: MultiFileRow[] = [];
		const sentences: MultiSentence[] = [];
		const counts = [];
		for (const file of files) {
			const content = await this.readFileText(file);
			const target = this.resolveTargetFor(file);
			const report = analyzeMarkdown(content, {
				...this.analyzeOptions(target, file),
				topSentenceCount: TOP_LIST_CAP,
			});
			rows.push({
				file,
				words: report.words,
				lix: report.lix,
				onTarget: report.onTarget,
			});
			counts.push({
				words: report.words,
				sentences: report.sentences,
				longWords: report.longWords,
				maxLix: target.maxLix,
			});
			for (const span of report.topSentences) sentences.push({ file, span });
		}
		rows.sort((a, b) => (b.lix ?? 0) - (a.lix ?? 0));
		sentences.sort((a, b) => b.span.words - a.span.words);
		this.multiReport = {
			combined: combineCounts(
				counts,
				this.settings.minWords,
				this.settings.wordsPerMinute,
			),
			rows,
			sentences: sentences.slice(0, TOP_LIST_CAP),
		};
		this.multiAuto = options.auto;
		if (options.reveal) {
			await this.activatePanel();
		} else {
			this.refreshUi();
		}
	}

	/** Leave the explorer-selection view and follow the active note again. */
	clearMultiReport(): void {
		this.multiReport = null;
		this.multiAuto = false;
		this.refreshUi();
	}

	/**
	 * Release rule for the editor side (BC_E1_S13, ontwerp eigenaar): a
	 * menu-pinned view stays while you work in any document — only the
	 * explorer (new selection, single click) or the Back button replaces it.
	 * A live-followed view lets go as soon as a note *outside* the selection
	 * gets focus; within the selection (walking its sentences) it stays.
	 */
	private maybeReleaseMultiReport(): void {
		if (this.multiReport === null || !this.multiAuto) return;
		const file = this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
		if (file === undefined || file === null) return;
		if (!this.multiReport.rows.some((row) => row.file.path === file.path)) {
			this.multiReport = null;
			this.multiAuto = false;
		}
	}

	/**
	 * Open a note and, if a span is given, select it. Reuses a leaf already
	 * showing the file, else a real editor leaf in the root split, else a fresh
	 * tab — never the sidebar (BC_E1_S16).
	 */
	async jumpToFileSpan(
		file: TFile,
		span?: { start: number; end: number },
	): Promise<void> {
		const leaf = this.resolveMarkdownLeaf(file);
		await leaf.openFile(file, { active: true });
		const view = leaf.view instanceof MarkdownView ? leaf.view : null;
		if (view === null) return;
		// On mobile: reveal the editor (slide the drawer away) BEFORE selecting,
		// otherwise Obsidian resets our selection when the editor becomes visible
		// (BC_E1_S19). On desktop this is a no-op.
		await this.revealEditorOnMobile(leaf);
		if (span !== undefined) {
			this.applySpan(view, span);
		} else {
			view.setEphemeralState({ focus: true });
		}
	}

	/** On mobile the panel is a full-screen drawer; slide it away so the jump's editor shows. */
	private async revealEditorOnMobile(leaf: WorkspaceLeaf): Promise<void> {
		if (!Platform.isMobile) return;
		this.app.workspace.rightSplit.collapse();
		await this.app.workspace.revealLeaf(leaf);
	}

	/** A markdown leaf to open a file in (see jumpToFileSpan). */
	private resolveMarkdownLeaf(file: TFile): WorkspaceLeaf {
		const { workspace } = this.app;
		// 1. Reuse a leaf already showing this file (match the view state, so
		//    deferred leaves — whose .view is not yet a MarkdownView — count too).
		for (const leaf of workspace.getLeavesOfType("markdown")) {
			if (leaf.getViewState().state?.file === file.path) return leaf;
		}
		// 2. Otherwise the most recent leaf in the root split (never a sidebar),
		//    if it can navigate.
		const recent = workspace.getMostRecentLeaf(workspace.rootSplit);
		if (recent !== null && recent.getViewState().pinned !== true) {
			const type = recent.getViewState().type;
			if (type === "markdown" || type === "empty") return recent;
		}
		// 3. Fall back to a fresh tab in the root split.
		return workspace.getLeaf("tab");
	}

	// --- Panel handling -----------------------------------------------------

	async activatePanel(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null =
			workspace.getLeavesOfType(VIEW_TYPE_READABILITY)[0] ?? null;
		if (leaf === null) {
			leaf = workspace.getRightLeaf(false);
			if (leaf === null) return;
			await leaf.setViewState({ type: VIEW_TYPE_READABILITY, active: true });
		}
		await workspace.revealLeaf(leaf);
		this.refreshUi();
	}

	/** Select a span in the active note (offsets are document offsets). */
	async jumpToSpan(span: { start: number; end: number }): Promise<void> {
		const view = this.activeMarkdownView();
		if (view === null) return;
		// Mobile: reveal the editor before selecting (see jumpToFileSpan).
		await this.revealEditorOnMobile(view.leaf);
		this.applySpan(view, span);
	}

	/** Document offsets → a clamped editor range on the live editor. */
	private spanToRange(
		editor: Editor,
		span: { start: number; end: number },
	): { from: ReturnType<Editor["offsetToPos"]>; to: ReturnType<Editor["offsetToPos"]> } {
		const length = editor.getValue().length;
		return {
			from: editor.offsetToPos(Math.min(span.start, length)),
			to: editor.offsetToPos(Math.min(span.end, length)),
		};
	}

	/**
	 * Select and reveal a span via Obsidian's native ephemeral state (which
	 * scrolls, selects and focuses atomically — the way core search/backlink
	 * navigation does it), then re-assert once on the next frame in case the
	 * post-open state restore overwrote it. Last writer wins, so the jump is
	 * deterministic instead of racing focus (BC_E1_S16).
	 */
	private applySpan(view: MarkdownView, span: { start: number; end: number }): void {
		const editor = view.editor;
		view.setEphemeralState({ cursor: this.spanToRange(editor, span), focus: true });
		window.requestAnimationFrame(() => {
			if (view.leaf.view !== view) return;
			const target = this.spanToRange(editor, span);
			const selection = editor.listSelections()[0];
			const matches =
				selection !== undefined &&
				editor.posToOffset(selection.anchor) === editor.posToOffset(target.from) &&
				editor.posToOffset(selection.head) === editor.posToOffset(target.to);
			if (!matches) {
				editor.setSelection(target.from, target.to);
				editor.scrollIntoView(target, true);
				editor.focus();
			}
		});
	}

	// --- Commands -----------------------------------------------------------

	private addCommands(): void {
		this.addCommand({
			id: "open-panel",
			name: "Open readability panel",
			callback: () => {
				void this.activatePanel();
			},
		});

		this.addCommand({
			id: "score-note",
			name: "Show readability of current note",
			checkCallback: (checking: boolean) => {
				const view = this.activeMarkdownView();
				if (view === null) return false;
				if (!checking) {
					const target = this.resolveTargetFor(view.file);
					const report = this.analyzeView(view, target);
					new Notice(
						formatNoticeText(
							report,
							view.file?.basename ?? "Current note",
							target,
						),
						10000,
					);
				}
				return true;
			},
		});

		this.addCommand({
			id: "score-selection",
			name: "Show readability of selection",
			checkCallback: (checking: boolean) => {
				const view = this.activeMarkdownView();
				if (view === null) return false;
				const text = this.selectedText(view);
				if (text.trim() === "") return false;
				if (!checking) {
					const target = this.resolveTargetFor(view.file);
					const report = analyzeMarkdown(
						text,
						this.selectionAnalyzeOptions(target),
					);
					new Notice(formatNoticeText(report, "Selection", target), 10000);
				}
				return true;
			},
		});

		this.addCommand({
			id: "insert-report",
			name: "Insert readability report at cursor",
			editorCallback: (editor: Editor) => {
				const file = this.activeMarkdownView()?.file ?? null;
				const target = this.resolveTargetFor(file);
				const report = analyzeMarkdown(
					editor.getValue(),
					this.analyzeOptions(target, file),
				);
				const date = new Date().toISOString().slice(0, 10);
				editor.replaceSelection(formatCalloutReport(report, date, target));
			},
		});

		this.addCommand({
			id: "toggle-status-bar",
			name: "Toggle readability in status bar",
			callback: () => {
				this.settings.showStatusBar = !this.settings.showStatusBar;
				void this.saveSettings();
			},
		});

		this.addCommand({
			id: "toggle-sentence-marking",
			name: "Toggle long sentence marking",
			callback: () => {
				this.settings.markLongSentences = !this.settings.markLongSentences;
				void this.saveSettings();
			},
		});
	}
}
