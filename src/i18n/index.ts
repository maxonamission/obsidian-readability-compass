/**
 * Which language the feedback speaks (BC_E1_S28).
 *
 * The plugin already detects the language of every note; this module turns
 * that into a string catalogue. Only languages that are actually translated
 * appear in the catalogue — everything else falls back to English, which is a
 * deliberate end state rather than a gap: a machine-translated readability
 * vocabulary would undermine exactly this plugin's credibility.
 */

import { DetectedLanguage, LanguageCode } from "../readability/language";
import { EN } from "./en";
import { NL } from "./nl";
import { Strings } from "./types";

export type { Strings, TargetSourceKind } from "./types";
export { EN } from "./en";

/**
 * The user's choice: follow the note, follow Obsidian's own interface
 * language, or pin one language outright.
 */
export type PanelLanguage = "auto" | "obsidian" | LanguageCode;

const CATALOGUE: Partial<Record<LanguageCode, Strings>> = {
	en: EN,
	nl: NL,
};

/** Translated languages, in registry order — drives the settings dropdown. */
export const UI_LANGUAGES: LanguageCode[] = Object.keys(CATALOGUE) as LanguageCode[];

/** The catalogue for a language, English when it has no translation. */
export function stringsFor(language: DetectedLanguage): Strings {
	return language === "unknown" ? EN : (CATALOGUE[language] ?? EN);
}

/**
 * Match a host locale (Obsidian's `getLanguage()`) to a translated language.
 *
 * Obsidian reports locales like `en`, `nl` or `pt-BR`; the region is dropped
 * because the catalogues are per language, not per region. Anything we have no
 * translation for resolves to `unknown`, which reads as English.
 */
export function matchUiLanguage(locale: string | null): DetectedLanguage {
	if (locale === null) return "unknown";
	const base = locale.toLowerCase().split(/[-_]/u)[0];
	return (UI_LANGUAGES as string[]).includes(base)
		? (base as LanguageCode)
		: "unknown";
}

/**
 * Resolve the feedback language for a note.
 *
 * Order, most specific first:
 * 1. a pinned `panelLanguage` — the escape hatch for mixed-language vaults;
 * 2. `"obsidian"` — follow the app's own interface language, which the user
 *    has already set once for everything else they read;
 * 3. a fixed measurement `language` — if you pinned the Flesch variant, the
 *    interface follows that same decision;
 * 4. the language detected in the note itself — the default;
 * 5. English, when detection is not confident (`unknown`), when there is no
 *    single note to speak for (an explorer selection can mix languages), or
 *    when the host language has no translation.
 *
 * Falling back at step 5 also keeps a fresh note from flipping languages under
 * the writer's hands: detection stays `unknown` until there is enough text.
 *
 * `hostLanguage` is passed in rather than read here, so this module stays free
 * of Obsidian imports and unit-testable.
 */
export function resolvePanelStrings(
	panelLanguage: PanelLanguage,
	measurementLanguage: "auto" | LanguageCode,
	detected: DetectedLanguage | null,
	hostLanguage: string | null = null,
): Strings {
	if (panelLanguage === "obsidian") return stringsFor(matchUiLanguage(hostLanguage));
	if (panelLanguage !== "auto") return stringsFor(panelLanguage);
	if (measurementLanguage !== "auto") return stringsFor(measurementLanguage);
	return stringsFor(detected ?? "unknown");
}
