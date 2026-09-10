# Five Crowns Ledger — PRD

*Status: agreed at kickoff, 2026-09-10. Supersedes the 2026-09-09 draft plan
(`docs/plan-2026-09-09.html`). Decisions that changed are recorded in `docs/DECISIONS.md`.*

⚠️ *Revised 2026-09-10 after two real scoresheets arrived (`fixtures/sheets/`). The pad turned out
to record **running totals**, which removes the self-proving arithmetic the original plan was
built on. See "What the pad actually looks like, and what that costs us" — that section is the
most important one in this document.*

## Decisions taken (answered 2026-09-10 — no longer open)

1. **Lowest total wins. Ties are shared** — if two players tie on the lowest score, both are
   winners. Every win-based stat must survive a game with two winners.
2. **Every game is 11 hands.** Every player plays all eleven, 3s through Kings. No late joiners, no
   dropouts, no abandoned games in the record. A sheet that isn't a complete game is **rejected at
   review, not stored** — so every game in the record is directly comparable to every other.
3. **Names are written consistently** and no two people share a name today. This is why M1's
   simple pick-list is sufficient. It is an answer about the past, not a guarantee about the
   future — **merging two players stays in Milestone 2.**
4. **Anyone with the password can edit or delete a saved game.** Corrections happen; the trade is
   accepted. See Risk 4.
5. **The date** is read off the sheet if it's written there, otherwise defaults to today, and is
   always editable on the review screen. Nobody types a date they didn't have to.

**Product call, made here** (not a founder decision — overrule it when you see mockups): the
**records board is the landing screen** once past the password gate. It is the reason someone
opens the app on a night they aren't uploading anything, so it should be the first thing they see,
with the games list and "add a game" reachable from it. **From Milestone 3** — until the board
exists and has enough games to say anything, the games list is the landing screen.

**No open questions remain.** Nothing below is waiting on the founder.

---

## What it is, and who it's for

Five Crowns is scored on a hand-ruled pad at the table. **The paper stays.** Nothing here
replaces it. This is an **archive, not a scoreboard** — nobody opens it mid-game.

At the end of the night the finished sheet is photographed on a phone. The app reads it, shows
what it read beside the photo, and once the numbers are confirmed the game becomes rows in a
permanent record. Years of games then turn into something that can be asked questions of — and
argued about.

**Who**: one small group of friends who play together. Everyone in the group can use it. There
are no accounts and no signup: a **single shared password on the front page**, and past it,
everyone can do everything. A **second, separate password** guards the admin panel, where the
founder alone keeps the thing running.

**Primary device: a phone.** The photo is taken on a phone at the table, and the analytics get
read on a phone on the sofa. Desktop should work, but nothing is designed for it first.

## What the pad actually looks like, and what that costs us

⚠️ **Corrected 2026-09-10 against two real sheets** (`fixtures/sheets/`). An earlier version of
this PRD rested on a self-proving property that **does not exist on this pad**. The correction is
below, stated plainly, because the whole product was justified on it.

**The pad records running totals, not per-hand scores.** Every column climbs and never falls, and
**there is no totals row** — the last number in a column *is* that player's final score. From
`sheet-01-four-players.jpg`:

| | Player A | Player B | Player C | Player D |
|---|---|---|---|---|
| the column | 28, 32, 60, 71, 74, 100, 118, 123, 123, 123, 137 | 0, 3, 3, 54, 80, 88, 105, 105, 109, 109, 109 | 23, 23, 27, 34, 37, 44, 57, 71, 75, 78, 78 | 29, 29, 64, 64, 64, 64, 64, 64, 67, 67, 111 |

So **"eleven rounds must sum to the total" is not available to us.** There is no total to check
against; the eleventh number is the total. The proof is gone.

**What replaces it, and it is genuinely weaker:**

1. **Monotonicity.** A running-total column can never decrease: every value must be greater than
   or equal to the one above it. ⚠️ **Measured 2026-09-10 by the Milestone 0 spike: it catches
   nothing.** 0 of 9 misreads caught, 9 of 9 slipped through — the reader is told columns never
   decrease, so it reads in a way that satisfies the rule, and a check the transcriber already
   obeyed is not an independent check. It stays as a save-gate against impossible data and
   nothing more. See `docs/SPIKE-M0-READING.md`.
2. **Per-hand scores are derived**, as the gap between consecutive rows (the first row's delta is
   itself). Player C's eleven hands above: 23, 0, 4, 7, 3, 7, 13, 14, 4, 3, 0. **The requirement to
   store every round separately is untouched** — the rounds are computed rather than read, and
   everything downstream (hand-by-hand villains, most rounds won, the eleven-hand trend) works
   exactly as written.
3. **Repeated values are normal and meaningful.** Player D's five identical 64s are five hands scored
   zero. ⚠️ **Anything that treats a repeat as a suspected duplicate-read is wrong.**

**The consequence for the product, and it is the important part:** the old check was a *proof* — a
column that didn't add up was wrong, full stop. **Monotonicity is only a partial check.** An error
that preserves the ordering slips straight through: 123 misread as 128, sitting quietly between
118 and 137, passes clean. So:

