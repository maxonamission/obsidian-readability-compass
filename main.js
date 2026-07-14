"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  TOP_LIST_CAP: () => TOP_LIST_CAP,
  default: () => ReadabilityCompassPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/readability/strip-markdown.ts
function blank(match) {
  return match.replace(/[^\n]/g, " ");
}
var FRONT_MATTER_RE = /^\uFEFF?---[^\S\n]*\n[\s\S]*?\n---[^\S\n]*(?:\n|$)/;
var FENCE_RE = /(?:```|~~~)[\s\S]*?(?:```|~~~|$)/g;
var COMMENT_RE = /%%[\s\S]*?(?:%%|$)/g;
var IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g;
var LINK_RE = /\[([^\]]*)\]\(([^)]*)\)/g;
var WIKILINK_ALIAS_RE = /\[\[([^\]|]*)\|([^\]]*)\]\]/g;
var WIKILINK_RE = /\[\[([^\]|]*)\]\]/g;
var FOOTNOTE_REF_RE = /\[\^[^\]]*\]/g;
var INLINE_CODE_RE = /`[^`\n]*`/g;
var TABLE_ROW_RE = /^[^\S\n]*\|.*\|[^\S\n]*$/gm;
var TABLE_SEPARATOR_RE = /^[^\S\n]*\|(?:[^\S\n]*:?-+:?[^\S\n]*\|)+[^\S\n]*$/gm;
var HTML_RE = /<[^>\n]+>/g;
var URL_RE = /https?:\/\/\S+/g;
var TAG_RE = /(^|[\s([])#[\p{L}\p{N}_/-]+/gmu;
var HEADING_HASH_RE = /^[^\S\n]{0,3}#{1,6}[^\S\n]*/gm;
var CALLOUT_MARKER_RE = /\[![\w-]+\][+-]?/g;
var BLOCKQUOTE_RE = /^[^\S\n]{0,3}>[^\S\n]?/gm;
var LIST_MARKER_RE = /^[^\S\n]{0,3}(?:[-*+]|\d+\.)[^\S\n]+/gm;
var EMPHASIS_RE = /[*_~=]/g;
function stripMarkdown(text, options = {}) {
  let t = text.replace(FRONT_MATTER_RE, blank);
  if (options.includeCode === true) {
    t = t.replace(FENCE_RE, (block) => block.replace(/(?:```|~~~)[^\n]*/g, blank));
  } else {
    t = t.replace(FENCE_RE, blank);
  }
  t = t.replace(COMMENT_RE, blank);
  t = t.replace(IMAGE_RE, blank);
  t = t.replace(LINK_RE, (m, label) => {
    const rest = m.length - 1 - label.length;
    return " " + label + " ".repeat(rest);
  });
  t = t.replace(WIKILINK_ALIAS_RE, (m, target, alias) => {
    return " ".repeat(2 + target.length + 1) + alias + "  ";
  });
  t = t.replace(WIKILINK_RE, (_m, target) => `  ${target}  `);
  t = t.replace(FOOTNOTE_REF_RE, blank);
  if (options.includeCode === true) {
    t = t.replace(INLINE_CODE_RE, (code) => code.replace(/`/g, " "));
  } else {
    t = t.replace(INLINE_CODE_RE, blank);
  }
  if (options.includeTables === true) {
    t = t.replace(TABLE_SEPARATOR_RE, blank);
    t = t.replace(/\|/g, " ");
  } else {
    t = t.replace(TABLE_ROW_RE, blank);
  }
  t = t.replace(HTML_RE, blank);
  t = t.replace(URL_RE, blank);
  t = t.replace(TAG_RE, (m, lead) => lead + blank(m.slice(lead.length)));
  t = t.replace(HEADING_HASH_RE, blank);
  t = t.replace(CALLOUT_MARKER_RE, blank);
  t = t.replace(BLOCKQUOTE_RE, blank);
  t = t.replace(LIST_MARKER_RE, blank);
  t = t.replace(EMPHASIS_RE, " ");
  return t;
}

// src/readability/words.ts
var WORD_RE = /\p{L}+(?:[’'-]\p{L}+)*/gu;
var LONG_WORD_LEN = 6;
function extractWords(text) {
  var _a;
  return (_a = text.match(WORD_RE)) != null ? _a : [];
}
function letterCount(word) {
  var _a;
  return ((_a = word.match(/\p{L}/gu)) != null ? _a : []).length;
}
function isLongWord(word) {
  return letterCount(word) > LONG_WORD_LEN;
}

// src/readability/sentences.ts
var BOUNDARY_RE = /[.!?]+|\n/g;
function splitSentences(clean) {
  const spans = [];
  let cursor = 0;
  const flush = (endExclusive) => {
    const segment = clean.slice(cursor, endExclusive);
    const words = extractWords(segment);
    if (words.length > 0) {
      const leading = segment.length - segment.trimStart().length;
      const trailing = segment.length - segment.trimEnd().length;
      spans.push({
        start: cursor + leading,
        end: endExclusive - trailing,
        text: segment.trim().replace(/\s+/g, " "),
        words: words.length,
        longWords: words.filter(isLongWord).length
      });
    }
  };
  BOUNDARY_RE.lastIndex = 0;
  let match;
  while ((match = BOUNDARY_RE.exec(clean)) !== null) {
    const isNewline = match[0] === "\n";
    flush(isNewline ? match.index : match.index + match[0].length);
    cursor = BOUNDARY_RE.lastIndex;
  }
  flush(clean.length);
  return spans;
}

// src/readability/language.ts
function makeVowelGroupCounter(options) {
  var _a;
  const vowels = new Set(options.vowels);
  const marked = new Set((_a = options.marked) != null ? _a : "");
  return (word) => {
    let w = word.toLowerCase();
    if (options.stripSilentFinalE) w = w.replace(/e$/, "");
    let count = 0;
    let previousWasVowel = false;
    for (const ch of w) {
      const startsNew = marked.has(ch);
      const isVowel = vowels.has(ch) || startsNew;
      if (isVowel && (!previousWasVowel || startsNew)) count++;
      previousWasVowel = isVowel;
    }
    if (count === 0 && /\p{L}/u.test(w)) return 1;
    return count;
  };
}
function countSyllablesEn(word) {
  var _a;
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, ((_a = w.match(/[aeiouy]{1,2}/g)) != null ? _a : []).length);
}
var countSyllablesNl = makeVowelGroupCounter({
  vowels: "aeiouy",
  marked: "\xEB\xEF\xF6\xFC\xE4\xE9\xE1\xED\xF3\xFA\xE8\xE0\xF9"
});
var LANGUAGES = [
  {
    code: "nl",
    label: "Dutch",
    stopwords: /* @__PURE__ */ new Set([
      "het",
      "een",
      "niet",
      "ook",
      "maar",
      "voor",
      "naar",
      "deze",
      "wordt",
      "geen",
      "zijn",
      "wel",
      "nog",
      "bij",
      "uit",
      "aan",
      "dan",
      "omdat",
      "tussen",
      "onder"
    ]),
    countSyllables: countSyllablesNl,
    // Douma (1960), the Dutch adaptation of Flesch Reading Ease.
    flesch: { name: "Flesch-Douma", base: 206.84, perWps: 0.93, perSpw: 77 }
  },
  {
    code: "en",
    label: "English",
    stopwords: /* @__PURE__ */ new Set([
      "the",
      "and",
      "of",
      "you",
      "that",
      "with",
      "this",
      "from",
      "they",
      "have",
      "not",
      "but",
      "are",
      "was",
      "which",
      "their",
      "would",
      "there",
      "been",
      "what"
    ]),
    countSyllables: countSyllablesEn,
    // Flesch (1948), the original Reading Ease formula.
    flesch: { name: "Flesch", base: 206.835, perWps: 1.015, perSpw: 84.6 }
  },
  {
    code: "de",
    label: "German",
    stopwords: /* @__PURE__ */ new Set([
      "der",
      "die",
      "das",
      "und",
      "ist",
      "nicht",
      "mit",
      "f\xFCr",
      "auf",
      "ein",
      "eine",
      "sich",
      "auch",
      "werden",
      "oder",
      "aber",
      "wird",
      "dass",
      "durch",
      "beim"
    ]),
    countSyllables: makeVowelGroupCounter({ vowels: "aeiouy\xE4\xF6\xFC" }),
    // Amstad (1978), the German adaptation of Flesch Reading Ease.
    flesch: { name: "Flesch-Amstad", base: 180, perWps: 1, perSpw: 58.5 }
  },
  {
    code: "es",
    label: "Spanish",
    stopwords: /* @__PURE__ */ new Set([
      "el",
      "los",
      "las",
      "una",
      "pero",
      "m\xE1s",
      "muy",
      "cuando",
      "donde",
      "aunque",
      "mientras",
      "despu\xE9s",
      "as\xED",
      "esto",
      "eso",
      "usted",
      "tambi\xE9n",
      "porque",
      "hasta",
      "sobre"
    ]),
    countSyllables: makeVowelGroupCounter({
      vowels: "aeiou\xFC",
      marked: "\xE1\xE9\xED\xF3\xFA"
    }),
    // Fernández-Huerta (1959), the Spanish adaptation of Flesch Reading Ease.
    flesch: { name: "Fern\xE1ndez-Huerta", base: 206.84, perWps: 1.02, perSpw: 60 }
  },
  {
    code: "fr",
    label: "French",
    stopwords: /* @__PURE__ */ new Set([
      "le",
      "les",
      "des",
      "une",
      "est",
      "dans",
      "pour",
      "que",
      "qui",
      "avec",
      "sur",
      "pas",
      "plus",
      "par",
      "comme",
      "\xEAtre",
      "cette",
      "vous",
      "nous",
      "sont"
    ]),
    countSyllables: makeVowelGroupCounter({
      vowels: "aeiouy\u0153",
      marked: "\xE9\xE8\xEA\xEB\xE0\xE2\xEE\xEF\xF4\xFB\xF9",
      stripSilentFinalE: true
    }),
    // Kandel & Moles (1958), the French adaptation of Flesch Reading Ease.
    flesch: { name: "Kandel-Moles", base: 209, perWps: 1.15, perSpw: 68 }
  },
  {
    code: "pt",
    label: "Portuguese",
    stopwords: /* @__PURE__ */ new Set([
      "n\xE3o",
      "uma",
      "com",
      "mas",
      "como",
      "ele",
      "ela",
      "voc\xEA",
      "tamb\xE9m",
      "j\xE1",
      "s\xE3o",
      "muito",
      "quando",
      "entre",
      "sem",
      "isso",
      "mesmo",
      "ainda",
      "depois",
      "essa"
    ]),
    countSyllables: makeVowelGroupCounter({
      vowels: "aeiou",
      marked: "\xE1\xE9\xED\xF3\xFA\xE2\xEA\xF4\xE3\xF5\xE0"
    }),
    // Martins et al. (1996), the Portuguese adaptation of Flesch Reading Ease.
    flesch: { name: "Flesch-Martins", base: 248.835, perWps: 1.015, perSpw: 84.6 }
  }
];
var LANGUAGE_BY_CODE = new Map(LANGUAGES.map((language) => [language.code, language]));
var MIN_HITS = 3;
function detectLanguage(words) {
  var _a;
  const hits = /* @__PURE__ */ new Map();
  for (const word of words) {
    const lower = word.toLowerCase();
    for (const language of LANGUAGES) {
      if (language.stopwords.has(lower)) {
        hits.set(language.code, ((_a = hits.get(language.code)) != null ? _a : 0) + 1);
      }
    }
  }
  let best = null;
  let bestHits = 0;
  let contested = false;
  for (const [code, count] of hits) {
    if (count > bestHits) {
      best = code;
      bestHits = count;
      contested = false;
    } else if (count === bestHits) {
      contested = true;
    }
  }
  if (best === null || bestHits < MIN_HITS || contested) return "unknown";
  return best;
}
function averageSyllablesPerWord(words, countSyllables) {
  if (words.length === 0) return 0;
  let total = 0;
  for (const word of words) total += countSyllables(word);
  return total / words.length;
}

// src/readability/scores.ts
function lixScore(wordCount, sentenceCount, longWordCount) {
  if (wordCount === 0) return null;
  return wordCount / Math.max(1, sentenceCount) + 100 * longWordCount / wordCount;
}
function lixBand(lix) {
  if (lix < 30) return "very easy";
  if (lix < 40) return "easy";
  if (lix < 50) return "average";
  if (lix < 60) return "difficult";
  return "very difficult";
}
function cefrIndication(lix) {
  if (lix <= 40) return "\u2248 B1";
  if (lix <= 45) return "\u2248 B2";
  if (lix <= 55) return "\u2248 C1";
  return "\u2248 C2";
}
var TARGET_MAX_LIX = {
  b1: 40,
  b2: 45,
  c1: 55
};
function targetMaxLix(band, customMaxLix) {
  return band === "custom" ? customMaxLix : TARGET_MAX_LIX[band];
}
function fleschScore(formula, wordsPerSentence, syllablesPerWord) {
  return formula.base - formula.perWps * wordsPerSentence - formula.perSpw * syllablesPerWord;
}
function fleschLabel(score) {
  if (score >= 90) return "very easy";
  if (score >= 80) return "easy";
  if (score >= 70) return "fairly easy";
  if (score >= 60) return "plain";
  if (score >= 50) return "fairly difficult";
  if (score >= 30) return "difficult";
  return "very difficult";
}

// src/readability/analyze.ts
var DEFAULT_TOP_SENTENCES = 5;
var MIN_PARAGRAPH_WORDS = 20;
function paragraphBlocks(clean) {
  const blocks = [];
  let offset = 0;
  let start = -1;
  let end = -1;
  for (const line of clean.split("\n")) {
    if (/\S/.test(line)) {
      if (start === -1) start = offset;
      end = offset + line.length;
    } else if (start !== -1) {
      blocks.push({ start, end });
      start = -1;
    }
    offset += line.length + 1;
  }
  if (start !== -1) blocks.push({ start, end });
  return blocks;
}
function topParagraphs(clean, count) {
  const spans = [];
  for (const block of paragraphBlocks(clean)) {
    const text = clean.slice(block.start, block.end);
    const words = extractWords(text);
    if (words.length < MIN_PARAGRAPH_WORDS) continue;
    const sentences = splitSentences(text);
    const lix = lixScore(
      words.length,
      sentences.length,
      words.filter(isLongWord).length
    );
    if (lix === null) continue;
    spans.push({
      start: block.start,
      end: block.end,
      text: text.trim().replace(/\s+/g, " "),
      words: words.length,
      lix
    });
  }
  return spans.sort((a, b) => b.lix - a.lix).slice(0, count);
}
function analyzeMarkdown(markdown, options) {
  var _a;
  const strip = {
    includeTables: options.includeTables === true,
    includeCode: options.includeCode === true
  };
  const clean = stripMarkdown(markdown, strip);
  const words = extractWords(clean);
  const sentences = splitSentences(clean);
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const longWords = words.filter(isLongWord).length;
  const characters = clean.replace(/\s/g, "").length;
  const paragraphs = clean.split(/\n\s*\n/).filter((block) => extractWords(block).length > 0).length;
  const language = options.language === "auto" ? detectLanguage(words) : options.language;
  const scorable = wordCount >= options.minWords;
  const lix = scorable ? lixScore(wordCount, sentenceCount, longWords) : null;
  let flesch = null;
  const definition = language === "unknown" ? void 0 : LANGUAGE_BY_CODE.get(language);
  if (scorable && definition !== void 0) {
    const wps = wordCount / Math.max(1, sentenceCount);
    const spw = averageSyllablesPerWord(words, definition.countSyllables);
    const score = fleschScore(definition.flesch, wps, spw);
    flesch = {
      name: definition.flesch.name,
      score,
      label: fleschLabel(score)
    };
  }
  const topCount = (_a = options.topSentenceCount) != null ? _a : DEFAULT_TOP_SENTENCES;
  const topSentences = [...sentences].sort((a, b) => b.words - a.words).slice(0, topCount);
  return {
    words: wordCount,
    sentences: sentenceCount,
    paragraphs,
    characters,
    longWords,
    longWordRatio: wordCount === 0 ? 0 : longWords / wordCount,
    avgWordsPerSentence: wordCount === 0 ? 0 : wordCount / Math.max(1, sentenceCount),
    language,
    lix,
    band: lix === null ? null : lixBand(lix),
    cefr: lix === null ? null : cefrIndication(lix),
    flesch,
    readingMinutes: wordCount / Math.max(1, options.wordsPerMinute),
    topSentences,
    topParagraphs: topParagraphs(clean, topCount),
    onTarget: lix === null ? null : lix <= options.targetMaxLix,
    targetMaxLix: options.targetMaxLix,
    minWords: options.minWords,
    tablesIncluded: strip.includeTables === true
  };
}

// src/readability/aggregate.ts
function combineCounts(files, minWords, wordsPerMinute) {
  const words = files.reduce((sum, file) => sum + file.words, 0);
  const sentences = files.reduce((sum, file) => sum + file.sentences, 0);
  const longWords = files.reduce((sum, file) => sum + file.longWords, 0);
  const lix = words >= minWords ? lixScore(words, sentences, longWords) : null;
  const ceilings = new Set(files.map((file) => file.maxLix));
  const maxLix = ceilings.size === 1 ? files[0].maxLix : null;
  return {
    files: files.length,
    words,
    sentences,
    longWords,
    readingMinutes: words / Math.max(1, wordsPerMinute),
    lix,
    band: lix === null ? null : lixBand(lix),
    cefr: lix === null ? null : cefrIndication(lix),
    onTarget: lix === null || maxLix === null ? null : lix <= maxLix,
    maxLix
  };
}

// src/readability/target-profile.ts
var DIATAXIS_TARGETS = {
  tutorial: "b1",
  "how-to": "b2",
  howto: "b2",
  reference: "b2",
  explanation: "b2"
};
var FRONTMATTER_KEY = "readability-target";
var BAND_VALUES = new Set(Object.keys(TARGET_MAX_LIX));
function ruleTarget(rule) {
  return {
    maxLix: targetMaxLix(rule.band, rule.customMaxLix),
    band: rule.band
  };
}
function normalizeTag(tag) {
  return tag.replace(/^#/, "").toLowerCase();
}
function tagMatches(ruleTag, noteTag) {
  return noteTag === ruleTag || noteTag.startsWith(ruleTag + "/");
}
function normalizeFolder(pattern) {
  return pattern.replace(/^\/+/, "").replace(/\/+$/, "");
}
function folderMatches(folder, path) {
  return path.startsWith(folder + "/");
}
function parseFrontmatterTarget(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return { maxLix: value, band: "custom" };
  }
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (BAND_VALUES.has(text)) {
    const band = text;
    return { maxLix: TARGET_MAX_LIX[band], band };
  }
  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    return { maxLix: numeric, band: "custom" };
  }
  return null;
}
function resolveTarget(context, settings) {
  var _a, _b;
  const global = {
    maxLix: targetMaxLix(settings.globalBand, settings.globalCustomMaxLix),
    band: settings.globalBand,
    source: "global",
    detail: null
  };
  if (context === null) return global;
  const explicit = parseFrontmatterTarget((_a = context.frontmatter) == null ? void 0 : _a[FRONTMATTER_KEY]);
  if (explicit !== null) {
    return { ...explicit, source: "note", detail: FRONTMATTER_KEY };
  }
  if (settings.deriveFromDiataxis) {
    const diataxis = (_b = context.frontmatter) == null ? void 0 : _b["diataxis"];
    if (typeof diataxis === "string") {
      const band = DIATAXIS_TARGETS[diataxis.trim().toLowerCase()];
      if (band !== void 0) {
        return {
          maxLix: TARGET_MAX_LIX[band],
          band,
          source: "diataxis",
          detail: `diataxis: ${diataxis.trim().toLowerCase()}`
        };
      }
    }
  }
  const noteTags = context.tags.map(normalizeTag);
  for (const rule of settings.tagRules) {
    const ruleTag = normalizeTag(rule.pattern.trim());
    if (ruleTag === "") continue;
    if (noteTags.some((tag) => tagMatches(ruleTag, tag))) {
      return { ...ruleTarget(rule), source: "tag", detail: `#${ruleTag}` };
    }
  }
  let bestFolder = null;
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
      detail: `${bestFolder.folder}/`
    };
  }
  return global;
}

