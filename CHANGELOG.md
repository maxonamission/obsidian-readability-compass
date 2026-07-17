# Changelog

## [0.8.2]

**Release provenance fix (no functional changes).** The build-provenance attestation on the
release assets is now signed from the release **tag** instead of a build branch, so it
verifies against this repository — clearing the community-directory warning that the assets
"failed cryptographic verification." The plugin itself is unchanged from 0.8.1.

## [0.8.1]

**The structure & cohesion hints now open with a conclusion, not just numbers.** The
experimental panel section led with raw figures; it now starts with a one-line **structural
read** that synthesizes them into a plain characterization — e.g. *"Flowing prose — loosely
connected (topics shift between sentences); 5 long sections without subheadings; a heading
level is skipped."* When a note declares a `diataxis:` type, the conclusion leads with whether
the structure matches that type. Still descriptive, still never pass/fail.

## [0.8.0]

**Experimental: structure & cohesion hints (off by default).** LIX and Flesch only read
word- and sentence-level surface features; the comprehension research shows that a text's
*organization and cohesion* are a separate axis the formulas miss. A new opt-in panel section
(Settings → *Show structure & cohesion hints*) surfaces cheap, local proxies for that axis:
heading structure, adjacent-sentence content-word overlap (a cohesion proxy), connective
density (English/Dutch for now), and — when a note declares a `diataxis:` type — a structural
match hint. These are **descriptive hints, deliberately kept out of the LIX score and never
pass/fail**, because the right amount of cohesion depends on the audience.

## [0.7.0]

**Russian, Turkish and Czech are now supported.** The secondary Flesch score covers three
more languages, each with its published adaptation: **Flesch-Oborneva** for Russian (Oborneva,
2006), the **Ateşman** formula for Turkish (Ateşman, 1997) and **Flesch-Bendová** for Czech
(Bendová & Cinková, 2021 — a Flesch recalibration fitted on a Czech↔English parallel corpus).
Ten languages now: English, Dutch, German, Spanish, French, Portuguese, Italian, Russian,
Turkish and Czech. Russian and Turkish count syllables as the vowel count, which fits their
near-phonemic orthographies (Turkish *saat* → sa-at is two syllables, Russian *поэт* → по-эт
is two); Czech merges the diphthongs ou/au/eu into one. LIX, the main score, has always worked
for any language that separates words with spaces — including Cyrillic — so this only adds the
language-specific second opinion.

## [0.6.0]

**Italian is now supported.** The secondary Flesch score covers Italian too, using the
published **Flesch-Vacca** formula (Franchina & Vacca, 1972). Seven languages now:
English, Dutch, German, Spanish, French, Portuguese and Italian. (LIX, the main score, has
always worked for any language with spaces — this adds the language-specific second opinion.)

**On mobile the jump now lands on the sentence, not just the note.** After the panel became
tappable, the note opened but the sentence wasn't selected — the selection was applied before
the sidebar slid away, so it was reset the moment the editor came to the front. The order is
fixed: on mobile the editor is revealed first, then the sentence is selected and scrolled to.
Desktop is unchanged.

## [0.5.1]

**The panel works on mobile now.** Tapping a note, sentence or paragraph in the side panel
did nothing on phones and tablets — it listened for a mouse event that a touch doesn't send.
The list now responds to a plain tap/click everywhere, and on mobile the panel slides away so
the note it jumped to is in front of you (with the sentence selected). On desktop nothing
changes — the panel stays put beside the note.

## [0.5.0]

**Clicking a sentence or paragraph in the panel now lands reliably — every time.** The
jump-to-sentence was redesigned from the ground up. It now uses Obsidian's own navigation
(the mechanism behind search-result and backlink jumps) to scroll, select and focus in one
atomic step, instead of hand-rolling those and racing the app's own state restore — which is
why the selection used to "not appear" at random. In a multi-note selection the panel opens
the file in its existing tab (never a copy in the wrong pane) and each list entry now carries
its own file + position, so two byte-identical sentences across two notes can never jump to
the wrong one.

**Lists are no longer mistaken for a hard paragraph.** A bullet or numbered list is terse by
design — telegraphic, keyword-dense — so its LIX looks high, and a tight list used to show up
in *Hardest paragraphs* as one big entry. The hardest-paragraphs ranking now skips list items
entirely (bulleted, numbered and nested lists alike), so it points you at real prose blocks.
The note's overall score is unchanged — list text still counts toward it, and a genuinely long
sentence inside a bullet still shows up under *Longest sentences*.

## [0.4.2]

**Live updates while you edit — the panel and the inline marks keep up now.**

- **A scored selection stays live.** When you score a folder or a set of notes and then edit
  one of them, the combined score, the per-note list and the sentences now recompute as you
  type (reading the live editor text, not the last-saved version). It used to freeze on the
  first score.
