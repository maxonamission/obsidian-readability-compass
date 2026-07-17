import { App, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";
import { TargetBand, TARGET_MAX_LIX } from "./readability/scores";
import { LanguageCode, LANGUAGES } from "./readability/language";
import { TargetRule } from "./readability/target-profile";
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
	showStructureHints: boolean;
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
	showStructureHints: false,
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
 *
 * Obsidian older than 1.13.0 never calls `getSettingDefinitions()`; it renders
 * through the legacy `display()` fallback below (`renderLegacy`), which keeps
 * `minAppVersion` at 1.7.2. On 1.13+ the fallback is ignored.
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
		// based on the value just persisted. Feature-detected: the member is
		// absent on Obsidian < 1.13, where the legacy path renders instead.
		(this as Partial<Record<"refreshDomState", () => void>>).refreshDomState?.();
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

	/**
	 * Re-render on whichever path is active. Feature-detected: update() only
	 * exists on Obsidian 1.13+; older versions re-render the legacy tab.
	 */
	private rerender(): void {
		const update = (this as Partial<Record<"update", () => void>>).update;
		if (typeof update === "function") {
			update.call(this);
		} else {
			this.renderLegacy();
		}
	}

	// --- Legacy fallback (Obsidian < 1.13.0) --------------------------------

	// Obsidian versions before 1.13.0 don't know getSettingDefinitions() and
	// render the tab through display(). 1.13+ ignores this override entirely.
	display(): void {
		this.renderLegacy();
	}

	/** The pre-1.13 imperative tab; re-renders call this method directly. */
	private renderLegacy(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Target").setHeading();

		new Setting(containerEl)
			.setName("Target audience")
			.setDesc(
				"The reading level your notes should stay at. CEFR bands are translated to a LIX ceiling.",
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("b1", `≈ B1 — plain (LIX ≤ ${TARGET_MAX_LIX.b1})`)
					.addOption("b2", `≈ B2 — clear (LIX ≤ ${TARGET_MAX_LIX.b2})`)
					.addOption("c1", `≈ C1 — advanced (LIX ≤ ${TARGET_MAX_LIX.c1})`)
					.addOption("custom", "Custom LIX ceiling")
					.setValue(this.plugin.settings.targetBand)
					.onChange(async (value) => {
						this.plugin.settings.targetBand = value as TargetBand;
						await this.plugin.saveSettings();
						this.renderLegacy();
					}),
			);

		if (this.plugin.settings.targetBand === "custom") {
			this.addLabelledSlider(
				new Setting(containerEl)
					.setName("Custom LIX ceiling")
					.setDesc("Scores above this value count as off target."),
				{ min: 20, max: 70, step: 1 },
				() => this.plugin.settings.customMaxLix,
				(value) => `LIX ${value}`,
				async (value) => {
					this.plugin.settings.customMaxLix = value;
					await this.plugin.saveSettings();
				},
			);
		}

		new Setting(containerEl).setName("Target profiles").setHeading();

		new Setting(containerEl)
			.setName("Derive target from diataxis type")
			.setDesc(
				"Notes with a 'diataxis' front matter key get a matching target: tutorial ≈ B1; how-to, reference and explanation ≈ B2. A 'readability-target' key always wins.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.deriveFromDiataxis)
					.onChange(async (value) => {
						this.plugin.settings.deriveFromDiataxis = value;
						await this.plugin.saveSettings();
					}),
			);

		this.renderRuleList(
			containerEl,
			this.plugin.settings.tagRules,
			"Tag rules",
			"Notes carrying the tag (or a nested tag under it) get this target. The first matching rule wins. Tag rules beat folder rules.",
			"Add tag rule",
			"#blog",
		);

		this.renderRuleList(
			containerEl,
			this.plugin.settings.folderRules,
			"Folder rules",
			"Notes inside the folder get this target. The most specific (longest) matching folder wins.",
			"Add folder rule",
			"docs/tutorials",
		);

		new Setting(containerEl).setName("Measurement").setHeading();

		new Setting(containerEl)
			.setName("Language")
			.setDesc(
				"Picks the Flesch variant for that language (e.g. Flesch-Douma for Dutch). LIX itself is language-independent. Auto-detect falls back to LIX only when unsure.",
			)
			.addDropdown((dropdown) => {
				dropdown.addOption("auto", "Auto-detect");
				for (const language of LANGUAGES) {
					dropdown.addOption(language.code, language.label);
				}
				dropdown
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value as "auto" | LanguageCode;
						await this.plugin.saveSettings();
					});
			});

		this.addLabelledSlider(
			new Setting(containerEl)
				.setName("Minimum words for a score")
				.setDesc("Below this word count LIX is too erratic and is hidden."),
			{ min: 10, max: 100, step: 5 },
			() => this.plugin.settings.minWords,
			(value) => `${value} words`,
			async (value) => {
				this.plugin.settings.minWords = value;
				await this.plugin.saveSettings();
			},
		);

		this.addLabelledSlider(
			new Setting(containerEl)
				.setName("Longest sentences and hardest paragraphs shown")
				.setDesc(
					"How many entries the panel lists at first; Show more reveals the rest in steps.",
				),
			{ min: 3, max: 25, step: 1 },
			() => this.plugin.settings.topSentencesShown,
			(value) => `top ${value}`,
			async (value) => {
				this.plugin.settings.topSentencesShown = value;
				await this.plugin.saveSettings();
			},
		);

		this.addLabelledSlider(
			new Setting(containerEl)
				.setName("Only list sentences above")
				.setDesc(
					"Sentences at or below this word count stay out of the longest-sentences list. 0 lists regardless of length.",
				),
			{ min: 0, max: 40, step: 1 },
			() => this.plugin.settings.sentenceMinWords,
			(value) => (value === 0 ? "off" : `${value} words`),
			async (value) => {
				this.plugin.settings.sentenceMinWords = value;
				await this.plugin.saveSettings();
			},
		);

		new Setting(containerEl)
			.setName("Follow file explorer selections")
			.setDesc(
				"Select multiple notes in the file explorer and the panel scores them together, live — no right-click needed (up to 50 notes; folders and larger selections via the right-click menu). Live selections let go when you open a note outside them; right-click scores stay pinned until you select something else in the explorer.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.followExplorerSelection)
					.onChange(async (value) => {
						this.plugin.settings.followExplorerSelection = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Include table text")
			.setDesc(
				"Count the text inside Markdown tables — for notes that are tables, like question banks. Per note override: 'readability-tables: true' (or false) in the front matter. A manual selection always includes tables and code.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeTables)
					.onChange(async (value) => {
						this.plugin.settings.includeTables = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Mark long sentences in the editor")
			.setDesc(
				"Give sentences above the threshold a subtle background while you write. Never marks code, front matter or tables.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.markLongSentences)
					.onChange(async (value) => {
						this.plugin.settings.markLongSentences = value;
						await this.plugin.saveSettings();
						this.renderLegacy();
					}),
			);

		if (this.plugin.settings.markLongSentences) {
			new Setting(containerEl)
				.setName("Marking threshold follows the target")
				.setDesc(
					"Derive the words-per-sentence threshold from the active target profile (≈ B1 ⇒ 22, ≈ B2 ⇒ 25, ≈ C1 ⇒ 30). Turn off for a fixed threshold.",
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.markingFollowsTarget)
						.onChange(async (value) => {
							this.plugin.settings.markingFollowsTarget = value;
							await this.plugin.saveSettings();
							this.renderLegacy();
						}),
				);

			if (!this.plugin.settings.markingFollowsTarget) {
				this.addLabelledSlider(
					new Setting(containerEl)
						.setName("Marking threshold (words per sentence)")
						.setDesc("Sentences above this word count get marked."),
					{ min: 10, max: 60, step: 1 },
					() => this.plugin.settings.markingThreshold,
					(value) => `${value} words`,
					async (value) => {
						this.plugin.settings.markingThreshold = value;
						await this.plugin.saveSettings();
					},
				);
			}
		}

		new Setting(containerEl)
			.setName("Mark long words in the editor")
			.setDesc(
				"Underline every long word (> 6 letters) — the other LIX ingredient. Shows why keyword-dense text scores high even without long sentences.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.markLongWords)
					.onChange(async (value) => {
						this.plugin.settings.markLongWords = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show structure & cohesion hints (experimental)")
			.setDesc(
				"Adds a panel section with descriptive structure and cohesion hints (heading structure, adjacent-sentence overlap, connective density, and a Diátaxis-type match). These complement LIX — they are hints, not a score, and never a pass/fail verdict.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showStructureHints)
					.onChange(async (value) => {
						this.plugin.settings.showStructureHints = value;
						await this.plugin.saveSettings();
					}),
			);

		this.addLabelledSlider(
			new Setting(containerEl)
				.setName("Reading speed")
				.setDesc("Words per minute, used for the reading time estimate."),
			{ min: 100, max: 400, step: 25 },
			() => this.plugin.settings.wordsPerMinute,
			(value) => `${value} wpm`,
			async (value) => {
				this.plugin.settings.wordsPerMinute = value;
				await this.plugin.saveSettings();
			},
		);

		new Setting(containerEl).setName("Status bar").setHeading();

		new Setting(containerEl)
			.setName("Show in status bar")
			.setDesc("The always-on indicator. Click it to open the panel.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showStatusBar)
					.onChange(async (value) => {
						this.plugin.settings.showStatusBar = value;
						await this.plugin.saveSettings();
					}),
			);

		const segments: Array<{
			key: keyof ReadabilityCompassSettings["statusBar"];
			name: string;
			desc: string;
		}> = [
			{ name: "LIX score", desc: "The primary readability score.", key: "lix" },
			{ name: "CEFR indication", desc: "Indicative audience band (≈ B1/B2/C1/C2).", key: "band" },
			{ name: "Target check", desc: "✓ on target, ▲ above target.", key: "target" },
			{ name: "Word count", desc: "Words in the note (or selection).", key: "words" },
			{ name: "Reading time", desc: "Estimated reading time.", key: "readingTime" },
		];
		for (const segment of segments) {
			new Setting(containerEl)
				.setName(segment.name)
				.setDesc(segment.desc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.statusBar[segment.key])
						.onChange(async (value) => {
							this.plugin.settings.statusBar[segment.key] = value;
							await this.plugin.saveSettings();
						}),
				);
		}
	}

	/**
	 * Legacy slider with an always-visible value label (owner-test finding,
	 * BC_E1_S8). The declarative path uses the built-in `displayFormat`.
	 */
	private addLabelledSlider(
		setting: Setting,
		limits: { min: number; max: number; step: number },
		getValue: () => number,
		format: (value: number) => string,
		onChange: (value: number) => Promise<void>,
	): void {
		const label = createSpan({ cls: "rc-slider-value", text: format(getValue()) });
		setting.addSlider((slider) =>
			slider
				.setLimits(limits.min, limits.max, limits.step)
				.setValue(getValue())
				.onChange(async (value) => {
					label.setText(format(value));
					await onChange(value);
				}),
		);
		setting.controlEl.prepend(label);
	}

	/** Legacy rule rows (pattern + band + delete) plus an add button. */
	private renderRuleList(
		containerEl: HTMLElement,
		rules: TargetRule[],
		name: string,
		desc: string,
		addLabel: string,
		placeholder: string,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addButton((button) =>
				button.setButtonText(addLabel).onClick(async () => {
					rules.push({ pattern: "", band: "b2", customMaxLix: 45 });
					await this.plugin.saveSettings();
					this.renderLegacy();
				}),
			);

		for (const rule of rules) {
			const row = new Setting(containerEl);
			this.renderRule(row, rule, placeholder);
			row.addExtraButton((button) =>
				button
					.setIcon("trash")
					.setTooltip("Remove rule")
					.onClick(async () => {
						rules.splice(rules.indexOf(rule), 1);
						await this.plugin.saveSettings();
						this.renderLegacy();
					}),
			);
		}
	}
}
