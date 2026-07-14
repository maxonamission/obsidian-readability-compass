# Changelog

## [0.1.0]

**First release.** Readability Compass measures the reading level of your notes with one
language-independent main score (LIX), translated into a CEFR-style target band you choose.

- **Status bar, always on**: LIX, band, target check and word count — configurable segments;
  counts your selection when you select text; click to open the panel.
- **Side panel**: score card (LIX, band, indicative CEFR audience, target check), a Flesch
  variant for your language, counts (words, sentences, words per sentence, long words,
  paragraphs, reading time) and your longest sentences with click-to-jump.
- **Five commands**: open the panel · readability of the current note · readability of the
  selection · insert a readability report at the cursor · toggle the status bar.
- **Six Flesch variants** via a single language registry: English (Flesch), Dutch
  (Flesch-Douma), German (Flesch-Amstad), Spanish (Fernández-Huerta), French (Kandel-Moles)
  and Portuguese (Flesch-Martins); LIX itself works for any language with space-separated
  words.
- **Markdown-aware**: front matter, code, tables, link URLs, images, HTML and tags are
  stripped before measuring — without losing offsets, so jump-to-sentence lands exactly.
- Everything is computed locally: no network calls, no telemetry, no account.