// src/editor-highlight.ts
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
var import_obsidian = require("obsidian");

// src/readability/highlight.ts
function longSentenceThreshold(maxLix) {
  return Math.max(8, Math.round(maxLix * 0.55));
}
function verySentenceThreshold(thresholdWords) {
  return Math.round(thresholdWords * 1.5);
}
function longSentenceRanges(markdown, thresholdWords, strip = {}) {
  const veryLong = verySentenceThreshold(thresholdWords);
  return splitSentences(stripMarkdown(markdown, strip)).filter((sentence) => sentence.words > thresholdWords).map((sentence) => ({
    start: sentence.start,
    end: sentence.end,
    tier: sentence.words > veryLong ? "very-long" : "long",
    words: sentence.words
  }));
}
function longWordRanges(markdown, strip = {}) {
  const clean = stripMarkdown(markdown, strip);
  const ranges = [];
  WORD_RE.lastIndex = 0;
  let match;
  while ((match = WORD_RE.exec(clean)) !== null) {
    if (isLongWord(match[0])) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return ranges;
}

// src/editor-highlight.ts
var REBUILD_DEBOUNCE_MS = 250;
var rebuildMarks = import_state.StateEffect.define();
var LONG_MARK = import_view.Decoration.mark({ class: "rc-long-sentence" });
var VERY_LONG_MARK = import_view.Decoration.mark({ class: "rc-long-sentence rc-very-long-sentence" });
var LONG_WORD_MARK = import_view.Decoration.mark({ class: "rc-long-word" });
function longSentenceExtension(plugin) {
  const threshold = (view) => {
    if (!plugin.settings.markingFollowsTarget) return plugin.settings.markingThreshold;
    const file = view.state.field(import_obsidian.editorInfoField).file;
    return longSentenceThreshold(plugin.resolveTargetFor(file).maxLix);
  };
  const build = (view) => {
    const doc = view.state.doc.toString();
    const file = view.state.field(import_obsidian.editorInfoField).file;
    const strip = { includeTables: plugin.includeTablesFor(file) };
    const clamp = (offset) => Math.min(offset, view.state.doc.length);
    const marks = [];
    if (plugin.settings.markLongSentences) {
      for (const range of longSentenceRanges(doc, threshold(view), strip)) {
        marks.push(
          (range.tier === "very-long" ? VERY_LONG_MARK : LONG_MARK).range(
            range.start,
            clamp(range.end)
          )
        );
      }
    }
    if (plugin.settings.markLongWords) {
      for (const range of longWordRanges(doc, strip)) {
        marks.push(LONG_WORD_MARK.range(range.start, clamp(range.end)));
      }
    }
    return import_view.Decoration.set(marks, true);
  };
  class LongSentenceMarks {
    constructor(view) {
      this.view = view;
      this.timer = null;
      this.decorations = build(view);
    }
    update(update) {
      const forced = update.transactions.some(
        (tr) => tr.effects.some((effect) => effect.is(rebuildMarks))
      );
      if (forced) {
        this.decorations = build(update.view);
        return;
      }
      if (update.docChanged) {
        this.decorations = this.decorations.map(update.changes);
        this.schedule();
      }
    }
    destroy() {
      if (this.timer !== null) window.clearTimeout(this.timer);
    }
    schedule() {
      if (this.timer !== null) window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => {
        this.timer = null;
        this.view.dispatch({ effects: rebuildMarks.of(null) });
      }, REBUILD_DEBOUNCE_MS);
    }
  }
  return import_view.ViewPlugin.fromClass(LongSentenceMarks, {
    decorations: (value) => value.decorations
  });
}

