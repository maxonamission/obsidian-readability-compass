/**
 * Offset-preserving Markdown stripping.
 *
 * Reduces Markdown to running text for readability measurement, following the
 * semantics of `codebase-standards/profiles/diataxis/check_readability.py`:
 * front matter, code, tables, link URLs, HTML, headings markers, blockquote
 * markers, list markers and emphasis do not count as prose.
 *
 * Unlike the Python script, every removal is replaced by spaces of equal
 * length (newlines are kept), so any offset into the cleaned text is also a
 * valid offset into the original document. That is what makes
 * "jump to sentence" possible without a separate source map.
 */

/** Replace every non-newline character of a match with a space. */
function blank(match: string): string {
	return match.replace(/[^\n]/g, " ");
}

const FRONT_MATTER_RE = /^\uFEFF?---[^\S\n]*\n[\s\S]*?\n---[^\S\n]*(?:\n|$)/;
const FENCE_RE = /(?:```|~~~)[\s\S]*?(?:```|~~~|$)/g;
const COMMENT_RE = /%%[\s\S]*?(?:%%|$)/g;
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g;
const LINK_RE = /\[([^\]]*)\]\(([^)]*)\)/g; // [text](url) -> text, in place
const WIKILINK_ALIAS_RE = /\[\[([^\]|]*)\|([^\]]*)\]\]/g; // [[target|alias]] -> alias
const WIKILINK_RE = /\[\[([^\]|]*)\]\]/g; // [[target]] -> target
const FOOTNOTE_REF_RE = /\[\^[^\]]*\]/g;
const INLINE_CODE_RE = /`[^`\n]*`/g;
const TABLE_ROW_RE = /^[^\S\n]*\|.*\|[^\S\n]*$/gm;
const TABLE_SEPARATOR_RE = /^[^\S\n]*\|(?:[^\S\n]*:?-+:?[^\S\n]*\|)+[^\S\n]*$/gm;
const HTML_RE = /<[^>\n]+>/g;
const URL_RE = /https?:\/\/\S+/g;
const TAG_RE = /(^|[\s([])#[\p{L}\p{N}_/-]+/gmu;
const HEADING_HASH_RE = /^[^\S\n]{0,3}#{1,6}[^\S\n]*/gm;
const CALLOUT_MARKER_RE = /\[![\w-]+\][+-]?/g;
const BLOCKQUOTE_RE = /^[^\S\n]{0,3}>[^\S\n]?/gm;
const LIST_MARKER_RE = /^[^\S\n]{0,3}(?:[-*+]|\d+\.)[^\S\n]+/gm;
const EMPHASIS_RE = /[*_~=]/g;

export interface StripOptions {
	/**
	 * Keep the text inside Markdown tables (cell content stays at its original
	 * offset; pipes and separator rows still become spaces). Default false —
	 * tables are not running prose — but useful for notes that *are* tables,
	 * like question banks (BC_E1_S8).
	 */
	includeTables?: boolean;
	/**
	 * Keep the text inside code fences and inline code (the fence markers and
	 * backticks still become spaces). Default false; used for manual
	 * selections — an explicit selection means "measure this", also when the
	 * prose happens to live in a code block (BC_E1_S8).
	 */
	includeCode?: boolean;
}

/**
 * Reduce Markdown to running text. The result has exactly the same length and
 * line structure as the input; stripped constructs become spaces.
 */
export function stripMarkdown(text: string, options: StripOptions = {}): string {
	let t = text.replace(FRONT_MATTER_RE, blank);
	if (options.includeCode === true) {
		// Keep fenced content; only the fence lines themselves become spaces.
		t = t.replace(FENCE_RE, (block) => block.replace(/(?:```|~~~)[^\n]*/g, blank));
	} else {
		t = t.replace(FENCE_RE, blank);
	}
	t = t.replace(COMMENT_RE, blank);
	t = t.replace(IMAGE_RE, blank);
	// Keep link/wikilink display text at its original offset; blank the rest.
	t = t.replace(LINK_RE, (m, label: string) => {
		const rest = m.length - 1 - label.length;
		return " " + label + " ".repeat(rest);
	});
	t = t.replace(WIKILINK_ALIAS_RE, (m, target: string, alias: string) => {
		return " ".repeat(2 + target.length + 1) + alias + "  ";
	});
	t = t.replace(WIKILINK_RE, (_m, target: string) => `  ${target}  `);
	t = t.replace(FOOTNOTE_REF_RE, blank);
	if (options.includeCode === true) {
		t = t.replace(INLINE_CODE_RE, (code) => code.replace(/`/g, " "));
	} else {
		t = t.replace(INLINE_CODE_RE, blank);
	}
	if (options.includeTables === true) {
		t = t.replace(TABLE_SEPARATOR_RE, blank);
		// All pipes become spaces — also in row *fragments* (a selection that
		// starts mid-row never matches the full-row pattern, BC_E1_S9).
		t = t.replace(/\|/g, " ");
	} else {
		t = t.replace(TABLE_ROW_RE, blank);
	}
	t = t.replace(HTML_RE, blank);
	t = t.replace(URL_RE, blank);
	t = t.replace(TAG_RE, (m, lead: string) => lead + blank(m.slice(lead.length)));
	t = t.replace(HEADING_HASH_RE, blank);
	t = t.replace(CALLOUT_MARKER_RE, blank);
	t = t.replace(BLOCKQUOTE_RE, blank);
	t = t.replace(LIST_MARKER_RE, blank);
	t = t.replace(EMPHASIS_RE, " ");
	return t;
}
