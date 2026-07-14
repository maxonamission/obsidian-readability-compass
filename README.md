# Readability Compass

**Write at the level your readers need — and know it while you write, not after they've given up.**

You know the feeling: you wrote a careful explanation for a broad audience, reread it twice — and you still can't say whether the people you wrote it for will actually follow it. Word counters tell you how *much* you wrote, never how *hard* it reads. The readability tools that do exist speak English-only formulas that mean nothing in your language, or dump thirty raw numbers on you without a verdict. So you guess. And your readers pay for the guess.

Readability Compass replaces the guess with a signal, right where you write. It measures your note with **LIX** — a readability score built only on sentence length and the share of long words, so it needs no syllable guessing or word lists and works in Dutch, English, German, the Scandinavian languages and any language that separates words with spaces. Then it holds that score against the **target band you choose** (≈ CEFR B1, B2, C1, or your own ceiling) and gives you the one verdict that matters, permanently, in the status bar: **on target, or not**.

*(Why "Compass"? A compass doesn't walk for you — it tells you, at a glance, whether you're still heading where you meant to go. Your writing stays yours; the plugin only keeps you honest about the direction.)*

## Get started in 60 seconds

1. **Install & enable** (see [Install](#install) below — community listing in preparation).
2. **Pick your audience** in the settings: ≈ B1, B2, C1, or a custom LIX ceiling.
3. **Write.** The status bar keeps score: `LIX 42 · ≈ B2 · ✓ · 351 w`. Click it whenever you want the why.

That's the whole entry fee. No account, no API key, nothing leaves your machine.

## What you get

- **Status bar, always on** — score, band, target check and word count, with configurable
  segments. Select text and it scores the selection. Click it to open the panel.
- **Side panel — the why behind the verdict**: a score card (LIX, band, indicative CEFR
  audience, target check), the published Flesch variant for your language (six supported),
  counts (words, sentences, words per sentence, long words, paragraphs, reading time), and
  your **longest sentences** — click one and you jump straight to the culprit.
- **Five commands** — open the panel · score the current note · score the selection · insert
  a readability report at the cursor (as a callout) · toggle the status bar.

## What Readability Compass is *not*

A compass, not a co-author:

- **Not a grammar or spell checker.** It measures and points; it never rewrites.
- **Not an AI writing assistant.** No suggestions, no rephrasing — the writing stays yours.
- **Not a statistics dashboard.** Vault-wide word counts and writing streaks are other
  plugins' turf; this one answers a single question — *can your readers follow you?*

## Why you can trust the score

- **Only running text counts.** Front matter, code blocks, inline code, tables, link URLs,
  images, HTML and tags are stripped before measuring — without losing positions, so
  jump-to-sentence lands exactly.
- **One published, inspectable formula:**

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

- **Honest labels.** The CEFR labels are an *indication* of the audience a text suits, not a
  certified level. Scores are hidden below a minimum word count (default 40) because they are
  too erratic on short texts.
- **A second opinion where one exists.** When the language is known (auto-detected, or fixed
  in the settings), the published Flesch variant is shown alongside: Flesch Reading Ease (en),
  Flesch-Douma (nl), Flesch-Amstad (de), Fernández-Huerta (es), Kandel-Moles (fr),
  Flesch-Martins (pt). Their syllable counts are heuristic (±1 on tricky clusters); LIX stays
  the main score.
- **Known limitations, stated.** Sentence splitting is punctuation- and line-based
  (abbreviations like "e.g." count as sentence ends), and LIX assumes space-separated words —
  it is not meaningful for CJK text.

## Privacy — what leaves your machine

Nothing. Every score is computed locally: **no network calls, no telemetry, no account.**

## Install

**Community plugins**: not yet listed — submission to the community directory is in
preparation. Until then, install manually:

1. Download `main.js`, `manifest.json` and `styles.css` from the latest
   [release](../../releases).
2. Copy them into `<vault>/.obsidian/plugins/readability-compass/`.
3. Enable the plugin under **Settings → Community plugins**.

Works on desktop and mobile.

## Support

Readability Compass is free and GPL-3.0. If it keeps your writing on target, you can
[**buy me a coffee** ☕](https://buymeacoffee.com/maxonamission) — it keeps the work going.

Issues and ideas: [GitHub issues](../../issues). Development happens in the
[codebase-basecamp](https://github.com/maxonamission/codebase-basecamp) repo; this repo
carries releases.

## License

[GPL-3.0](LICENSE) — © 2026 Max Kloosterman