- ⚠️ **The human review step carries *all* of the weight.** Written as "most" before the spike
  measured it; there is no automated check standing behind it at all. It is not a formality over a
  proof — it is the only quality control the product has.
- **Showing the transcription beside the photo every single time goes from good practice to
  essential.** This was always the principle — **the app's job is to be *checkable*, not to be
  right** — and it is now doing far more work than when it was written.
- **Nothing is saved while a column decreases**, but passing that check means "not obviously
  wrong", not "verified".
- **The photo is kept forever with the game**, so any number can be re-read from the paper for as
  long as the record exists. This is now the real backstop.

⚠️ Analytics built on unverified transcription are not merely useless, they are *confidently
wrong*, and nobody would ever know.

**Other facts from the real sheets**, all of which are the normal case rather than edge cases:

- **The sheet is hand-ruled on a notepad**, drawn fresh every game — vertical lines between
  players, names along the top, the pad's own printed lines as rows. Lines wander, column widths
  vary.
- **Orientation varies.** The second sheet is written along the long edge of the pad and
  photographed sideways. **Arbitrary rotation is normal.**
- **Crossings-out are normal.** Both sheets have corrected numbers with the old value struck
  through or written over. **The surviving value is the one that counts.**
- **The number of players varies** — four on the first sheet, five on the second. The review
  screen handles a variable number of columns, and this is direct evidence the roster concept
  earns its keep.
- **Photo conditions are poor and will stay poor**: hard shadow across the page, glare, held at an
  angle, a thumb in shot. This is the normal case, not a bad day.
- **Eleven rows on both sheets**, and **names written identically on both** — the "always 11 hands"
  rule and the founder's answer about consistent names both hold up against evidence.

## The core loop

1. **Enter the shared password** (once per device, remembered).
2. **Photograph the finished sheet** — the whole game, all players, all 11 hands. Not hand-by-hand.
3. **It reads the grid**: names along the top, eleven running totals down each column, whatever
   rotation the photo happens to be. Knowing the shape exactly in advance is most of what makes
   reading it possible.
4. **Review beside the photo.** Each column is checked for never decreasing; a column that dips is
   flagged at the offending number. **Derived per-hand scores are shown alongside the running
   totals**, because an implausible hand is often the visible symptom of a misread total. **The
   date and the location are filled in and editable.** Each handwritten name is matched to a
   **known player** — "this looks like Sam, right?" — with "this is someone new" always available.
5. **Read it against the photo and correct what is wrong.** ⚠️ This step is the check, not a
   formality — see above. **Anything can be overridden**: any cell, the shape of the grid, or the
   whole transcription in favour of typing it in by hand.
6. **Save.** The game, its rounds, its roster, its date and location, and its photo enter the
   record.
7. **Browse and argue** — game history, player pages, roster pages, and the stats.

## The data model, conceptually

The architect owns the schema; this is what has to be representable.

- **Player** — a *person*, persisting across every game they ever play. Individual stats hang off
  this, independent of who else was at the table. Getting this wrong fractures a person into two
  and silently corrupts every stat that mentions them.
- **Game** — one night, one sheet, one date, **one location**, with the sheet photo and any column
  close-ups attached permanently as evidence of what the paper said. Always eleven
  hands for every player. It knows **its winner or winners** — lowest final total, and more than
  one player can hold it. A player's **final total is simply the last running total in their
  column**; there is no separate total on the paper.
- **Running total** — what is actually written on the pad: one player's cumulative score after one
  hand. This is the **transcribed layer**, the thing that is checked against the photo, and it must
  be kept as read so the review screen and the paper can always be compared.
- **Round score** — one player's points in one hand: **the gap between consecutive running
  totals**, with the first hand's score being the first number itself. **Derived, not transcribed.**
  **Every round is still stored separately, never just a final total** — that requirement is
  unchanged and is the entire reason the analytics below are answerable. Hands are identified by
  what they actually are, 3s through Kings. Every player has all eleven; there are no holes.
  - **A repeat means a zero**, and zeros are common. Five identical numbers in a row are five
    hands scored nothing, not a reading fault.
- **Round winner** — within a single hand, the player with the **lowest score for that hand**.
  ⚠️ **This is a definition, not new data.** It falls out of the derived round scores, so nothing
  extra needs capturing and old games gain the stat retroactively.
  - **Ties are shared**, consistent with the game-level rule. In the early hands a zero is normal
    — several people go out clean — so **shared round wins are the common case, not an edge case**,
    and everyone on the lowest score takes the round. Any presentation that assumes one holder per
    round is wrong.
  - It earns its place because **it can disagree with the game result**: a player can take the most
    hands all night and still lose on the eleventh. That gap is the argument, and the argument is
    the point.
- **Roster** — the *set* of players in a game, order-independent. The founder's "signature".
  - **Exact matching only.** Player C+Sam+Jo is a different roster from Player C+Sam+Jo+Alex.
    Deliberately not grouped as subsets.
  - **Auto-named, editable.** Defaults to "Player C, Sam & Jo"; renameable to "Thursday crew" and
    the new name sticks everywhere that roster appears.
  - A roster is created the first time its exact set appears, and reused silently after that.
