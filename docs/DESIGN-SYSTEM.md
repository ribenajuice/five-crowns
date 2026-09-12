# Design system

*Owned by the ui-designer agent; law for the frontend-developer. Created during `/kickoff` step 3.*

> **Decided.** **Direction 1 — Kitchen Table**, with the **Column Sweep** review screen. Chosen by
> the founder on **2026-09-10** from three directions presented as mockups. This document is
> settled and is law for the frontend. Nothing below is a proposal.
>
> Where it came from: `docs/mockups/visual-directions.html`, published as an Artifact at
> <https://claude.ai/code/artifact/19cf1033-89db-43ba-9dff-de83d298b2e5>. The two rejected
> directions stay in that file as the record of what was considered.

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
| `RecordCard` | records board | Label · value · holder · sample size. Sealed variant for withheld records |
| `Countdown` | records board | "N more nights and the board opens" |
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

## Screen rules

- **Password gates** (`/login`, admin prompt): no `AppBar`; the `h1` in the display face is the
  wordmark. The admin prompt adds a `ghost` **"Back to games"** button under the submit button.
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