- **Inline marks no longer lag behind on a shortened sentence.** While typing continuously,
  the long-sentence / long-word marks are now rebuilt on a bounded schedule instead of only
  after you pause — so a mark can no longer stay stretched across into the next sentence when
  you make a sentence shorter.

## [0.4.1]

**Jumping to a sentence or paragraph now keeps its focus.** After 0.4.0's one-click change,
clicking an entry in the panel would occasionally bounce focus straight back to the side
panel — the note scrolled and selected, then the selection quietly sprang away. Cause: the
panel's own mouse-down was still grabbing focus back off the editor, racily, so it only
happened sometimes. The panel now yields that focus to the editor, and the jump ends by
focusing the editor explicitly.

## [0.4.0]

**The panel now follows your file explorer selection — no right-click needed.**

- **Live explorer scoring** (new, on by default): select multiple notes in the file explorer
  and the panel scores them together as you select; change the selection and the score
  follows. Works up to 50 notes — folders and larger selections keep the right-click menu.
  Uses the explorer's internal selection state (there is no public API), so if a future
  Obsidian version changes it, the feature quietly falls back to the menu. Toggle in the
  settings.
- **Two flavours of selection view.** A *live* selection (made in the explorer) lets go by
  itself: open a note outside it and the panel follows that note again. A *right-click*
  score (selection or folder) is deliberate and stays pinned while you work in any document
  — until you select something else in the explorer or hit "Back to current note". While
  you walk the longest sentences within a selection, the list always stays put.
- **One click instead of two**: clicking a sentence, paragraph or note in the side panel now
  responds on the first click. (The first click used to focus the panel, which re-rendered
  the list under your cursor before the click landed.)

## [0.3.0]

**Score a whole selection of notes — and see exactly where the hard spots are.**

- **Explorer scoring** (new): select multiple notes (or right-click a folder) in the file
  explorer → *Score readability*. The side panel shows one combined score over the whole
  selection (computed over summed counts, so long notes weigh in properly), a per-note list
  sorted hardest-first with each note's own target verdict, and the longest sentences across
  all selected notes — click one to open that note right at that sentence. "Back to current
  note" returns the panel to its usual behaviour.
- **Hardest paragraphs** (new): the panel now also lists the highest-LIX paragraphs of the
  note (paragraphs of 20+ words), click-to-jump — so you can start rewriting where it hurts
  most, not just at the longest sentence.
- **The longest-sentences list is yours now**: set how many entries the panel shows
  (default 5), reveal the rest step by step with **Show more**, and optionally hide
  sentences at or below a word threshold so the list only names real offenders.

## [0.2.1]

**Selections across table cells now count every cell.** Live Preview renders tables as
widgets whose cells are separate sub-editors, so a selection across cells reached the plugin
as just the first cell. The status bar and the selection command now read the full visible
selection inside the note, and stray table pipes in a selection that starts mid-row are
ignored. As a bonus, the selection command is also available when the selection lives
entirely inside a rendered table.

Also: the long-word underline now uses a plain dotted border instead of `text-decoration`,
which Obsidian's automated review flags as only partially supported on older webviews.

## [0.2.0]

**Your target now follows the note's context — and long sentences light up where you write.**

- **Target profiles** (new): set a different target band per folder or per tag (e.g. `blog/`
  ⇒ ≈ B1, `docs/` ⇒ ≈ B2), override per note with `readability-target: b1` (or a bare LIX
  ceiling like `42`) in the front matter, or derive it from a `diataxis:` type (tutorial ⇒
  ≈ B1; how-to, reference and explanation ⇒ ≈ B2). Priority: front matter > diataxis > tag
  > folder > global setting. The status bar shows the band next to the target check when a
  rule applies; the panel and inserted reports name the source (e.g. "from folder blog/").
- **Inline long-sentence marking** (new, off by default): sentences above the threshold get
  a subtle background in the editor, with a second tint for the ones nobody finishes. The
  threshold follows your active target profile (≈ B1 ⇒ 22, ≈ B2 ⇒ 25, ≈ C1 ⇒ 30 words
  per sentence) or a fixed value you choose. Never marks inside code, front matter or
  tables. Toggle in the settings or via the new command.
- **Mark long words** (new, off by default): underline every long word (> 6 letters) — the
  other LIX ingredient. Shows why keyword-dense notes score high even without long sentences.
- **Include table text** (new, off by default): count the text inside Markdown tables, for
  notes that *are* tables (question banks, glossaries). Per-note override with
  `readability-tables: true`/`false` in the front matter. A manual selection now always
  measures everything you selected — tables **and** code (so you can score prose that lives
  inside a code block, like help text).
- Sliders in the settings now show their value (minimum words, reading speed, custom LIX
  ceiling, marking threshold).
- Sharper manifest description; funding link added.
- Still: everything local, no network calls, no telemetry — and all of it free.

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