// src/format.ts
function formatTargetBand(target) {
  return target.band === "custom" ? `LIX \u2264 ${Math.round(target.maxLix)}` : `\u2248 ${target.band.toUpperCase()}`;
}
function formatTargetSource(target) {
  var _a, _b, _c;
  switch (target.source) {
    case "note":
      return "note front matter";
    case "diataxis":
      return (_a = target.detail) != null ? _a : "diataxis type";
    case "tag":
      return `tag ${(_b = target.detail) != null ? _b : ""}`.trim();
    case "folder":
      return `folder ${(_c = target.detail) != null ? _c : ""}`.trim();
    case "global":
      return "global setting";
  }
}
function targetSourceSuffix(target) {
  if (target === null || target.source === "global") return "";
  return ` \xB7 ${formatTargetSource(target)}`;
}
function formatLixValue(lix) {
  return String(Math.round(lix));
}
function formatReadingTime(minutes) {
  if (minutes < 1) return "<1 min";
  return `~${Math.round(minutes)} min`;
}
function formatPercent(ratio) {
  return `${Math.round(ratio * 100)}%`;
}
var ON_TARGET = "\u2713";
var OFF_TARGET = "\u25B2";
function formatStatusBarText(report, selection, segments, target = null) {
  if (selection !== null) {
    const parts2 = [`${selection.words} w selected`];
    if (selection.lix !== null && segments.lix) {
      parts2.push(`LIX ${formatLixValue(selection.lix)}`);
    }
    return parts2.join(" \xB7 ");
  }
  if (report === null) return "";
  const parts = [];
  if (segments.lix) {
    parts.push(report.lix === null ? "LIX \u2013" : `LIX ${formatLixValue(report.lix)}`);
  }
  if (segments.band && report.cefr !== null) {
    parts.push(report.cefr);
  }
  if (segments.target && report.onTarget !== null) {
    const mark = report.onTarget ? ON_TARGET : OFF_TARGET;
    parts.push(
      target !== null && target.source !== "global" ? `${mark} ${formatTargetBand(target)}` : mark
    );
  }
  if (segments.words) {
    parts.push(`${report.words} w`);
  }
  if (segments.readingTime && report.words > 0) {
    parts.push(formatReadingTime(report.readingMinutes));
  }
  return parts.join(" \xB7 ");
}
function formatNoticeText(report, title, targetInfo = null) {
  var _a, _b;
  const lines = [title];
  if (report.lix === null) {
    lines.push(
      `Too short for a stable score (min ${report.minWords} words; found ${report.words}).`
    );
  } else {
    const target = report.onTarget ? `on target (max ${report.targetMaxLix}${targetSourceSuffix(targetInfo)})` : `above target (max ${report.targetMaxLix}${targetSourceSuffix(targetInfo)})`;
    lines.push(
      `LIX ${formatLixValue(report.lix)} (${(_a = report.band) != null ? _a : ""}) \xB7 ${(_b = report.cefr) != null ? _b : ""} \xB7 ${target}`
    );
  }
  lines.push(
    `${report.words} words \xB7 ${report.sentences} sentences \xB7 ${report.avgWordsPerSentence.toFixed(1)} words/sentence`
  );
  lines.push(
    `${formatPercent(report.longWordRatio)} long words \xB7 ${formatReadingTime(report.readingMinutes)} read`
  );
  if (report.flesch !== null) {
    lines.push(
      `${report.flesch.name} ${Math.round(report.flesch.score)} (${report.flesch.label})`
    );
  }
  return lines.join("\n");
}
function formatCalloutReport(report, dateIso, targetInfo = null) {
  var _a, _b;
  const lines = [`> [!info] Readability \u2014 ${dateIso}`];
  if (report.lix === null) {
    lines.push(
      `> Too short for a stable score (min ${report.minWords} words; found ${report.words}).`
    );
  } else {
    const target = report.onTarget ? `on target (max ${report.targetMaxLix}${targetSourceSuffix(targetInfo)})` : `above target (max ${report.targetMaxLix}${targetSourceSuffix(targetInfo)})`;
    lines.push(
      `> **LIX ${formatLixValue(report.lix)}** (${(_a = report.band) != null ? _a : ""}) \xB7 ${(_b = report.cefr) != null ? _b : ""} \xB7 ${target}`
    );
  }
  lines.push(
    `> ${report.words} words \xB7 ${report.sentences} sentences \xB7 ${report.avgWordsPerSentence.toFixed(1)} words/sentence \xB7 ${formatPercent(report.longWordRatio)} long words \xB7 ${formatReadingTime(report.readingMinutes)} read`
  );
  if (report.flesch !== null) {
    lines.push(
      `> ${report.flesch.name} ${Math.round(report.flesch.score)} (${report.flesch.label})`
    );
  }
  return lines.join("\n") + "\n";
}