- **Location** — *where* the game was played: a **thing picked from a list**, not free text.
  ⚠️ **Built on exactly the same pattern as Player, for exactly the same reason.** "Player C's
  place", "darrens" and "Player C's House" typed on three different nights would fracture into three
  locations and quietly ruin every location stat — the identical failure mode described under
  Player, and it needs the identical fix.
  - **Pick an existing location, or add a new one.** The list grows as new venues appear. Never
    raw free text.
  - **Optional.** A game with no location is still a game (see the acceptance criteria).

## A principle: capture dimensions early, build reports whenever

The founder asked directly how hard it will be to add more reporting later. The answer is worth
writing down, because it should shape decisions from here on rather than being re-derived each
time.

- **New reports are cheap and retroactive.** Rounds are stored individually and stats are computed
  on demand, so a new stat is a query and a screen — and **it applies to the whole history the
  moment it exists.** A stat thought up in three years covers games played this month.
- ⚠️ **New dimensions are cheap to add and impossible to backfill.** A dimension added in a year
  has **no data for any game before it, forever.** The paper will not say, and nobody will
  remember which house they were sitting in.

**Therefore: be relaxed about deferring reports, and impatient about capturing dimensions.** This
is why location is captured in Milestone 1 while location analytics wait for Milestone 3, and it
is the question to ask whenever a new idea arrives: *is this a report, or a dimension?* If it is a
dimension the founder might plausibly want, the cheap moment to add it is now.

## User stories

**Getting in**

> As a member of the group, I want to enter one shared password to get in, so that nobody has to
> make an account.

- Front page asks for a single password; correct password grants full access, wrong one does not.
- The device stays logged in; you don't retype it every night.
- Everything past the gate is the same for everyone — anyone can upload, anyone can browse.
- Nothing is readable without the password.

**Recording a game**

> As a player, I want to photograph the finished sheet and have it turned into a record, so that
> the night is kept without anyone retyping it.

- One photo, taken or chosen on a phone, covers the whole finished game.
- **The photo may be at any rotation**, and is straightened without the founder being asked to
  retake it.
- The app produces a transcription: every player, and their eleven running totals as written.
- The transcription is displayed **beside the photo**, always — including when nothing looks
  wrong. ⚠️ **This is the check.** It is never skipped, never collapsed, never "looks fine, save".
- **Each column is checked for never decreasing.** A column that dips is flagged at the number
  that dips.
- **Derived per-hand scores are shown next to the running totals**, so an implausible hand exposes
  a misread total that monotonicity alone would let through.
- **A repeated value is displayed as a zero-point hand, never as a suspected duplicate read.**
- **A struck-through or overwritten number is read as its surviving value.**
- **A column without eleven numbers is an error**, surfaced as a missing or unread value to fill
  in — never quietly accepted as a shorter game.
- The number of players is whatever the sheet has; four and five both work without configuration.
- The date is pre-filled from the sheet where it's written, otherwise today, and is editable.
- **The location is pre-filled with the last one used**, and changed in one tap by picking another
  from the list or adding a new one. Groups rotate between a handful of places and the same venue
  repeats for runs of games, so **a default that is usually right beats a required field the
  founder resents** — and it keeps the data dense, which is the whole point of capturing it.
- ⚠️ **Location never blocks a save.** The old sheets being entered may have no recoverable venue.
  It is **prompted rather than hidden**, and a game with no location is **shown as having none**
  rather than left silently blank.
- Any number can be edited by tapping it; the column re-checks itself immediately.
- **Save is unavailable while any column is incomplete or decreases.** ⚠️ Passing that check means
  *not obviously wrong*, not *verified* — the screen should not claim more than it knows.
- On save: game, the running totals as read, the derived rounds, date, location, roster, winner(s),
  the sheet photo and any column close-ups are stored, and all of them remain viewable from the
  game forever.
- The winner is whoever holds the lowest total; **if two players tie on it, both are recorded as
  winners** and the game view says so.

> As a player, I want the app to recognise the names on the sheet, so that I never retype the
> roster after the first game.

- Each handwritten name is presented with a suggested match to an existing player, to confirm or
  change.
- "This is someone new" is always available and creates a player.
- Choosing an existing player is never more than a tap or two — including when the suggestion is
  wrong.
- Once all names are confirmed, the roster is matched to an existing exact set or created.
- A newly created roster gets a default name from its members and can be renamed.

**Manual override**

> As a player, I want to override anything the import got wrong — up to and including typing the
> whole grid myself — so that a bad read never costs me the game record.

⚠️ **The founder must always be able to get the right numbers in, whatever the reader does.** Tap-
to-edit only rescues a transcription that is *nearly* right. This story covers the case where it is
badly wrong, and the case where it is useless.

**Four levels, a ladder away from automation** — fix a number by tapping it; fix the shape of the
grid; **re-photograph a column and let the app try again**; or type the whole thing in yourself.
**The founder stops at whichever rung solves their problem**, and should never be pushed further
down it than they need to go. (The founder's "option 4" is the re-photograph; it sits third here
because it should be reached for *before* typing the grid by hand, not after.)

**1. Cell-level** — every number, always
- **Every cell is editable at all times**, not only the ones the validator flagged.
- ⚠️ This is not a nicety: monotonicity cannot tell a plausible wrong number from a right one, so
  the app must never imply a number is beyond correction because it didn't trip a check.
