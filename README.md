# Readability Compass

**Write at the level your readers need — and know it while you write, not after they've given up.**

You know the feeling: you wrote a careful explanation for a broad audience, reread it twice — and you still can't say whether the people you wrote it for will actually follow it. Word counters tell you how *much* you wrote, never how *hard* it reads. The readability tools that do exist speak English-only formulas that mean nothing in your language, or dump thirty raw numbers on you without a verdict. So you guess. And your readers pay for the guess.

Readability Compass replaces the guess with a signal, right where you write. It measures your note with **LIX** — a readability score built only on sentence length and the share of long words, so it needs no syllable guessing or word lists and works in Dutch, English, German, the Scandinavian languages and any language that separates words with spaces. Then it holds that score against the **target band you choose** (≈ CEFR B1, B2, C1, or your own ceiling) and gives you the one verdict that matters, permanently, in the status bar: **on target, or not**.

*(Why "Compass"? A compass doesn't walk for you — it tells you, at a glance, whether you're still heading where you meant to go. Your writing stays yours; the plugin only keeps you honest about the direction.)*

## Get started in 60 seconds

1. **Install & enable**: Settings → Community plugins → search for *Readability Compass*.
2. **Pick your audience** in the settings: ≈ B1, B2, C1, or a custom LIX ceiling.
3. **Write.** The status bar keeps score: `LIX 42 · ≈ B2 · ✓ · 351 w`. Click it whenever you want the why.

That's the whole entry fee. No account, no API key, nothing leaves your machine.

## What you get

- **Status bar, always on** — score, band, target check and word count, with configurable
  segments. Select text and it scores the selection. Click it to open the panel.
- **Side panel — the why behind the verdict**: a score card (LIX, band, indicative CEFR
  audience, target check), the published Flesch variant for your language (ten supported),
  counts (words, sentences, words per sentence, long words, paragraphs, reading time), your
  **hardest paragraphs** (by LIX) and your **longest sentences** — click one and you jump
  straight to the culprit. You choose how many entries the lists show, reveal more with
  *Show more*, and can hide sentences below a word threshold.
- **Score a folder or a selection of notes** — select notes in the file explorer and the
  panel scores them together, live; change the selection and the score follows (right-click
  menu for folders and larger sets). One combined score, a per-note list sorted hardest-first
  (each note against its own target), and the longest sentences across all of them — click to
  open that note at that sentence.
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
  jump-to-sentence lands exactly. Notes that *are* tables (question banks, glossaries) can
  opt in: turn on **Include table text**, or set `readability-tables: true` in a note's
  front matter. A manual selection always measures everything you selected — tables and
  code included.
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
  Flesch-Martins (pt), Flesch-Vacca (it), Flesch-Oborneva (ru), Ateşman (tr) and
  Flesch-Bendová (cs). Their syllable counts are heuristic (±1 on tricky clusters); LIX stays
  the main score.
  **Missing your language?**
  [Open a language request](https://github.com/maxonamission/obsidian-readability-compass/issues/new?title=Language%20request%3A%20&labels=language-request&body=%2A%2ALanguage%2A%2A%3A%20%0A%2A%2APublished%20readability%20formula%20for%20this%20language%20(if%20you%20know%20one%2C%20with%20a%20reference)%2A%2A%3A%20%0A%2A%2AAnything%20special%20about%20syllables%2Fword%20boundaries%20in%20this%20language%2A%2A%3A%20)
  — adding one is a single entry in the language registry (a stopword set, a syllable counter
  and published formula coefficients). LIX itself already works for your language today if it
  separates words with spaces.
- **Known limitations, stated.** Sentence splitting is punctuation- and line-based
  (abbreviations like "e.g." count as sentence ends), and LIX assumes space-separated words —
  it is not meaningful for CJK text. Keyword-style notes (slide decks, bullet lists of long
  content words without connecting prose) score deceptively high: every line counts as a
  sentence and the long-word share dominates. LIX is meant for running prose — turn on
  **Mark long words** to see exactly which words drive such a score.

## Privacy — what leaves your machine

Nothing. Every score is computed locally: **no network calls, no telemetry, no account.**

## Install

**Community plugins**: Settings → Community plugins → search for *Readability Compass* →
Install → Enable. Or start from the
[directory listing](https://community.obsidian.md/plugins/readability-compass).

Manual: download `main.js`, `manifest.json` and `styles.css` from the latest
[release](../../releases) and copy them into
`<vault>/.obsidian/plugins/readability-compass/`.

Works on desktop and mobile (Obsidian 1.7.2+).

## Works well with

**[Voxtral Transcribe](https://github.com/maxonamission/obsidian-voxtral)** — from the same
workshop. Spoken first drafts are honest but rambling: speak your idea on a walk, let Voxtral
turn it into a markdown note, then let Readability Compass show how far that transcript is
from your audience — your longest sentences are one click away. Capture by voice, tighten by
compass.

**[Parallax](https://github.com/maxonamission/obsidian-parallax)** — also from the same
workshop. Parallax guards the thinking *behind* your conclusions (graded evidence, belief
tracking, a methodological account); Readability Compass guards whether the write-up of those
conclusions reads at the level your audience needs. Sound research on one side, readable
reporting on the other.

The three plugins share the same principles — your notes stay yours, local where possible, no
telemetry — but stay deliberately separate tools, each owning its own job.

## Support

Readability Compass is free and GPL-3.0. If it keeps your writing on target, you can
[**buy me a coffee** ☕](https://buymeacoffee.com/maxonamission) — it keeps the work going.

Issues and ideas: [GitHub issues](../../issues). Development happens in the
[codebase-basecamp](https://github.com/maxonamission/codebase-basecamp) repo; this repo
mirrors the source and builds each release here, so every release asset carries a
build-provenance attestation you can verify.

## License

[GPL-3.0](LICENSE) — © 2026 Max Kloosterman