// src/settings.ts
var import_obsidian2 = require("obsidian");
var DEFAULT_SETTINGS = {
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
  includeTables: false,
  minWords: 40,
  wordsPerMinute: 225,
  topSentencesShown: 5,
  sentenceMinWords: 0,
  showStatusBar: true,
  statusBar: {
    lix: true,
    band: true,
    target: true,
    words: true,
    readingTime: false
  }
};
var ReadabilityCompassSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian2.Setting(containerEl).setName("Target").setHeading();
    new import_obsidian2.Setting(containerEl).setName("Target audience").setDesc(
      "The reading level your notes should stay at. CEFR bands are translated to a LIX ceiling."
    ).addDropdown(
      (dropdown) => dropdown.addOption("b1", `\u2248 B1 \u2014 plain (LIX \u2264 ${TARGET_MAX_LIX.b1})`).addOption("b2", `\u2248 B2 \u2014 clear (LIX \u2264 ${TARGET_MAX_LIX.b2})`).addOption("c1", `\u2248 C1 \u2014 advanced (LIX \u2264 ${TARGET_MAX_LIX.c1})`).addOption("custom", "Custom LIX ceiling").setValue(this.plugin.settings.targetBand).onChange(async (value) => {
        this.plugin.settings.targetBand = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.targetBand === "custom") {
      this.addLabelledSlider(
        new import_obsidian2.Setting(containerEl).setName("Custom LIX ceiling").setDesc("Scores above this value count as off target."),
        { min: 20, max: 70, step: 1 },
        () => this.plugin.settings.customMaxLix,
        (value) => `LIX ${value}`,
        async (value) => {
          this.plugin.settings.customMaxLix = value;
          await this.plugin.saveSettings();
        }
      );
    }
    new import_obsidian2.Setting(containerEl).setName("Target profiles").setHeading();
    new import_obsidian2.Setting(containerEl).setName("Derive target from diataxis type").setDesc(
      "Notes with a 'diataxis' front matter key get a matching target: tutorial \u2248 B1; how-to, reference and explanation \u2248 B2. A 'readability-target' key always wins."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.deriveFromDiataxis).onChange(async (value) => {
        this.plugin.settings.deriveFromDiataxis = value;
        await this.plugin.saveSettings();
      })
    );
    this.renderRuleList(
      containerEl,
      this.plugin.settings.tagRules,
      "Tag rules",
      "Notes carrying the tag (or a nested tag under it) get this target. The first matching rule wins. Tag rules beat folder rules.",
      "Add tag rule",
      "#blog"
    );
    this.renderRuleList(
      containerEl,
      this.plugin.settings.folderRules,
      "Folder rules",
      "Notes inside the folder get this target. The most specific (longest) matching folder wins.",
      "Add folder rule",
      "docs/tutorials"
    );
    new import_obsidian2.Setting(containerEl).setName("Measurement").setHeading();
    new import_obsidian2.Setting(containerEl).setName("Language").setDesc(
      "Picks the Flesch variant for that language (e.g. Flesch-Douma for Dutch). LIX itself is language-independent. Auto-detect falls back to LIX only when unsure."
    ).addDropdown((dropdown) => {
      dropdown.addOption("auto", "Auto-detect");
      for (const language of LANGUAGES) {
        dropdown.addOption(language.code, language.label);
      }
      dropdown.setValue(this.plugin.settings.language).onChange(async (value) => {
        this.plugin.settings.language = value;
        await this.plugin.saveSettings();
      });
    });
    this.addLabelledSlider(
      new import_obsidian2.Setting(containerEl).setName("Minimum words for a score").setDesc("Below this word count LIX is too erratic and is hidden."),
      { min: 10, max: 100, step: 5 },
      () => this.plugin.settings.minWords,
      (value) => `${value} words`,
      async (value) => {
        this.plugin.settings.minWords = value;
        await this.plugin.saveSettings();
      }
    );
    this.addLabelledSlider(
      new import_obsidian2.Setting(containerEl).setName("Longest sentences and hardest paragraphs shown").setDesc(
        "How many entries the panel lists at first; Show more reveals the rest in steps."
      ),
      { min: 3, max: 25, step: 1 },
      () => this.plugin.settings.topSentencesShown,
      (value) => `top ${value}`,
      async (value) => {
        this.plugin.settings.topSentencesShown = value;
        await this.plugin.saveSettings();
      }
    );
    this.addLabelledSlider(
      new import_obsidian2.Setting(containerEl).setName("Only list sentences above").setDesc(
        "Sentences at or below this word count stay out of the longest-sentences list. 0 lists regardless of length."
      ),
      { min: 0, max: 40, step: 1 },
      () => this.plugin.settings.sentenceMinWords,
      (value) => value === 0 ? "off" : `${value} words`,
      async (value) => {
        this.plugin.settings.sentenceMinWords = value;
        await this.plugin.saveSettings();
      }
    );
    new import_obsidian2.Setting(containerEl).setName("Include table text").setDesc(
      "Count the text inside Markdown tables \u2014 for notes that are tables, like question banks. Per note override: 'readability-tables: true' (or false) in the front matter. A manual selection always includes tables and code."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.includeTables).onChange(async (value) => {
        this.plugin.settings.includeTables = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Mark long sentences in the editor").setDesc(
      "Give sentences above the threshold a subtle background while you write. Never marks code, front matter or tables."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.markLongSentences).onChange(async (value) => {
        this.plugin.settings.markLongSentences = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.markLongSentences) {
      new import_obsidian2.Setting(containerEl).setName("Marking threshold follows the target").setDesc(
        "Derive the words-per-sentence threshold from the active target profile (\u2248 B1 \u21D2 22, \u2248 B2 \u21D2 25, \u2248 C1 \u21D2 30). Turn off for a fixed threshold."
      ).addToggle(
        (toggle) => toggle.setValue(this.plugin.settings.markingFollowsTarget).onChange(async (value) => {
          this.plugin.settings.markingFollowsTarget = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );
      if (!this.plugin.settings.markingFollowsTarget) {
        this.addLabelledSlider(
          new import_obsidian2.Setting(containerEl).setName("Marking threshold (words per sentence)").setDesc("Sentences above this word count get marked."),
          { min: 10, max: 60, step: 1 },
          () => this.plugin.settings.markingThreshold,
          (value) => `${value} words`,
          async (value) => {
            this.plugin.settings.markingThreshold = value;
            await this.plugin.saveSettings();
          }
        );
      }
    }
    new import_obsidian2.Setting(containerEl).setName("Mark long words in the editor").setDesc(
      "Underline every long word (> 6 letters) \u2014 the other LIX ingredient. Shows why keyword-dense text scores high even without long sentences."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.markLongWords).onChange(async (value) => {
        this.plugin.settings.markLongWords = value;
        await this.plugin.saveSettings();
      })
    );
    this.addLabelledSlider(
      new import_obsidian2.Setting(containerEl).setName("Reading speed").setDesc("Words per minute, used for the reading time estimate."),
      { min: 100, max: 400, step: 25 },
      () => this.plugin.settings.wordsPerMinute,
      (value) => `${value} wpm`,
      async (value) => {
        this.plugin.settings.wordsPerMinute = value;
        await this.plugin.saveSettings();
      }
    );
    new import_obsidian2.Setting(containerEl).setName("Status bar").setHeading();
    new import_obsidian2.Setting(containerEl).setName("Show in status bar").setDesc("The always-on indicator. Click it to open the panel.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showStatusBar).onChange(async (value) => {
        this.plugin.settings.showStatusBar = value;
        await this.plugin.saveSettings();
      })
    );
    const segments = [
      { key: "lix", name: "LIX score", desc: "The primary readability score." },
      { key: "band", name: "CEFR indication", desc: "Indicative audience band (\u2248 B1/B2/C1/C2)." },
      { key: "target", name: "Target check", desc: "\u2713 on target, \u25B2 above target." },
      { key: "words", name: "Word count", desc: "Words in the note (or selection)." },
      { key: "readingTime", name: "Reading time", desc: "Estimated reading time." }
    ];
    for (const segment of segments) {
      new import_obsidian2.Setting(containerEl).setName(segment.name).setDesc(segment.desc).addToggle(
        (toggle) => toggle.setValue(this.plugin.settings.statusBar[segment.key]).onChange(async (value) => {
          this.plugin.settings.statusBar[segment.key] = value;
          await this.plugin.saveSettings();
        })
      );
    }
  }
  /**
   * Slider with an always-visible value label (owner-test finding, BC_E1_S8:
   * a bare slider gives no number to reason with).
   */
  addLabelledSlider(setting, limits, getValue, format, onChange) {
    const label = createSpan({ cls: "rc-slider-value", text: format(getValue()) });
    setting.addSlider(
      (slider) => slider.setLimits(limits.min, limits.max, limits.step).setValue(getValue()).onChange(async (value) => {
        label.setText(format(value));
        await onChange(value);
      })
    );
    setting.controlEl.prepend(label);
  }
  /** One editable row per rule (pattern + band + delete) plus an add button. */
  renderRuleList(containerEl, rules, name, desc, addLabel, placeholder) {
    new import_obsidian2.Setting(containerEl).setName(name).setDesc(desc).addButton(
      (button) => button.setButtonText(addLabel).onClick(async () => {
        rules.push({ pattern: "", band: "b2", customMaxLix: 45 });
        await this.plugin.saveSettings();
        this.display();
      })
    );
    for (const rule of rules) {
      const row = new import_obsidian2.Setting(containerEl);
      row.setClass("rc-rule-row");
      row.addText(
        (text) => text.setPlaceholder(placeholder).setValue(rule.pattern).onChange(async (value) => {
          rule.pattern = value;
          await this.plugin.saveSettings();
        })
      );
      row.addDropdown(
        (dropdown) => dropdown.addOption("b1", "\u2248 B1").addOption("b2", "\u2248 B2").addOption("c1", "\u2248 C1").addOption("custom", "Custom").setValue(rule.band).onChange(async (value) => {
          rule.band = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );
      if (rule.band === "custom") {
        row.addText((text) => {
          text.inputEl.type = "number";
          text.inputEl.addClass("rc-rule-lix");
          text.setPlaceholder("45").setValue(String(rule.customMaxLix)).onChange(async (value) => {
            const numeric = Number(value);
            if (Number.isFinite(numeric) && numeric > 0) {
              rule.customMaxLix = numeric;
              await this.plugin.saveSettings();
            }
          });
        });
      }
      row.addExtraButton(
        (button) => button.setIcon("trash").setTooltip("Remove rule").onClick(async () => {
          rules.splice(rules.indexOf(rule), 1);
          await this.plugin.saveSettings();
          this.display();
        })
      );
    }
  }
};

// src/panel.ts
var import_obsidian3 = require("obsidian");
var VIEW_TYPE_READABILITY = "readability-compass-panel";
var SHOW_MORE_STEP = 10;
var LANGUAGE_LABEL = {
  unknown: "language unknown \u2014 LIX only"
};
for (const language of LANGUAGES) {
  LANGUAGE_LABEL[language.code] = language.label;
}
var ReadabilityPanelView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    /** Extra list entries revealed via "Show more"; resets when the subject changes. */
    this.extraEntries = 0;
    this.renderedSubject = null;
    /** Last render inputs, so "Show more" can re-render in place. */
    this.lastRender = null;
  }
  getViewType() {
    return VIEW_TYPE_READABILITY;
  }
  getDisplayText() {
    return "Readability";
  }
  getIcon() {
    return "gauge";
  }
  onOpen() {
    this.plugin.refreshUi();
    return Promise.resolve();
  }
  listBudget() {
    return this.plugin.settings.topSentencesShown + this.extraEntries;
  }
  resetForSubject(subject) {
    if (this.renderedSubject !== subject) {
      this.renderedSubject = subject;
      this.extraEntries = 0;
    }
  }
  // --- Single note ----------------------------------------------------------
  render(report, fileName, target = null) {
    var _a, _b, _c;
    this.resetForSubject(`file:${fileName != null ? fileName : ""}`);
    this.lastRender = () => this.render(report, fileName, target);
    const root = this.contentEl;
    root.empty();
    root.addClass("rc-panel");
    if (report === null || fileName === null) {
      root.createEl("p", {
        text: "No active note. Open a Markdown note to see its readability.",
        cls: "rc-empty"
      });
      return;
    }
    root.createDiv({ text: fileName, cls: "rc-file" });
    const card = root.createDiv({ cls: "rc-card" });
    if (report.lix === null) {
      card.createDiv({ text: "\u2013", cls: "rc-score" });
      card.createDiv({
        text: `Add more text for a stable score (min ${report.minWords} words; found ${report.words}).`,
        cls: "rc-hint"
      });
    } else {
      card.createDiv({ text: formatLixValue(report.lix), cls: "rc-score" });
      card.createDiv({ text: "LIX", cls: "rc-score-label" });
      card.createDiv({
        text: `${(_a = report.band) != null ? _a : ""} \xB7 ${(_b = report.cefr) != null ? _b : ""}`,
        cls: "rc-band"
      });
      const onTarget = report.onTarget === true;
      card.createDiv({
        text: onTarget ? `\u2713 on target (max ${report.targetMaxLix})` : `\u25B2 above target (max ${report.targetMaxLix})`,
        cls: onTarget ? "rc-target rc-target-ok" : "rc-target rc-target-off"
      });
    }
    if (target !== null) {
      card.createDiv({
        text: `Target ${formatTargetBand(target)} \xB7 from ${formatTargetSource(target)}`,
        cls: "rc-target-source"
      });
    }
    const secondary = root.createDiv({ cls: "rc-secondary" });
    if (report.flesch !== null) {
      secondary.createSpan({
        text: `${report.flesch.name} ${Math.round(report.flesch.score)} (${report.flesch.label})`
      });
      secondary.createSpan({ text: " \xB7 " });
    }
    secondary.createSpan({
      text: (_c = LANGUAGE_LABEL[report.language]) != null ? _c : report.language
    });
    const counts = root.createDiv({ cls: "rc-counts" });
    const row = (label, value) => {
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
    this.renderSentences(
      root,
      report.topSentences,
      (span) => this.plugin.jumpToSpan(span),
      null
    );
    root.createEl("p", {
      text: report.tablesIncluded ? "Measured on running text incl. tables \u2014 front matter, code, links and URLs are excluded." : "Measured on running text \u2014 front matter, code, tables, links and URLs are excluded.",
      cls: "rc-footnote"
    });
  }
  // --- Explorer selection (BC_E1_S10) ----------------------------------------
  renderMulti(multi) {
    var _a, _b;
    this.resetForSubject(`multi:${multi.rows.map((r) => r.file.path).join("|")}`);
    this.lastRender = () => this.renderMulti(multi);
    const root = this.contentEl;
    root.empty();
    root.addClass("rc-panel");
    const header = root.createDiv({ cls: "rc-file rc-multi-header" });
    header.createSpan({ text: `${multi.combined.files} notes` });
    const back = header.createEl("button", {
      text: "Back to current note",
      cls: "rc-back-button"
    });
    this.registerDomEvent(back, "click", () => this.plugin.clearMultiReport());
    const combined = multi.combined;
    const card = root.createDiv({ cls: "rc-card" });
    if (combined.lix === null) {
      card.createDiv({ text: "\u2013", cls: "rc-score" });
      card.createDiv({
        text: "Too little text in this selection for a stable score.",
        cls: "rc-hint"
      });
    } else {
      card.createDiv({ text: formatLixValue(combined.lix), cls: "rc-score" });
      card.createDiv({ text: "LIX (combined)", cls: "rc-score-label" });
      card.createDiv({
        text: `${(_a = combined.band) != null ? _a : ""} \xB7 ${(_b = combined.cefr) != null ? _b : ""}`,
        cls: "rc-band"
      });
      if (combined.onTarget !== null && combined.maxLix !== null) {
        const onTarget = combined.onTarget;
        card.createDiv({
          text: onTarget ? `\u2713 on target (max ${combined.maxLix})` : `\u25B2 above target (max ${combined.maxLix})`,
          cls: onTarget ? "rc-target rc-target-ok" : "rc-target rc-target-off"
        });
      } else {
        card.createDiv({
          text: "Notes have different targets \u2014 see the per-note marks below.",
          cls: "rc-target-source"
        });
      }
    }
    const counts = root.createDiv({ cls: "rc-counts" });
    const row = (label, value) => {
      const el = counts.createDiv({ cls: "rc-count-row" });
      el.createSpan({ text: label, cls: "rc-count-label" });
      el.createSpan({ text: value, cls: "rc-count-value" });
    };
    row("Words", String(combined.words));
    row("Sentences", String(combined.sentences));
    row("Reading time", formatReadingTime(combined.readingMinutes));
    root.createDiv({ text: "Notes (hardest first)", cls: "rc-section-title" });
    const list = root.createDiv({ cls: "rc-multi-files" });
    for (const entry of multi.rows) {
      const item = list.createDiv({ cls: "rc-count-row rc-multi-file" });
      item.createSpan({ text: entry.file.basename, cls: "rc-count-label" });
      const mark = entry.onTarget === null ? "" : entry.onTarget ? " \u2713" : " \u25B2";
      item.createSpan({
        text: entry.lix === null ? `${entry.words} w \xB7 \u2013` : `${entry.words} w \xB7 LIX ${formatLixValue(entry.lix)}${mark}`,
        cls: "rc-count-value"
      });
      item.setAttribute("title", "Click to open this note");
      this.registerDomEvent(item, "click", () => {
        void this.plugin.jumpToFileSpan(entry.file, { start: 0, end: 0 });
      });
    }
    this.renderSentences(
      root,
      multi.sentences.map((entry) => entry.span),
      (_span, index) => {
        const entry = this.visibleMultiSentences(multi)[index];
        void this.plugin.jumpToFileSpan(entry.file, entry.span);
      },
      (index) => {
        var _a2, _b2;
        return (_b2 = (_a2 = this.visibleMultiSentences(multi)[index]) == null ? void 0 : _a2.file.basename) != null ? _b2 : null;
      }
    );
    root.createEl("p", {
      text: "Combined over the selected notes; per-note targets apply to the marks.",
      cls: "rc-footnote"
    });
  }
  visibleMultiSentences(multi) {
    const minWords = this.plugin.settings.sentenceMinWords;
    return multi.sentences.filter((entry) => entry.span.words > Math.max(1, minWords));
  }
  // --- Shared list sections ---------------------------------------------------
  renderParagraphs(root, paragraphs) {
    if (paragraphs.length === 0) return;
    const budget = this.listBudget();
    root.createDiv({ text: "Hardest paragraphs", cls: "rc-section-title" });
    const list = root.createEl("ol", { cls: "rc-sentences" });
    for (const paragraph of paragraphs.slice(0, budget)) {
      const item = list.createEl("li", { cls: "rc-sentence" });
      item.createSpan({
        text: `LIX ${formatLixValue(paragraph.lix)} \xB7 ${paragraph.words} w \xB7 `,
        cls: "rc-sentence-words"
      });
      item.createSpan({ text: truncate(paragraph.text, 140) });
      item.setAttribute("title", "Click to jump to this paragraph");
      this.registerDomEvent(item, "click", () => {
        this.plugin.jumpToSpan(paragraph);
      });
    }
    this.renderShowMore(root, paragraphs.length - budget);
  }
  renderSentences(root, sentences, onClick, fileLabel) {
    const minWords = Math.max(1, this.plugin.settings.sentenceMinWords);
    const offenders = sentences.filter((span) => span.words > minWords);
    if (offenders.length === 0) return;
    const budget = this.listBudget();
    root.createDiv({ text: "Longest sentences", cls: "rc-section-title" });
    const list = root.createEl("ol", { cls: "rc-sentences" });
    offenders.slice(0, budget).forEach((sentence, index) => {
      const item = list.createEl("li", { cls: "rc-sentence" });
      const label = fileLabel == null ? void 0 : fileLabel(index);
      item.createSpan({
        text: `${sentence.words} w \xB7 ${label !== null && label !== void 0 ? `${label} \xB7 ` : ""}`,
        cls: "rc-sentence-words"
      });
      item.createSpan({ text: truncate(sentence.text, 140) });
      item.setAttribute("title", "Click to jump to this sentence");
      this.registerDomEvent(item, "click", () => {
        onClick(sentence, index);
      });
    });
    this.renderShowMore(root, offenders.length - budget);
  }
  renderShowMore(root, hidden) {
    if (hidden <= 0) return;
    const button = root.createEl("button", {
      text: `Show more (${hidden} hidden)`,
      cls: "rc-show-more"
    });
    this.registerDomEvent(button, "click", () => {
      var _a;
      this.extraEntries += SHOW_MORE_STEP;
      (_a = this.lastRender) == null ? void 0 : _a.call(this);
    });
  }
};
function truncate(text, max) {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "\u2026";
}

// src/main.ts
var TOP_LIST_CAP = 50;
var ReadabilityCompassPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.statusBarEl = null;
    /** Last markdown view with content, so the panel keeps working when focused. */
    this.lastMarkdownView = null;
    /** Mutable container for registerEditorExtension; contents swap on settings changes. */
    this.editorExtensions = [];
    /** When set, the panel shows this explorer selection instead of the active note. */
    this.multiReport = null;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(
      VIEW_TYPE_READABILITY,
      (leaf) => new ReadabilityPanelView(leaf, this)
    );
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("rc-status", "mod-clickable");
    this.statusBarEl.setAttribute("aria-label", "Readability \u2014 click for details");
    this.registerDomEvent(this.statusBarEl, "click", () => {
      void this.activatePanel();
    });
    this.addSettingTab(new ReadabilityCompassSettingTab(this.app, this));
    this.addCommands();
    this.registerEditorExtension(this.editorExtensions);
    this.syncEditorExtensions();
    this.registerEvent(
      this.app.workspace.on("files-menu", (menu, files) => {
        const notes = this.markdownFiles(files);
        if (notes.length < 2) return;
        menu.addItem(
          (item) => item.setTitle(`Score readability of ${notes.length} notes`).setIcon("gauge").onClick(() => void this.scoreFiles(notes))
        );
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian4.TFolder)) return;
        const notes = this.markdownFiles([file]);
        if (notes.length === 0) return;
        menu.addItem(
          (item) => item.setTitle(`Score readability of folder (${notes.length} notes)`).setIcon("gauge").onClick(() => void this.scoreFiles(notes))
        );
      })
    );
    const refreshSoon = (0, import_obsidian4.debounce)(() => this.refreshUi(), 400, true);
    const refreshStatusSoon = (0, import_obsidian4.debounce)(() => this.refreshStatusBar(), 200, true);
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.refreshUi())
    );
    this.registerEvent(this.app.workspace.on("editor-change", refreshSoon));
    this.registerEvent(this.app.metadataCache.on("changed", refreshSoon));
    this.registerDomEvent(document, "selectionchange", refreshStatusSoon);
    this.app.workspace.onLayoutReady(() => this.refreshUi());
  }
  async loadSettings() {
    const stored = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);
    this.settings.statusBar = Object.assign(
      {},
      DEFAULT_SETTINGS.statusBar,
      stored == null ? void 0 : stored.statusBar
    );
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.syncEditorExtensions();
    this.refreshUi();
  }
  /** (Un)install the editor marking; updateOptions rebuilds the editors. */
  syncEditorExtensions() {
    this.editorExtensions.length = 0;
    if (this.settings.markLongSentences || this.settings.markLongWords) {
      this.editorExtensions.push(longSentenceExtension(this));
    }
    this.app.workspace.updateOptions();
  }
  // --- Analysis -----------------------------------------------------------
  /** Resolve which target applies to a file (front matter > diataxis > tag > folder > global). */
  resolveTargetFor(file) {
    var _a, _b;
    let context = null;
    if (file !== null) {
      const cache = this.app.metadataCache.getFileCache(file);
      context = {
        path: file.path,
        tags: cache === null ? [] : (_a = (0, import_obsidian4.getAllTags)(cache)) != null ? _a : [],
        frontmatter: (_b = cache == null ? void 0 : cache.frontmatter) != null ? _b : null
      };
    }
    return resolveTarget(context, {
      deriveFromDiataxis: this.settings.deriveFromDiataxis,
      tagRules: this.settings.tagRules,
      folderRules: this.settings.folderRules,
      globalBand: this.settings.targetBand,
      globalCustomMaxLix: this.settings.customMaxLix
    });
  }
  /** Note-level table inclusion: front matter `readability-tables` wins over the setting. */
  includeTablesFor(file) {
    var _a;
    if (file !== null) {
      const frontmatter = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      const value = frontmatter == null ? void 0 : frontmatter["readability-tables"];
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const text = value.trim().toLowerCase();
        if (text === "true" || text === "include") return true;
        if (text === "false" || text === "exclude") return false;
      }
    }
    return this.settings.includeTables;
  }
  analyzeOptions(target, file) {
    return {
      language: this.settings.language,
      minWords: this.settings.minWords,
      wordsPerMinute: this.settings.wordsPerMinute,
      targetMaxLix: target.maxLix,
      includeTables: this.includeTablesFor(file),
      topSentenceCount: TOP_LIST_CAP
    };
  }
  /** A manual selection means "measure this" — tables and code included. */
  selectionAnalyzeOptions(target) {
    return {
      language: this.settings.language,
      minWords: this.settings.minWords,
      wordsPerMinute: this.settings.wordsPerMinute,
      targetMaxLix: target.maxLix,
      includeTables: true,
      includeCode: true
    };
  }
  activeMarkdownView() {
    const active = this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView);
    if (active !== null) {
      this.lastMarkdownView = active;
      return active;
    }
    if (this.lastMarkdownView !== null && this.lastMarkdownView.file !== null) {
      return this.lastMarkdownView;
    }
    this.lastMarkdownView = null;
    return null;
  }
  analyzeView(view, target) {
    return analyzeMarkdown(
      view.editor.getValue(),
      this.analyzeOptions(target, view.file)
    );
  }
  /**
   * The selected text. Live Preview renders tables as widgets whose cells are
   * separate sub-editors: a selection across cells reaches the editor as only
   * the first cell. The visible DOM selection inside this view does carry the
   * whole selection, so prefer it when it is the richer of the two
   * (owner-test finding, BC_E1_S9).
   */
  selectedText(view) {
    const editorSelection = view.editor.somethingSelected() ? view.editor.getSelection() : "";
    const domSelection = view.containerEl.ownerDocument.getSelection();
    if (domSelection !== null && !domSelection.isCollapsed && view.containerEl.contains(domSelection.anchorNode)) {
      const domText = domSelection.toString();
      if (domText.length > editorSelection.length) return domText;
    }
    return editorSelection;
  }
  selectionStats(view, target) {
    if (view === null) return null;
    const text = this.selectedText(view);
    if (text.trim() === "") return null;
    const report = analyzeMarkdown(text, this.selectionAnalyzeOptions(target));
    if (report.words === 0) return null;
    return { words: report.words, lix: report.lix };
  }
  // --- UI refresh ---------------------------------------------------------
  refreshUi() {
    var _a;
    const view = this.activeMarkdownView();
    const target = this.resolveTargetFor((_a = view == null ? void 0 : view.file) != null ? _a : null);
    const report = view === null ? null : this.analyzeView(view, target);
    this.renderStatusBar(view, report, target);
    this.renderPanels(view, report, target);
  }
  refreshStatusBar() {
    var _a;
    const view = this.activeMarkdownView();
    const target = this.resolveTargetFor((_a = view == null ? void 0 : view.file) != null ? _a : null);
    this.renderStatusBar(
      view,
      view === null ? null : this.analyzeView(view, target),
      target
    );
  }
  renderStatusBar(view, report, target) {
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
      target
    );
    this.statusBarEl.setText(text);
    this.statusBarEl.setAttribute(
      "aria-label",
      `Readability \u2014 target ${formatTargetBand(target)} (LIX \u2264 ${Math.round(
        target.maxLix
      )}) from ${formatTargetSource(target)} \u2014 click for details`
    );
    if (text === "") {
      this.statusBarEl.hide();
    } else {
      this.statusBarEl.show();
    }
  }
  renderPanels(view, report, target) {
    var _a, _b;
    const fileName = (_b = (_a = view == null ? void 0 : view.file) == null ? void 0 : _a.basename) != null ? _b : null;
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_READABILITY)) {
      if (leaf.view instanceof ReadabilityPanelView) {
        if (this.multiReport !== null) {
          leaf.view.renderMulti(this.multiReport);
        } else {
          leaf.view.render(report, fileName, target);
        }
      }
    }
  }
  // --- Multi-note scoring (BC_E1_S10) ---------------------------------------
  /** Markdown files in the selection, folders expanded recursively. */
  markdownFiles(selection) {
    const notes = [];
    const walk = (item) => {
      if (item instanceof import_obsidian4.TFile) {
        if (item.extension === "md") notes.push(item);
      } else if (item instanceof import_obsidian4.TFolder) {
        for (const child of item.children) walk(child);
      }
    };
    for (const item of selection) walk(item);
    return notes;
  }
  async scoreFiles(files) {
    const rows = [];
    const sentences = [];
    const counts = [];
    for (const file of files) {
      const content = await this.app.vault.cachedRead(file);
      const target = this.resolveTargetFor(file);
      const report = analyzeMarkdown(content, {
        ...this.analyzeOptions(target, file),
        topSentenceCount: TOP_LIST_CAP
      });
      rows.push({
        file,
        words: report.words,
        lix: report.lix,
        onTarget: report.onTarget
      });
      counts.push({
        words: report.words,
        sentences: report.sentences,
        longWords: report.longWords,
        maxLix: target.maxLix
      });
      for (const span of report.topSentences) sentences.push({ file, span });
    }
    rows.sort((a, b) => {
      var _a, _b;
      return ((_a = b.lix) != null ? _a : 0) - ((_b = a.lix) != null ? _b : 0);
    });
    sentences.sort((a, b) => b.span.words - a.span.words);
    this.multiReport = {
      combined: combineCounts(
        counts,
        this.settings.minWords,
        this.settings.wordsPerMinute
      ),
      rows,
      sentences: sentences.slice(0, TOP_LIST_CAP)
    };
    await this.activatePanel();
  }
  /** Leave the explorer-selection view and follow the active note again. */
  clearMultiReport() {
    this.multiReport = null;
    this.refreshUi();
  }
  /** Open a note (reusing its leaf when already open) and select a span. */
  async jumpToFileSpan(file, span) {
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
    const view = leaf.view instanceof import_obsidian4.MarkdownView ? leaf.view : null;
    if (view !== null) this.selectSpanIn(view, span);
  }
  // --- Panel handling -----------------------------------------------------
  async activatePanel() {
    var _a;
    const { workspace } = this.app;
    let leaf = (_a = workspace.getLeavesOfType(VIEW_TYPE_READABILITY)[0]) != null ? _a : null;
    if (leaf === null) {
      leaf = workspace.getRightLeaf(false);
      if (leaf === null) return;
      await leaf.setViewState({ type: VIEW_TYPE_READABILITY, active: true });
    }
    await workspace.revealLeaf(leaf);
    this.refreshUi();
  }
  /** Jump the last active editor to a span (offsets are document offsets). */
  jumpToSpan(span) {
    const view = this.activeMarkdownView();
    if (view === null) return;
    this.selectSpanIn(view, span);
  }
  selectSpanIn(view, span) {
    const editor = view.editor;
    const length = editor.getValue().length;
    const from = editor.offsetToPos(Math.min(span.start, length));
    const to = editor.offsetToPos(Math.min(span.end, length));
    editor.setSelection(from, to);
    editor.scrollIntoView({ from, to }, true);
    this.app.workspace.setActiveLeaf(view.leaf, { focus: true });
  }
  // --- Commands -----------------------------------------------------------
  addCommands() {
    this.addCommand({
      id: "open-panel",
      name: "Open readability panel",
      callback: () => {
        void this.activatePanel();
      }
    });
    this.addCommand({
      id: "score-note",
      name: "Show readability of current note",
      checkCallback: (checking) => {
        var _a, _b;
        const view = this.activeMarkdownView();
        if (view === null) return false;
        if (!checking) {
          const target = this.resolveTargetFor(view.file);
          const report = this.analyzeView(view, target);
          new import_obsidian4.Notice(
            formatNoticeText(
              report,
              (_b = (_a = view.file) == null ? void 0 : _a.basename) != null ? _b : "Current note",
              target
            ),
            1e4
          );
        }
        return true;
      }
    });
    this.addCommand({
      id: "score-selection",
      name: "Show readability of selection",
      checkCallback: (checking) => {
        const view = this.activeMarkdownView();
        if (view === null) return false;
        const text = this.selectedText(view);
        if (text.trim() === "") return false;
        if (!checking) {
          const target = this.resolveTargetFor(view.file);
          const report = analyzeMarkdown(
            text,
            this.selectionAnalyzeOptions(target)
          );
          new import_obsidian4.Notice(formatNoticeText(report, "Selection", target), 1e4);
        }
        return true;
      }
    });
    this.addCommand({
      id: "insert-report",
      name: "Insert readability report at cursor",
      editorCallback: (editor) => {
        var _a, _b;
        const file = (_b = (_a = this.activeMarkdownView()) == null ? void 0 : _a.file) != null ? _b : null;
        const target = this.resolveTargetFor(file);
        const report = analyzeMarkdown(
          editor.getValue(),
          this.analyzeOptions(target, file)
        );
        const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        editor.replaceSelection(formatCalloutReport(report, date, target));
      }
    });
    this.addCommand({
      id: "toggle-status-bar",
      name: "Toggle readability in status bar",
      callback: () => {
        this.settings.showStatusBar = !this.settings.showStatusBar;
        void this.saveSettings();
      }
    });
    this.addCommand({
      id: "toggle-sentence-marking",
      name: "Toggle long sentence marking",
      callback: () => {
        this.settings.markLongSentences = !this.settings.markLongSentences;
        void this.saveSettings();
      }
    });
  }
};
