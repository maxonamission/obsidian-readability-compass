# Readability Compass

**Know the reading level of your notes — and whether it is the level you want.**

Readability Compass measures how readable your writing is, right where you write. It is built around one honest, **language-independent** score — [LIX](https://en.wikipedia.org/wiki/Lix_(readability_test)) — instead of a wall of English-only formulas, and it translates that score into a **target band** you choose (≈ CEFR B1, B2, C1, or a custom ceiling). The verdict is always on, in the status bar: on target, or not.

## Why another readability plugin?

- The most popular counting plugin has been unmaintained for years; the existing readability
  plugins only support English (Flesch, syllable-based), or dump 30 raw numbers on you without
  saying what "good" looks like.
- LIX only uses sentence length and the share of long words (> 6 letters), so it works for
  Dutch, English, German, the Scandinavian languages and more — no word lists, no syllable
  guessing.
- A score without a target is trivia. You pick the audience level; the plugin tells you whether
  the note is on target — permanently, in the status bar.

## What you get

- **Status bar, always on** — `LIX 42 · ≈ B2 · ✓ · 351 w`. Segments are configurable. When you
  select text it counts the selection. Click it to open the panel.
- **Side panel** — score card (LIX, band, indicative CEFR audience, target check), the Flesch
  variant for your language (six supported), counts (words, sentences, words per sentence, long
  words, paragraphs, reading time), and your **longest sentences** — click one to jump straight
  to it.
- **Commands** — open the panel · show readability of the current note · show readability of
  the selection · insert a readability report at the cursor (as a callout) · toggle the status
  bar.

Everything is computed locally. **No network calls, no telemetry, no account.**

## How it measures

Only running text counts: front matter, code blocks, inline code, tables, link URLs, images,
HTML and tags are excluded before measuring.

```
LIX = words / sentences + 100 × long_words / words     (long word: > 6 letters)
```

| LIX | Band | Indicative audience |
|---|---|---|
| < 30 | very easy | ≈ B1 |
| 30–40 | easy | ≈ B1 |
| 40–50 | average | ≈ B2 (≤ 45) / ≈ C1 |
| 50–60 | difficult | ≈ C1 (≤ 55) / ≈ C2 |
| > 60 | very difficult | ≈ C2 |

The CEFR labels are an *indication* of the audience a text suits, not a certified level. Scores
are hidden below a minimum word count (default 40) because they are too erratic on short texts.

### Languages

The LIX score, bands and target check work for **any language that separates words with
spaces**. On top of that, a published Flesch variant is shown as a secondary score when the
language is known (auto-detected, or fixed in the settings):

| Language | Secondary score |
|---|---|
| English | Flesch Reading Ease (Flesch, 1948) |
| Dutch | Flesch-Douma (Douma, 1960) |
| German | Flesch-Amstad (Amstad, 1978) |
| Spanish | Fernández-Huerta (1959) |
| French | Kandel-Moles (1958) |
| Portuguese | Flesch-Martins (Martins et al., 1996) |

Syllable counts behind these variants are heuristic (vowel-group based, ±1 on tricky
clusters). LIX is the main score.

### Known limitations

- Sentence splitting is punctuation- and line-based; abbreviations ("e.g.", "bijv.") count as
  sentence ends.
- LIX assumes space-separated words; it is not meaningful for CJK text.

## Install

**Community plugins**: not yet listed — submission to the community directory is in
preparation. Until then, install manually:

1. Download `main.js`, `manifest.json` and `styles.css` from the latest
   [release](../../releases).
2. Copy them into `<vault>/.obsidian/plugins/readability-compass/`.
3. Enable the plugin under **Settings → Community plugins**.

Works on desktop and mobile.

## Support

Readability Compass is free and GPL-3.0. If it sharpens your writing, you can
[**buy me a coffee** ☕](https://buymeacoffee.com/maxonamission) — it keeps the work going.

Issues and ideas: [GitHub issues](../../issues). Development happens in the
[codebase-basecamp](https://github.com/maxonamission/codebase-basecamp) repo; this repo
carries releases.

## License

[GPL-3.0](LICENSE) — © 2026 Max Kloosterman
