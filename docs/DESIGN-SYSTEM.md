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
| `PhotoStrip` | review | One column of the sheet photo, cropped, rows on `--pitch`. Tap = full-screen zoom |
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

## Screen rules

- **Password gates** (`/login`, admin prompt): no `AppBar`; the `h1` in the display face is the
  wordmark. The admin prompt adds a `ghost` **"Back to games"** button under the submit button.
- **Games list, empty**: a `Card` saying so, plus a `primary` **"Add a game"** button linking to the
  add-a-game route. Until that flow ships, the route renders a plain holding page; the button is
  never hidden, because an empty list must always offer the way in.

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

## Hard rules

- Mobile-first; every screen works at 375px and 1280px.
- Visible focus states on everything interactive; touch targets ≥ 44px.
- Loading, empty, and error states are part of every screen's design, not afterthoughts.
- Semantic landmarks (`header`/`nav`/`main`), real `<button>`s, labelled inputs, one `h1` per page.
- Inline SVG for icons; no icon fonts. One webfont, self-hosted.
- Colour is never the only carrier of meaning.
- Player names in shared docs and mockups are **Player A–E**, never real names.
