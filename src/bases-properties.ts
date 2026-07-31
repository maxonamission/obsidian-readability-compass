/**
 * Readability properties for Bases (BC_E2_S4): the plugin writes the note's
 * score into front matter so users can build native Bases views over it
 * (tables, cards, "above target" filters) — route (b) from the BC_E2_S3
 * spike. Pure TypeScript, no Obsidian imports: the caller owns reading and
 * persisting the front matter.
 */

import { ReadabilityReport } from "./readability/analyze";

export const DEFAULT_PROPERTY_PREFIX = "readability";

export interface PropertyKeys {
	lix: string;
	band: string;
	onTarget: string;
}

export function propertyKeys(prefix: string): PropertyKeys {
	return {
		lix: `${prefix}-lix`,
		band: `${prefix}-band`,
		onTarget: `${prefix}-on-target`,
	};
}

/**
 * A front-matter-safe prefix: non-empty, and no characters that break YAML
 * keys or Bases property ids (whitespace, colon, hash, dot).
 */
export function isValidPropertyPrefix(prefix: string): boolean {
	return prefix.length > 0 && !/[\s:#.]/.test(prefix);
}

/**
 * Write the report into a front matter object, in place. A scoreless note
 * (below minWords) gets its readability keys *removed* — no score means no
 * property, so a Bases filter never sees a stale or misleading value.
 * Returns whether anything changed, so callers can skip a no-op file write
 * (this also breaks the loop when a write re-triggers a metadata event).
 */
export function applyReadabilityProperties(
	frontmatter: Record<string, unknown>,
	report: ReadabilityReport,
	prefix: string,
): boolean {
	const keys = propertyKeys(prefix);
	let changed = false;
	const setValue = (key: string, value: number | string | boolean): void => {
		if (frontmatter[key] !== value) {
			frontmatter[key] = value;
			changed = true;
		}
	};
	const removeValue = (key: string): void => {
		if (key in frontmatter) {
			delete frontmatter[key];
			changed = true;
		}
	};

	if (report.lix === null) {
		removeValue(keys.lix);
		removeValue(keys.band);
		removeValue(keys.onTarget);
		return changed;
	}

	setValue(keys.lix, Math.round(report.lix * 10) / 10);
	if (report.band !== null) setValue(keys.band, report.band);
	if (report.onTarget !== null) setValue(keys.onTarget, report.onTarget);
	return changed;
}