- Editing a cell immediately re-runs the column check and re-derives the per-hand scores either
  side of it.

**2. Structural** — when the *shape* is wrong and editing cells cannot rescue it

The minimum set that covers the realistic failure modes, and deliberately nothing more:
- **Add or remove a player column** — for a column missed entirely, or one invented out of a
  margin or a stray ruled line.
- **Set or change who a column belongs to** — correct a misread name, reassign the column to a
  different known player, or make it a new player.
- **Reorder columns to match the photo** — so the side-by-side comparison stays readable, which is
  the entire mechanism by which errors get caught.
- **Insert or delete a value within a column, shifting the rest** — repairs the off-by-one
  alignment left by a missed or doubled row in one action, instead of retyping eleven numbers.

**This is not a spreadsheet.** No free-form grid, no arbitrary row count (it is always eleven), no
formulas, no multi-cell selection. If a failure mode isn't on the list above, the escape hatch
below covers it.

**3. Targeted re-photograph** — take a second photo of one column instead of typing it

When a column is wrong or doubtful, the app asks for a **close-up of just that column**, re-reads
it on its own, and offers to replace those eleven numbers. ⚠️ **This is likely the highest-leverage
correction available** — plausibly more effective than changing the model or the prompt would be —
for two compounding reasons worth stating:

- **Resolution.** A whole-page photo gets scaled down, leaving each handwritten digit only a couple
  of dozen pixels tall. That is precisely why a 3 reads as an 8. A close-up spends the same budget
  on a tenth of the page, so every digit is many times larger. **Same camera, same reader,
  dramatically better data.**
- **A far narrower task.** The full sheet means finding a hand-drawn grid, segmenting columns, and
  associating twenty-odd cells with the right player. One column means reading eleven numbers in a
  vertical line, where the player is already known and the values must climb. **Nearly every way
  the first read can go wrong is simply absent.**

- **Offered and invokable.** The app offers it on any column that breaks monotonicity or that it is
  unsure about. ⚠️ **The founder can invoke it on any column at any time, including one the app
  thinks is fine** — same reasoning as cell editing: the app cannot tell a plausible wrong number
  from a right one, so it must never be the gatekeeper of what may be re-checked.
- **Named guidance.** The app knows whose column it wants and says so — "photograph Player B's
  column" — with whatever framing help is cheap and obvious.
- **Scoped.** Only that column's numbers are replaced. ⚠️ **Every other column is untouched** — a
  re-read must never disturb corrections the founder already made by hand.
- **Re-validated** like everything else: eleven values, climbing, per-hand scores derived and shown.
- ⚠️ **Non-destructive, and this is a real requirement.** A re-read can come back *worse* than what
  it replaced — bad close-up, shadow, thumb over the page. The founder sees the new reading against
  the old and can **reject it and get the previous values back in one tap**, without re-uploading.
  **The re-read is never automatically authoritative.**
- **Repeatable.** Several columns can be re-shot, and the same column can be re-shot more than once.
- **Kept.** Close-up photos are stored with the game alongside the main sheet photo and are part of
  the permanent record, for exactly the same reason the main photo is: they are further evidence of
  what the paper said.
- **Cost is not a consideration.** A second read is roughly the same few pence as the first, at one
  or two sheets a week. ⚠️ **Nobody should design a cheap-out around this** — no limits on re-shots,
  no discarding close-ups to save space.

**4. Full manual entry** — the last resort
- The founder can **clear the transcription and type the grid in themselves**, at any point —
  without having to try a re-photograph first.
- Reachable **without re-uploading, without hitting an error state first, and without being
  presented as a failure path.** It is an ordinary way to use the app.
- The result is **a saved game identical in every respect to one that imported cleanly**.
- ⚠️ **Manual entry is not a bypass of the checks.** Columns must still climb, per-hand scores are
  still derived and shown, and save is still blocked on an incomplete or decreasing column. It is
  a different way of filling the same grid, not a different grid.

**Two product calls, made by the team** (overrule at mockups):
- **The photo is required and stored even when every number was typed by hand.** The photo is what
  makes a record checkable years later, and that guarantee must not depend on how the numbers got
  in. A game with no photo would be the one entry in the archive nobody can ever verify.
- **A manually-entered game is not marked or flagged in the record.** It is the same game. How the
  numbers arrived is of no interest to any stat, and a "manually entered" badge would only invite
  doubt about entries that are, if anything, *more* reliable than the imported ones.

**Browsing**

> As a player, I want to browse past games, so that I can settle an argument about a night we
> half-remember.

- Games list, newest first, showing date, location, roster name, and who won — **both names when a
  game was shared**.
- The list can be **filtered by location and by roster** (Milestone 3, with the analytics).
- Opening a game shows the full grid of eleven rounds and totals, plus the original photo.

> As a player, I want to fix or remove a game that went in wrong, so that the record stays true.

- Any saved game can be corrected — numbers, date, players — or deleted outright.
- Corrections re-run the monotonicity check and re-derive the per-hand scores; a game cannot be
  saved back into a state where a column decreases.
