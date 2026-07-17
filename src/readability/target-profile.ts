/**
 * Context-dependent target resolution: which LIX ceiling applies to a note.
 *
 * Priority order (explicit beats implicit, note beats context):
 *   1. `readability-target` in the note's front matter (band or number)
 *   2. `diataxis` type in the front matter (when enabled)
 *   3. tag rules (first matching rule wins)
 *   4. folder rules (longest matching path prefix wins)
 *   5. the global target setting
 *
 * Pure TypeScript — no Obsidian imports — so resolution is unit-testable.
 */

import { TargetBand, TARGET_MAX_LIX, targetMaxLix } from "./scores";

export interface TargetRule {
	/** Folder path prefix (vault-relative) or tag (with or without '#'). */
	pattern: string;
	band: TargetBand;
	/** Only used when band === "custom". */
	customMaxLix: number;
}

export interface NoteContext {
	/** Vault-relative file path, e.g. "blog/post.md". */
	path: string;
	/** All tags of the note, with or without leading '#'. */
	tags: string[];
	frontmatter: Record<string, unknown> | null;
}

export type TargetSourceKind = "note" | "diataxis" | "tag" | "folder" | "global";

export interface ResolvedTarget {
	maxLix: number;
	/** "custom" when the ceiling is a bare number. */
	band: TargetBand;
	source: TargetSourceKind;
	/** What matched, e.g. "#blog", "docs/", "diataxis: tutorial". Null for global. */
	detail: string | null;
}

export interface TargetProfileSettings {
	deriveFromDiataxis: boolean;
	tagRules: TargetRule[];
	folderRules: TargetRule[];
	globalBand: TargetBand;
	globalCustomMaxLix: number;
}

/**
 * Diataxis type → target band. Own design decision (the doc-standard CI uses
 * one global norm): tutorials address beginners and get the strictest band;
 * the other types follow the house norm (clear B2).
 */
export const DIATAXIS_TARGETS: Record<string, TargetBand> = {
	tutorial: "b1",
	"how-to": "b2",
	howto: "b2",
	reference: "b2",
	explanation: "b2",
};

const FRONTMATTER_KEY = "readability-target";
const BAND_VALUES = new Set<string>(Object.keys(TARGET_MAX_LIX));

function ruleTarget(rule: TargetRule): { maxLix: number; band: TargetBand } {
	return {
		maxLix: targetMaxLix(rule.band, rule.customMaxLix),
		band: rule.band,
	};
}

function normalizeTag(tag: string): string {
	return tag.replace(/^#/, "").toLowerCase();
}

/** A rule tag matches the tag itself and its nested tags (`blog` ⊇ `blog/tech`). */
function tagMatches(ruleTag: string, noteTag: string): boolean {
	return noteTag === ruleTag || noteTag.startsWith(ruleTag + "/");
}

function normalizeFolder(pattern: string): string {
	return pattern.replace(/^\/+/, "").replace(/\/+$/, "");
}

function folderMatches(folder: string, path: string): boolean {
	return path.startsWith(folder + "/");
}

/** Parse `readability-target: b1 | 42` (band name or bare LIX ceiling). */
function parseFrontmatterTarget(
	value: unknown,
): { maxLix: number; band: TargetBand } | null {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return { maxLix: value, band: "custom" };
	}
	if (typeof value !== "string") return null;
	const text = value.trim().toLowerCase();
	if (BAND_VALUES.has(text)) {
		const band = text as Exclude<TargetBand, "custom">;
		return { maxLix: TARGET_MAX_LIX[band], band };
	}
	const numeric = Number(text);
	if (Number.isFinite(numeric) && numeric > 0) {
		return { maxLix: numeric, band: "custom" };
	}
	return null;
}

export function resolveTarget(
	context: NoteContext | null,
	settings: TargetProfileSettings,
): ResolvedTarget {
	const global: ResolvedTarget = {
		maxLix: targetMaxLix(settings.globalBand, settings.globalCustomMaxLix),
		band: settings.globalBand,
		source: "global",
		detail: null,
	};
	if (context === null) return global;

	// 1. Explicit per-note override.
	const explicit = parseFrontmatterTarget(context.frontmatter?.[FRONTMATTER_KEY]);
	if (explicit !== null) {
		return { ...explicit, source: "note", detail: FRONTMATTER_KEY };
	}

	// 2. Diataxis type.
	if (settings.deriveFromDiataxis) {
		const diataxis = context.frontmatter?.["diataxis"];
		if (typeof diataxis === "string") {
			const band = DIATAXIS_TARGETS[diataxis.trim().toLowerCase()];
			if (band !== undefined) {
				return {
					maxLix: TARGET_MAX_LIX[band as Exclude<TargetBand, "custom">],
					band,
					source: "diataxis",
					detail: `diataxis: ${diataxis.trim().toLowerCase()}`,
				};
			}
		}
	}

	// 3. Tag rules — first matching rule wins (list order is user-controlled).
	const noteTags = context.tags.map(normalizeTag);
	for (const rule of settings.tagRules) {
		const ruleTag = normalizeTag(rule.pattern.trim());
		if (ruleTag === "") continue;
		if (noteTags.some((tag) => tagMatches(ruleTag, tag))) {
			return { ...ruleTarget(rule), source: "tag", detail: `#${ruleTag}` };
		}
	}

	// 4. Folder rules — the longest (most specific) matching prefix wins.
	let bestFolder: { rule: TargetRule; folder: string } | null = null;
	for (const rule of settings.folderRules) {
		const folder = normalizeFolder(rule.pattern.trim());
		if (folder === "") continue;
		if (!folderMatches(folder, context.path)) continue;
		if (bestFolder === null || folder.length > bestFolder.folder.length) {
			bestFolder = { rule, folder };
		}
	}
	if (bestFolder !== null) {
		return {
			...ruleTarget(bestFolder.rule),
			source: "folder",
			detail: `${bestFolder.folder}/`,
		};
	}

	// 5. Global fallback.
	return global;
}
