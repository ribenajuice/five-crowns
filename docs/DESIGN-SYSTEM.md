# Design system

*Owned by the ui-designer agent; law for the frontend-developer. Created during `/kickoff` step 3.*

> **Decided.** **Direction 1 — Kitchen Table**, with the **Column Sweep** review screen. Chosen by
> the founder on **2026-09-10** from three directions presented as mockups. This document is
> settled and is law for the frontend. Nothing below is a proposal.
>
> Where it came from: `docs/mockups/visual-directions.html`, published as an Artifact at
> <https://claude.ai/code/artifact/19cf1033-89db-43ba-9dff-de83d298b2e5>. The two rejected
> directions stay in that file as the record of what was considered.
>
> **Milestone 2 Stage 3** (players, rosters and places; renaming; the criterion 174 navigation)
> adds screens rather than a new direction — mockups at
> `docs/mockups/stage-3-people-sets-places.html`, published at
> <https://claude.ai/code/artifact/c56313a7-74e0-42be-ab7c-5a5f4ccd1b60>.
>
> **Milestone 2 Stage 4** ("Identity, repaired" — the suggested-match pre-selection, and merging
> players and places) again adds screens and one behaviour change to an existing one, no new
> direction — mockups at `docs/mockups/stage-4-identity-repaired.html`, published at
> <https://claude.ai/code/artifact/42f4136c-e8c5-4930-afec-f8b977c0897c>.
>
> **Milestone 3 Stage 1** ("The board, and the engine under it" — the records board becomes the
> landing screen at `/`) again adds screens rather than a new direction — mockups at
> `docs/mockups/m3-stage-1-the-board.html`, published at
> <https://claude.ai/code/artifact/ef904f9d-c560-43e7-b2d0-36f8fbfb18ed>.
>
> **Milestone 3 Stage 2** ("Rivalry" — head-to-head, by-roster and streak-in-context on the player
> page, the board's two new rows, and the nemesis card) again adds screens rather than a new
> direction — mockups at `docs/mockups/m3-stage-2-rivalry.html`, published at
> <https://claude.ai/code/artifact/e9a9adb3-3f73-4acf-a058-be5279cc7be5>. ⚠️ **The nemesis card's
> exact title and framing sentence are not decided in this document** — the mockup lays out five
> candidates side by side (§ "The nemesis card" below) for the founder to pick or redirect at the
> checkpoint; everything else on this page is settled.
>
> **Milestone 3 Stage 3** ("Distributions and villains" — the board's five new records, the player
> and roster pages' new sections, and the `/stats` catalogue index) again adds screens rather than a
> new direction — mockups at `docs/mockups/m3-stage-3-distributions-and-villains.html`, published at
> <https://claude.ai/code/artifact/6609a0ef-ac50-417d-a181-0cffbf9d90a2>. ⚠️ **Day-of-week and month
> tables are not part of this stage** — the mockup's own opening section explains why (criteria
> 223–249 contain no such criterion; the PRD's "Explicitly out of scope for Stage 3" list and Stage
> 4's own scope line both name venue/date slices as Stage 4 work) — so nothing below documents them
> either. Everything on this page for Stage 3 is settled; there is no open founder choice like Stage
> 2's nemesis titles.

## Direction

**Kitchen Table: the app looks like the pad.** Warm paper, biro-blue ink, a soft serif for
headings, big tabular numbers, and no decoration that competes with the photograph. The
personality lives in the words, not the ornament — this is a game-night record for five friends,
not an admin panel, but the screen where it matters is a screen you have to *read carefully in bad
light*.

**The review screen is the Column Sweep.** You never compare a whole grid against a whole
photograph. The photo is cropped to **one player's column** and stood beside that player's numbers
on a shared row pitch, so paper line 7 sits physically next to screen line 7. One impossible
comparison becomes four or five short ones, and the layout is identical whether the game had four
players or five. Full rules in *Review screen law* below.

**The two rejected directions**, recorded so the reasoning survives:

| Direction | Palette | Review mechanic | Why not |
|---|---|---|---|
| 2 — The Card Room | baize `#0F211B`, brass `#E0B24C`, ivory `#F2ECDD` | **Loupe** — whole sheet pinned above the grid, tapping a number zooms the photo to it | Best-looking at night, worst in a bright kitchen; least guided of the three, easy to skim a line |
| 3 — Games Night | peach `#FFF1E6`, plum `#5A2A7A`, tangerine `#F2611B` | **Overlay & Blink** — our numbers printed on the photo, switch between paper and ours | Most fun, but shouts on the one screen that needs concentration, and needs each number located on a skewed shadowed page |

## Tokens

### Color

Contrast ratios are measured; **every pair below passes WCAG AA** (≥4.5:1 body text, ≥3:1 large
text and UI). Ratios given against the surface the token is used on.

| Token | Light | Dark | Use | Contrast |
|---|---|---|---|---|
| `--bg` | `#FAF3E7` | `#17140F` | Page ground | — |
| `--surface` | `#FFFDF8` | `#211D17` | Cards, bars, inputs | — |
| `--sunk` | `#F2E9D8` | `#2B251D` | Wells, secondary rows, keypad | — |
| `--line` | `#E0D5C0` | `#3A3328` | Borders, dividers | 1.3:1 (decorative only, never carries meaning alone) |
| `--text` | `#23201B` | `#F3EADA` | Body copy | **14.3:1** on bg · **15.6:1** on surface (light) · **15.5:1** / **14.2:1** (dark) |
| `--text-muted` | `#6B6257` | `#B0A390` | Captions, meta | **5.5:1** on bg · **6.0:1** on surface (light) · **7.4:1** / **6.8:1** (dark) |
| `--brand` | `#17457A` | `#7FB3E8` | Primary buttons, links, focus | **8.8:1** on bg (light) · **8.3:1** on bg (dark) |
| `--on-brand` | `#FFFDF8` | `#17140F` | Text on `--brand` fills | **9.7:1** (light) · **8.3:1** (dark) |
| `--accent` | `#C1462F` | `#F0906E` | Camera/re-read actions, seals | **4.6:1** on bg (light) · **7.8:1** (dark) |
| `--accent-ink` | `#9C3520` | `#F0906E` | Accent used as *text* | **6.5:1** on bg (light) |
| `--success` | `#1F6B45` | `#7CCFA0` | Winner, accepted re-read | **5.9:1** on bg (light) |
| `--warn` | `#8A5A00` | `#E5B45C` | Unread cell, "not a backup" | **5.4:1** on bg (light) |
| `--error` | `#B3261E` | `#FF8B7E` | Column stops climbing, blocked save | **5.9:1** on bg (light) |

Soft tints for banners (`--*-soft`): light `#E2EFE7` / `#F7EBD4` / `#FBE4E1`, dark `#1D2C23` /
`#2E2515` / `#33191A`. Each is paired **only** with its own semantic colour as the foreground, and
those pairs are the ratios above ±0.4.

Rules:
- **One brand, one accent.** Everything else is the neutral ramp plus three semantic colours.
- **Colour never carries meaning alone.** A flagged cell has a red border, a red tint, an icon and
  a sentence. A winner has a crown, a label and a colour.
- Dark values are a token swap, not a second design.

### Type

Font stack: `"Fraunces", Georgia, "Times New Roman", serif` for the display face;
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` for
everything else; `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` for numbers.
**One webfont only** (Fraunces), self-hosted and subset — not loaded from a third party.

| Token | Size / weight | Use |
|---|---|---|
| `--text-xl` | 24–30px / 700 / display | Page and gate titles |
| `--text-lg` | 17px / 700 / display | Card and section headings |
| `--text-base` | 16px / 400 | Body — never smaller for body copy |
| `--text-sm` | 13px / 400 | Captions, meta, helper text |
| `--text-xs` | 11px / 700, uppercase, `.07em` | Labels above values |
| `--num` | 20px / 700 mono | Review cells, grids |
| `--num-lg` | 27–34px / 800 mono | Record values, final scores |

In code (`app/globals.css` `@theme`): `--text-xl` is fixed at **28px**, and the scale is used as
Tailwind utilities `text-xl` … `text-xs` with `font-display` for the display face. The label
letter-spacing is `--tracking-label` (`.07em`, utility `tracking-label`), and the content widths
are `--container-read` (640px, `max-w-read`) and `--container-wide` (1120px, `max-w-wide`).

**All numbers use `font-variant-numeric: tabular-nums`.** Columns of running totals must align on
the digit; this is a correctness feature, not typography.

### Spacing & shape

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
- Radius: **14px** on every surface and control (`--radius`); `999px` for pills only
- Max content width: **640px** for a single column of reading; **1120px** for wide grids on desktop
- Review row pitch: **46px** — set once as `--pitch`, and the photo strip beside the grid uses the
  same value so paper line 7 sits beside screen line 7

## Component inventory

| Component | Location | Notes |
|---|---|---|
| `AppBar` | every screen except the two password gates | Title + one-line context (date · venue), max one icon button. On `/login` and the admin prompt there is no bar: the display-face `h1` is the wordmark |
| `Card` / `CardSunk` | everywhere | Surface + 1px line + radius 14. The only container |
| `Button` | everywhere | 48px tall; `primary` (brand fill), `ghost` (outline), `accent` (camera/re-read). Full width on phone. Busy: `disabled` + `aria-busy="true"` + `opacity-60`, label becomes a present-tense verb with an ellipsis ("Checking…"). Disable only while busy, never because a field is empty; validate on submit and say what's missing |
| `IconButton` | app bars | 44×44 minimum, always `aria-label`led. Inline SVG only — no icon font |
| `Field` / `Input` | gate, review, admin | 52px tall, label above, uppercase-xs label. Outline is **1px `--text-muted`** (≥3:1 non-text contrast), never `--line`, which is decorative only |
| `Banner` | gate, review, admin | `error` / `warn` / `ok`. Bold first line = what, second line = what to do. Every banner carries an **inline SVG icon** beside the bold line, so colour is never the only signal. Lockout after too many tries is `warn`, not `error`: the password typed may have been right |
| `Pill` | review, records | Status chip; never the only signal |
| `PhotoStrip` | review | One column of the sheet photo, cropped to that column's `crop` rectangle, rows on `--pitch`. Tap = full-screen zoom. If `crop` is `null`, shows the **whole photo** scaled to fit instead of a blank, with a **"Set the crop"** ghost button — the photo is never absent (criterion 15). Once set, a small 44px "Adjust crop" corner button reopens `CropFrame` |
| `SheetPhoto` | review, game view | Whole sheet, pinch-zoom and pan, presigned URL |
| `ReviewGrid` | review | hand label · editable cell · derived hand score. One row per hand |
| `CellEditor` | review | Bottom sheet: photo strip + keypad + both neighbouring hand scores + prev/next line |
| `ColumnPager` | review | Chips per player with a status dot. 44px tall, horizontally scrollable |
| `ReadingCompare` | review | Old reading vs new, differing lines highlighted, keep/reject |
| `StructureMenu` | review | The five structural repairs + "type it in by hand" |
| `FinalRow` | review, game view | The last line of every column on its own, winner(s) marked |
| `RecordCard` (M3 Stage 1) | records board | Flat, equal-weight — title, holder(s), value, per-holder sample. No ranking styling (no crowns, no medal colour, no 1st/2nd/3rd). Whole card is the tap target to its drill-through; a small chevron is the only affordance. Joint holders alphabetical, one line, each with their own sample (criteria 180–182, 186). A `no-holder` variant drops the value and chevron for a plain italic sentence (criterion 185) — never styled as a warning. The stalwart's card omits the sample line: its value *is* the holder's own game count, so a second "from N games" would repeat the same number — a literal reading of criterion 182 flagged for sign-off, see *Screen rules* below |
| ~~`Countdown`~~ — **retired, M3 Stage 1** | — | Was "N more nights and the board opens," for the board's old withheld state. PRD open question 6 (2026-09-14) removed all withholding; there is no waiting-room state left for this component to render, and nothing replaces it |
| `ArchiveLine` (M3 Stage 1) | records board | One line, top of the board, above everything else. Two states sharing one neutral `--sunk` box — never `warn`/`error`, it's a fact, not a problem: **under `EARLY_DAYS_BELOW` (10) games**, criterion 183's line verbatim, which also satisfies criterion 182's archive-size statement while it's showing; **at 10+ games**, a plain count (fixed strings, below) — a different sentence, not the same one reworded (criterion 183: "absent, not reworded") |
| `BoardNav` (M3 Stage 1) | records board | Two fixed buttons side by side — `ghost` **"Games"**, `primary` **"Add a game"** — directly under `ArchiveLine`, rendered on every board state including the empty one (criteria 179, 191), the same "always reachable" precedent `IndexNav` set on the games list |
| `GameRow`, rounds-won annotation (M3 Stage 1) | records board drill-through | The existing `GameRow` unchanged, plus one small brand-coloured line under the meta — **"{Player} took {n} of 11 rounds"** — only on the "most rounds won" drill-through, where the claim is a per-game count rather than a single fact each game either carries or doesn't (criterion 186) |
| `GameRow`, streak-holder annotation (M3 Stage 1) | records board drill-through, joint streak only | When "most wins in a row" is jointly held by players whose qualifying games differ, each row gets a small line naming whose run it belongs to — **"{Player}'s streak game"** — otherwise a list of games with nothing else in common would read as one continuous run it isn't |
| `HeadToHeadRow` (M3 Stage 2) | player page, "Head-to-head" section | One row per opponent shared at least one game with (criterion 203): the opponent's name as the row's own tappable link (`EntityLink`-styled), a right-aligned "{n} games together" caption, then a three-across mini-stat row in the same label/value shape `StatBlock` already uses at smaller scale — **Wins** (`{mine}–{theirs}`, criterion 197's shared-win-counts-for-both figures), **My win rate** (criterion 197, one decimal place) and **Above me** (the opponent's above-rate, criterion 198, one decimal place). The whole row is the tap target to that pair's shared games (criterion 204, reusing Stage 1's drill-through), same "stretched link" construction as `PlayerGameRow`. Rows order by games together descending, then alphabetically (criterion 203) — never by win rate or above-rate, which would read as a ranking this stat explicitly isn't |
| `NemesisCard` (M3 Stage 2) | player page, directly under "Head-to-head" | Same visual grammar as `RecordCard` — uppercase label, the opponent's name in the display face, one sentence of detail, a chevron tap target through to that opponent's `HeadToHeadRow` — but personal rather than board-wide: no per-holder sample line (there's only ever one subject, the page it's on), no joint-holder list rendered here even though criterion 199 allows joint nemeses (multiple names simply join with "&", same list grammar as everywhere else). **A player with no nemesis** (criterion 201 — every above-rate is zero, or no shared games at all) renders the `RecordCard` no-holder variant verbatim: the value and chevron drop, the fixed sentence **"Nobody's done this yet."** (`BOARD_NO_HOLDER_SENTENCE`, reused rather than a second string invented for the same shape) takes their place. ⚠️ **The label, the opponent-name line and the detail sentence are the one thing on this page not fixed yet** — see *The nemesis card* below |
| `ByRosterRow` (M3 Stage 2) | player page, "By roster" section | Mirrors the roster page's own per-member `<li>` (criterion 208's "read one shared function," criterion 209's "cannot disagree") from the other direction: the roster's name as an `EntityLink` to its roster page with a muted "{n} games" caption beneath, right-aligned win rate (`--num`, one decimal) over a "{wins} of {games}" caption — pixel-identical stat shape to the roster page's member row, just naming the roster instead of the member. Rows carry no ranking or reordering by rate; they read in whatever order the player's rosters naturally list (by most games in that roster, descending, ties alphabetical by roster name — the same "games together" ordering logic `HeadToHeadRow` uses, generalised) |
| `PersonalRecordCard` (M3 Stage 2) | player page, "Streak, in context" section | Two side by side (`grid-template-columns: 1fr 1fr` from 0px — this is two numbers, not a scrolling list, so it never needs to stack): **"Longest winning streak"** and **"The drought"**, each `StatBlock`-shaped with an added chevron and tap target through to that player's own qualifying games. Deliberately not `RecordCard` reused outright — a holder-name line would repeat "you," which is redundant on a player's own page — and deliberately not bare `StatBlock` — these need the tap-through `RecordCard` has and `StatBlock` doesn't. ⚠️ **The drought's own drill-through order needs the same sign-off Stage 1 flagged for the streak** (criterion 186's note, restated here rather than assumed): a run reads as a run in the order it was played, so both cards' drill-throughs render **oldest → newest**, the one deliberate exception to "newest first" this project makes, on both cards for the same reason |
| `GameRow` | games list | Date · venue · roster · winner(s) |
| `ScoreTable` | game view | Running totals as written, toggle for derived hands |
| `PhotoCapture` | add-a-game | `<input type="file" accept="image/*" capture="environment">`, opens the phone camera directly; a paired "Choose a photo" button reaches the system picker. Either way produces a local preview — **nothing uploads yet** |
| `RotateControl` | add-a-game | One 44×44 `IconButton`, `aria-label="Rotate"`. Cycles the preview 0°→90°→180°→270°→0° on tap, one quarter turn per tap. Rotation happens **client-side, before upload** |
| `UploadProgress` | add-a-game | Thumbnail + a determinate `progress` bar and a one-line label. Its error state swaps to `Banner error` + a **"Try again"** `Button` that re-sends the same local photo — never asks the founder to re-photograph |
| `PickList` | venue field, player column header | Bottom sheet: existing entries as 52px rows (44px+ touch target), one **pinned "add new" row** always last. Empty (nothing in the database yet) shows only that row plus a line saying so. Picking "add new" opens a text field and records a **pending** entry, shown with the `new` `Pill` — it becomes a real row in the database only when the game is saved, and matches an existing entry (case/space-insensitive) rather than duplicating it |
| `PairedFlag` | review grid | Both cells of a broken pair get the `err` border, `err-soft` tint and a warning icon, plus **one sentence beneath naming both values** — colour is never the only signal. Template: *"{lower} is lower than the {higher} above it."* |
| `SoftWarning` | review grid | Same shape as `PairedFlag` in `warn` colours, for a value worth a second look that isn't wrong. **Never disables `SaveBar`** |
| `SaveBar` | review screen, sticky footer | `Button` (**"Put it in the book"**) plus one line of helper text beneath it — what's blocking save, or what passing it means. Disabled only by the hard checks (§ Review screen law #9), never by an empty optional field |
| `Seg` | game view | Two-way segmented control, **"As written" / "Per hand"**, swaps `ScoreTable` between the transcribed running totals and the derived hand scores |
| `CropFrame` | review screen, folded into assigning a column's player | A rectangle over the **whole photo**, four 44px corner handles to resize, drag-anywhere-inside to pan. Confirms a column's `crop` — normalised `{x,y,width,height}` covering that column's eleven cells top to bottom. Reopenable at any time from the `PhotoStrip`'s "Adjust crop" corner button |
| `TranscribeProgress` | review screen (Stage 3) | Appears within 2s of submitting a photo for reading (criterion 52) and replaces the column area until a reading or an error arrives. Photo thumbnail, an indeterminate bar (never a determinate one — there is nothing real to measure against a tens-of-seconds model call), and a caption that cycles through 2–3 present-tense lines (*"Finding the columns."* → *"Reading each player's numbers."*), with a third, slower-only line (*"Still going — this one's taking a little longer."*) that earns its place after ~20s so a fast read never shows it |
| `ReadHint` | review grid (Stage 3) | The model's own `least_confident_index`, one per column — deliberately the **weakest** of the three grid signals, weaker than `SoftWarning`. No border or tint on the cell: a small dotted-outline corner badge plus **one muted sentence beneath the grid** in `text-muted`, never a semantic colour (colour still isn't the only signal here — the badge and the sentence are the two). Never appears on a cell that already carries `err` or is unread — a real problem always outranks a mild doubt, so the two are mutually exclusive per cell. Clears the moment the founder edits that cell: their own typed value retires the model's doubt about its own reading |
| `StructureMenu` (Stage 4) | review, opened from a **"Fix something" ghost link** right-aligned above `ActiveColumnCard` | Bottom sheet, six equal-weight 52px rows in the `PickList` row shape: **add a missing column · remove this column · reassign this column's player · reorder columns · insert or delete a value · type it in by hand**, the last set off by a dashed divider but never styled as a last resort (criterion 47). Each row carries a one-line sub-caption. Picking "Reorder columns" or "Insert or delete a value" swaps the sheet's content in place — the same `step`-swapping convention `ReviewScreen` already uses for the player-picker → `CropFrame` handoff — rather than opening a second, nested sheet |
| `ColumnReorderList` (Stage 4) | inside `StructureMenu`, "Reorder columns" step | A **vertical list**, one 44px+ row per column in current left-to-right order, each row a status dot + player name plus **two 44×44 `IconButton`s (up/down)** that swap it with its neighbour. The top row's "up" and the bottom row's "down" are `disabled` rather than silently doing nothing. A **"Done"** primary button commits. See *Reordering columns* below for why up/down beat drag-and-drop |
| `CellEditor` — **"Fix the shape"** (Stage 4) | inside `CellEditor`, below the previous/next-line row | A `ghost` link that expands **in place inside the same sheet** (no nested sheet) into three actions relative to the line already open: **"Insert a blank line above"**, **"Insert a blank line below"**, **"Delete this line"** (the last in `ghost` shape with `--error` ink and a trash icon — a documented one-off variant, not a new `Button` kind). Each opens a one-sentence confirm naming what shifts and what the column will read afterwards (`columnStatusLabel`, verbatim: *"12 of 11"* / *"10 of 11"*), then a **Cancel**/commit pair. See *Insert or delete a value* below |
| `ReadingCompare` (Stage 4) | review, **replaces the active column's card content** — the same in-place convention `TranscribeProgress` established in Stage 3, not a dialog | Two columns of eleven rows sharing the grid's row pitch: **"Saved now"** against **"New close-up"** (or, when browsing history, any two named readings). A differing row gets the neutral `--sunk` tint already used for wells — deliberately **not** a semantic colour, because a difference is neither right nor wrong — plus a small swap icon and, beneath the grid, one plain sentence naming every differing line (*"4 lines differ from what's saved: 8s, 9s, 10s, Jacks."*). Footer: **"Keep the new reading"** (`primary`) and **"Keep what's saved"** (`ghost`) stacked full-width, a **"Photograph again"** `accent` link (the column is re-shootable without limit, criterion 41), and a **"See every reading (n)"** `ghost` link into the version list below. When comparing two past readings rather than newest-vs-saved, the two footer buttons relabel to **"Make {reading} active"** / **"Keep {reading} active"** — same component, generalised copy, no new screen |
| `ReadingHistoryList` (Stage 4) | review, opened from `ReadingCompare`'s "See every reading" link | Bottom sheet, `PickList`-shaped rows: source (*full sheet* / *close-up*), a timestamp, and an **"Active"** `ok` `Pill` on the one currently in use. Every reading a column has ever had is listed, not only the one directly before the newest (criterion 41) — tapping any other row opens `ReadingCompare` against it |
| `WrongColumnWarning` (Stage 4) | `ReadingCompare`, above the grid | A `Banner warn` — **non-blocking**, same shape as everywhere else `Banner` is used: *"This looks like {sheet player}'s column, not {assigned player}'s."* / *"The close-up's own reading of the name doesn't match — you can use the new numbers anyway."* Neither footer button is disabled underneath it |
| `TypedCellDisagreement` (Stage 4) | `ReadingCompare`, beneath one specific row | The row keeps its ordinary "changed" tint, and additionally gets the `SoftWarning` treatment (`warn` border, tint, icon) **layered on, not swapped in** — because only this row carries an extra fact its neighbours don't: the founder typed that value by hand. Fixed sentence, named per-cell: *"You typed {typed}; the close-up reads {read}."* Never a generic banner — criterion 43 requires the specific cell |
| Column-scoped `TranscribeProgress` (Stage 4) | review, in place of `ActiveColumnCard`, while a close-up is being read | Same component as Stage 3's full-sheet read, narrower copy: heading *"Reading {Player}'s column…"*, captions *"One column, eleven numbers."* → the existing slow-only line after ~20s. The pager dot for that column shows a hollow **accent** ring (not `todo`'s hollow neutral ring) while the read is in flight, so it reads as "busy, camera path" rather than "incomplete" |
| `EntityLink` (Stage 3) | game view's "How it finished," games list rows, player and roster pages' own games lists | The one new inline-link idiom this stage introduces: a player or roster **name appearing away from its own page**, rendered `--brand` and **underlined** (`text-underline-offset: 2px`) — colour is never the only signal that it's tappable, same reasoning the rest of the system already applies to status. On a winner's row in `FinalRow` the link recolours to `--success` (it inherits that row's existing colour/bold/crown treatment) but **keeps its underline**, so "this is a link" and "this is the winner" stay two separate signals layered on the same text, never collapsed into one. Every `EntityLink` gets a real 44px-tall tap target via padding, not by resizing the visible text |
| `IndexNav` (Stage 3) | games list, directly under "Add a game" | Criterion 174's answer to "all three index pages reachable from the games list": three equal-width `ghost`-shaped tiles in a row (`grid-template-columns: repeat(3, 1fr)`), each ≥48px tall — **Players**, **Rosters**, **Places** — an inline SVG glyph above or beside the label, brand-coloured, never an icon alone (the label is always visible text, so this isn't an icon-only control). Always present, never conditional on the games list having content, because the three index pages are worth reaching even from the empty state |
| `IndexRow` (Stage 3) | players index, rosters index | The whole row is a `Link` (unlike `PlaceRow` below, which isn't one) — 52px+ tall, `PickList`-row shaped: a name in the display face, an optional muted second line (a roster's member list), and a right-aligned games-played count in the same uppercase-label-over-`--num`-value shape `StatBlock` uses. Players index: name only. Rosters index: name plus its members on a second line |
| `StatBlock` (Stage 3) | player page, roster page | The admin usage panel's own label/value shape (`docs/DESIGN-SYSTEM.md` § "Admin panel — usage and spend"), formalised as a named, reusable unit now that a third screen needs it: uppercase `--text-xs` label, a `--num`-sized tabular value, and — wherever criterion 133 requires it — a muted one-line **sample-size caption** underneath (*"4 of 9 games"*). Three sit in a row (`grid-template-columns: repeat(3, 1fr)`) at the top of the player page; the roster page uses a single one for "Games played," since its per-member numbers get their own list, below |
| `PlaceRow` (Stage 3) | places index | Unlike `IndexRow`, **not** a `Link` — there's no place page for it to lead to. Name, an optional muted caption on a never-used venue, a right-aligned games-played count (0 renders like any other number), and the row's `RenameControl` trigger |
| `RenameControl` (Stage 3) | roster page (its own name); places index (per row) | A `ghost` **"Rename"** link that reveals a `Field` in place — no separate screen, same "reveal the form in place" convention `AdminKeyPanel`'s "Replace key" already established. Roster page: one control, above the stats, for the roster's own name. Places index: one per row, opened by a 44×44 pencil `IconButton` (**Stage 4: `aria-label="Edit {place}"`, changed from "Rename {place}"** — see `PlaceRowActions` below) rather than a text link, because the row has no spare width for a label. Both share the same footer shape — `Cancel` (`ghost`) then **"Save name"** (`primary`) — and the same non-blocking-warning-vs-blocking-refusal split described under *Renaming* below |
| `SuggestedMatchPill` (Stage 4) | review screen, `ActiveColumnCard` header | The **only** new visual signal a pre-selected suggestion gets: a `Pill tone="neutral"` reading **"Suggested"**, shown beside the column's player name only while that column's assignment came from criterion 172's auto-match and has not yet been touched by the founder. Cleared the instant the founder opens that column's name control and picks anything — including re-picking the same player — same "their own action retires the model's doubt" reasoning `ReadHint` already established for cells. Never blocks anything, never requires a tap to dismiss: the column is already assigned for the save gate (criterion 172) whether or not this pill is showing |
| `ReadAsCaption` (Stage 4) | review screen, `ActiveColumnCard` header | A small `text-muted` line directly under the column's player name — **"Read as {sheetName}."** — present on **every** column once a transcription exists (criterion 153), not only suggested or mismatched ones. An unassigned column doesn't get one: its heading already *is* the handwritten name, so there's nothing separate to echo |
| `PlaceRowActions` (Stage 4) | places index, replacing `RenameControl`'s direct-to-`Field` behaviour | The pencil `IconButton` now opens a two-row chooser in the same in-place reveal slot, rather than jumping straight to the rename `Field`: **"Rename"** (pencil icon, sub-caption "Give this place a different name.") and **"Merge with another place…"** (a new converging-arrows icon, sub-caption "Combine it with a duplicate — the games move, one place goes away."), each a 52px row in the same shape `StructureMenu`'s equal-weight rows already use. Picking "Rename" swaps the slot to Stage 3's existing `Field` editor, unchanged. Picking "Merge…" opens `MergeTargetPicker` below. `PlaceRow` itself is pixel-identical to Stage 3 at rest — only its pencil's `aria-label` changes, from "Rename {place}" to **"Edit {place}"** |
| `MergeTargetPicker` (Stage 4) | player page's "This is the same person as…"; `PlaceRowActions`' "Merge with another place…" | A `BottomSheet` holding a `PickList`-shaped list of every *other* player or place — no "add new" row and no "someone new" row, since neither concept applies to picking a merge target. Each row's games-played count is shown as secondary text (an existing duplicate is often the one with almost no games), same shape `IndexRow` already uses. Heading: **"Merge {name} with which player?"** / **"Merge {name} with which place?"** |
| `MergeConfirmScreen` (Stage 4) | reached from `MergeTargetPicker` (players and places both) | A full screen, same two-deliberate-actions shape as "Deleting a game": arriving here is the first action, tapping **"Merge permanently"** is the second. Names both records via two `survivor-card` rows (radio-style, `aria-pressed`, same `--sunk`-highlight idiom `PickList` already uses for a selected row) each showing games-played; **neither is pre-selected** (criterion 156). Once one is picked, both cards immediately carry a `Pill` — **"Stays"** (`tone="ok"`) on the chosen one, **"Deleted"** (`tone="err"`) on the other — and two plain sentences appear beneath (not a `Banner`; same "plain text under the heading" precedent "Deleting a game" set): what moves, and the no-undo/no-record line. `Cancel` (`ghost`) then **"Merge permanently"** (the same documented `ghost` + `--error`-ink + icon destructive variant "Delete permanently" already established, disabled until a survivor is picked) |
| `MergeConflictRefusal` (Stage 4) | `MergeConfirmScreen`, players only | Where the two players share a game, this **replaces** the entire survivor-picker — not a `Banner` sitting above a still-enabled one. A `Banner error` naming both players and that they share a game, then every offending game listed as an `EntityLink` plus an **"Edit this game"** link, then a single **"Back to {player}"** `ghost` button. Nothing resembling a choice renders while the conflict stands (criterion 160). Places have no equivalent state: a game has exactly one location, so two places can never both be "in the same game" |
| `RecordCard` — single-event variant (M3 Stage 3, criteria 228–233) | records board, five new cards | Renders exactly like the ordinary `RecordCard` when the record has **one instance** (the common case): holder name, the number, then **the game's date in place of the sample line** — `"on {date}"` — never `"from {n} games"` (criterion 233). The catastrophe's single-instance card additionally states the hand on that same line: `"{hand} · {date}"`, since criterion 230 requires the hand named even with one holder. Unit text sits beside the number exactly like every other card (`"178 final score"`, `"41 points in one hand"`, `"8 zero-point hands"`, `"52 point margin"`) |
| `RecordCard` — instance list (M3 Stage 3, criteria 228, 230–231) | records board, only when a single-event record is **tied** | Replaces the plain holder-name line with a stacked list of **instance rows** — one per (player, game) pair that shares the tied number, each showing the player's name and its own date (`RecordInstanceRow`: name left, date right, `--text-muted`, `13px`). ⚠️ **Not the same grammar as criterion 181's joint holders** — 181 lists each *person* once against one shared count; this lists each *event*, so the same player's name can legitimately appear twice with two different dates (criterion 228's own example) or, for the catastrophe, two different hands (`"{hand} · {date}"` per row, criterion 230's own example). An instance row's own player field can itself be a criterion-181 joint name (a hammered game's shared winners), nesting the ordinary grammar one level in rather than inventing a third. Rows order alphabetically by player, then by date — never a ranking of the instances |
| `StatsNavLink` (M3 Stage 3, criterion 236) | records board, directly under `BoardNav`; games list, directly under `IndexNav` | A single full-width `ghost` button, **"See all the stats"**, linking to `/stats`. Not folded into `BoardNav` (which stays the two fixed buttons criteria 179/191 specify) and not a fourth `IndexNav` tile (which stays the three equal-width entity indexes criterion 174 specifies) — `/stats` is one page, not an index of many entities, so it gets its own link rather than distorting either fixed component. Rendered on every state of both screens it appears on, same "always reachable" precedent as its neighbours |
| `HandTrendBars` (M3 Stage 3, criteria 225, 237–238) | `/stats`' "The eleven-hand trend"; player page's "Eleven-hand profile" | Eleven rows, one per hand (`3s` … `Kings`), each a label, a horizontal bar (`--brand` fill on a `--sunk` track, decorative, `aria-hidden`) and **the mean printed as real text** beside it — never only a bar (criterion 237, 247's "text equivalent"). The archive-wide instance on `/stats` states its sample once above the list (games, players, hand-scores behind it) and carries **`HAND_DERIVATION_HONESTY_LINE`** (fixed strings, below) beneath it, set off by a dashed rule. The player-page instance is the same component with one player's own means, worst hand marked (below), and no honesty line repeated a second time on the same page as the board's wording rules already govern it once per screen it appears on |
| Worst-hand marker (M3 Stage 3, criterion 226, 239, 247) | `HandTrendBars` (player page); `VillainsTable` (`/stats`) | A small filled star `<svg>` plus bold, `--accent-ink`-coloured text on the marked value — three signals together (icon, weight, colour), never colour alone. Ties are joint: every hand at a player's own highest mean is marked, not just one |
| `VillainsTable` (M3 Stage 3, criteria 225–226, 239, 247) | `/stats`, "Hand-by-hand villains" | Every player as a row, the eleven hands as columns, each cell a mean to one decimal. The player-name column is sticky-left, the header row sticky-top, and the whole table sits in its own `overflow-x: auto` wrapper — the page itself never scrolls horizontally (hard rules). Each row's own game count sits as a muted caption under the player's name, not a twelfth column. The worst-hand marker (above) appears once per row, on that player's own highest mean |
| `DisasterRow` / disasters list (M3 Stage 3, criterion 240) | `/stats`, "Biggest single-hand disasters" | `GameRow`-shaped rows reused for a different claim: rank, player (display face), hand and date on a muted second line, the score right-aligned in tabular type, the whole row a tap target to that game. Exactly **`SINGLE_HAND_DISASTERS` (10)** rows normally; ⚠️ **a tie at the last place adds rows rather than cutting one** (criterion 240), so the list can run to eleven or twelve, and every tied rank number repeats (two rows can both read "9") rather than skipping to compensate |
| `AveragesTable` (M3 Stage 3, criteria 223–224, 242) | `/stats`, "Averages" | Two plain lists in one `Card`-shaped section, headed **"Players"** and **"Rosters"**: a name (`EntityLink`), a muted sample caption (`"{n} games"` for a player; `"{games} games · {scores} scores"` for a roster, criterion 224's dual sample), and the average right-aligned in tabular type. ⚠️ **No ranking decoration of any kind** — no crown, medal, or 1st/2nd/3rd, matching `RecordCard`'s own precedent (criterion 242); rows sit alphabetically by name, the same neutral order `VillainsTable` and every other Stage 3 list uses |
| `PersonalGameCard` (M3 Stage 3, criteria 228–229, 243) | player page, "Best and worst game" | Two side by side (`grid-template-columns: 1fr 1fr`, never stacking — two numbers, not a list), `StatBlock`-shaped with an added chevron and tap-through to that one game: **"Best game"** and **"Worst game"**, each showing that player's own score and the game's date as its caption (not a game count — this is one event, same reasoning as the board's single-event cards). Deliberately distinct from the board's "best/worst game ever" cards, which name the archive-wide holder; these two are always about the page's own player and never repeat their name |
| `FunFactCard` (M4, first slice) | records board, directly below `ArchiveLine` | One line of italic display-face text in a dashed-border `--surface` well — deliberately not `RecordCard` (no uppercase label, no chevron, no `--num-lg` value) and not `ArchiveLine` (not the flat `--sunk` box), so this reads as an aside, not a thirteenth board card or a second archive-size line (criterion 292). The whole card is the tap target where the fact has one, `aria-label`led with the sentence itself; the flatliner, the comeback and a random old night link to a single game, current drought and the slump link to that player's own page, rivalry needle links to the existing head-to-head drill-through (M3 Stage 2) — overdue and collective trivia render as plain, unlinked text, having no single game or player to point at. Absent entirely on an empty archive and whenever the fact pool comes back empty (criterion 292: no fact slot at all, never an empty one) |

## Screen rules

- **Password gates** (`/login`, admin prompt): no `AppBar`; the `h1` in the display face is the
  wordmark. The admin prompt adds a `ghost` **"Back to games"** button under the submit button, and
  (Stage 1) a second `ghost` link beneath it, **"Forgotten the admin password?"**, to the recovery
  procedure documented in the README — no new control, same slot the "Back to games" link
  established.
- **Games list, empty**: a `Card` saying so, plus a `primary` **"Add a game"** button linking to the
  add-a-game route. Until that flow ships, the route renders a plain holding page; the button is
  never hidden, because an empty list must always offer the way in.

- **Add-a-game screen.** ⚠️ **Photo first, always** — there is no draft, and nothing else on this
  screen, until a sheet photo exists. The screen has two moments:
  1. **Get the photo.** `PhotoCapture` opens the camera directly (criterion 6); "Choose a photo"
     sits beside it as an equal-weight `ghost` button, not a fallback. Once a photo is picked, its
     preview appears with `RotateControl` under it and a caption — *"Turn it until it's the right
     way up."* Only once the founder has rotated it (or confirmed it's already upright) does a
     **"Use this photo"** primary button appear; tapping it is the upright-confirmation and starts
     the upload (`UploadProgress`). Nothing is sent to the server before this tap.
  2. **Choose how the numbers go in**, shown only once the photo has finished uploading. Two
     equal-weight options, never one above the other as if the second were a fallback:
     - **"Read the sheet"** — the automatic path. `primary` weight, with the helper line *"We'll
       read the numbers off your photo — you still check every one next."* Wired up from Stage 3:
       tapping it creates the draft, kicks off the vision call, and hands straight to the review
       screen already showing `TranscribeProgress` (below) — the founder never watches a spinner on
       this screen itself.
     - **"Type it in by hand"** — `ghost` weight, equal reach, with the helper line *"We'll skip the
       automatic read. Your photo's already saved."* This is the phrasing the lead specified: it
       reads as skipping a read that would otherwise happen, never as recovering from one that
       failed. It was the only live path in Stage 2; from Stage 3 both cards render together, same
       pattern as `PhotoCapture`'s camera-vs-gallery pairing.
     Either choice hands off to the review screen with the draft already created and the photo
     attached (criterion 46, first half).

- **Upload state, and its error state.** While the two JPEGs are being written to S3,
  `UploadProgress` shows the photo's own thumbnail (so the founder recognises what's uploading) and
  a determinate bar — never an unlabelled spinner. On failure: `Banner error` — **"That didn't
  upload."** / *"Check your connection and try again."* — and a **"Try again"** button that retries
  the same local photo without reopening the camera or picker (criterion 53's "never asks for a
  re-photograph" applies here too, not only to the transcription call).

- **Review screen — date.** `Field` labelled **"Played on"**, a native date input styled to the
  52px `Field` spec, defaulting to today (criterion 58). Always editable, never disabled.

- **Review screen — venue.** `Field` labelled **"Where"**, backed by `PickList`. Pre-selected to
  the most recently used venue (criterion 59); one tap opens the sheet to change it. On a fresh
  database the sheet holds only **"Add a new one"** plus the line **"No venues yet."** Selecting
  "Add a new one" opens a text field; what's typed becomes a **pending** venue on the draft — shown
  in the "Where" field with the `new` `Pill` — resolved against existing venues (trimmed,
  case-folded) only when the game saves (criteria 60, 62). The sheet always offers an explicit
  **"No location"** row so clearing the field is a deliberate choice, not an accidental empty
  state; a game saved with no venue shows **"No location"** everywhere it would otherwise show a
  venue (criterion 61).

- **Review screen — player, per column.** Each column header carries the handwritten name (once
  transcription exists) or a placeholder, with a control to open `PickList` scoped to players. On
  the very first game the list is empty and every column goes straight to **"Someone new"** with
  the line *"Nobody's in the book yet — add everyone's name."* Picking "Someone new" on any later
  game records a **pending** player the same way a pending venue works — the `new` `Pill` on the
  column header, resolved only at save (criterion 63). ⚠️ **An abandoned draft leaves nothing
  behind**: no pending player or venue becomes a real row unless the game is actually saved.

- **Review screen — the suggested match (Stage 4, criteria 148–154, 172–173).** Matching now runs
  before the screen first renders, and its result decides the column's *starting* state — nothing
  about the pick-list itself, `PickList`, `CropFrame` or the save gate changes shape.
  - **A confident suggestion (≥ 0.80, clear leader)**: the matched player is **already selected**
    when the screen renders. The column counts as assigned for the save gate exactly as a
    hand-picked one does (criterion 172) — ⚠️ **no new blocking state, no "unconfirmed" badge**. The
    one visual difference is `SuggestedMatchPill` (component inventory, above) next to the player's
    name, plus `ReadAsCaption` beneath it reading **"Read as {sheetName}."** — present on every
    column once a transcription exists, suggested or not (criterion 153), so a wrong suggestion is
    visible without opening the picker. Opening the column's name control and choosing anything —
    even re-confirming the same player — clears the pill for good.
  - **A near match, an ambiguous tie within 0.10, or nothing plausible (criterion 173)**: the column
    renders **unassigned**, exactly as M1 — heading is the handwritten name itself in muted italic,
    a `Pill tone="warn"` reading **"Needs a player"**, "Who is this column?" in place of "Not
    {player}?". Its `PickList` sheet opens with a **"Closest matches"** section (up to the best two
    or three, in the order criterion 173 ranks them) pinned above the ordinary alphabetical roster,
    separated by the same divider rule the "add new" row already uses — an ordering change to the
    existing sheet, not a new component. "Someone new", pre-filled with the handwritten name, stays
    pinned last regardless.
  - Wording throughout stays inside the same banned-word list as everywhere else on this screen: a
    suggestion is never *checked, validated, verified, confirmed, correct* or *looks right*
    (criterion 154) — "Suggested" and "Read as" are the only two new words this adds.

- **Review screen — setting a column's crop.** Stage 2 has no transcription to supply where a
  column sits on the photo, so the founder shows it, once per column. This is **not a separate
  setup step** — criterion 13's "no configuration step" applies here too — it is the second half of
  assigning that column's player, on the same sheet. The moment a player is picked or a pending
  name confirmed in `PickList`, the sheet doesn't close: it swaps to `CropFrame` over the whole
  upright photo, heading **"Show us {player}'s column."**
  - **The starting guess**: the photo's width divided evenly by the number of columns, this
    column's share by its left-to-right order, full height. Faint guide lines mark the other
    columns' shares so the founder can see the whole split at a glance. Caption: *"We've guessed
    evenly — drag to line it up."*
  - **Adjusting**: drag anywhere inside the frame to pan, drag a corner (44px handle) to resize —
    one gesture family covers the first set and every later nudge, nothing new to learn the second
    time.
  - **Confirming**: a **"Use this crop"** primary button. If the guess is already close enough this
    is the entire interaction, one tap.
  - **Fixing it later**: `PhotoStrip` carries a 44px **"Adjust crop"** corner button that reopens
    `CropFrame` pre-filled with the current rectangle, any time paper line 7 isn't level with screen
    line 7.
  - **Before a crop exists** (`crop: null` — a column just added structurally, say): `PhotoStrip`
    shows the whole photo scaled to fit, captioned **"Not lined up yet"** with a **"Set the crop"**
    ghost button — never a blank space (criterion 15 applies to this state too).
  - **In the cell editor** (criterion 16a): the strip beside the keypad is the same crop,
    auto-scrolled so the edited row sits centred — the crop isolates the column once, and every row
    within it is a vertical offset, `(crop height ÷ 11) × row index`. If `crop` is still `null` here,
    the same whole-photo-plus-"Set the crop" fallback appears, with a faint band at the row's
    approximate position (`row index ÷ 11` of the photo's height) so there's still something to look
    at while the founder fixes it.

- **Review screen — column status.** Each `ColumnPager` chip carries a status dot: filled `ok`
  (climbing, all eleven present, nothing flagged), `warn` (a soft warning present), `err` (a
  `PairedFlag` present), or hollow `todo` (incomplete). The active column's card header shows a
  `Pill` reflecting the same state — reading **"{n} of 11"** while incomplete (criterion 25,
  literal wording: *"10 of 11"*, never a shorter grid presented as complete) — and no pill at all
  once a column is complete and clean, so a pill on screen always means there is something to look
  at.

- **Review screen — the read in progress (Stage 3).** The moment "Read the sheet" is tapped, the
  review screen shows `TranscribeProgress` in place of the `ColumnPager`/grid, within 2 seconds
  (criterion 52) — the model call itself can take tens of seconds, so this has to feel alive, not
  stuck. No claim of measured progress; the bar is indeterminate and the caption cycles through
  honest, present-tense lines. The photo is still on screen throughout, per the "photo never absent"
  rule — it's the same thumbnail the founder just confirmed upright.

- **Review screen — the transcription arrives.** ⚠️ **A freshly-read cell is styled identically to
  a hand-typed one.** There is no "just read" decoration anywhere on the grid — the only visual
  distinction that exists at all is filled vs. not-yet-filled, which is the same distinction Stage 2
  already used for manual entry. Decorating a model-read cell differently would teach the founder to
  scrutinise it less, which is exactly backwards: monotonicity catches nothing (see
  `docs/ARCHITECTURE.md`), so every cell earns the same scrutiny whatever put the number there.

- **Review screen — a cell the model couldn't read.** Comes back `null`. ⚠️ **This reuses Stage 2's
  existing unread-cell pattern exactly** — the dashed `text-muted`/`sunk` cell, the `{n} of 11` `Pill`
  (criterion 25), the hollow `todo` pager dot — nothing new. A model's blank and a founder's blank
  are the same kind of blank, and get the same treatment.

- **Review screen — the model's own doubt (`ReadHint`).** `least_confident_index`, one per column,
  is a **hint, not a hard flag** — weaker than `SoftWarning`, which is itself already non-blocking.
  It never uses *checked, verified, confirmed* or implies the cell is wrong: the fixed sentence is
  *"Least sure about the {hand} in this column."* No border or tint on the cell — just the small
  dotted corner badge plus that one muted sentence beneath the grid. Suppressed entirely on any cell
  that already carries `err` (paired flag) or is unread — a real problem always outranks a mild
  doubt, so a cell shows at most one of the three signals. Clears the instant the founder edits that
  cell.

- **Review screen — an API error or timeout.** `Banner error` — **"That didn't finish."** / *"Check
  your connection and try again."* — with a **"Try again"** button that re-runs the vision call
  against the photo already in S3. ⚠️ **Never a re-photograph** (criterion 53) — same non-destructive
  shape as the Stage 2 upload-retry. **"Type it in by hand" sits at equal reach directly below it**,
  so a bad read is never a dead end.

- **Review screen — the daily transcription cap.** `Banner warn` (not `error` — this is an expected
  limit, not a failure) — **"That's today's reads used up."** / *"Try again tomorrow, or type this
  one in by hand — it's already saved."* Manual entry remains fully available beneath it (criterion
  56); nothing else about the screen changes. ⚠️ **A distinct cap from the upload cap and the column
  re-read cap** (`usage_day.sheet_transcriptions`, separate from `.sheet_uploads` and column re-reads
  per `docs/ARCHITECTURE.md`) — re-photographing a single column stays available even when this one
  is hit.

- **The paired flag.** Both cells of a pair that breaks monotonicity get the `err` border, the
  `err-soft` tint and a warning-triangle icon (`PairedFlag`), plus one sentence beneath the pair
  naming both numbers: *"{lower} is lower than the {higher} above it."* — e.g. *"11 is lower than
  the 67 above it."* All four signals present together; colour alone never carries this (criterion
  21). Clearing the flag (editing either cell back into order) removes all four immediately, no
  round trip (criterion 22).

- **The soft warning.** Same visual grammar as the paired flag, in `warn` colours: border, tint,
  icon, sentence — e.g. *"51 on the 6s — a big one, saved as written."* ⚠️ **It never disables
  `SaveBar`.** A soft warning is information, not a gate (criterion 27).

- **The save area.** `SaveBar` is sticky at the bottom of the review screen. The button reads
  **"Put it in the book"** in every state; only its `disabled`/busy styling changes (Hard rules
  already forbid disabling a `Button` for an empty optional field — the save button is disabled
  only by the hard checks). The helper line beneath it is the **only** place the screen says what
  passing means, and it never uses *checked, validated, verified, confirmed, correct, looks right*
  or *all good* — see the fixed copy table below, which is exhaustive: developers use these strings
  verbatim, not paraphrases.

- **Game view.** `ScoreTable` shows the eleven running totals **in the paper's column order**
  (criterion 70), with `Seg` ("As written" / "Per hand") to bring the derived hand scores alongside
  without losing the transcribed layer. `FinalRow` is called out on its own beneath the table, with
  winner(s) marked by crown icon, bold label and `--success` colour together — never colour alone —
  and both names shown when the game was shared. `SheetPhoto` sits underneath, pinch-zoomable and
  pannable, with any accepted or rejected close-ups attached to the column they belong to
  (criterion 71, Stage 4 — the game view's layout for it exists from Stage 2 even though nothing
  populates it yet).

- **Games list row.** `GameRow`, newest first: date in the display face, then venue-or-**"No
  location"** and the roster name on one muted line. The roster name is the roster's own name or, until someone
  names it, **its members' display names in alphabetical order (ignoring case), joined as
  "Player A, Player B, Player C & Player D"** ("Player A & Player B" for two). The row truncates it
  with an ellipsis if it doesn't fit, and the game view shows it in full (criterion 68), and the winner right-aligned — a single name,
  or **"{A} & {B} — shared"** when the game was tied (criterion 69).

- **Admin panel — the API key screen.** ⚠️ **The panel is plain** — no jokes anywhere near the key.
  One `Field` (masked, `type="password"`, with a show/hide toggle in its existing `trailing` slot —
  no new control), one `Button`. States:
  - **Empty** (no key ever set): a `Card` — *"No key set yet."* / *"Nothing can be read from a photo
    until one is added."* — above the field and a **"Save key"** primary `Button`.
  - **Saving**: field disabled, button busy per the standard rule (`disabled` + `aria-busy` +
    present-tense-with-ellipsis: **"Testing…"**), plus a line beneath — *"Testing the key with a real
    call — this can take a couple of seconds."*
  - **Just saved**: `Banner ok` reading, **verbatim** (this exact sentence is a real constraint, not
    copy that can be softened — see `docs/ARCHITECTURE.md` § Staleness after rotation) —
    **"Saved."** / *"In use everywhere within a minute."* — sitting above the resting status card,
    below.
  - **Just rejected**: `Banner error` — **"That key didn't work."** / *"Check it and try again — the
    key you had before is untouched."* ⚠️ The status card beneath it is **unchanged** — still names
    the previous key's last four characters and its own last-checked time. A rejected paste touches
    nothing (criterion 77).
  - **Resting — working** (the ordinary state on every later visit, no banner because nothing just
    happened): a `Card` naming the key by its **last four characters**, **when it was set**, and a
    `Pill` — **"Working"** — sourced from the **last recorded successful use**, not a fresh test.
    Visiting `/admin` never itself spends a call. A **"Replace key"** `ghost` button reopens the
    form.
  - **Resting — not working right now**: the same card, `Pill` — **"Not working"** — in `err`
    tone, with both **last worked** and **last failed** timestamps. ⚠️ **This is the state Stage 2
    had no way to represent at all**, and it matters most: a key can go bad on its own (revoked, hit
    its console spend limit) with no save action to trigger anything, so "whether it currently
    works" has to be a standing fact built from the last successful and last failed use — never only
    spoken once at save time. Finding this out from the admin panel, calmly, beats finding it out
    standing at the table with a sheet to photograph.
  - The key is **never rendered back** in any state (criterion 76) — every card above shows only
    last-four, a date, and a status `Pill`.

- **Admin panel — changing the group password** (Stage 1). Reuses the API-key screen's shape
  exactly: one `Field` (masked, `type="password"`, show/hide toggle in its existing `trailing`
  slot), one primary `Button`. ⚠️ **No current-password field** — `docs/PRD.md`'s Milestone 2
  user stories say why: the reason to rotate this password is often that you've lost control of it,
  and demanding proof of the old one would be the one place the product locks you out on purpose.
  Only the length
  rule is new (12 characters minimum, reveal control, same `Field`). Above the field, a `Banner warn`
  is shown **before** the button is even usable — this is a warning about what submitting will do,
  not a result of having submitted — reading the fixed copy below. Busy and success states follow
  the existing `Button`/`Banner` rules (`disabled` + `aria-busy` + present-tense ellipsis; a plain
  confirmation banner once it's done). No new component anywhere on this screen.

- **Admin panel — changing the admin password** (Stage 1). Three `Field`s stacked (current, new,
  confirm — masked, same show/hide slot), a length helper line, one primary `Button`. The one line
  of reasoning for why this form alone asks for the current password sits directly beneath the
  current-password field as ordinary helper text (`--text-sm`, `--text-muted`) — not a `Banner`,
  because nothing risky is about to happen and a banner would overstate it. A wrong current password
  is a normal form error: the field gets the standard invalid state, no new pattern. On success, every
  admin session dies including this one, so the redirect to the admin login **is** the confirmation —
  no toast, matching the save-area rule already in force for the review screen.

- **Admin panel — downloading the scores** (Stage 1). A `Card` in the same bold-first-line /
  second-line shape the API-key screen already uses for its resting states, holding the fixed copy
  below, plus one primary `Button`. ⚠️ **The word "backup" appears only to deny it** — the card's job
  is to say plainly what the file is and isn't before anyone taps the button, not after. No `Banner`
  needed here: nothing has gone right or wrong yet, it's a standing fact, which is exactly what
  `Card` is for elsewhere in this panel (compare the API key's resting-state card).

- **Admin panel — usage and spend** (Stage 1). A `Card` holding three label/value pairs in the same
  uppercase `--text-xs` label over `--num` value shape `RecordCard` already uses on the records board
  (no holder, no sample size — this isn't a record, just three numbers, so it borrows the type
  treatment, not the component), plus one line for the A$ estimate and its disclosure, plus today's
  two cap lines. ⚠️ **A month with nothing transcribed still renders every value** — zeroes and
  `A$0.00`, never a blank, a dash, or an error state; there is nothing to be empty about, a month
  with no reads is a fact like any other. No `Banner`, no `Pill`: this section is read-only
  arithmetic, not a status.

- **Reordering columns** (Stage 4, criterion 32). Opened from `StructureMenu`. ⚠️ **Decision: 44px
  up/down move buttons on a vertical list, not drag-and-drop, and not left/right chips.** Drag is
  fiddly with fat thumbs and buys nothing here; the sheet these repairs live in is already vertical
  (same shape as `PickList`), so a vertical list with per-row up/down `IconButton`s reuses that shape
  exactly, gives every row a real 44×44 target, and works with a keyboard or screen reader for free —
  a boundary row's inapplicable direction is simply `disabled`, never a dead tap. Reordering carries a
  column's crop, its hand edits and its close-up photos with it; none of that state is
  position-dependent, so moving a column changes nothing about it except where it sits.

- **Insert or delete a value within a column** (Stage 4, criterion 33). Lives inside `CellEditor`,
  not a separate screen — the line already open when the founder notices an off-by-one **is** the row
  picker, reached via the existing previous/next-line controls before "Fix the shape" is opened.
  Inserting always leaves **twelve** values (a blank row shifts everything below it down one) and
  reports **"12 of 11"**; deleting leaves **ten** and reports **"10 of 11"** — both the literal,
  existing `columnStatusLabel` string, never new copy for "too many" versus "too few". Each action
  asks exactly once, naming what will shift and what the column will read afterwards, before
  committing. ⚠️ **While a column holds other than eleven rows** (mid-repair), rows are labelled by
  plain position — *"1st", "2nd"* … — instead of card ranks, and revert to *3s … Kings* the instant
  the column is back to eleven. Nothing else about `CellEditor` changes shape for this.

- **Photograph this column** (Stage 4, criteria 36, 37). Offered from `ActiveColumnCard` as a
  full-width `accent` button — camera icon, **"Photograph this column"** — on **every** column,
  always, not only ones the app is unsure about. Tapping it opens a small capture sheet headed
  **"Photograph {Player}'s column."** with the same camera-direct / "Choose a photo" pairing as
  `PhotoCapture`, in `accent` rather than `primary` weight (this is the camera/re-read family, same
  token as everywhere else it appears). ⚠️ **Never worded as double-checking, confirming, or a second
  opinion on the earlier read** (criterion 45) — the fixed helper line is *"A close-up gives the
  reader far more pixels per digit than the whole page did — new pixels, not a second opinion."` Once
  a photo is chosen, the sheet closes and the column area itself carries the rest — upload, then the
  column-scoped `TranscribeProgress`, then `ReadingCompare` — the same in-place convention Stage 3
  established, never a new modal for the reading itself.

- **The old-vs-new comparison** (Stage 4, criteria 38–41). `ReadingCompare` replaces the active
  column's card content the moment a close-up reading returns. Differing lines are highlighted with
  the neutral `--sunk` tint (not a semantic colour — a difference is neither right nor wrong) plus a
  swap icon and a summary sentence naming every differing line. **"Keep the new reading"** and **"Keep
  what's saved"** are both always enabled; keeping the old is one tap, no re-upload. **"Photograph
  again"** stays reachable from the same screen — the same column can be re-shot as many times as it
  takes. ⚠️ **Every reading a column has ever had is retained and reachable, not only the one directly
  before the newest** (criterion 41): "See every reading (n)" opens `ReadingHistoryList`, and tapping
  any past reading opens the same `ReadingCompare` generalised to that pair, with its two buttons
  relabelled **"Make {reading} active"** / **"Keep {reading} active"**.

- **Two non-blocking callouts on `ReadingCompare`** (Stage 4, criteria 42, 43). The **wrong-column
  warning** is a `Banner warn` above the grid when the close-up's own read of the handwritten name
  disagrees with the column it was shot for — *"This looks like {sheet player}'s column, not
  {assigned player}'s."* — with both footer buttons left fully enabled underneath it. The
  **typed-cell disagreement** is layered onto one specific row, not a generic banner: that row keeps
  its ordinary "changed" tint and additionally gets the `SoftWarning` treatment naming both values —
  *"You typed {typed}; the close-up reads {read}."* — because only a hand-typed cell carries the
  extra fact that a person, not a model, put that number there.

- **An incomplete close-up** (Stage 4, criterion 44). Reuses the existing shapes exactly: missing
  rows render with the review grid's dashed "unread" cell style, the header carries the same
  `{n} of 11` `Pill`, and accepting it anyway is allowed — it then behaves like any other short column
  everywhere else on the screen, blocking `SaveBar` with the same `blockedColumnShort` copy. "Keep
  what's saved" remains the one-tap way out.

- **Deleting a game** (Stage 2, criteria 124–129, and decision 10). Reached from the game view: a
  full-width `Button` in `ghost` shape with `--error` ink and a trash icon, labelled **"Delete
  game"** — the same documented one-off destructive variant already established for `CellEditor`'s
  "Delete this line" (§ `StructureMenu` above), reused rather than invented a second time or given
  its own fourth `Button` kind. Tapping it is not the delete itself: it opens a dedicated
  confirmation screen — `AppBar` (title **"Delete this game?"**, back arrow labelled **"Back to the
  game"**, which doubles as Cancel) over one `Card` — because criterion 125's "deliberate second
  action" means an interstitial screen, never a single extra tap on the same view.
  - **The heading names the game itself**, never a bare "Are you sure?": **"Delete the {date} game
    with {roster}?"**, using the same date and roster-name the game view's own `AppBar` already
    shows for this game.
  - **Two fixed sentences beneath it** say plainly what is about to happen: **"This can't be undone.
    The game and its scores are gone for good, and its photos come out of the record with it."**
    ⚠️ **Never "the photos are deleted."** Decision 10 keeps the underlying S3 objects — nothing in
    this app holds `s3:DeleteObject` at all (`docs/ARCHITECTURE.md` § IAM) — so the honest claim is
    that the photos leave the *record*, not that the files are destroyed. This is a real
    distinction the copy must hold exactly, in both directions: the founder could still retrieve one
    from S3 directly with AWS access, and the sentence must never claim otherwise, but nobody using
    the app should read it as "the photos are safe somewhere" either — as far as the record is
    concerned, they're gone.
  - **Two full-width buttons, "Cancel" then "Delete permanently"** — `Cancel` first (`ghost`, plain:
    the safe option should be the easy one to reach), **"Delete permanently"** second, in the same
    `ghost` + `--error`-ink + trash-icon treatment as the button that opened this screen. Exactly
    **"Delete permanently"** — never "Delete", "Yes" or "Confirm" (criterion 124's literal label).
    The same "name what happens, then a Cancel/commit pair" shape `CellEditor`'s row-level delete
    already uses, generalised from a row to a whole game.

- **A game that no longer exists — the 404 screen** (criterion 130). A deleted game's old URL, a
  mistyped one, or a made-up player/roster/location address all land here alike. This is Next's
  global `not-found.tsx`, so it never knows *which* of the three happened, and the copy is written
  to be honestly true of all three at once, never implying one specific cause. Reuses `AppBar`
  (title **"Not found"**, back arrow labelled **"Back to games"** — the same bar every other
  in-session screen carries; only the two password gates skip it, and this page is only ever
  reached already signed in, criterion 1) and the `Banner` `error` idiom the review screen already
  uses for its own "this draft doesn't exist any more" case:
  - **Banner title**: **"Nothing here."**
  - **Banner body**: **"The link's wrong, or it's been deleted — either way, it's not in the
    record."**
  - Beneath it, a full-width `primary` `ButtonLink` — **"Back to games"** — so the way back is a
    real button, not only the bar's small 44px back arrow.

- **An unhandled error** (criterion 131). Next's global `error.tsx`. ⚠️ **No stack trace, no file
  path, no library name — ever appears on screen.** The copy is entirely fixed and never reads
  anything off the thrown error, so there is nothing a rendering bug could leak. Voice stays this
  project's own: plain, dry, no apology — *"Sorry!"* is not a word this app uses anywhere else, and
  this is not the screen to start. Reuses `AppBar` (title **"Five Crowns Ledger"** — the one screen
  where a page-specific title would be a lie, since this boundary can be reached from anywhere —
  back arrow labelled **"Back to games"**) and `Banner` `error`:
  - **Banner title**: **"Something went wrong."**
  - **Banner body**: **"Try again, or head back to the games list."**
  - Two full-width buttons beneath: **"Try again"** (`primary`, calls Next's own `reset()`) — the
    same non-destructive retry shape every other error banner in this app already uses, never a
    re-photograph or a re-type — and **"Back to games"** (`ghost`).

- **Players index** (Stage 3, criterion 132). `AppBar` (title **"Players"**, back arrow labelled
  **"Back to games"**). Every player renders as an `IndexRow` — name, right-aligned games-played
  count — the whole row a `Link` to that player's page, including a player on **0 games**
  (criterion 132 says "every player," and a zero-game player is a real, if unusual, row here rather
  than a special case). **Empty database**: a `Card` — *"Nobody's in the book yet."* / *"Add a game
  and its players will show up here."* — same shape as the games list's own empty state, no button
  (there's nothing to add from this screen).

- **Player page** (Stage 3, criteria 133–136). `AppBar` (title the player's name, back arrow
  labelled **"Back to players"**). Three `StatBlock`s in a row — **"Games played"**, **"Wins"**,
  **"Win rate"** — the wins and win-rate blocks each carrying their sample-size caption
  (*"{wins} of {gamesPlayed} games"*), stated **to one decimal place** on the rate itself
  (criterion 133). ⚠️ **No ranking, no highlighting, no colour on these numbers** — this is a
  factual page, not a leaderboard; that's Milestone 3's records board. Below, that player's games
  **newest first**, each an `EntityLink`-bearing row: date, venue-or-**"No location"**, the roster
  name (an `EntityLink` to its roster page — not required by criterion 133's literal wording, but
  the same link this stage adds everywhere else a roster name appears, so it would be a stray
  inconsistency to leave it plain here), their **own** final score for that game, and a winner
  marker (the same crown-plus-label-plus-colour treatment `FinalRow` already uses) when they won.
  - **One game** (criterion 135): renders exactly like any other count — *"1 game"*, a rate of
    *"0.0%"* or *"100.0%"*, sample stated as *"1 of 1 game"*. Nothing is withheld or hedged; only
    the M3 records board's 10-/5-game rules govern a ranking, not a statement of fact about one
    person.
  - **Zero games** (criterion 136 — created, then edited out of their only game): the "Games
    played" `StatBlock` alone (wins and win-rate blocks don't render — there is no sample to state
    a rate against), followed by a `Card`: **"No games on record."** / *"Nothing saved right now
    has {Player} at the table."* Not an error, not a blank page.
  - **The merge entry point (Stage 4, criterion 155)**: a full-width `ghost` `Button` — **"This is
    the same person as…"** — sits directly under the stat block, above the games list (or above the
    zero-games `Card` on the empty layout). ⚠️ **Present on both layouts, not only the populated
    one** — a zero-game player is exactly the duplicate most likely to need merging away, so the
    empty state carries the button at the same relative position rather than omitting it because
    there's "nothing here yet." Available to anyone holding the group password, same trust level as
    deleting a game — **not** gated behind the admin panel (criterion 155).

- **Rosters index** (Stage 3, criterion 137). `AppBar` (title **"Rosters"**, back arrow to games).
  Every roster **with at least one game** — never a zero-game roster, which is exactly the filter
  the games list and games' own roster-matching already apply — as an `IndexRow`: name (custom or
  auto), its members on a muted second line, right-aligned games-played count, the whole row a
  `Link` to that roster's page. **Empty database**: *"No rosters yet."* / *"A roster appears the
  first time its exact set of players saves a game."*

- **Roster page** (Stage 3, criteria 138–139, 141–144). `AppBar` (title the roster's name, back
  arrow labelled **"Back to rosters"**). A `RenameControl` sits first, above the stats — see
  *Renaming a roster* below. One `StatBlock` — **"Games played"** — then a `Card` headed **"Wins
  within this roster"**, one line stating the sample once (*"Each member's wins and win rate across
  these {n} games."*), and a plain list of members (each an `EntityLink` to their player page)
  with their wins and win rate **computed within this roster only** (criterion 138) — a member's
  overall win rate on their own player page can differ from their rate here, and that's the whole
  point of the roster page existing separately. ⚠️ **Rates can sum past 100%** when the roster has
  shared a win — a second, italic muted line names the game responsible the first time it happens
  on a mocked page (*"125% total — {A} and {B} shared a win on {date}, so this is correct, not a
  bug."*) so nobody reads a sum over 100% as broken arithmetic; this is a one-off reassurance,
  **not** a permanent fixture of the real screen once the founder has seen it once or twice — the
  frontend-developer should treat the exact wording as illustrative, not a fixed string, since it
  names a specific game. Below, the roster's games **newest first**: date, venue-or-**"No
  location"**, winner(s) — the roster name itself is omitted from these rows (it's redundant on its
  own page).
  - Criterion 139 (roster numbers are set-exact): a QA-visible consequence of exact-set matching
    (M1 decision 3 / criterion 67), not a new design surface — nothing on this page changes for it.

- **Renaming a roster** (criteria 141–144). The `RenameControl`'s `Field`, labelled **"Roster
  name"**, pre-filled with the current name (custom or auto), **trimmed and capped at 40
  characters** (`maxlength="40"` plus a matching server-side trim/cap — the hint line states it:
  *"Up to 40 characters. Leave it blank to use the automatic name from its members."* — covering
  criterion 142 in the same sentence as the length rule, so clearing the field is documented as a
  deliberate, supported action rather than discovered by accident). Saving:
  - **A case-insensitive duplicate** (criterion 143) is a `Banner warn` **above** the Cancel/Save
    row, both buttons staying enabled underneath it — *"{Name} is already a roster name."* /
    *"{Other roster's members} answers to it too — nothing stops you saving it, rename either one
    later if it's confusing."* Naming the other roster **by its members**, not by the name itself,
    because the two names are now identical text and naming "the other roster" by the very string
    that collided would be no help identifying which one it is.
  - **An ordinary save** confirms the same way the admin key panel's save does — a brief `Banner
    ok`: **"Saved."** / *"Showing everywhere this roster appears."* — then the control collapses
    back to resting, name updated on this page immediately (criterion 141 also lists four other
    surfaces — games list, game view, every member's player page, the rosters index — that inherit
    the new name from the same underlying row, not from anything re-rendered here).
  - ⚠️ **A rename never changes which roster a re-entered exact set matches** (criterion 144) — no
    design consequence, since identity is the player-set key, never the display name; noted here so
    nobody "fixes" a rename into creating a new roster row.

- **Merging two players** (Stage 4, criteria 155–162). Tapping "This is the same person as…"
  opens `MergeTargetPicker`: a `BottomSheet` titled **"Merge {player} with which player?"**, listing
  every other player with their games-played count as secondary text, no add-new row. Picking one
  navigates to `MergeConfirmScreen` (`AppBar` title **"Merge two players?"**, back arrow to the
  originating player).
  - **The ordinary case** (no shared game): one caption — *"Pick which one stays. Nothing is chosen
    for you."* — then two `survivor-card` rows, one per player, each showing that player's own games
    played. **Neither is pre-selected** (criterion 156) — no card is highlighted, so age or
    games-played can never read as a default. Tapping a card selects it (`aria-pressed`, `--sunk`
    highlight, same idiom `PickList` already uses) and immediately labels both: the chosen card gets
    a `Pill tone="ok"` reading **"Stays"**, the other a `Pill tone="err"` reading **"Deleted"**.
    Two plain sentences (not a `Banner` — same "plain text under the heading" precedent "Deleting a
    game" set) appear beneath the cards once one is picked:
    - **"{Loser} is deleted for good. Every game, round, roster spot and photo of theirs moves to
      {survivor}."** — names what criterion 158 actually repoints, in plain words.
    - **"There's no undo, and no record that a merge happened."** — covers criterion 157's "no undo"
      and criterion 162's "no merge history" in one sentence, directly above the button that does it.
    - Footer: **"Cancel"** (`ghost`) then **"Merge permanently"** — the same documented `ghost` +
      `--error`-ink + icon destructive variant "Delete permanently" already established (§ "Deleting
      a game"), reused a second time rather than invented again. `disabled` until a survivor is
      picked (criterion 156's "nothing is picked for them").
  - **The same-game refusal** (Stage 4, criterion 160). Where the two players share a game, the
    whole survivor-picker above **does not render at all** — refused before anything changes, not a
    warning sitting above a still-usable one. Instead: a `Banner error` — **"{A} and {B} played the
    same game."** / *"One person can't hold two seats at the same table. Fix these first, then try
    the merge again:"* — then every offending game listed as a `Card` row, each an `EntityLink` to
    the game (date · roster name) plus an **"Edit this game"** link to Stage 2's edit flow (which is
    how one of the two players comes off that game), then a single **"Back to {player}"** `ghost`
    button. QA constructs this and confirms no row anywhere was repointed.
  - **After it runs** (criteria 161–162): redirect to the survivor's own player page with a
    one-time `Banner ok` — **"Merged."** / *"{Loser} is now part of {survivor}'s record."* — same
    ephemeral shape as roster rename's "Saved.": gone on reload, because nothing about the merge is
    stored anywhere (criterion 162). ⚠️ **When the merge also folds two custom-named rosters into
    one** (criterion 159, both had a custom name), a second sentence is appended naming which
    survived: *"Two rosters folded into one — kept the name '{name}'."* The losing player's page and
    URL now show the 404 screen (criterion 161); the players index is one row shorter.

- **Places index, and renaming a location** (Stage 3, criteria 140, 145–146). `AppBar` (title
  **"Places"**, back arrow to games). **There is no place page** — nothing in the PRD gives a
  location anywhere else to link to yet (filtering by location is Milestone 3), so a places-index
  row is **not** a `Link`: a `PlaceRow` is name, an optional muted caption on a never-used venue
  (*"Never used yet — still pickable when you save a game."*), a right-aligned games-played count
  — **0 renders like any other number, never hidden or dashed** (criterion 140) — and a 44×44 pencil
  `IconButton`. **Empty database**: *"No places yet."* / *"Add one from the review screen next time
  you save a game."*
  - **An ordinary rename** shows on every game that used it, the games list, the game view, the
    review screen's pick-list and this index (criterion 145) — five surfaces sharing the one
    underlying row, exactly the same "one row, everywhere inherits it" shape roster renaming uses.
  - **Stage 4: the pencil now opens `PlaceRowActions`, not the rename `Field` directly** (component
    inventory, above) — `PlaceRow` itself is pixel-identical to Stage 3 at rest, since the row had no
    spare width for a second icon button and this stage adds a second action (merge) to it. The
    pencil's `aria-label` changes from **"Rename {place}"** to **"Edit {place}"**, since it no longer
    commits to one action on tap. Two 52px rows appear in the row's own reveal slot: **"Rename"**
    (sub-caption *"Give this place a different name."*) swaps straight to the unchanged Stage 3
    `Field` editor; **"Merge with another place…"** (sub-caption *"Combine it with a duplicate — the
    games move, one place goes away."*) opens `MergeTargetPicker`, titled **"Merge {place} with which
    place?"**, leading to `MergeConfirmScreen` exactly as a player merge does (see *Merging places*
    below) — same mechanism, same "Merge permanently" confirmation, same permanence wording
    (criterion 163).
  - **A `name_key` collision** (criterion 146) is **refused**, not warned — `Banner error` replacing
    the confirm row rather than sitting above an enabled one: **"{Existing place} already has that
    name."** / *"Pick a different name, or merge the two into one instead."* ⚠️ **Stage 4 copy
    change**: this replaces Stage 3's "merging two places into one is coming in a later update" now
    that the merge exists (criterion 163 explicitly fulfils criterion 146's promise). Directly below
    the refusal, a **"Merge with {existing place}"** button (the same destructive `ghost` +
    `--error`-ink + icon treatment as "Merge permanently") jumps straight to `MergeConfirmScreen`
    with both places already filled in — **not** back through `MergeTargetPicker`'s "which place?"
    sheet, since typing the colliding name already answered that question and re-asking would be
    busywork.

- **Merging two places** (Stage 4, criteria 163–166). Reached from the places index's
  `PlaceRowActions` (above) or from the rename-collision refusal's "Merge with {existing place}"
  button. `MergeConfirmScreen` (`AppBar` title **"Merge two places?"**, back arrow to the places
  index) is the same component the player merge uses, generalised to locations: two `survivor-card`
  rows (each place's own games-played count), neither pre-selected, "Stays"/"Deleted" `Pill`s once
  one is picked, the two plain sentences —
  **"{Loser} is deleted for good. Every game at {loser} moves to {survivor}."** and **"There's no
  undo, and no record that a merge happened."** — then **"Cancel"** / **"Merge permanently"**.
  ⚠️ **No same-game refusal applies here** — a game has exactly one location, so two places can
  never both be "in the same game" the way two players can; places have no equivalent of
  `MergeConflictRefusal`. **Games with no location are simply untouched** by any merge (criterion
  165). After it runs: redirect to the places index with the same one-time `Banner ok` shape —
  **"Merged."** / *"{Loser} is now part of {survivor}."* — the survivor's games-played count updated
  in place, the loser's row gone. The review screen's venue pick-list collapses to one entry for the
  pair, and "most recently used" resolves to the survivor (criterion 166).

- **Reaching these pages** (Stage 3, criterion 174). Three decisions, all ours to make per the
  criterion's own wording ("where the links sit is a design call, not a further product decision"):
  1. **`IndexNav`** sits directly under "Add a game" on the games list, **always rendered** — even
     against the empty-games-list state — because the three index pages are worth reaching before
     the archive has a single game in it (a fresh players/rosters/places index just shows its own
     empty state, above).
  2. **A roster name becomes an `EntityLink`** everywhere it appears **away from its own page** —
     games list rows, the game view's `AppBar` title, and (our own extension, for consistency) the
     player and roster pages' own games lists. On the games list, the row itself stays one large tap
     target to the game (a "stretched link" — an absolutely-positioned, empty, `aria-label`led
     anchor filling the card, `z-index` below the visible roster link) so today's easy, whole-row
     tap to open a game is unchanged; the roster name is a second, independently focusable and
     tappable link layered on top with its own 44px hit slop via padding, not by resizing the
     visible text. On the game view, the `AppBar`'s `h1` itself becomes the link (there is exactly
     one roster per game, so there's exactly one title to make tappable) — the one place in this app
     a page's own heading doubles as navigation, and it keeps the title's existing size and weight,
     adding only the `EntityLink` underline.
  3. **A player's name becomes an `EntityLink` only in the game view's "How it finished" list**
     (`FinalRow`) — deliberately **not** also in `ScoreTable`'s column headers, even though a name
     appears there too. Turning every header cell of a dense score grid into a link adds four or
     five extra tab stops before a keyboard or screen-reader user ever reaches the numbers, for a
     destination `FinalRow` already offers cleanly two sections up; one clear way to reach a player
     page beats two redundant ones on the same screen.

- **The records board** (M3 Stage 1, criteria 175–196). `/` now renders the board for a group
  session instead of redirecting to `/games` (criterion 179); `/games` is unchanged and still works
  directly. The board's `AppBar` carries the wordmark **"Five Crowns Ledger"** as its title, no
  context line and no back arrow — the one in-session screen with nowhere to go back to, the same
  reasoning the global error screen already uses for showing the full app name.
  - **`ArchiveLine` sits once, at the very top of the body** (criteria 182–183). Under
    `EARLY_DAYS_BELOW` (10) games it is criterion 183's fixed sentence, verbatim, and that sentence
    also *is* criterion 182's archive-size statement for as long as it's showing — the count is
    never printed twice on one screen. At 10 games and above the line is **absent, not reworded**: a
    separate, plain sentence (fixed strings, below) takes over criterion 182's job on its own. Both
    states share one neutral `--sunk` box, never a `warn` or `error` tint — neither sentence is a
    problem being flagged, it's a standing fact. ⚠️ **Inside the wording ban, not an exception to
    it** (criterion 192): the line says a record *can* change, never that a small sample is fine,
    and it never gains a second, softer sentence underneath.
  - **`BoardNav` sits directly under `ArchiveLine`**: `ghost` **"Games"** and `primary`
    **"Add a game"**, side by side, both reachable in one tap from the board in every state — early
    days, past 10, and empty (criteria 179, 191) — the same "always rendered, even against nothing"
    precedent `IndexNav` set on the games list.
  - **`RecordCard` is flat by design** (criterion 180). No crown, no medal colour, no 1st/2nd/3rd —
    this is five independent facts, not a ranking of them against each other. Each card: an
    uppercase label (the record's fixed title), the holder(s) in the display face, the number in
    `--num-lg` tabular type with a plain-English unit beside it, and — except the stalwart, below —
    a muted sample line underneath. The whole card is the link to its drill-through; a small chevron
    is the only visual affordance, and the link's own `aria-label` states the claim so a screen
    reader doesn't need the chevron to know it's tappable.
  - **Joint holders** (criterion 181): every holder's name, alphabetically, on one line, joined with
    "&" for two or a comma-then-"&" for more — the same list grammar `GameRow`'s shared-win label
    and an auto-named roster already use. Never a tie-break, never truncated, never "and N others."
  - **The sample line** (criterion 182): a single holder reads **"from {n} games"**; two or more
    holders read each one's own count, joined by " · " — **"{Holder A} — from {n} games ·
    {Holder B} — from {n} games"** — because criterion 182 requires each holder's *own* count, and
    joint holders can have very different ones (a player who joined the group last month can hold a
    per-player record on a handful of games, sitting right beside one who's played for years).
  - ⚠️ **The stalwart's card is the one exception, and it needs the founder's sign-off**
    (criterion 196): its number *is* the holder's own game count, so the sample sentence would
    repeat the headline figure verbatim — *"3 games played … from 3 games."* The card instead shows
    one number captioned **"games played"** and stops there. This still satisfies criterion 182's
    substance — the number on screen and the sample behind it aren't merely stated together, they
    are *identical* — but it's a literal reading of a criterion written with the other four records
    in mind, so it's flagged rather than assumed.
  - **A degenerate value is shown exactly like any other** (criterion 184): no footnote, no
    suppression, no second hedge beyond `ArchiveLine` and the sample line. *"Most wins in a
    row — Player A & Player B — 1"* over a three-game archive renders in the same `RecordCard` as
    every other value, at every other count.
  - **A record with no holder** (criteria 185, 193) is the same card shape with the value and
    chevron dropped: an italic muted sentence, **"Nobody's done this yet,"** sits where the number
    would be. Never the `warn` or `error` treatment — nobody having done a thing yet is not a
    problem. None of Stage 1's five records can actually reach this state over a non-empty archive
    (every game has a winner, so most-wins, the streak, the average and the stalwart always have at
    least one holder, and every hand has a round winner) — the mockups show it against a Stage 2
    record ("the drought") instead, so the component exists and is agreed ahead of the stage that
    needs it for real.
  - **Drill-through** (criterion 186): a heading stating the claim — **"{Record title} —
    {Holder(s)}"** — as the `AppBar`'s `h1`, the value and sample as its context line, over the
    plain, unmodified `GameRow` list, newest first, in the games list's own row format. "Most rounds
    won" adds one small brand-coloured line per row, **"{Player} took {n} of 11 rounds,"** because
    that claim is a running count rather than a single fact each game either carries or doesn't.
    ⚠️ **Streak drill-throughs are ordered oldest → newest — the one deliberate exception to "newest
    first," and it needs sign-off**: a run reads as a run in the order it was played, and criterion
    186's own wording for this record is "the games of that streak, **in order**," distinct from the
    "newest first" language used for the other three. When a streak is jointly held by players whose
    qualifying games differ, each row also carries **"{Player}'s streak game"** so the list doesn't
    read as one continuous run it isn't.
  - **Empty archive** (criterion 191): `BoardNav` renders exactly as it does on every other state;
    below it, a plain `Card` — **"No games yet."** / *"Once you save one, the board will show who's
    who."* — never an error, never a board of zeroes.

- **The player page gains three sections (M3 Stage 2, criteria 203–212).** All three sit below the
  existing "This is the same person as…" merge button and above the player's own games list, in
  this order: **Head-to-head**, **Nemesis** (the `NemesisCard`, directly under the head-to-head
  list it's computed from, per criterion 206), **By roster**, then **Streak, in context**. Mockups:
  `docs/mockups/m3-stage-2-rivalry.html`.
  - **Head-to-head** (203–205): one `HeadToHeadRow` per opponent shared at least one game with,
    ordered by games together descending then alphabetically. **No section at all renders as an
    error** — a player with no shared games (a brand-new player, or one whose only games are
    solo-roster oddities) gets the section's own empty state, a plain sentence, never a missing
    heading and never the section silently dropped (criterion 203's "a player with no shared games
    sees the section's own empty state, not a missing section").
  - **By roster** (207–210): one `ByRosterRow` per **exact** roster the player has been part of.
    ⚠️ **The numbers must be pixel-identical to the roster page's own per-member figures** — both
    read `lib/scoring`'s one shared function (criterion 208), so this section is never a second
    place a rounding difference could sneak into.
  - **Streak, in context** (211–212): the two `PersonalRecordCard`s. Both labelled so neither reads
    as "the run I'm on right now" — **"Longest winning streak"** and **"The drought"** are both
    all-time records, exactly like the board's own streak and (new) drought cards, just personal
    rather than archive-wide.
  - **The nemesis card's placement is fixed even though its copy isn't** (see *The nemesis card*,
    below): it sits directly under the head-to-head list on every layout, so moving between the two
    once the copy is chosen is a wording change only, never a reflow.

- **The records board gains two rows (M3 Stage 2, criteria 213–218).** `RecordCard`, `ArchiveLine`
  and `BoardNav` are all unchanged — **the drought** and **the nearly man** slot into the existing
  grid using the same component, same no-holder variant, same sample-line and joint-holder grammar
  Stage 1 already established. Nothing new to build for either card itself.
  - **The board now carries seven records.** ⚠️ **Legibility at 375px is a QA finding this stage,
    not a design decision made here** (criterion 218) — the mockup shows the board at 375px so the
    founder can see the scroll for themselves; cutting or reordering a row afterwards is the
    founder's call and costs one deletion or one reorder, never a rebuild.
  - **The drought's drill-through is ordered oldest → newest**, the same deliberate exception to
    "newest first" Stage 1 already made for the winning-streak drill-through and for the same
    reason — a run reads as a run in the order it was played. Flagged for the same sign-off Stage 1
    flagged its own streak ordering for.
  - **Neither new row can ever show a bare `0` beside a name** (criterion 217): an archive where
    every game in it ended level renders both as the ordinary no-holder card, never a zero.

- **The nemesis card.** Criterion 202 (amended by open question 10) hands the ui-designer the
  nemesis card's **title and framing sentence** — and only those — to propose as options, not to
  decide. Everything else about the card is already fixed by criteria 199–201, 206 and is not in
  play here: the number (the opponent's above-rate, one decimal place), the sample (games together),
  the no-nemesis state (§ `NemesisCard`, above — reuses `BOARD_NO_HOLDER_SENTENCE` verbatim), and
  the mechanical wording test (criterion 202: every candidate must be printable with **both named
  players reading it, one over each shoulder** — nothing calling either weak, hopeless, dominated,
  owned, a victim or a walkover; nothing saying a player can't or never will win; nothing advising
  anyone what to do about it).
  - **Five candidates are laid out side by side** in `docs/mockups/m3-stage-2-rivalry.html` (§
    "Nemesis: five candidates, side by side"), all rendered against the identical real numbers so
    only the wording differs: **Nemesis** (the founder's own word from the analytics catalogue,
    kept flat — the default if this goes unanswered), **The upper hand**, **The regular**,
    **Bogeyman**, and **Frequent flyer** — ordered driest to most playful. Full copy and the
    one-line rationale for each sits in the mockup itself, not duplicated here, so there is exactly
    one place this wording can drift out of sync.
  - ✅ **Decided 2026-09-14 — the founder picked candidate 1, the flat "Nemesis."** No banter
    layered on top of the title itself: the card's label and display-face line are just the
    opponent's name under the plain word **Nemesis**, and the detail sentence is candidate 1's own
    wording from the mockup, verbatim — **"Finishes above you in {n} of your {total} games together
    ({rate}%)."** — never repeating the opponent's name a second time, since it's already the line
    above. Now fixed in the table below (`NEMESIS_CARD_TITLE`, `nemesisDetailSentence` in
    `lib/ui/copy.ts`), superseding the "not fixed" row this section used to point at.

- **The board gains five more records (M3 Stage 3, criteria 228–235).** `RecordCard`, `ArchiveLine`,
  `BoardNav` and criterion 181's joint-holder grammar are all unchanged — best game ever, worst game
  ever, the catastrophe, cleanest sheet and biggest hammering slot into the existing grid. What's new
  is confined to these five cards specifically:
  - **The sample line is a date, not a game count** (criterion 233). Every other card on the board
    reads `"from {n} games"`; these five read `"on {date}"` (the catastrophe additionally names the
    hand: `"{hand} · {date}"`) — because the number is one observation, not a rate over the holder's
    history. Nothing else about the card's shape changes for this.
  - **A tie renders as an instance list, not a name list** (component inventory, `RecordCard` —
    instance list, above) — criterion 181's "list every holder's name against one number" grammar
    doesn't hold here, because the same player can be one of two *instances* (two different games at
    the tied score, or for the catastrophe, two different hands). QA should expect this to look
    different from every other joint-holder card on the board and that is deliberate, not a bug.
  - **No caveat beyond the sample statement** (open question 3a, answered 2026-09-14): these five
    cards carry no extra warning icon, no "read this carefully" line, no different visual weight from
    the other seven. `ArchiveLine`'s early-days line already governs the whole board and is not
    duplicated or intensified for this stage's additions.
  - **Order (criterion 235)**: the founder's four first, then the stalwart, then the drought and the
    nearly man (Stage 2, in that order), then this stage's five in the order the PRD's own user
    stories introduce them — best game ever, worst game ever, the catastrophe, cleanest sheet,
    biggest hammering. This keeps each stage's cards contiguous, so a card's position on the board
    tells you which stage computes it, and reordering later (open question 12) costs a documentation
    edit here plus a one-line change in code, never a rebuild.
  - **Legibility at twelve cards is a founder review point, not a QA pass** (open question 12,
    following criterion 218's finding at seven). The mockup shows the full twelve-card scroll at
    375px so the founder can react to it directly; nothing has been pre-emptively collapsed,
    tabbed, or hidden behind a "show more" control — that would reintroduce the withholding the
    founder explicitly rejected at Stage 1 (open question 6), just spatially instead of numerically.
  - **`StatsNavLink`** (component inventory, above) sits directly under `BoardNav`, reading **"See
    all the stats"**, linking to `/stats` — reachable in one tap from the board per criterion 236.

- **The player page gains three more things (M3 Stage 3, criterion 243).** Average final score, the
  `HandTrendBars` eleven-hand profile with the worst hand marked, and two `PersonalGameCard`s for
  this player's own best and worst game. All three sit **below Stage 2's four sections** (head-to-
  head, nemesis, by-roster, streak-in-context) and above the player's own games list — nothing above
  them moves, is re-explained, or changes meaning (criterion 243 restates this explicitly, the same
  discipline criterion 207 already established for Stage 2 against Stage 1). A one-game player shows
  every one of these three with "1 game" or that game's own date beside it — no floor, nobody set
  aside (criterion 245).

- **The roster page gains two things (M3 Stage 3, criterion 244).** A second `StatBlock` —
  **"Table average"** — sits beside the existing "Games played" block, stating both numbers behind it
  per criterion 224 (`"{games} games · {scores} scores"`). Each member's row in the existing "Wins
  within this roster" list (criterion 138) gains a third figure, that member's own average **within
  this roster only**, in the same `--num`/`--text-xs`-label shape the wins and win-rate figures
  already use — the member list's shape doesn't change, it gains a column.

- **`/stats` — the catalogue index (M3 Stage 3, criteria 236–242).** `AppBar` title **"Stats"**, back
  arrow labelled **"Back to the board"** (the board is the primary hub either entry point — the
  board's own link and the games list's — ultimately returns to, so the back arrow is consistent
  regardless of which one was used to arrive). An unauthenticated request 307s to `/login` exactly as
  every other screen does (criterion 236, M1 criterion 1's pattern). No `ArchiveLine` repeats on this
  page — each section states its own sample per its own criterion (237, 239, 240, 242), and a second
  global count would be exactly the double-statement criterion 182 already forbids. Four sections, in
  this order: **the eleven-hand trend** (`HandTrendBars`, archive-wide, with the honesty line),
  **hand-by-hand villains** (`VillainsTable`), **biggest single-hand disasters** (`DisasterRow` list),
  **averages** (`AveragesTable`, players then rosters). ⚠️ **Best game ever and worst game ever are
  not re-rendered here as a sixth section** — criterion 241 requires the catalogue and the board to
  read the same holder, number and date from the same function, and the mockup treats that as "the
  board already shows this record" rather than duplicating the card; a future session should read
  criterion 241 before adding a "best/worst game" card to this page a second time.

- **Day-of-week and month tables are explicitly not part of Stage 3.** Flagged here so a future
  session doesn't assume the brief and the criteria agree: `docs/PRD.md`'s Stage 3 criteria (223–249)
  contain no day-of-week or month criterion, the "Explicitly out of scope for Stage 3" list names
  *"Venue and date slices — Stage 4, per open question 9"* by name, and Stage 4's own scope line lists
  *"day-of-week and time-of-year"* cuts explicitly. Nothing in this document's Stage 3 section
  describes such a table, and none should be built against a Stage 3 criterion number, because none
  exists. They belong in Stage 4's own mockup and its own section of this document, written when
  Stage 4's criteria are.

## Review screen law

Whichever direction is chosen, the review screen must:

1. Show the transcription **beside the photo, every time** — never collapsed, never skipped, never
   "looks fine, save".
2. Show **derived per-hand scores live** next to the running totals, recomputed on every keystroke.
3. Make **every cell editable at all times**, including cells nothing has flagged.
4. Flag **both** values of a pair that stops climbing — we cannot know which is wrong.
5. Show a **repeated value as a zero-point hand**, never as a suspected duplicate read.
6. Call out **the final row separately**, because a misread there changes who won.
7. Offer **re-photograph this column** on any column at any time, and show the new reading
   **against the old**, rejectable in one tap.
8. Keep **type it in by hand** reachable without hitting an error first, and never word it as a
   failure.
9. Block save only on the hard checks (eleven values, non-decreasing) and **say what passing means**:
   *not obviously wrong*, not *verified*.

## Voice & tone

Warm, dry, a bit blunt. Contractions yes, exclamation marks no, emoji no. Say what happened and
what to do next: *"Two things to sort"*, *"11 is lower than the 67 above it"*, *"Put it in the
book"*. Records carry the banter — *the drought*, *the nearly man*, *the catastrophe*. **The admin
panel is plain**: no jokes anywhere near the API key, the passwords or the download. Never claim
more than the app knows — nothing on the review screen may imply a number has been verified.

Fixed banner copy (bold line / second line):

| Case | Tone | Copy |
|---|---|---|
| Wrong password | `error` | **That password's wrong.** / Check it with whoever set it up. |
| Too many tries | `warn` | **Too many tries.** / Try again later. |
| Upload failed | `error` | **That didn't upload.** / Check your connection and try again. |

**Fixed strings — add-a-game, review screen and the save area.** Developers use these verbatim.
None of the wording-critical rows below may ever be paraphrased to include *checked, validated,
verified, confirmed, correct, looks right* or *all good*.

| Case | Copy |
|---|---|
| Camera button | Take a photo |
| Gallery button | Choose a photo |
| Rotate control (`aria-label`) | Rotate |
| Rotate caption | Turn it until it's the right way up. |
| Upright-confirm button | Use this photo |
| Upload in progress | Saving the photo… |
| Upload retry button | Try again |
| Automatic-read option | Read the sheet |
| Automatic-read helper line | We'll read the numbers off your photo — you still check every one next. |
| Hand-entry option | Type it in by hand |
| Hand-entry helper line | We'll skip the automatic read. Your photo's already saved. |
| Date field label | Played on |
| Venue field label | Where |
| Venue list, fresh database | No venues yet |
| Venue/player list, "add new" row | Add a new one *(venue)* · Someone new *(player)* |
| Venue/player list, "no location" row | No location |
| Player list, very first game | Nobody's in the book yet — add everyone's name |
| Pending new venue/player | `Pill`: new |
| Crop step heading | Show us {player}'s column. |
| Crop guess caption | We've guessed evenly — drag to line it up. |
| Crop confirm button | Use this crop |
| Crop not set yet (strip) | Not lined up yet |
| Crop not set yet (button) | Set the crop |
| Adjust an existing crop (`aria-label`) | Adjust crop |
| Column incomplete | `Pill`: {n} of 11 |
| Paired-flag sentence | {lower} is lower than the {higher} above it. |
| Soft-warning sentence | {points} on the {hand} — a big one, saved as written. |
| Save button, all states | Put it in the book |
| Save button, busy | Putting it in the book… |
| Passing statement (save available) | Not obviously wrong — that's the most this screen can promise. |
| Blocked — column short | {Player}'s column has {n} of 11. |
| Blocked — column dips | {Player}'s column dips at hand {n}. |
| Blocked — too few players | Add at least two players before this can be saved. |
| Confirmation, sole winner | In the book. {Player} won on {score}. |
| Confirmation, shared win | In the book. {A} and {B} shared it on {score}. |
| Games list, no venue | No location |
| Games list, shared win | {A} & {B} — shared |
| Transcription progress heading | Reading the sheet… |
| Transcription progress captions | Finding the columns. · Reading each player's numbers. · Still going — this one's taking a little longer. *(third line only after ~20s)* |
| Read-error banner | That didn't finish. / Check your connection and try again. |
| Read-error retry button | Try again |
| Daily transcription cap banner | That's today's reads used up. / Try again tomorrow, or type this one in by hand — it's already saved. |
| Read-hint sentence | Least sure about the {hand} in this column. |
| Admin, no key set | No key set yet. / Nothing can be read from a photo until one is added. |
| Admin, key field label | Anthropic API key |
| Admin, save button | Save key |
| Admin, save button, busy | Testing… |
| Admin, testing helper line | Testing the key with a real call — this can take a couple of seconds. |
| Admin, key saved | Saved. / In use everywhere within a minute. *(verbatim — see ARCHITECTURE.md)* |
| Admin, key rejected | That key didn't work. / Check it and try again — the key you had before is untouched. |
| Admin, status `Pill` | Working · Not working |
| Admin, replace button | Replace key |
| Admin, group password field label | New group password |
| Admin, group password length helper | At least 12 characters. |
| Admin, group password warning banner | This logs out every device — including this one. / Send everyone the new password yourself; nobody gets back in without it. |
| Admin, group password save button | Change group password |
| Admin, group password save button, busy | Changing… |
| Admin, admin password current-field label | Current admin password |
| Admin, admin password new-field label | New admin password |
| Admin, admin password confirm-field label | Confirm new admin password |
| Admin, admin password length helper | At least 12 characters. |
| Admin, admin password asymmetry line | This one checks your current password because it's the one password that can lock you out for good — the group password doesn't, because losing control of it is usually why you're changing it. |
| Admin, admin password save button | Change admin password |
| Admin, admin password save button, busy | Changing… |
| Admin login, recovery link | Forgotten the admin password? |
| Admin, download card | The numbers, not a backup. / The photos aren't in this file — copy them yourself: `aws s3 sync s3://five-crowns-photos ./photos` |
| Admin, download button | Download scores |
| Admin, download filename | five-crowns-scores-YYYY-MM-DD.csv |
| Admin, usage heading | This month |
| Admin, usage label — sheet reads | Sheet reads |
| Admin, usage label — column re-reads | Column re-reads |
| Admin, usage label — total | Total |
| Admin, usage estimate label | Estimated cost this month |
| Admin, usage estimate disclosure | An estimate — converted at US$1 ≈ A$1.55, prices checked against the Anthropic console on {date}. |
| Admin, usage today — sheet reads | {n} of {sheetCap} sheet reads today |
| Admin, usage today — column re-reads | {n} of {columnCap} column re-reads today |
| Fix-something link (`StructureMenu`) | Fix something |
| Structure menu, reorder row | Reorder columns · Match the order they're written in on the photo. |
| Structure menu, insert/delete row | Insert or delete a value · Fixes a row that's shifted by one. |
| Reorder screen heading | Reorder columns |
| Reorder screen caption | Match the order the columns are written in on the photo — top is the left-most column. |
| Reorder, done button | Done |
| Fix-the-shape link (`CellEditor`) | Fix the shape |
| Fix-the-shape helper | If a row got missed or doubled near here, fix the shape instead of retyping the column. |
| Insert row action | Insert a blank line above · Insert a blank line below |
| Delete row action | Delete this line |
| Insert confirm | Insert a blank line above the {n}th line down? / Everything below shifts down one — this column will read {n+1} of 11 until it's filled in. |
| Delete confirm | Delete the {n}th line down — {value}? / Everything below shifts up one — this column will read {n-1} of 11. |
| Photograph-column button | Photograph this column |
| Photograph-column heading | Photograph {Player}'s column. |
| Photograph-column helper | A close-up gives the reader far more pixels per digit than the whole page did — new pixels, not a second opinion. |
| Column-scoped read heading | Reading {Player}'s column… |
| Column-scoped read captions | One column, eleven numbers. · Still going — this one's taking a little longer. *(slow line only, shared with the full-sheet read)* |
| Compare, subheading | Compared with what's saved now. |
| Compare, differing-lines summary | {n} lines differ from what's saved: {list of hand labels}. |
| Compare, keep new | Keep the new reading |
| Compare, keep old | Keep what's saved |
| Compare, re-shoot link | Photograph again |
| Compare, history link | See every reading ({n}) |
| Compare vs a past reading | {Reading} vs what's active now |
| Compare vs a past reading, buttons | Make {reading} active · Keep {reading} active |
| Reading history heading | Every reading of {Player}'s column |
| Reading history row | Reading {n} · {full sheet / close-up} · {when} |
| Reading history, active pill | `Pill`: Active |
| Wrong-column warning | This looks like {sheet player}'s column, not {assigned player}'s. / The close-up's own reading of the name doesn't match — you can use the new numbers anyway. |
| Typed-cell disagreement | You typed {typed}; the close-up reads {read}. |
| Incomplete close-up, keeping-it note | Keeping this leaves {Player}'s column at {n} of 11 — Put it in the book stays blocked until it's filled in. |
| Delete-game button (game view) | Delete game |
| Delete confirmation heading | Delete the {date} game with {roster}? |
| Delete confirmation body | This can't be undone. The game and its scores are gone for good, and its photos come out of the record with it. |
| Delete confirmation, cancel button | Cancel |
| Delete confirmation, commit button | Delete permanently |
| 404 screen, `AppBar` title | Not found |
| 404 screen, banner title | Nothing here. |
| 404 screen, banner body | The link's wrong, or it's been deleted — either way, it's not in the record. |
| 404 screen, button | Back to games |
| Error screen, `AppBar` title | Five Crowns Ledger |
| Error screen, banner title | Something went wrong. |
| Error screen, banner body | Try again, or head back to the games list. |
| Error screen, retry button | Try again |
| Error screen, back button | Back to games |
| Players index, `AppBar` title | Players |
| Players index, empty state | Nobody's in the book yet. / Add a game and its players will show up here. |
| Rosters index, `AppBar` title | Rosters |
| Rosters index, empty state | No rosters yet. / A roster appears the first time its exact set of players saves a game. |
| Places index, `AppBar` title | Places |
| Places index, empty state | No places yet. / Add one from the review screen next time you save a game. |
| Places index, unused-location caption | Never used yet — still pickable when you save a game. |
| `IndexNav` labels | Players · Rosters · Places |
| Player/roster stat label | Games played · Wins · Win rate |
| Player/roster stat, sample caption | {wins} of {gamesPlayed} games |
| Player page, games-list heading | {Player}'s games |
| Player page, zero games | No games on record. / Nothing saved right now has {Player} at the table. |
| Roster page, stats heading | Wins within this roster |
| Roster page, stats sample line | Each member's wins and win rate across these {n} games. |
| Roster page, games-list heading | {Roster}'s games |
| `RenameControl` open link (roster) | Rename |
| `RenameControl`/`PlaceRowActions` open button (place, `aria-label`) | Edit {place} *(Stage 4 — was "Rename {place}")* |
| Rename field label — roster | Roster name |
| Rename field label — place | Location name |
| Rename length/blank helper (roster) | Up to 40 characters. Leave it blank to use the automatic name from its members. |
| Rename length helper (place) | Up to 40 characters. |
| Rename, cancel button | Cancel |
| Rename, save button | Save name |
| Rename, save button busy | Saving… |
| Rename saved (roster) | Saved. / Showing everywhere this roster appears. |
| Roster name, duplicate warning | {Name} is already a roster name. / {Other roster's members} answers to it too — nothing stops you saving it, rename either one later if it's confusing. |
| Location rename, refused (collision) | {Existing place} already has that name. / Pick a different name, or merge the two into one instead. *(Stage 4 — was "…coming in a later update.")* |
| Location rename, refused — merge button | Merge with {existing place} |
| Suggested-match `Pill` | Suggested |
| Suggested-match, read-as caption | Read as {sheetName}. |
| Unassigned column, `Pill` | Needs a player |
| `PickList`, near-match section label | Closest matches |
| `PlaceRowActions`, rename row | Rename · Give this place a different name. |
| `PlaceRowActions`, merge row | Merge with another place… · Combine it with a duplicate — the games move, one place goes away. |
| Merge entry point (player page) | This is the same person as… |
| `MergeTargetPicker` heading — player | Merge {player} with which player? |
| `MergeTargetPicker` heading — place | Merge {place} with which place? |
| `MergeConfirmScreen` title — player | Merge two players? |
| `MergeConfirmScreen` title — place | Merge two places? |
| `MergeConfirmScreen` intro | Pick which one stays. Nothing is chosen for you. |
| Survivor card `Pill`s | Stays · Deleted |
| Merge detail sentence — player | {Loser} is deleted for good. Every game, round, roster spot and photo of theirs moves to {survivor}. |
| Merge detail sentence — place | {Loser} is deleted for good. Every game at {loser} moves to {survivor}. |
| Merge, no-undo sentence | There's no undo, and no record that a merge happened. |
| Merge, cancel button | Cancel |
| Merge, commit button | Merge permanently |
| Same-game refusal, banner title | {A} and {B} played the same game. |
| Same-game refusal, banner body | One person can't hold two seats at the same table. Fix these first, then try the merge again: |
| Same-game refusal, edit-game link | Edit this game |
| Same-game refusal, back button | Back to {player} |
| Merge success — player | Merged. / {Loser} is now part of {survivor}'s record. |
| Merge success, roster-folding note | Two rosters folded into one — kept the name "{name}". |
| Merge success — place | Merged. / {Loser} is now part of {survivor}. |
| Board, `AppBar` title | Five Crowns Ledger |
| Board, early-days line — **verbatim, criterion 183** | Early days — {n} games in the record. A single game can still change any of these. |
| Board, archive count at 10+ games | {n} games in the record. |
| `BoardNav`, games button | Games |
| `BoardNav`, add-a-game button | Add a game |
| Record title — most wins | Most wins |
| Record title — most wins in a row | Most wins in a row |
| Record title — lowest average score | Lowest average score |
| Record title — most rounds won | Most rounds won |
| Record title — the stalwart | The stalwart |
| Record unit — most wins | wins |
| Record unit — most wins in a row | games in a row |
| Record unit — lowest average score | avg. score |
| Record unit — most rounds won | rounds |
| Record unit — the stalwart | games played |
| Sample line, single holder | from {n} games |
| Sample line, joint holders | {Holder} — from {n} games · {Holder} — from {n} games |
| Board, no-holder sentence — **verbatim, criterion 193** | Nobody's done this yet. |
| Drill-through heading | {Record title} — {Holder(s)} |
| Drill-through, rounds-won row annotation | {Player} took {n} of 11 rounds |
| Drill-through, streak-holder row annotation | {Player}'s streak game |
| Board, empty archive | No games yet. / Once you save one, the board will show who's who. |
| Player page, head-to-head heading | Head-to-head |
| Player page, head-to-head sample line | Every player you've shared a game with, most games together first. |
| Head-to-head row label — together | {n} games together |
| Head-to-head row label — wins | Wins |
| Head-to-head row label — my rate | My win rate |
| Head-to-head row label — their rate | Above me |
| Player page, by-roster heading | By roster |
| Player page, by-roster sample line | This player's wins and win rate within each exact roster they've played in. |
| Player page, streak section heading | Streak, in context |
| Personal record card — streak | Longest winning streak |
| Personal record card — drought | The drought |
| Personal record card unit — streak | games in a row |
| Personal record card unit — drought | games without a win |
| Record title — the drought (board) | The drought |
| Record title — the nearly man (board) | The nearly man |
| Record unit — the drought (board) | games |
| Record unit — the nearly man (board) | second places |
| Nemesis, no-nemesis state | Nobody's done this yet. *(reuses `BOARD_NO_HOLDER_SENTENCE` verbatim — not a new string)* |
| Nemesis, title | Nemesis *(founder's pick, 2026-09-14 — candidate 1 of 5, `docs/mockups/m3-stage-2-rivalry.html` § "Nemesis: five candidates, side by side," kept flat, no banter on the title itself)* |
| Nemesis, detail sentence | Finishes above you in {n} of your {total} games together ({rate}%). |
| Record title — best game ever | Best game ever |
| Record title — worst game ever | Worst game ever |
| Record title — the catastrophe | The catastrophe |
| Record title — cleanest sheet | Cleanest sheet |
| Record title — biggest hammering | Biggest hammering |
| Record unit — best/worst game ever | final score |
| Record unit — the catastrophe | points in one hand |
| Record unit — cleanest sheet | zero-point hands |
| Record unit — biggest hammering | point margin |
| Single-event sample line, one instance — **verbatim, criterion 233** | on {date} |
| Single-event sample line, the catastrophe, one instance | {hand} · {date} |
| Single-event instance row, plain (best/worst game ever, cleanest sheet, biggest hammering) | {Holder(s)} — {date} |
| Single-event instance row, the catastrophe | {Holder} — {hand} · {date} |
| `StatsNavLink` label | See all the stats |
| `/stats`, `AppBar` title | Stats |
| `/stats`, back arrow label | Back to the board |
| Eleven-hand trend, section heading | The eleven-hand trend |
| Eleven-hand trend, sample line | Average points scored on each hand, across every player and every one of the {n} games in the record ({m} individual hands). |
| Eleven-hand trend, honesty line — **verbatim, criterion 238** | These are derived from the running totals — one misread total moves the two hands either side of it in opposite directions. |
| Player page, eleven-hand profile heading | Eleven-hand profile |
| Player page, eleven-hand profile sample line | Average points on each hand, from {n} games. Worst hand marked. |
| Hand-by-hand villains, section heading | Hand-by-hand villains |
| Hand-by-hand villains, sample line | Average points per hand, every player. Each player's own worst hand is marked. |
| Villains table, per-row sample caption | from {n} games |
| Biggest single-hand disasters, section heading | Biggest single-hand disasters |
| Biggest single-hand disasters, sample line | The ten biggest single-hand scores ever recorded. |
| Averages, section heading | Averages |
| Averages, players sub-heading | Players |
| Averages, rosters sub-heading | Rosters |
| Player/roster average sample caption — player | {n} games |
| Player/roster average sample caption — roster | {games} games · {scores} scores |
| Player page, average final score label | Average final score |
| Player page, best/worst game section heading | Best and worst game |
| `PersonalGameCard` label — best | Best game |
| `PersonalGameCard` label — worst | Worst game |
| Roster page, table average label | Table average |
| Roster page, member average label | avg |

No toast is used for save in Stage 2 — the confirmation is the game view itself, reached by
redirect, carrying the banner text above.

## Hard rules

- Mobile-first; every screen works at 375px and 1280px.
- Visible focus states on everything interactive; touch targets ≥ 44px.
- Loading, empty, and error states are part of every screen's design, not afterthoughts.
- Semantic landmarks (`header`/`nav`/`main`), real `<button>`s, labelled inputs, one `h1` per page.
- Inline SVG for icons; no icon fonts. One webfont, self-hosted.
- Colour is never the only carrier of meaning.
- Player names in shared docs and mockups are **Player A–E**, never real names.