- The date and location of a saved game can be corrected too — including adding a location to an
  old sheet whose venue is remembered later.
- ⚠️ There is no undo and no record of who changed what. A delete is permanent, and the photo goes
  with it. The screen says so before it happens.

> As a player, I want one board of all-time records, so that I can see who is actually best in
> five seconds and start an argument about it.

- One screen, all-time, across the whole archive. It is the **landing screen** past the password
  gate; the games list and "add a game" are reachable from it.
- Each record shows **the holder's name and the number** — readable at a glance on a phone, no
  drilling required.
- A record with **more than one holder shows all of them**, jointly. This is normal, not an error.
- Every record states **how many games it's drawn from**.
- ⚠️ **Records with too little behind them are withheld, not shown small.** Until the archive has
  at least **10 games**, the board shows what it's waiting for rather than crowning anyone. A
  per-player record ignores players with fewer than **5 games**, and says how many were set aside.
- Tapping a record leads to the games behind it, so a claim can always be checked.

> As a player, I want stats for myself and for a roster, so that the record is fun and not just
> storage.

- A player page: their record across every game they played.
- A roster page: how that exact set of people performs together, separate from per-player stats.
- Stats state how many games they're computed from, so a single lucky night is visibly a single
  lucky night.
- Every game counts towards every stat — they are all the same shape, so nothing is ever excluded.
- A shared win counts as a win for both players and does not break any total, rate or streak.

## The admin panel

A small feature that matters out of proportion to its size: **it is the founder's only means of
operating this thing without a developer.** Everything in it is here because they genuinely cannot
do it another way. It is **not a settings screen** — no feature toggles, no theming, no user
management, because there are no users.

**Access: a second password**, separate from and independent of the group password.

- Holding the group password does **not** get you into the admin panel.
- What this separates: **"can log a game" from "can change how the system runs".** It means the
  group password can be texted around freely without exposing the API key, letting anyone change
  the passwords, or handing over the whole score history in one file.
- What it does *not* do: it is still a password, not an account. Anyone who has it is
  indistinguishable from the founder, and there is still no record of who did what.

> As the founder, I want a password-protected panel where I can set the API key, change both
> passwords, and take a copy of the scores, so that I can keep the thing running without needing a
> developer.

**Setting the transcription API key** — Milestone 1
- A new key can be pasted in and saved **without a developer and without a deploy**. Key rotation,
  or recovering from a key that leaked, is something the founder does alone in two minutes.
- ⚠️ **Verified before it is accepted.** A pasted key is tested with a real call before it is
  saved. A silently wrong key would otherwise be discovered by the founder standing at the table
  at midnight with a photographed sheet and an app that doesn't work.
- ⚠️ **Write-only.** Once saved, the panel never shows the key again — only enough to identify it:
  **last four characters, when it was set, and whether it currently works.** A panel that displays
  a key back is a panel that leaks it over someone's shoulder.

**Changing both passwords** — Milestone 2
- **The group password can be changed from the panel.** It will be texted around and will
  eventually reach someone who has left the group; fixing that must not need a developer.
- **The admin password can be changed from the panel too**, and ⚠️ **doing so requires entering the
  current admin password first.** Otherwise anyone who wanders past an unattended unlocked screen
  can take ownership of the system in two taps.
- ⚠️ **There must be a documented way back in if the admin password is forgotten**, and it must not
  need a developer. A forgotten admin password otherwise locks the founder out of the one screen
  that can change passwords — the only truly unrecoverable state in the product. *How* is the
  architect's call; *that it exists* is a requirement.

**Downloading the scores** — Milestone 2

The founder's clarification: *"the database I'm talking about is just the player scores."* So this
is the **score data only — players, games, rounds, rosters** — as a single file, on demand.

- **What it is**: the founder's own copy of the numbers. Years of games, openable in a spreadsheet,
  and their way out if the hosted database ever goes away.
- ⚠️ **What it is not: a complete backup of the archive. The photos are not in it.** The whole
  premise of this product is that any number can be checked against the paper years later, and
  **a file of numbers with no photos does not preserve that guarantee on its own.** The download
  must not be presented, named, or described in a way that implies otherwise — the difference
  matters at exactly the moment someone reaches for it.
- **The founder is not exposed by this**: the photos are separately and automatically backed up.
  They are simply not in this file.
- ⚠️ **No secret of any kind ever appears in the downloaded file.** Not the API key, not the group
  password, not the admin password. **This is a permanent acceptance criterion, not a one-off
  check** — every future change to the download is subject to it.
- **The hazard this exists to prevent**, stated so nobody re-introduces it: a panel that both
  stores the API key and offers a data download will, sooner or later, produce a file containing a
  working key. The founder would then hand out something that can spend their money — to a friend,
  to a cloud drive, to anyone — without once thinking about it. **The download must be safe to
  share carelessly, because eventually it will be.**

**Usage and spend** — Milestone 2, *a team suggestion rather than a founder request*
- Transcriptions this month and an estimated cost. The founder is paying per use and chose that
  deliberately; they should see what it costs without opening a billing console. It also makes a
  runaway or abused key visible early, which nothing else in the product would.

