/**
 * CodeMirror 6 layer for inline long-sentence marking (BC_E1_S5).
 *
 * A ViewPlugin recomputes the ranges debounced after document changes; in
 * between, existing decorations are mapped through the changes so marks stay
 * roughly in place while typing. The threshold follows the active target
 * profile (via the plugin) unless a fixed threshold is configured.
 */

import { StateEffect } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { editorInfoField } from "obsidian";
import {
	longSentenceRanges,
	longSentenceThreshold,
	longWordRanges,
} from "./readability/highlight";
import type ReadabilityCompassPlugin from "./main";

const REBUILD_DEBOUNCE_MS = 180;
/**
 * Rebuild at least this often even while typing continuously, so a mapped mark
 * can never bleed onto the next sentence for long (a keystroke used to reset
 * the debounce indefinitely — BC_E1_S14).
 */
const MAX_REBUILD_WAIT_MS = 500;

/** No-op effect: tells the ViewPlugin to rebuild from the current document. */
const rebuildMarks = StateEffect.define<null>();

const LONG_MARK = Decoration.mark({ class: "rc-long-sentence" });
const VERY_LONG_MARK = Decoration.mark({ class: "rc-long-sentence rc-very-long-sentence" });
const LONG_WORD_MARK = Decoration.mark({ class: "rc-long-word" });

export function longSentenceExtension(plugin: ReadabilityCompassPlugin) {
	const threshold = (view: EditorView): number => {
		if (!plugin.settings.markingFollowsTarget) return plugin.settings.markingThreshold;
		const file = view.state.field(editorInfoField).file;
		return longSentenceThreshold(plugin.resolveTargetFor(file).maxLix);
	};

	const build = (view: EditorView): DecorationSet => {
		const doc = view.state.doc.toString();
		const file = view.state.field(editorInfoField).file;
		const strip = { includeTables: plugin.includeTablesFor(file) };
		const clamp = (offset: number): number => Math.min(offset, view.state.doc.length);
		const marks = [];
		if (plugin.settings.markLongSentences) {
			for (const range of longSentenceRanges(doc, threshold(view), strip)) {
				marks.push(
					(range.tier === "very-long" ? VERY_LONG_MARK : LONG_MARK).range(
						range.start,
						clamp(range.end),
					),
				);
			}
		}
		if (plugin.settings.markLongWords) {
			for (const range of longWordRanges(doc, strip)) {
				marks.push(LONG_WORD_MARK.range(range.start, clamp(range.end)));
			}
		}
		return Decoration.set(marks, true);
	};

	class LongSentenceMarks implements PluginValue {
		decorations: DecorationSet;
		/** Fires after a typing pause. */
		private timer: number | null = null;
		/** Guarantees a rebuild during continuous typing. */
		private maxTimer: number | null = null;

		constructor(private view: EditorView) {
			this.decorations = build(view);
		}

		update(update: ViewUpdate): void {
			const forced = update.transactions.some((tr) =>
				tr.effects.some((effect) => effect.is(rebuildMarks)),
			);
			if (forced) {
				this.decorations = build(update.view);
				this.clearTimers();
				return;
			}
			if (update.docChanged) {
				// Keep marks roughly in place until the (bounded) rebuild lands.
				this.decorations = this.decorations.map(update.changes);
				this.schedule();
			}
		}

		destroy(): void {
			this.clearTimers();
		}

		private clearTimers(): void {
			if (this.timer !== null) {
				window.clearTimeout(this.timer);
				this.timer = null;
			}
			if (this.maxTimer !== null) {
				window.clearTimeout(this.maxTimer);
				this.maxTimer = null;
			}
		}

		private schedule(): void {
			if (this.timer !== null) window.clearTimeout(this.timer);
			this.timer = window.setTimeout(() => this.fire(), REBUILD_DEBOUNCE_MS);
			if (this.maxTimer === null) {
				this.maxTimer = window.setTimeout(() => this.fire(), MAX_REBUILD_WAIT_MS);
			}
		}

		private fire(): void {
			this.clearTimers();
			this.view.dispatch({ effects: rebuildMarks.of(null) });
		}
	}

	return ViewPlugin.fromClass(LongSentenceMarks, {
		decorations: (value) => value.decorations,
	});
}
