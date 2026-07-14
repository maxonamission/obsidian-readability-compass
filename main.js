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
  default: () => ReadabilityCompassPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

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
var HTML_RE = /<[^>\n]+>/g;
var URL_RE = /https?:\/\/\S+/g;
var TAG_RE = /(^|[\s([])#[\p{L}\p{N}_/-]+/gmu;
var HEADING_HASH_RE = /^[^\S\n]{0,3}#{1,6}[^\S\n]*/gm;
var CALLOUT_MARKER_RE = /\[![\w-]+\][+-]?/g;
var BLOCKQUOTE_RE = /^[^\S\n]{0,3}>[^\S\n]?/gm;
var LIST_MARKER_RE = /^[^\S\n]{0,3}(?:[-*+]|\d+\.)[^\S\n]+/gm;
var EMPHASIS_RE = /[*_~=]/g;
function stripMarkdown(text) {
  let t = text.replace(FRONT_MATTER_RE, blank);
  t = t.replace(FENCE_RE, blank);
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
  t = t.replace(INLINE_CODE_RE, blank);
  t = t.replace(TABLE_ROW_RE, blank);
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
function analyzeMarkdown(markdown, options) {
  var _a;
  const clean = stripMarkdown(markdown);
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
  const topSentences = [...sentences].sort((a, b) => b.words - a.words).slice(0, (_a = options.topSentenceCount) != null ? _a : DEFAULT_TOP_SENTENCES);
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
    onTarget: lix === null ? null : lix <= options.targetMaxLix,
    targetMaxLix: options.targetMaxLix,
    minWords: options.minWords
  };
}

// src/format.ts
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
function formatStatusBarText(report, selection, segments) {
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
    parts.push(report.onTarget ? ON_TARGET : OFF_TARGET);
  }
  if (segments.words) {
    parts.push(`${report.words} w`);
  }
  if (segments.readingTime && report.words > 0) {
    parts.push(formatReadingTime(report.readingMinutes));
  }
  return parts.join(" \xB7 ");
}
function formatNoticeText(report, title) {
  var _a, _b;
  const lines = [title];
  if (report.lix === null) {
    lines.push(
      `Too short for a stable score (min ${report.minWords} words; found ${report.words}).`
    );
  } else {
    const target = report.onTarget ? `on target (max ${report.targetMaxLix})` : `above target (max ${report.targetMaxLix})`;
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
function formatCalloutReport(report, dateIso) {
  var _a, _b;
  const lines = [`> [!info] Readability \u2014 ${dateIso}`];
  if (report.lix === null) {
    lines.push(
      `> Too short for a stable score (min ${report.minWords} words; found ${report.words}).`
    );
  } else {
    const target = report.onTarget ? `on target (max ${report.targetMaxLix})` : `above target (max ${report.targetMaxLix})`;
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
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  language: "auto",
  targetBand: "b2",
  customMaxLix: 45,
  minWords: 40,
  wordsPerMinute: 225,
  showStatusBar: true,
  statusBar: {
    lix: true,
    band: true,
    target: true,
    words: true,
    readingTime: false
  }
};
var ReadabilityCompassSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Target").setHeading();
    new import_obsidian.Setting(containerEl).setName("Target audience").setDesc(
      "The reading level your notes should stay at. CEFR bands are translated to a LIX ceiling."
    ).addDropdown(
      (dropdown) => dropdown.addOption("b1", `\u2248 B1 \u2014 plain (LIX \u2264 ${TARGET_MAX_LIX.b1})`).addOption("b2", `\u2248 B2 \u2014 clear (LIX \u2264 ${TARGET_MAX_LIX.b2})`).addOption("c1", `\u2248 C1 \u2014 advanced (LIX \u2264 ${TARGET_MAX_LIX.c1})`).addOption("custom", "Custom LIX ceiling").setValue(this.plugin.settings.targetBand).onChange(async (value) => {
        this.plugin.settings.targetBand = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.targetBand === "custom") {
      new import_obsidian.Setting(containerEl).setName("Custom LIX ceiling").setDesc("Scores above this value count as off target.").addSlider(
        (slider) => slider.setLimits(20, 70, 1).setValue(this.plugin.settings.customMaxLix).onChange(async (value) => {
          this.plugin.settings.customMaxLix = value;
          await this.plugin.saveSettings();
        })
      );
    }
    new import_obsidian.Setting(containerEl).setName("Measurement").setHeading();
    new import_obsidian.Setting(containerEl).setName("Language").setDesc(
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
    new import_obsidian.Setting(containerEl).setName("Minimum words for a score").setDesc("Below this word count LIX is too erratic and is hidden.").addSlider(
      (slider) => slider.setLimits(10, 100, 5).setValue(this.plugin.settings.minWords).onChange(async (value) => {
        this.plugin.settings.minWords = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Reading speed").setDesc("Words per minute, used for the reading time estimate.").addSlider(
      (slider) => slider.setLimits(100, 400, 25).setValue(this.plugin.settings.wordsPerMinute).onChange(async (value) => {
        this.plugin.settings.wordsPerMinute = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Status bar").setHeading();
    new import_obsidian.Setting(containerEl).setName("Show in status bar").setDesc("The always-on indicator. Click it to open the panel.").addToggle(
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
      new import_obsidian.Setting(containerEl).setName(segment.name).setDesc(segment.desc).addToggle(
        (toggle) => toggle.setValue(this.plugin.settings.statusBar[segment.key]).onChange(async (value) => {
          this.plugin.settings.statusBar[segment.key] = value;
          await this.plugin.saveSettings();
        })
      );
    }
  }
};

// src/panel.ts
var import_obsidian2 = require("obsidian");
var VIEW_TYPE_READABILITY = "readability-compass-panel";
var LANGUAGE_LABEL = {
  unknown: "language unknown \u2014 LIX only"
};
for (const language of LANGUAGES) {
  LANGUAGE_LABEL[language.code] = language.label;
}
var ReadabilityPanelView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
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
  render(report, fileName) {
    var _a, _b, _c;
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
    const offenders = report.topSentences.filter((s) => s.words >= 2);
    if (offenders.length > 0) {
      root.createDiv({ text: "Longest sentences", cls: "rc-section-title" });
      const list = root.createEl("ol", { cls: "rc-sentences" });
      for (const sentence of offenders) {
        const item = list.createEl("li", { cls: "rc-sentence" });
        item.createSpan({ text: `${sentence.words} w \xB7 `, cls: "rc-sentence-words" });
        item.createSpan({ text: truncate(sentence.text, 140) });
        item.setAttribute("title", "Click to jump to this sentence");
        this.registerDomEvent(item, "click", () => {
          this.jumpTo(sentence);
        });
      }
    }
    root.createEl("p", {
      text: "Measured on running text \u2014 front matter, code, tables, links and URLs are excluded.",
      cls: "rc-footnote"
    });
  }
  jumpTo(sentence) {
    this.plugin.jumpToSpan(sentence);
  }
};
function truncate(text, max) {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "\u2026";
}

// src/main.ts
var ReadabilityCompassPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.statusBarEl = null;
    /** Last markdown view with content, so the panel keeps working when focused. */
    this.lastMarkdownView = null;
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
    const refreshSoon = (0, import_obsidian3.debounce)(() => this.refreshUi(), 400, true);
    const refreshStatusSoon = (0, import_obsidian3.debounce)(() => this.refreshStatusBar(), 200, true);
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.refreshUi())
    );
    this.registerEvent(this.app.workspace.on("editor-change", refreshSoon));
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
    this.refreshUi();
  }
  // --- Analysis -----------------------------------------------------------
  analyzeOptions() {
    return {
      language: this.settings.language,
      minWords: this.settings.minWords,
      wordsPerMinute: this.settings.wordsPerMinute,
      targetMaxLix: targetMaxLix(
        this.settings.targetBand,
        this.settings.customMaxLix
      )
    };
  }
  activeMarkdownView() {
    const active = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
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
  analyzeView(view) {
    return analyzeMarkdown(view.editor.getValue(), this.analyzeOptions());
  }
  selectionStats(view) {
    const editor = view == null ? void 0 : view.editor;
    if (!editor || !editor.somethingSelected()) return null;
    const report = analyzeMarkdown(editor.getSelection(), this.analyzeOptions());
    if (report.words === 0) return null;
    return { words: report.words, lix: report.lix };
  }
  // --- UI refresh ---------------------------------------------------------
  refreshUi() {
    const view = this.activeMarkdownView();
    const report = view === null ? null : this.analyzeView(view);
    this.renderStatusBar(view, report);
    this.renderPanels(view, report);
  }
  refreshStatusBar() {
    const view = this.activeMarkdownView();
    this.renderStatusBar(view, view === null ? null : this.analyzeView(view));
  }
  renderStatusBar(view, report) {
    if (this.statusBarEl === null) return;
    if (!this.settings.showStatusBar) {
      this.statusBarEl.setText("");
      this.statusBarEl.hide();
      return;
    }
    const text = formatStatusBarText(
      report,
      this.selectionStats(view),
      this.settings.statusBar
    );
    this.statusBarEl.setText(text);
    if (text === "") {
      this.statusBarEl.hide();
    } else {
      this.statusBarEl.show();
    }
  }
  renderPanels(view, report) {
    var _a, _b;
    const fileName = (_b = (_a = view == null ? void 0 : view.file) == null ? void 0 : _a.basename) != null ? _b : null;
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_READABILITY)) {
      if (leaf.view instanceof ReadabilityPanelView) {
        leaf.view.render(report, fileName);
      }
    }
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
  /** Jump the last active editor to a sentence span (offsets are document offsets). */
  jumpToSpan(span) {
    const view = this.activeMarkdownView();
    if (view === null) return;
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
          const report = this.analyzeView(view);
          new import_obsidian3.Notice(
            formatNoticeText(report, (_b = (_a = view.file) == null ? void 0 : _a.basename) != null ? _b : "Current note"),
            1e4
          );
        }
        return true;
      }
    });
    this.addCommand({
      id: "score-selection",
      name: "Show readability of selection",
      editorCheckCallback: (checking, editor) => {
        if (!editor.somethingSelected()) return false;
        if (!checking) {
          const report = analyzeMarkdown(
            editor.getSelection(),
            this.analyzeOptions()
          );
          new import_obsidian3.Notice(formatNoticeText(report, "Selection"), 1e4);
        }
        return true;
      }
    });
    this.addCommand({
      id: "insert-report",
      name: "Insert readability report at cursor",
      editorCallback: (editor) => {
        const report = analyzeMarkdown(editor.getValue(), this.analyzeOptions());
        const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        editor.replaceSelection(formatCalloutReport(report, date));
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
  }
};