**Milestone call.** ⚠️ **The API key is in Milestone 1** — the app cannot transcribe anything
without one, and a founder who cannot replace a bad or expired key is a founder with a dead app and
no recourse. **Everything else waits for Milestone 2.** At Milestone 1 the archive is one or two
games and **the pad itself is still the real backup**, so a score download protects very little;
password rotation and spend are conveniences, not the difference between working and not. The
second password gate ships in Milestone 1 alongside the key, so the panel exists from the start and
the rest drops into it.

## The records board

**One screen. All-time. The honours board.** This is the "who's actually best" view — a fixed set
of headline records, each with a named holder and a number, readable in five seconds and arguable
for the rest of the night.

It is **not the analytics catalogue below**, and the two should not be merged. The catalogue is
exploratory: you go to it with a question. The records board answers before you ask. It is the
**landing screen past the password gate**, because it is the reason to open the app on a night
nobody is uploading a sheet.

**The four the founder named**
- **Most wins** — all-time.
- **Most wins in a row** — the longest streak anyone has managed.
- **Lowest average score** — the quiet one who just never blows up.
- **Most rounds won** — the most individual hands taken. See the round-winner definition in the
  data model: it needs no new data, ties are shared, and it can flatly disagree with who won the
  games. Taking the most hands all night and still losing on Kings is exactly the sort of thing
  this board exists to expose.

**The "etc." — proposed, in the same spirit**
- **The stalwart** — most games played. Turning up is a skill.
- **Best game ever** — the lowest final score anyone has ever posted, and the night they did it.
- **Worst game ever** — the highest. Named, dated, permanent.
- **The catastrophe** — the biggest points taken in a single hand, all-time.
- **Cleanest sheet** — most zero-point hands. Directly readable from repeats in a column: a value
  that doesn't move is a hand scored nothing.
- **The drought** — longest run without a win. Someone has to hold it.
- **The nearly man** — most second places.
- **Biggest hammering** — the widest margin between winner and runner-up in one game.
- **Home advantage** — the player with the biggest gap between their win rate at one venue and
  everywhere else. Needs enough games at that venue to mean anything, so it obeys the same
  withholding rules as everything else here.

Overlap with the analytics catalogue (best/worst game, biggest single-hand disaster) is
deliberate: the board is where they read as records, the catalogue is where they read as data.

⚠️ **Sample size governs this screen more than any other.** A board over four games crowns
someone on nonsense and does it with a straight face — see the acceptance criteria above for how
records are withheld rather than shown small.

## The analytics catalogue

All of these are **in v1** — they are a headline feature, not a follow-up. The tone is banter,
not a business dashboard.

Every game in the record is eleven hands, so **every stat below is computed over every game**.
There are no exclusions and no comparability caveats.

**Rivalry**
- Head-to-head records: who beats who, and by how much.
- Win rates, overall and per roster.
- Longest winning streak.
- **Nemesis** — the player who most reliably finishes above you.

*Shared wins are real wins.* A tie on the lowest total gives both players a win, keeps both
streaks alive, and counts as a win for each in head-to-head. Win rate is wins ÷ games played, so a
group's win rates can sum to more than 100% — that is correct and the screens should not hide it.

**Score distributions**
- Average final score, per player and per roster.
- Best game ever and worst game ever.
- How scores trend across the eleven hands — where games are actually decided.

**Hand-by-hand villains**
- Which hand (3s through Kings) each player bleeds the most points on.
- Biggest single-hand disasters, all-time.

**Place and time** — everything here is already captured, so none of it needs new data
- **Win rates and average scores by location** — "we play differently at Player E's".
- **Per-player performance by location**: does anyone have a genuine home advantage, or a venue
  they are reliably terrible at?
- **Location as a filter** alongside roster, on the games list and across the analytics.
- **Day-of-week and time-of-year slices** — available for free from the date we already store.
  Whether Sunday games are sharper than Friday ones, whether anyone falls apart at Christmas.
  Nobody has to capture anything extra for these; they are already bought and paid for.

**Personality stats** — the tone-setter for the whole section, in the founder's words
- **"The player who looks like they are cheating"** — the one whose results are suspiciously good.
- **"The player getting absolutely wrecked"** — the one currently taking the beating.
- **Most clutch comeback** — furthest behind at hand 9, still won.
- **Most consistent player** — smallest spread between their best and worst.

## Non-goals

Each is a decision, not an omission.

- **Not a live scoreboard.** No hand-by-hand entry during play. The paper is the game.
- **It does not know the rules of Five Crowns.** No wild cards, no going-out logic, no scoring a
  hand from cards. ⚠️ Every rule it learns is a rule that can disagree with the pad — and the pad
  wins. The **only** rule it is told is that the lowest total wins and ties are shared. (Knowing
  that a running total never falls is not a rule of Five Crowns — it is a property of the pad.)
- **No abandoned or partial games.** Only complete eleven-hand games go in the record. If a night
  is abandoned, it simply isn't logged. This is a decision, not a gap: it keeps every game in the
  archive comparable to every other, and keeps the expected shape of a column exactly known.
- **No accounts, no per-user login, no signup.** Two shared passwords — one for the group, one for
  admin — and therefore no record of who did what. Accepted.
