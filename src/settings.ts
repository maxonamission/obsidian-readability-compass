import { App, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";
import { TargetBand, TARGET_MAX_LIX } from "./readability/scores";
import { LanguageCode, LANGUAGES } from "./readability/language";
import { TargetRule } from "./readability/target-profile";
import { DEFAULT_PROPERTY_PREFIX, isValidPropertyPrefix } from "./bases-properties";
import type ReadabilityCompassPlugin from "./main";

export interface ReadabilityCompassSettings {
	language: "auto" | LanguageCode;
	targetBand: TargetBand;
	customMaxLix: number;
	deriveFromDiataxis: boolean;
	tagRules: TargetRule[];
	folderRules: TargetRule[];
	markLongSentences: boolean;
	markingFollowsTarget: boolean;
	markingThreshold: number;
	markLongWords: boolean;
	showSectionScores: boolean;
	showStructureHints: boolean;
	basesWriteEnabled: boolean;
	basesPropertyPrefix: string;
	basesAutoUpdate: boolean;
	includeTables: boolean;
	minWords: number;
	wordsPerMinute: number;
	topSentencesShown: number;
	sentenceMinWords: number;
	followExplorerSelection: boolean;
	showStatusBar: boolean;
	statusBar: {
		lix: boolean;
		band: boolean;
		target: boolean;
		words: boolean;
		readingTime: boolean;
	};
}

export const DEFAULT_SETTINGS: ReadabilityCompassSettings = {
	language: "auto",
	targetBand: "b2",
	customMaxLix: 45,
	deriveFromDiataxis: true,
	tagRules: [],
	folderRules: [],
	markLongSentences: false,
	markingFollowsTarget: true,
	markingThreshold: 25,
	markLongWords: false,
	showSectionScores: true,
	showStructureHints: false,
	basesWriteEnabled: false,
	basesPropertyPrefix: DEFAULT_PROPERTY_PREFIX,
	basesAutoUpdate: false,
	includeTables: false,
	minWords: 40,
	wordsPerMinute: 225,
	topSentencesShown: 5,
	sentenceMinWords: 0,
	followExplorerSelection: true,
	showStatusBar: true,
	statusBar: {
		lix: true,
		band: true,
		target: true,
		words: true,
		readingTime: false,
	},
};

/**
 * Declarative settings tab (Obsidian 1.13, BC_E1_S27): the tab renders from
 * `getSettingDefinitions()` and every option is indexed for Obsidian's
 * settings search. Values flow through `getControlValue`/`setControlValue`,
 * which read and persist `plugin.settings` by (dot-path) key — the nested
 * `statusBar.*` keys ride along without special cases. The two rule lists
 * are `list` definitions with native add/delete affordances; each row is a
 * small imperative `render` (pattern + band + optional ceiling), because a
 * declarative control maps one key to one row.
 */
export class ReadabilityCompassSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: ReadabilityCompassPlugin,
	) {
		super(app, plugin);
	}

	getControlValue(key: string): unknown {
		let value: unknown = this.plugin.settings;
		for (const part of key.split(".")) {
			value = (value as Record<string, unknown> | undefined)?.[part];
		}
		return value;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const path = key.split(".");
		let target = this.plugin.settings as unknown as Record<string, unknown>;
		for (const part of path.slice(0, -1)) {
			target = target[part] as Record<string, unknown>;
		}
		target[path[path.length - 1]] = value;
		await this.plugin.saveSettings();
		// Conditional rows (custom ceiling, marking threshold) show or hide
		// based on the value just persisted.
		this.refreshDomState();
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const { settings } = this.plugin;
		const languageOptions: Record<string, string> = { auto: "Auto-detect" };
		for (const language of LANGUAGES) {
			languageOptions[language.code] = language.label;
		}
		return [
			{
				type: "group",
				heading: "Target",
				items: [
					{
						name: "Target audience",
						desc: "The reading level your notes should stay at. CEFR bands are translated to a LIX ceiling.",
						control: {
							type: "dropdown",
							key: "targetBand",
							options: {
								b1: `≈ B1 — plain (LIX ≤ ${TARGET_MAX_LIX.b1})`,
								b2: `≈ B2 — clear (LIX ≤ ${TARGET_MAX_LIX.b2})`,
								c1: `≈ C1 — advanced (LIX ≤ ${TARGET_MAX_LIX.c1})`,
								custom: "Custom LIX ceiling",
							},
						},
					},
					{
						name: "Custom LIX ceiling",
						desc: "Scores above this value count as off target.",
						visible: () => settings.targetBand === "custom",
						control: {
							type: "slider",
							key: "customMaxLix",
							min: 20,
							max: 70,
							step: 1,
							displayFormat: (value) => `LIX ${value}`,
						},
					},
				],
			},
			{
				type: "group",
				heading: "Target profiles",
				items: [
					{
						name: "Derive target from diataxis type",
						desc: "Notes with a 'diataxis' front matter key get a matching target: tutorial ≈ B1; how-to, reference and explanation ≈ B2. A 'readability-target' key always wins.",
						control: { type: "toggle", key: "deriveFromDiataxis" },
					},
					{
						name: "Rule priority",
						desc: "Front matter > diataxis > tag > folder > global setting. Within the tag rules below the first matching rule wins (nested tags match their parent); within the folder rules the most specific (longest) folder wins. Tag rules beat folder rules.",
					},
				],
			},
			this.ruleList(
				settings.tagRules,
				"Tag rules",
				"No tag rules yet. Notes carrying the tag (or a nested tag under it) get the rule's target.",
				"Add tag rule",
				"#blog",
			),
			this.ruleList(
				settings.folderRules,
				"Folder rules",
				"No folder rules yet. Notes inside the folder get the rule's target.",
				"Add folder rule",
				"docs/tutorials",
			),
			{
				type: "group",
				heading: "Measurement",
				items: [
					{
						name: "Language",
						desc: "Picks the Flesch variant for that language (e.g. Flesch-Douma for Dutch). LIX itself is language-independent. Auto-detect falls back to LIX only when unsure.",
						control: {
							type: "dropdown",
							key: "language",
							options: languageOptions,
						},
					},
					{
						name: "Minimum words for a score",
						desc: "Below this word count LIX is too erratic and is hidden.",
						control: {
							type: "slider",
							key: "minWords",
							min: 10,
							max: 100,
							step: 5,
							displayFormat: (value) => `${value} words`,
						},
					},
					{
						name: "Longest sentences and hardest paragraphs shown",
						desc: "How many entries the panel lists at first; Show more reveals the rest in steps.",
						control: {
							type: "slider",
							key: "topSentencesShown",
							min: 3,
							max: 25,
							step: 1,
							displayFormat: (value) => `top ${value}`,
						},
					},
					{
						name: "Only list sentences above",
						desc: "Sentences at or below this word count stay out of the longest-sentences list. 0 lists regardless of length.",
						control: {
							type: "slider",
							key: "sentenceMinWords",
							min: 0,
							max: 40,
							step: 1,
							displayFormat: (value) => (value === 0 ? "off" : `${value} words`),
						},
					},
					{
						name: "Follow file explorer selections",
						desc: "Select multiple notes in the file explorer and the panel scores them together, live — no right-click needed (up to 50 notes; folders and larger selections via the right-click menu). Live selections let go when you open a note outside them; right-click scores stay pinned until you select something else in the explorer.",
						control: { type: "toggle", key: "followExplorerSelection" },
					},
					{
						name: "Include table text",
						desc: "Count the text inside Markdown tables — for notes that are tables, like question banks. Per note override: 'readability-tables: true' (or false) in the front matter. A manual selection always includes tables and code.",
						control: { type: "toggle", key: "includeTables" },
					},
					{
						name: "Mark long sentences in the editor",
						desc: "Give sentences above the threshold a subtle background while you write. Never marks code, front matter or tables.",
						control: { type: "toggle", key: "markLongSentences" },
					},
					{
						name: "Marking threshold follows the target",
						desc: "Derive the words-per-sentence threshold from the active target profile (≈ B1 ⇒ 22, ≈ B2 ⇒ 25, ≈ C1 ⇒ 30). Turn off for a fixed threshold.",
						visible: () => settings.markLongSentences,
						control: { type: "toggle", key: "markingFollowsTarget" },
					},
					{
						name: "Marking threshold (words per sentence)",
						desc: "Sentences above this word count get marked.",
						visible: () =>
							settings.markLongSentences && !settings.markingFollowsTarget,
						control: {
							type: "slider",
							key: "markingThreshold",
							min: 10,
							max: 60,
							step: 1,
							displayFormat: (value) => `${value} words`,
						},
					},
					{
						name: "Mark long words in the editor",
						desc: "Underline every long word (> 6 letters) — the other LIX ingredient. Shows why keyword-dense text scores high even without long sentences.",
						control: { type: "toggle", key: "markLongWords" },
					},
					{
						name: "Show per-section scores in the panel",
						desc: "Lists every heading section with its own LIX and target check, so you can see which part of a long note is off target. Sections below the minimum word count show no score.",
						control: { type: "toggle", key: "showSectionScores" },
					},
					{
						name: "Show structure & cohesion hints (experimental)",
						desc: "Adds a panel section with descriptive structure and cohesion hints (heading structure, adjacent-sentence overlap, connective density, and a Diátaxis-type match). These complement LIX — they are hints, not a score, and never a pass/fail verdict.",
						control: { type: "toggle", key: "showStructureHints" },
					},
					{
						name: "Reading speed",
						desc: "Words per minute, used for the reading time estimate.",
						control: {
							type: "slider",
							key: "wordsPerMinute",
							min: 100,
							max: 400,
							step: 25,
							displayFormat: (value) => `${value} wpm`,
						},
					},
				],
			},
			{
				type: "group",
				heading: "Status bar",
				items: [
					{
						name: "Show in status bar",
						desc: "The always-on indicator. Click it to open the panel.",
						control: { type: "toggle", key: "showStatusBar" },
					},
					{
						name: "LIX score",
						desc: "The primary readability score.",
						control: { type: "toggle", key: "statusBar.lix" },
					},
					{
						name: "CEFR indication",
						desc: "Indicative audience band (≈ B1/B2/C1/C2).",
						control: { type: "toggle", key: "statusBar.band" },
					},
					{
						name: "Target check",
						desc: "✓ on target, ▲ above target.",
						control: { type: "toggle", key: "statusBar.target" },
					},
					{
						name: "Word count",
						desc: "Words in the note (or selection).",
						control: { type: "toggle", key: "statusBar.words" },
					},
					{
						name: "Reading time",
						desc: "Estimated reading time.",
						control: { type: "toggle", key: "statusBar.readingTime" },
					},
				],
			},
			{
				type: "group",
				heading: "Bases",
				items: [
					{
						name: "Write readability properties",
						desc: "Adds the score to a note's properties (lix, band, on-target) via the commands below, so you can build Bases views and filters over readability. Off means the plugin never writes to your notes.",
						control: { type: "toggle", key: "basesWriteEnabled" },
					},
					{
						name: "Property prefix",
						desc: "Property names become <prefix>-lix, <prefix>-band and <prefix>-on-target.",
						visible: () => settings.basesWriteEnabled,
						control: {
							type: "text",
							key: "basesPropertyPrefix",
							placeholder: DEFAULT_PROPERTY_PREFIX,
							validate: (value: string) =>
								isValidPropertyPrefix(value.trim())
									? undefined
									: "Use a non-empty prefix without spaces, ':', '#' or '.'.",
						},
					},
					{
						name: "Keep properties up to date",
						desc: "Rewrites the properties when a note changes — only for notes that already carry them; new notes still opt in via the command.",
						visible: () => settings.basesWriteEnabled,
						control: { type: "toggle", key: "basesAutoUpdate" },
					},
				],
			},
		];
	}

	/** A mutable rule list with the native add/delete affordances. */
	private ruleList(
		rules: TargetRule[],
		heading: string,
		emptyState: string,
		addLabel: string,
		placeholder: string,
	): SettingDefinitionItem {
		return {
			type: "list",
			heading,
			emptyState,
			addItem: {
				name: addLabel,
				action: () => {
					rules.push({ pattern: "", band: "b2", customMaxLix: 45 });
					void this.plugin.saveSettings().then(() => this.rerender());
				},
			},
			onDelete: (index: number) => {
				rules.splice(index, 1);
				void this.plugin.saveSettings().then(() => this.rerender());
			},
			items: rules.map((rule) => ({
				name: "",
				searchable: false,
				render: (setting: Setting) => this.renderRule(setting, rule, placeholder),
			})),
		};
	}

	/** One editable rule row: pattern + band (+ custom LIX ceiling). */
	private renderRule(setting: Setting, rule: TargetRule, placeholder: string): void {
		setting.setClass("rc-rule-row");
		setting.addText((text) =>
			text
				.setPlaceholder(placeholder)
				.setValue(rule.pattern)
				.onChange(async (value) => {
					rule.pattern = value;
					await this.plugin.saveSettings();
				}),
		);
		setting.addDropdown((dropdown) =>
			dropdown
				.addOption("b1", "≈ B1")
				.addOption("b2", "≈ B2")
				.addOption("c1", "≈ C1")
				.addOption("custom", "Custom")
				.setValue(rule.band)
				.onChange(async (value) => {
					rule.band = value as TargetBand;
					await this.plugin.saveSettings();
					// The custom-ceiling input appears or disappears with the band.
					this.rerender();
				}),
		);
		if (rule.band === "custom") {
			setting.addText((text) => {
				text.inputEl.type = "number";
				text.inputEl.addClass("rc-rule-lix");
				text
					.setPlaceholder("45")
					.setValue(String(rule.customMaxLix))
					.onChange(async (value) => {
						const numeric = Number(value);
						if (Number.isFinite(numeric) && numeric > 0) {
							rule.customMaxLix = numeric;
							await this.plugin.saveSettings();
						}
					});
			});
		}
	}

	/** Re-render the tab after a structural change (rule add/delete, band↔custom). */
	private rerender(): void {
		this.update();
	}
}