- **The admin panel is not a settings screen.** No feature toggles, no theming, no user management.
  Something belongs there only if the founder genuinely cannot do it any other way.
- **No subset roster grouping.** Exact sets only, by design.
- **No bulk-import mode.** There are only a handful of old sheets; the normal flow run a few
  times in a row is enough.
- **Not multi-group.** One group, one password, one record.
- **No exports, no printing, no sharing links.** v2 at the earliest.
- **Running costs stay minimal.** A feature that needs something always-on and expensive is a
  feature we don't have.

## Risks

1. ⚠️ **The self-check is much weaker than this PRD originally assumed, and this is the headline
   risk.** There is no total to add up to. Monotonicity catches only errors that break the
   ordering; **an error that preserves it passes silently** — 123 read as 128 between 118 and 137
   is invisible to the app, and so is a running total the human wrote down wrong on the pad in the
   first place. A single wrong number also corrupts **two** derived hands, one either side of it.
   **Mitigation is mostly not technical**: the transcription sits beside the photo every time, the
   derived per-hand scores are shown as a reading aid — ⚠️ **the spike found they do not make a
   slipped error stand out**, because one wrong interior cell perturbs two adjacent hands in
   opposite directions and both stay plausible — and the photo is kept forever
   so any number can be re-read from the paper. The founder should expect to actually look. **The
   one technical lever that genuinely helps is the targeted re-photograph** — a close-up of a
   doubtful column is a far easier read than the same column on a full page, and it is available on
   any column, not just the ones that trip a check.
2. **Reading conditions are hostile and permanent.** Hand-ruled columns with no fixed geometry,
   arbitrary rotation, hard shadow, glare, thumbs in shot, and crossings-out where the wrong value
   is often the more legible one. This is the normal case. **Measured by Milestone 0 on
   2026-09-10: 97% of cells correct, 100% of final scores and winners correct, roughly one column
   in three carrying an error.** Hostile conditions are survivable; the errors they produce are
   invisible to every automated check, which is the real finding. See `docs/SPIKE-M0-READING.md`.

   ⚠️ **Manual override is the mitigation, and it is why this risk is survivable.** If Milestone 0
   comes back and says a hand-ruled pad cannot be read reliably, the fallback was always going to
   be typing the grid by hand — so **manual override is built in Milestone 1, before we know the
   answer.** The walking skeleton is therefore useful even in the worst case. **This converts the
   project's biggest risk from "the product might not work" into "the product might be more typing
   than we hoped."** That is a materially different risk, and a survivable one.
3. **Fractured player identity.** If "Sam" becomes two Sams, every stat that mentions him is
   quietly wrong, and nothing about the app will say so. Name matching is a first-class part of
   the review step for this reason.
4. **A shared password is a shared password, and anyone holding it can edit or delete a game.** It
   will be texted around. ⚠️ **A deletion is silent and unrecoverable** — no undo, no trace of who
   did it, and the photo goes with the game. An edit is equally untraceable. Accepted by the
   founder as the cost of having no accounts; it would not be acceptable for anyone else.
   **Partial mitigation**: because the photo is stored with the game, a *wrong edit* is recoverable
   in practice — the paper is still there to re-read. A *deletion* is not, because the photo is
   destroyed with it. If deletion ever proves painful, the cheapest fix is to keep deleted games
   hidden rather than gone; not in scope now.
5. **The admin password is a single point of failure.** ⚠️ **Forgetting it locks the founder out of
   the only screen that can change passwords or replace the API key** — the one genuinely
   unrecoverable state in the product. The requirement is that a documented way back exists and
   does not need a developer. Conversely, anyone who *has* it can spend money on the API key,
   change both passwords, and download every score. It is a password, not an account: there is no
   record of who used it.
6. **The score download is not a backup, and will be mistaken for one.** It contains the numbers
   and not the photos, so on its own it does not preserve the product's central promise that any
   number can be checked against the paper. Photos are backed up separately and automatically; the
   risk is one of *expectation*, and the mitigation is naming and describing the download honestly.

---

## Milestones

### Milestone 0 — Reading spike (half a day, throwaway) — ✅ DONE 2026-09-10

> **Complete. Verdict: reading works well enough to build on; the automated check does not.**
> 97% cell accuracy, 100% of final scores and winners correct, and **monotonicity caught 0 of 9
> misreads**. Full findings in `docs/SPIKE-M0-READING.md`; consequences recorded as an ADR.
> Milestone 1 proceeds unchanged, manual override included.


**Not a milestone the founder can touch, and deliberately not Milestone 1.** The question has
changed since the two real sheets arrived. It is no longer *"can this be read at all"* — we have
the format and we know the shape. It is now:

1. **How reliably can a column of running totals be read** under the real conditions (rotation,
   shadow, glare, crossings-out)?
2. ⚠️ **How often does monotonicity actually catch a misread, and how often does it let one
   through?** This is the question that matters. It decides how hard the founder has to squint at
   the review screen, forever. If ordering-preserving errors are common, the review screen needs
   to work much harder — and we would want to know that before designing it.

It remains a spike, not a product: nothing ships, and it is time-boxed.

- **Corpus**: the two sheets in `fixtures/sheets/`, plus the handful of old sheets the founder
  still has. Ground truth typed out by hand once, and kept.
- Transcribe each; compare against truth; count errors caught by monotonicity versus errors that
  passed.
- **Deliverable**: those two numbers, and a view on whether the derived per-hand scores make
  slipped errors visible in practice.
- If reading proves hopeless, the fallback is typing eleven numbers per player by hand — tedious
  but perfectly workable, and the rest of the product is unaffected. **That fallback is Milestone
  1's manual override**, which is built regardless of what this spike concludes, so a bad verdict
  here delays nothing and cancels nothing.

### Milestone 1 — Walking skeleton: one game in, one game out

The thinnest end-to-end slice a real person can use on a phone. **Definition of done: the founder
photographs a real sheet on their own phone and the game is in the record, correct, checkable
against the photo.** The two fixture sheets are the acceptance test — four players and five, one
of them sideways.

- Password gate on the front page.
- Photograph or choose a sheet on a phone.
- Any rotation accepted and straightened.
- Transcription of the eleven running totals shown beside the photo, with **derived per-hand
  scores alongside**, every column flagged if it decreases, numbers editable by tap.
- **Manual override, all four levels** — every cell editable, the four structural corrections,
  targeted re-photograph of a single column, and full manual entry as an ordinary path rather than
  a failure path. ⚠️ **Not deferrable**: it is the mitigation for the one risk that could sink the
  project, and it has to exist before Milestone 0's verdict lands.
- Photo required and stored either way, plus any column close-ups; a hand-typed game is
  indistinguishable from an imported one.
- Date pre-filled from the sheet or today, editable.
- **Location captured**: pick from the list or add a new one, defaulting to the last used, never
  blocking a save. ⚠️ **In M1 because it is a dimension** — a field on the review screen and a
  short list, trivial to build, and **every game logged before it exists is permanently missing
  it.** The location *analytics* wait for M3.
- Save blocked until every column has eleven values and never decreases.
- Winner recorded as the lowest total, with ties recorded as shared.
- Names confirmed by **picking from the list of existing players, or adding a new one**. No
  automatic suggestion yet — the pick-list alone is enough to stop identities fracturing from day
  one.
- Roster created or matched from the exact set; default auto-name; no renaming yet.
- Games list, and a game view showing the grid plus the original photo.
- **Admin panel behind its own second password**, containing one thing: **set the transcription API
  key** — verified with a real call before it is accepted, never displayed back, identified only by
  its last four characters and when it was set.

**Cut from M1**: all analytics, name suggestion from the handwriting, roster renaming, editing or
deleting a saved game, player and roster pages, and everything in the admin panel except the API
key.

### Milestone 2 — Identity, rosters, and the rest of the admin panel

- **Admin panel completed**: change the group password; change the admin password (current one
  required first); download the scores; usage and spend. Plus the documented, developer-free way
  back in if the admin password is forgotten.
- Handwritten names get a **suggested** player match on review, "someone new" always one tap away.
- Roster renaming ("Thursday crew"), reflected everywhere.
- Player pages and roster pages, with games played and basic record.
- **Edit or delete a saved game**, with a clear warning that a delete is permanent and takes the
  photo with it.
- **Merge two players** who turn out to be the same person. Names are consistent today, so this is
  insurance rather than an immediate need — but it stays in M2, because the day it's needed the
  stats are already wrong.
- **Rename or merge locations**, for the same reason and by the same mechanism. The pick-list makes
  duplicates unlikely, not impossible.

### Milestone 3 — The records board and the analytics

- **The records board**, as the landing screen: the four named records plus the proposed extras,
  each with holder(s), number, and the games behind it.
- **Round winners** derived from the per-hand scores, which are themselves derived from the
  running totals — definitions all the way down, no new data and no migration.
- Withholding rules honoured: nothing crowned under 10 games, no player ranked under 5.
- Rivalry: head-to-head, win rates, streaks, nemesis.
- **Shared wins handled throughout**: a tie on the lowest total is a win for each player, keeps
  both streaks alive, and counts in both head-to-head records. Win rates across a group can
  therefore sum to over 100%, which is correct.
- Distributions: averages, best/worst ever, the 11-hand trend.
- Hand-by-hand villains and single-hand disasters.
- **Location and time slices**: win rates and averages by venue, per-player home advantage, plus
  day-of-week and time-of-year — and location as a filter on the games list and the analytics.
- Sample sizes shown alongside every stat.

**Should any of it come earlier?** I considered pulling the records board into M1 as the landing
screen, since M1 needs *something* to land on. **No** — with one game in the archive every record
is the same person and the board is a joke at its own expense; the withholding rules would hide
all of it anyway. **M1 lands on the games list instead**, which is honest at one game and still
useful at fifty. The one thing worth pulling early is cheap and invisible: **M1 already records the
winner of each game** (lowest total, ties shared), so by the time the board is built the history
it needs is complete rather than backfilled.

### Milestone 4 — Personality and polish

- "The player who looks like they are cheating", "the player getting absolutely wrecked", most
  clutch comeback, most consistent.
- Whatever the old sheets teach us once they're all entered.

### v2 and beyond (not now)

Exports, sharing outside the group, multiple groups, live scoring, anything that knows the rules.
