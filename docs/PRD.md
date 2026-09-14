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

**Nothing in Milestone 1 is waiting on the founder.** Two operational questions opened at Stage 5 —
they change how the last stage is run, not what gets built. A third opened on 2026-09-14 and is a
**Milestone 3 scope question**, parked until then. A fourth, also 2026-09-14, was the one live
blocker on **Milestone 2 Stage 4**; the founder answered it the same day, so **nothing in Milestone
2 is waiting on the founder either** and Stage 1 can start.

**Milestone 3, opened 2026-09-14**, un-parks question 3 (it is now Milestone 3's turn) and adds
questions **6–9**. ⚠️ **None of them blocks Stage 1 from being built** — 6 is two constants, 7
decides whether Stage 1's last criterion survives, and 8 and 9 are needed before Stages 2 and 4 are
specced, not before the first line of code. They are product opinions, not team calls, which is why
they are asked rather than assumed.

⚠️ **Milestone 3 Stage 2 was specced the same day** (criteria 197–222) and adds **question 10** —
the tone of the nemesis, a stat about one named friend beating another. It does not block Stage 2's
build any more than 6–9 blocked Stage 1's: the default is what the criteria already say.

⚠️ **Milestone 3 Stage 3 was specced the same day too** (criteria **223–249**, immediately after
Stage 2's), adding questions **11 and 12** and **restating question 3 as 3a/3b** now that it has
something concrete to bite on. **None of the three blocks anything** — Stage 2 is still the next
thing built, and each has a stated default. ⚠️ **Stage 3 defines no second place of its own**: its
*biggest hammering* record uses **Stage 2's criterion 214** and nothing else.

⚠️ **Updated 2026-09-14, same day: the founder answered 6, 8, and the part of 7 Stage 1 needed.**
**The board now shows records from game one under an early-days line** instead of withholding them
(question 6 — criteria 182–185 rewritten), **the stalwart is adopted permanently** (question 7 —
criterion 196 is no longer conditional), and **the personality stats stay in Milestone 4**
(question 8 — no change anywhere). **Nothing in Milestone 3 Stage 1 is waiting on the founder.**

## Open questions

*Opened 2026-09-13 for Milestone 1 Stage 5. Both are the founder's to answer; neither blocks the
scratch-environment work starting.*

1. **The key window.** Criteria 50–57 and the M0 spike re-run need a working Anthropic key that QA
   does not hold. Two ways: paste a key into the **scratch** environment for the Stage 5 window and
   revoke it after, or keep the key to yourself and run those items on the live site yourself.
   ⚠️ **Cost either way is about A$0.30–0.60**, so this is a question about who does the clicking,
   not about money.
2. **Signing off criterion 85.** When you ran the two real sheets on 2026-09-13, did you check
   **every cell** against the photo, or the totals and the winner? 85's wording is *"correct and
   checkable against the photo, cell by cell"*. If it was the totals, one of the two games needs a
   five-minute cell-by-cell pass to close it — the run itself doesn't need repeating.

*Opened 2026-09-14 by the real-API re-run. Does not block Milestone 1 — nothing changes in M1
either way.* ⚠️ **Un-parked 2026-09-14 by the Milestone 3 spec: it is now live.** M3 Stage 1 builds
**lowest average score** directly on those final scores, and Stage 3 builds **best and worst game
ever** on them. **Default if unanswered: nothing changes** — the final row keeps the call-out it has
today and the board is built on it, so this does not block Stage 1. It is here because the moment
those numbers become records is the moment a wrong one becomes permanent and quotable.

3. **Should the final row cost you more than a glance?** The re-run showed a final score can be
   read wrong, repeatably, with nothing on screen hinting at it (risk 1). Today the final row is
   called out on its own and you read it — that is the whole defence, and for M1 we are leaving it
   there. The question is for **Milestone 3**, where average score and "best game ever" get built
   on those numbers: would you want the review screen to make the last row *deliberate* rather than
   glanceable — e.g. tapping to confirm each final score, or the app offering a close-up of the
   final row by default? ⚠️ **This would be new scope, so it is your call, not ours**, and we are
   not proposing it. A second read is not on the table either way: errors repeat.

   ⚠️ **Restated 2026-09-14 by the Milestone 3 Stage 3 spec, because this is the stage where it
   bites.** Stage 3 builds **best game ever, worst game ever, biggest hammering, the catastrophe and
   every average** — five board records and two screens whose numbers are a score read as a number.
   The question splits cleanly in two, and **they can be answered separately**:
   - **3a ✅ Answered 2026-09-14: no, nothing beyond the sample statement.** The founder confirmed
     the default — each record states the date of the game it came from (criterion 233), the wording
     ban applies, and one tap lands on the game where the photo is. No fixed caveat line is added to
     the board or `/stats`. *For the record, the alternative on the table was* **one fixed line,
     once** — something like *"These are read off the paper. If a final score was read wrong, this
     is where it shows up — the photo's on the game."* — *never a caveat per card, which the founder
     had already ruled out once before (question 6).*
   - **3b — does the review screen change?** Still open, not part of Stage 3's checkpoint. The
     original question, unchanged: make the final row deliberate (a tap per final score, or a
     close-up of the last row by default). ⚠️ **That is new scope in Milestone 1's flow, not a
     Stage 3 item**, and it is the only one of the two that could stop a wrong number entering the
     record rather than labelling it afterwards. **Default: nothing changes.**

   ⚠️ **Neither blocks Stage 3 being built.**

*Opened 2026-09-14 by the Milestone 2 spec. ✅ **Answered by the founder the same day — no longer
open.** Kept here with its answer rather than deleted, per the house rule on preserving decision
history. Full reasoning in `docs/DECISIONS.md`; it produced criteria 172–173.*

4. ✅ **Answered: option (a) — the suggestion is pre-selected, and accepting it costs nothing.** The
   founder's reasoning: this is for themselves and about five other people, so a wrong guess is rare
   and is still visible and correctable on the review screen like everything else there — *the review
   screen does not stop being the check just because one field starts pre-filled*. The original
   question, for the record: **when the app suggests a player, does a tap have to accept it?** Once a
   handwritten name is
   matched to an existing player, either (a) the suggestion is **pre-selected and saveable** — a
   clean sheet of four known faces is zero taps, and a wrong suggestion can be saved by someone not
   looking, or (b) **each column needs one tap to accept**, so four known faces cost four taps and
   nothing enters the record unlooked-at. The agreed scope says the match is presented *"to confirm
   or change"*, which reads like (b); the story it serves says *"never more than a tap or two"* and
   *"never retype the roster"*, which reads like (a). ⚠️ **This is about how much friction you want
   in the thing you do every game**, so it is yours. It is cheap either way and cheap to change
   later — what it is not is guessable. Everything else about matching is specced and unaffected.

*Opened 2026-09-14 by Milestone 2 Stage 1's security review and independently confirmed by QA.
✅ **Answered by the founder the same day — no longer open.** Kept here with its answer, per the
house rule on preserving decision history. Full reasoning in `docs/DECISIONS.md`.*

5. ✅ **Answered: option (a) — widen the grant.** The group and admin password-change routes write
   four SSM parameters (`group-password-hash`, `admin-password-hash`, `group-session-epoch`,
   `admin-session-epoch`). The web Lambda's IAM role could until now write only the three
   `anthropic-api-key*` parameters — narrowed on 2026-09-11 specifically so a bug in the
   internet-facing app could never overwrite either password hash. As built, both routes would have
   got `AccessDeniedException` from SSM and surfaced as a plain 500. The founder chose in-panel
   rotation actually working over keeping that narrower grant, re-accepting the 2026-09-11 risk for
   exactly these four parameters. The original question, for the record: **(a) widen the grant** to
   the four new parameters, or **(b) keep the narrower grant** and drop in-panel password rotation
   entirely, rotating both passwords only through the SSM runbook already written for the
   forgotten-password case (criteria 97–101). Criteria 87–96 (the panel forms) now ship for real.

*Opened 2026-09-14 by the Milestone 3 delivery spec. All four are the founder's. ⚠️ **None blocks
the build starting** — each has a stated default, and the default is always "what the PRD already
says".* ✅ **Three were answered by the founder the same day**: 6 in full, 8 in full, and the only
part of 7 that Stage 1 needed. Kept here with their answers rather than deleted, per the house rule
on preserving decision history; full reasoning in `docs/DECISIONS.md`. **3 and 9 are still open and
still do not block anything.**

6. ✅ **Answered 2026-09-14: option (c) — the board shows records from game one, under an early-days
   line.** ⚠️ **The founder overruled the team's push-back**, and the thing the team's argument
   missed is plain enough once said: this board is the landing screen, and **the months when the
   archive is small are exactly the months the founder most wants something on it**. A screen that
   says "waiting for eight more games" until November is a screen nobody opens until November.
   **What the founder chose is the shape, not the wording** — the mechanics below are the team's,
   specified against it:
   - **Nothing is withheld and nobody is set aside.** Every record shows its holder and its number
     from the first saved game. **The 5-game per-player threshold is dropped outright**: a player on
     one game can hold a per-player record.
   - **The 10-game constant survives, as a caveat threshold rather than a gate.** While the archive
     holds fewer than 10 games the board carries **one fixed line at the top** — *"Early days — 2
     games in the record. A single game can still change any of these."* — and at 10 games it is
     gone. One line, one place, not thirteen apologies.
   - ⚠️ **The honesty burden moves onto the sample statement**, which every record carried anyway:
     a per-player record now states **the holder's own game count** beside the number, so "lowest
     average score — Sam, 41.5, from 1 game" is self-evidently thin without the board having to say
     so twice.
   - **Rewritten as criteria 182–185**, dated inline. The board gate and the per-player floor are
     struck there rather than deleted.

   *The original question, for the record:* **do the withholding thresholds still feel right now that
   real games exist?** The agreed rule was
   **10 games before the board crowns anyone**, and **5 games before a player is counted in a
   per-player record**. ⚠️ **The record currently holds two games.** At roughly a sheet a week, the
   board's landing screen would say *"2 of 10 games"* until about November, and the first crowning
   would be over a sample of ten. Three ways to go: **(a) keep 10 and 5** as agreed — the board is a
   waiting room for a couple of months and then means something; **(b) lower the board gate** (6 is
   the obvious alternative — every player in a four-handed group can already be on 5) and keep the
   per-player 5; **(c) keep both numbers, but show the board from game one under a prominent
   "it's early days" line** rather than withholding it. ⚠️ **(c) is the one we'd push back on**: the
   PRD's own reasoning is that a board over four games "crowns someone on nonsense and does it with
   a straight face", and a caveat nobody reads is not a defence. **Default if unanswered: (a),
   unchanged.** Either number is a constant — changing your mind later costs minutes, not a rebuild.
7. ✅ **Partly answered 2026-09-14: the stalwart is in, permanently.** Criterion 196 stops being
   conditional and is adopted as an ordinary Stage 1 criterion — **Stage 1 is fully unblocked.** The
   other eight extras are **still open and still not blocking**: each is decided when the stage that
   computes its number is specced (Stage 2 for the drought and the nearly man, Stage 3 for
   best/worst/catastrophe/cleanest sheet/biggest hammering, Stage 4 for home advantage), and the
   default there remains "build it". ⚠️ **The legibility question stands** — if the board reads as
   cluttered once Stage 2 lands, that is the moment to cut, and cutting one is deleting a row.
   *The original question, for the record:* **which of the proposed extra records do you actually
   want?** The four you named — most wins,
   most wins in a row, lowest average score, most rounds won — are committed. The **"etc." eight**
   were our proposal, not your request: *the stalwart* (most games played), *best game ever*, *worst
   game ever*, *the catastrophe* (biggest single hand), *cleanest sheet* (most zero-point hands),
   *the drought* (longest run without a win), *the nearly man* (most second places), *biggest
   hammering* (widest winner-to-runner-up margin), *home advantage*. ⚠️ **Cost is not the reason to
   cut any of them** — each rides on a number the analytics stage is computing anyway, so a record
   is a row on a screen. **The reason to cut is that a board of thirteen records is not readable in
   five seconds**, which was the whole point of it. Keep, cut or reorder freely.
   **Default if unanswered: build all of them**, each in the stage that computes its number.
   **Only one is needed now**: *the stalwart* is the sole extra that Stage 1 would carry (criterion
   196) — a yes/no on that one unblocks Stage 1 completely, and the rest can wait for Stage 2.
8. ✅ **Answered 2026-09-14: yes — the personality stats stay in Milestone 4.** The milestone list is
   confirmed as the plan of record, the catalogue section's *"all of these are in v1"* is read as
   the older wording, and **nothing was built either way**, so this closes with no change anywhere.
   ⚠️ **Their wording stays the founder's** whenever M4 is specced. *The original question, for the
   record:* **do the personality stats stay in Milestone 4?** ⚠️ **The PRD disagrees with itself here.** The
   analytics catalogue says *"All of these are in v1"* and then lists **"the player who looks like
   they are cheating"**, **"the player getting absolutely wrecked"**, *most clutch comeback* and
   *most consistent*; the milestone list puts exactly those four in **Milestone 4 — Personality and
   polish**. **We are reading the milestone list as the plan of record and treating them as M4**,
   which is why they appear nowhere in the M3 spec below. Say if you want any of them pulled
   forward. ⚠️ **Their wording is yours whenever they are built** — "the player who looks like they
   are cheating" is a joke about a named friend on a screen that friend will read, and the team
   should not be inventing that tone on your behalf. **Default if unanswered: they stay in M4.**
9. **What does "location as a filter" mean on screen?** Milestone 2 shipped a **places index** —
   every venue with its games-played count — but **no per-venue page**. M3 has to put the venue
   numbers somewhere, and there are three honest shapes: **(a) a filter on the games list**
   ("show me Player E's nights"), with the venue stats living on the analytics screens; **(b) a
   per-venue page** at `/places/{id}`, mirroring the player and roster pages you already have —
   win rates and averages at that venue, then that venue's games; **(c) both**, the filter being
   what the venue page's game list *is*. ⚠️ **We lean (c)**, because it is barely more work than (b)
   and it is how the player and roster pages already behave — but where a filter lives is something
   you will use weekly and we will not, so it is yours. **Needed before Stage 4 is specced, not
   before Stage 1.** **Default if unanswered: (c).**

*Opened 2026-09-14 by the Milestone 3 **Stage 2** spec. The founder's, for the same reason the
personality stats' wording is (open question 8). ⚠️ **It does not block Stage 2 being built** — the
default is what the criteria already say.*

10. ✅ **Answered 2026-09-14: option (b) — the banter turns up, not flat.** The founder chose to lean
    into the PRD's own "banter, not a dashboard" tone rather than the team's flat, factual default.
    ⚠️ **The founder asked to see options, not pick blind**: the ui-designer writes a **short list of
    candidate titles and framings** for the nemesis card (in place of the single flat sentence
    criterion 202 originally specified) as part of Stage 2's mockup, and the founder picks or
    redirects at that checkpoint — this is **not** a blank cheque to invent an edgier tone
    unsupervised. Still true regardless of wording: nothing may call anyone weak, dominated,
    hopeless or a walkover, and nothing tells anyone what to do about it — the banter is in the
    framing and the title, never in language about a specific person. Criterion 202 is amended
    accordingly; the number, the rate and the sample stay exactly as specced.
    *The original question, for the record:* **the nemesis is a stat about one named friend beating
    another — is its tone the founder's to set?** Every other number in this milestone is about a
    player and the archive; nemesis is about two people, by name, on a screen they both read —
    "Sam has finished above you in 8 of 9 games you have played together". Three things were on the
    table: (a) a different title, since *nemesis* was the one word the team didn't write; (b) the
    banter turned up; (c) nemesis cut entirely. The team would not guess between them, because it is
    the same call as "the player who looks like they are cheating" — a joke about a named friend is
    the founder's to make, not the team's to invent.

*Opened 2026-09-14 by the Milestone 3 **Stage 3** spec (criteria 223–249). Both are the founder's.
⚠️ **Neither blocks anything** — Stage 2 is next in the build order, and both have stated defaults.*

11. ✅ **Answered 2026-09-14: one game, not a career.** The founder confirmed the default — cleanest
    sheet stays **the most zeros one player scored in one game**, out of eleven (decision 18,
    criterion 231), not a career count. *For the record, the reasoning offered at the time*: a career
    total mostly measures **turning up**, which the stalwart already measures, and it climbs forever
    with nothing to compare it against, whereas a career count of zero-point hands would have been a
    different and perfectly real record — the person who most often goes out clean.
12. **Twelve records on the board — is it still readable in five seconds?** Stage 2 takes the board
    to seven cards; **Stage 3 takes it to twelve** (best game ever, worst game ever, the
    catastrophe, cleanest sheet, biggest hammering), and Stage 4's home advantage makes it
    **thirteen**. ⚠️ **This is question 7's legibility warning arriving for real** — you said build
    all of them, and the reason to cut was never cost, it was that *"a board of thirteen records is
    not readable in five seconds, which was the whole point of it."* Two things we would like from
    you, both cheap and both reversible: **the order** (which records sit at the top of a phone
    screen — the four you named are first today) and **whether any of the five Stage 3 additions
    should not be on the board at all**, with its number still living on `/stats`. ⚠️ **Deleting a
    record from the board is deleting a row**; moving one is reordering a list. **Default if
    unanswered: all twelve ship, the founder's four first, in the order documented in the design
    system** (criterion 235). *(Criterion 218 already asks QA to report how seven reads at 375px —
    that finding lands before you have to answer this.)*

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
  place", "player cs" and "Player C's House" typed on three different nights would fracture into three
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
- **Cost is not a consideration.** A second read is roughly the same few cents as the first, at one
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
- Every record states **how many games it's drawn from**, and a per-player record states **how many
  games its holder has played**.
- ⚠️ ~~**Records with too little behind them are withheld, not shown small.** Until the archive has
  at least **10 games**, the board shows what it's waiting for rather than crowning anyone. A
  per-player record ignores players with fewer than **5 games**, and says how many were set
  aside.~~ ⚠️ **REPLACED 2026-09-14 by the founder's answer to open question 6 — records are shown
  from game one.** Nothing is withheld and no player is set aside; the archive being small is
  exactly when the founder most wants something on the board. **Under 10 games the board carries one
  fixed early-days line at the top**, and the sample statement above carries the rest of the
  honesty. *Kept struck rather than deleted, per the house rule on preserving decision history.*
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
  everywhere else. Needs enough games at that venue to mean anything, so ⚠️ *(amended 2026-09-14)*
  it **states the venue's own game count** beside the number, like every other record here.

Overlap with the analytics catalogue (best/worst game, biggest single-hand disaster) is
deliberate: the board is where they read as records, the catalogue is where they read as data.

⚠️ **Sample size governs this screen more than any other.** ~~A board over four games crowns
someone on nonsense and does it with a straight face — see the acceptance criteria above for how
records are withheld rather than shown small.~~ ⚠️ **REPLACED 2026-09-14 (open question 6).** The
founder's call is that **a board over four games is still worth looking at, as long as it says it
is a board over four games.** So nothing is withheld: every record is shown from game one, every
record states its sample, a per-player record states its holder's game count, and **under 10 games
one fixed early-days line sits at the top of the screen**. See criteria 182–185.

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

   ⚠️ **Corrected 2026-09-14 by the real-API re-run: the final row is not structurally protected,
   and this paragraph used to imply it was.** The comfort above rests on interior errors
   self-cancelling — an error at hand *n* inflates hand *n* and deflates hand *n+1* by the same
   amount, so every total below it survives. **Row 11 has no hand 12 to cancel against**, and the
   first spike never sampled an error there; its "0 errors in row 11" was a small sample, not a
   property. The re-run found the opposite: **3 of 6 reads turned a true final score of 144 into
   174 — the same wrong number every time.** Nothing in the product would say so: 134 → 174 still
   climbs, so monotonicity is silent; the read-hint pointed at hands 5 and 6, never at 11; the
   derived hands either side stay ordinary. **Winners survived on margin, not on structure** (still
   6/6 correct, because a game is rarely close enough for 30 points to flip it) — but **average
   score and best/worst game ever read a final score as a number rather than a comparison, and a
   wrong one there is permanent**, findable only by going back to the photo. **The mitigation is
   already built and it is the founder's eyes**: the final row is called out on its own on the
   review screen (criterion 23), which is exactly the treatment this finding justifies. ⚠️ **The
   answer is still not a second read** — the 174 reproduced three times out of three, so reading it
   again buys a second wrong answer and the false confidence that goes with it. Read the last row
   against the paper, every game. Full workings: `docs/SPIKE-M0-READING.md`, 2026-09-14.
2. **Reading conditions are hostile and permanent.** Hand-ruled columns with no fixed geometry,
   arbitrary rotation, hard shadow, glare, thumbs in shot, and crossings-out where the wrong value
   is often the more legible one. This is the normal case. **Measured by Milestone 0 on
   2026-09-10: 97% of cells correct, ~~100% of final scores and~~ winners correct, roughly one column
   in three carrying an error.** *(⚠️ final-score claim corrected 2026-09-14 — the real-API re-run
   scored 96% of cells correct, winners still 6/6, but **final scores wrong in 3 of 6 reads**. See
   risk 1.)* Hostile conditions are survivable; the errors they produce are
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
7. **Recent scores can be lost, and that is accepted.** The database is backed up **by hand, on
   demand** (`npm run db:backup`), never on a schedule. If the hosted database lost data, every game
   saved since the last manual backup would go with it. The founder accepted this on 2026-09-11:
   *"this isnt sensitive data, its just a pet project. if something gets lost, its not the end of
   the world."* ⚠️ **Photos are not part of this risk**: the photo bucket is versioned with no
   delete lifecycle, so every sheet photo is kept permanently whatever happens to the database.

---

## Milestones

### Milestone 0 — Reading spike (half a day, throwaway) — ✅ DONE 2026-09-10

> **Complete. Verdict: reading works well enough to build on; the automated check does not.**
> 97% cell accuracy, ~~100% of final scores and~~ winners correct, and **monotonicity caught 0 of 9
> misreads**. Full findings in `docs/SPIKE-M0-READING.md`; consequences recorded as an ADR.
> Milestone 1 proceeds unchanged, manual override included.
> ⚠️ **Re-run through the real API 2026-09-14** (Stage 5): the verdict holds, but the final-score
> claim does not — **row 11 was wrong in 3 of 6 reads**, and is not self-cancelling. See risk 1.


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

### Milestone 1 — delivery spec

*Written 2026-09-10, after the Milestone 0 verdict landed. This section is longer than the rest of
this PRD on purpose: it is the build contract, not the decision document. Everything above it still
governs. **Two founder decisions frame it:** M1 **finishes live** at `fivecrowns.ribenajuice.xyz`,
so provisioning AWS, the database and the photo bucket are inside this milestone; and it is
**delivered as five reviewed PRs** rather than one.*

⚠️ **The wording constraint governs this whole milestone.** Monotonicity caught **0 of 9** misreads.
**Nothing the app says — on screen, in a button, in a banner, in a confirmation — may describe a
transcription as checked, validated, verified or confirmed.** The strongest honest claim is **"not
obviously wrong"**. There are acceptance criteria below that test the wording itself, and they fail
the build like any other.

⚠️ **Do not build "transcribe twice and compare".** The spike found the same ambiguous digits misread
identically across independent reads. **Targeted per-column re-photograph is the sanctioned second
path**, and it is never worded as reading it again to check — it supplies new pixels, not a second
opinion.

#### User stories

**Getting in**

> As a member of the group, I want to enter one shared password to get in, so that nobody has to
> make an account.

- One password on the front page; nothing of the record is readable without it.
- The device stays logged in; nobody retypes it every night.
- The group password does not open the admin panel.

**Getting a game in**

> As a player, I want to photograph the finished sheet on my phone and have the numbers read off
> it, so that the night is kept without anyone typing forty-four numbers.

- The camera opens directly; a photo already on the phone works too.
- Any rotation is accepted, and the founder turns it upright in one tap per quarter turn.
- The photo is stored permanently, at full quality, before anything else happens.
- What was read comes back as columns of eleven running totals with a name on each.

> As a player, I want to read the transcription against the photo one column at a time, so that I
> catch what the app cannot.

- The photo sits beside the numbers **every time**, cropped to the column being read, on the same
  row pitch, so paper line 7 is level with screen line 7.
- Derived per-hand scores sit alongside the running totals and update as you type. ⚠️ **They are a
  reading aid, not a check** — the spike proved they do not make a slipped error stand out.
- A column that stops climbing is flagged at **both** numbers of the offending pair.
- A repeated value is a zero-point hand. ⚠️ **Never a suspected duplicate read.**
- The final row of every column is called out on its own, because a wrong number there changes who
  won.
- Save is unavailable while any column is short of eleven values or dips — and the screen says what
  passing that means: **not obviously wrong**, not verified.

**Manual override, all four rungs**

> As a player, I want to fix any single number by tapping it, so that a nearly-right read costs me
> ten seconds rather than the whole grid.

- Every cell is editable at all times, including cells nothing flagged.
- The editor shows that column's photo strip, a keypad, and the hand scores either side of the line
  being edited.

> As a player, I want to repair the *shape* of the grid when editing numbers cannot rescue it, so
> that a missed column or a doubled row doesn't cost me the game.

- Add or remove a player column; set or change who a column belongs to; reorder columns to match the
  photo; insert or delete a value within a column and shift the rest.
- ⚠️ **This is not a spreadsheet.** Four repairs, and deliberately nothing else.

> As a player, I want to take a close-up of one doubtful column and have that column read on its
> own, so that I get better numbers without typing them.

- Offered on any column the app is unsure about, and **invokable on any column at any time**,
  including ones the app thinks are fine.
- The app names the column it wants: *"Photograph Player D's column."*
- Only that column changes. Every hand correction elsewhere survives untouched.
- The new reading is shown against the old and **rejected in one tap** if it came back worse.
- Close-ups are kept forever with the game, accepted or rejected.

> As a player, I want to type the whole grid myself whenever I like, so that a hopeless read never
> costs me the record.

- Reachable without re-uploading, without hitting an error first, and never worded as a failure.
- The photo is still required and still stored.
- The result is **a game indistinguishable from an imported one** — no badge, no flag, nowhere.
- ⚠️ Not a bypass: columns must still climb, hands are still derived, save is still gated.

**The night around the numbers**

> As a player, I want the date and the venue recorded, so that the archive can be asked questions
> about *when* and *where* years from now.

- Date pre-fills from the sheet if it's written there, otherwise today, always editable.
- Location pre-fills with the last one used, changed by picking from a list or adding a new one.
  **Never raw free text.**
- ⚠️ **Location never blocks a save**, and a game with none is shown as having none.

> As a player, I want the names on the sheet tied to the right people, so that nobody quietly turns
> into two people.

- Every column's player is **picked from the list of existing players**, or explicitly created as
  someone new. No automatic suggestion in M1.
- The roster is matched to the exact set, or created with a default name from its members.

> As a player, I want a tie recorded as two winners, so that the record matches what actually
> happened at the table.

- Lowest final total wins. **Two players on it means two winners**, on the review screen, in the
  saved game, and in the games list.

**The record**

> As a player, I want to see the games I've saved and open one up beside its photo, so that the
> archive is real rather than a promise.

- Games list, newest first: date, venue, roster, winner or winners.
- A game shows the eleven running totals as the paper has them, the derived hands alongside, the
  final row called out, and the original photo — pinch-zoomable — plus any close-ups.

**Keeping it running**

> As the founder, I want to set the transcription API key from a password-protected panel, so that a
> dead or leaked key is two minutes of my time rather than a developer's afternoon.

- A second password, independent of the group one.
- The key is **tested with a real call before it is accepted**.
- ⚠️ **Write-only**: last four characters, when it was set, whether it currently works. Never shown
  back.
- ⚠️ **One job. Nothing else in the panel in M1.**

#### Acceptance criteria

*Executable by QA against the two fixture sheets. **`sheet-01-four-players.jpg`** — four players,
portrait, six consecutive `64`s in Player D's column, a struck-through value in Player B's row 4, a
genuine 51-point hand, winner Player C on 78. **`sheet-02-five-players-rotated.jpg`** — five
players, written along the long edge and photographed sideways, `48` held for five consecutive rows
in Player B's column, winner Player B on 71. Ground truth is
`fixtures/sheets/GROUND-TRUTH.md`; it is founder-verified and not to be edited.*

**Getting in**

1. Requesting `/`, `/games`, any game URL, any `/review/{id}` or `/admin` with no session redirects
   to `/login`, and **no fragment of the record appears in the returned HTML**.
2. A wrong password is refused, sets no cookie, and says so; the correct password lands on the games
   list.
3. After a successful login, quitting the browser and reopening the app the following day lands on
   the games list with no password prompt.
4. Holding a valid **group** session and opening `/admin` produces the admin password prompt, not the
   panel.
5. Ten failed logins from one address inside ten minutes cause further attempts to be refused with a
   plain "try again later", including a correct one.

**The photo**

6. On a phone, "add a game" opens the camera directly; choosing an existing photo also works.
7. `sheet-01` photographed portrait appears upright without any rotation being needed (EXIF applied).
8. `sheet-02` photographed sideways is turned upright with the rotate control — one tap per quarter
   turn, four taps returns it to where it started — and **that orientation is what is shown from then
   on, including on the saved game view days later**.
9. After capture, exactly two objects exist at `photos/{photoId}/original.jpg` (long edge ≤ 3000px)
   and `photos/{photoId}/model.jpg` (long edge ≤ 1568px). An unauthenticated GET on either is denied.
10. There is **no path through the app that saves a game without a sheet photo** — including full
    manual entry. QA attempts it and cannot reach save.
11. A game typed entirely by hand and a game imported from a transcription are **identical on screen**:
    QA compares the games list row and the game view of one of each and finds no badge, icon, label,
    tooltip or wording distinguishing them.
12. Photos are served by presigned URL; a URL copied out of the page stops working after five minutes.

**The review screen**

13. With `sheet-01`, the review screen shows **four** player chips with a status dot on each; with
    `sheet-02` it shows **five**, in the same layout, with no configuration step and no horizontal
    scrolling of the grid at 375px wide.
14. For the selected column, the photo strip beside the grid is cropped to **that player's column
    only** and shares the grid's row pitch: QA measures that paper line 7 and screen line 7 are level
    within one row height on both fixtures.
15. ⚠️ There is **no state of the review screen in which the photo is absent**, including a read where
    nothing is flagged. QA reaches save from a clean read and confirms the photo strip is on screen at
    the moment save is pressed. No "looks fine, save" shortcut exists anywhere.
16. Tapping any cell — **including one nothing has flagged** — opens the cell editor showing (a) that
    column's photo strip positioned at the edited row, (b) a numeric keypad, (c) the derived hand
    score for the row above **and** the row below the edited value, and (d) previous/next line
    controls.
17. Changing a value updates the two neighbouring derived hand scores **on the keystroke**, with no
    network round trip and no apply step.
18. All 44 cells of `sheet-01` and all 55 of `sheet-02` are editable at every point in the review,
    before and after any flag, re-read or structural repair.
19. ⚠️ **The repeats criterion.** On `sheet-01`, Player D's column holds `64` for **six consecutive
    rows**. QA confirms that **no warning, flag, dot, tint, icon, banner or wording of any kind**
    appears on that column or those cells, and that the derived hands render as
    `29, 0, 35, 0, 0, 0, 0, 0, 3, 0, 44` — five zeros in a row, shown as zero-point hands.
20. The same on `sheet-02`, where Player B holds `48` for five consecutive rows: no duplicate-read
    suspicion anywhere on screen.
21. Editing `sheet-01` Player A's row 6 from `100` to `70` flags **both** `70` and the `74` above it,
    with a border, a tint, an icon **and** a sentence naming the numbers — colour is never the only
    signal — and save becomes unavailable.
22. Restoring `100` clears the flag and re-enables save immediately, with no round trip.
23. The final row is displayed on its own. On `sheet-01` it reads
    `Player A 137 · Player B 109 · Player C 78 · Player D 111` with Player C marked as winner by
    crown, label **and** colour. On `sheet-02` it marks Player B on 71.
24. ⚠️ **The wording criterion.** With every column complete and climbing, QA reads the save area,
    every banner, the button label, the confirmation and any toast, and finds **none of**: *checked,
    validated, verified, confirmed, correct, looks right, all good*. The screen states that passing
    means **"not obviously wrong"**. This is run in three states: clean read, read with a flag
    resolved by hand, and fully manual entry.
25. A cell the model could not read renders empty and flagged; the column reports **"10 of 11"**
    rather than presenting a shorter game, and save stays unavailable until it is filled.
26. Save is unavailable whenever any column has other than eleven values, any value is lower than the
    one above it, or fewer than two columns have a player assigned.
27. ⚠️ A soft warning **never** blocks a save: `sheet-01` Player B's genuine **51-point hand 4** may
    be warned about, but save stays available and the game saves with `54` unchanged.
28. The review survives the page being evicted: with half the corrections made, QA force-quits the
    browser, reopens `/review/{draftId}`, and **every correction is still there** — including after
    opening the camera for a close-up.

**Structural repairs**

29. A missed column can be **added**, assigned to a player and typed; it reports "0 of 11" until
    complete and blocks save meanwhile.
30. A spurious column invented from a margin can be **removed**, and every remaining column keeps its
    values, its hand edits and its close-up photos.
31. A column can be **reassigned** to a different existing player or to a new one; the handwritten name
    as originally read is still stored with the saved game.
32. Columns can be **reordered** to match the photo. QA re-reads one column, hand-edits a cell in
    another, reorders both, and confirms the readings, the edits and the close-up photo all moved with
    their columns.
33. **Inserting** a value inside a column shifts the rest down, leaving twelve values; the column
    reports "12 of 11" and blocks save. **Deleting** one leaves ten and reports "10 of 11". Either
    repairs an off-by-one in one action rather than eleven retypes.
34. There is **no free-form grid**: no way to make a game other than eleven hands, no formulas, no
    multi-cell selection, no row labels other than 3s through Kings.
35. Every structural repair leaves the derived hand scores and the column check correct immediately,
    with no save/apply step.

**Targeted re-photograph**

36. "Re-photograph this column" is offered on any column that breaks monotonicity or that the model
    flagged uncertain, **and is available on every column at all times, including clean ones**.
37. The request names the player: *"Photograph Player D's column."*
38. A close-up reading replaces **only that column's eleven values**. QA hand-types a correction in
    another column first and confirms it is untouched afterwards.
39. The new reading is shown **against the old**, with differing lines highlighted.
40. Rejecting the new reading restores the previous values in **one tap, with no re-upload**, and the
    close-up photo is still stored.
41. The same column can be re-shot more than once and several columns re-shot in one session; every
    reading a column has ever had is retained and reachable.
42. Photographing the **wrong column** — QA shoots Player B's column when Player D's was asked for —
    produces a **non-blocking** warning naming the mismatch. The founder can accept it anyway.
43. A close-up that disagrees with a cell the founder typed **calls out that specific cell** —
    "you typed 64; the close-up reads 84" — rather than silently overwriting it.
44. A close-up returning fewer than eleven values is flagged as an incomplete column, save is blocked,
    and the previous reading is one tap away.
45. ⚠️ **The wording criterion, again.** QA reads every string in the re-photograph flow and finds
    nothing describing it as checking, verifying, confirming or double-checking the earlier read.

**Full manual entry**

46. "Type it in by hand" is reachable **from the add-a-game screen without transcribing at all**, and
    **from the review screen without first hitting an error**.
47. Its wording nowhere presents it as a failure, a fallback or a last resort. QA reads the control,
    its help text and the screen it leads to.
48. Clearing a transcription and typing the grid leaves the photo attached and saves a game that
    passes criterion 11.
49. Manual entry is gated identically: `sheet-01` typed with Player C's row 7 as `47` (below the `44`
    above it) blocks save with the same paired flag as an imported read.

**Transcription**

50. Photographing `sheet-01` through the app returns **four named columns of eleven values each**,
    displayed beside the photo, within 60 seconds. ⚠️ **Exact agreement with the ground truth is not
    an acceptance criterion** — the spike measured 97% cell accuracy and roughly one column in three
    carrying an error. What is tested is that whatever comes back is **correctable to the ground truth
    by hand and saves correctly**.
51. Photographing `sheet-02` after the founder rotates it upright returns **five** named columns of
    eleven values each.
52. A progress state appears within two seconds of submitting, and a transcription taking 45 seconds
    completes rather than being cut off at 30.
53. An API error or timeout produces a clear message and a **Try again** button that reuses the photo
    already uploaded. ⚠️ QA confirms the app **never asks for a re-photograph** on this path.
54. Output that fails schema validation is recorded with its raw JSON and a failed status, and the
    review screen opens with whatever parsed pre-filled and the rest empty and flagged.
55. Every attempt — success, invalid or error — leaves a stored record with its raw response and token
    counts.
56. With the daily sheet cap exhausted, a vision call is refused with a plain message, **manual entry
    still works**, and column re-reads are counted separately and still available.
57. The API key never appears in any response to the browser, any page source, or any client-side
    bundle. QA greps the served JavaScript.

**Date, venue, people, winners**

58. The date defaults to today when the sheet carries none — which is both fixtures — is editable, and
    the saved game shows what was chosen.
59. The venue field pre-fills with the **most recently used** location and is changed in one tap by
    picking another. On a fresh database it is empty and offers "add a new one".
60. There is **no path that stores a venue as raw free text** — every value is an entry in the list,
    created deliberately.
61. Leaving the venue empty still saves, and the game view and the games list show **"No location"**
    rather than a gap.
62. Adding "Player C's place" and then "  player c's place " resolves to **one** location, not two.
63. Every column's player is set by picking from the existing list or explicitly creating someone new.
    On the very first game the list is empty and all four are created; saving `sheet-02` afterwards,
    QA picks the four returning players from the list and creates only **Player E**.
64. After saving both fixtures the database holds exactly **5 players, 2 rosters (sizes 4 and 5),
    2 games, and 99 round rows**, each with **both** the running total as read and the derived hand
    score.
65. `sheet-01` saves with **Player C (78)** as sole winner; `sheet-02` with **Player B (71)**.
66. ⚠️ **The ties criterion.** QA edits a `sheet-01` draft so **Player D's row 11 reads `78`**
    (down from `111`). Player D's row 10 is `67`, so the column still climbs and the save is not
    blocked — Player C and Player D now share the lowest total on `78`. The final row marks
    **both**; the saved game names both; the games list row names both. Nothing on any of the three
    screens implies a single winner, and nothing errors.
    *(Reworded 2026-09-10: the original said to set Player A's row 11 to `78`, which is unbuildable
    — Player A's row 10 is `123`, so that edit breaks monotonicity and criterion 26 blocks the save
    before the tie can be observed.)*
67. Re-entering `sheet-01`'s four players in a **different column order** matches the existing roster
    rather than creating a second one.
68. A newly created roster displays a default name built from its members.

**The record**

69. The games list is newest first and each row shows date, venue (or "No location"), roster name and
    the winner **or winners**.
70. A game view shows the eleven running totals **in the paper's column order**, the derived hands
    available alongside, the final row called out, the winner(s) marked, and the sheet photo
    pinch-zoomable and pannable.
71. Any close-ups taken during review appear on the game view **attached to the player whose column
    they show**, including ones whose reading was rejected.
72. With no games saved, the list says so and offers "add a game" rather than rendering blank.
73. Every M1 screen works at **375px and 1280px**, every touch target is at least 44px, and focus is
    visible on everything interactive.

**The admin panel**

74. `/admin` asks for the **admin** password. A valid group session grants nothing there.
75. A valid key pasted in is saved, and the panel then shows **only** its last four characters, when it
    was set, and whether it currently works.
76. ⚠️ The key is **never rendered back**: QA reloads the panel, views source, and inspects every API
    response, and the full key appears in none of them.
77. An invalid key is **rejected by a real API call before being saved**, and the previously working
    key stays in use.
78. After saving a key the panel states plainly that it takes up to a minute to be in use everywhere,
    and transcription works within 60 seconds **with no deploy**.
79. ⚠️ **No secret is in the database.** A dump of every table contains no API key and no password
    hash. **This is permanent, not a one-off check.**
80. The M1 panel does **one thing**. QA confirms there is no password change, no download, no usage
    page, no toggle and no theming.

**Live, and done**

81. CI runs on every PR: lint, typecheck and **real unit tests** over the fixture grids — monotonicity,
    delta derivation including Player D's six 64s and Player B's 51-point hand, and roster-signature
    order-independence. A deliberately broken derivation fails the build.
82. Deploy runs from `main` through GitHub Actions by OIDC with **no stored AWS credentials**, and
    refuses to deploy while either password hash is missing from Parameter Store.
83. The photo bucket has **versioning on with no delete lifecycle**. Running the documented manual
    backup command, `npm run db:backup`, writes a dated `YYYY-MM-DD.sql` file to the machine it is
    run on. The dump is **complete**: restored into an empty database, every table has the same row
    count as the live one. It is **secret-free**: it contains no API key and no password hash. No
    scheduled backup exists.
    *(Reworded 2026-09-11: the original required a nightly automated dump to
    `s3://five-crowns-photos/backups/`. The founder cut it: "this isnt sensitive data, its just a
    pet project. if something gets lost, its not the end of the world." Database backups are now
    manual and on demand. Photos are unaffected and are still kept forever.)*
84. `https://fivecrowns.ribenajuice.xyz` answers with a valid certificate and no browser warning. The
    CloudFront URL is **deliberately closed** once the domain is attached (it answers 403), so the site
    has exactly one address, and the documented recovery can reopen it.
    *(Reworded 2026-09-11, founder decision. The original also required the CloudFront URL to keep
    working alongside the domain. SST blocks it by design whenever a custom domain is set, and has no
    option to turn that off. If the domain ever breaks, deleting `/five-crowns/prod/app-domain` and
    `/five-crowns/prod/app-cert-arn` and deploying once reopens the CloudFront URL.)*
85. ⚠️ **Definition of done.** The founder, on their own phone, on the live domain, photographs a real
    sheet, reviews it, saves it, and the game appears in the record **correct and checkable against
    the photo, cell by cell**. Nothing else in this list substitutes for this one.
86. A zero-spend AWS budget alarm exists. Expected running cost is **about A$0.65/month**, effectively
    all of it Anthropic usage.

**86 acceptance criteria.**

#### The stages

*Five PRs, each reviewed as it lands. The sequence differs from the sketch in two places and both
are deliberate.*

**Why the review screen is second and not third.** It carries all of the product's quality control,
so it needs the founder's eyes on it earliest. It can land before transcription **honestly, not as a
stub**, because full manual entry is a first-class path in its own right (rung 4) — a review screen
fed by typing is a real, shippable way to use the app, not scaffolding. Transcription then lands into
a screen the founder has already approved. The photo capture and upload move up with it, because
**every save requires a photo**, typed or not.

**Why the first deploy is first and not last.** M1 finishes live, and a first deploy saved for the
end is where every unknown collects. Deploying an almost-empty app on day one turns the riskiest step
into the cheapest one, and it is also the only way the founder can try stages 2–4 **on their phone**,
which is the only device that matters.

---

**Stage 1 — Foundations: live, locked, and empty**

*Scope*: the project scaffold (nothing exists yet — no `package.json`, no app code); the database
schema and migrations; the pure scoring library (monotonicity, delta derivation, roster signature)
with unit tests over the fixture grids; the password gate; AWS provisioned by SST — Lambda,
CloudFront, the private versioned photo bucket, Parameter Store; the documented manual database backup
command (`npm run db:backup`, run by hand, no schedule); CI running lint, typecheck and real tests on
every PR; deployed to the CloudFront URL.

*Acceptance criteria*: 1–5, 72 (empty state), 79, 81, 82, 83, 86.

*What the founder sees*: a real URL that asks for the password, lets them in, and shows an empty
games list saying there's nothing here yet. Unimpressive on purpose — but it is deployed, it is
private, and the numbers logic underneath it is already tested against both real sheets.

*Founder action starts here*: the DNS and certificate runbook in `docs/ARCHITECTURE.md` takes about
fifteen minutes of work and up to an hour of waiting. Starting it now means the domain is ready by
stage 5 rather than holding it up.

---

**Stage 2 — The review screen, typed by hand**

*Scope*: camera and photo picker, rotate, downscale, direct upload to S3; the persisted draft; the
Column Sweep review screen — photo strip, grid, derived hands live, cell editor, paired
monotonicity flags, the called-out final row, the save gate and its wording; full manual entry; date;
venue pick-list; the player pick-list and roster matching; save; a games list row and a game view.

*Acceptance criteria*: 6–28 (except 11 in part, which completes at stage 3), 46–49, 58–70, 73.

*What the founder sees*: **the whole loop, working, on their phone.** They photograph a sheet, type
the numbers in, and the game lands in the record with the right winner. This is the PR to look at
hardest — it is the screen every later stage builds on, and the last easy moment to say the layout is
wrong.

---

**Stage 3 — Transcription, and the key that pays for it**

*Scope*: the admin panel skeleton behind its second password and the API key form (moved forward from
the sketch — the app cannot transcribe without a key, and the two are one dependency); the vision
path with its prompt, structured output schema, streaming and daily caps; pre-filling the draft;
unread cells; the stored record of every attempt.

*Acceptance criteria*: 11, 50–57, 74–80.

*What the founder sees*: they paste their key in once, then photograph a fixture sheet and watch the
numbers arrive in the screen they already approved. Expect to correct something — roughly one column
in three carries an error, and that is the measured normal case, not a bad day.

---

**Stage 4 — The rest of the override ladder**

*Scope*: the four structural repairs; the targeted per-column re-photograph, including the second
transcription path, the old-versus-new comparison, one-tap rejection, the wrong-column warning and
the typed-cell disagreement callout; close-up photos stored permanently.

*Acceptance criteria*: 29–45, 71.

*What the founder sees*: the two rungs that rescue a bad read. Worth testing on `sheet-02`'s
overwritten Player A column, which the spike named as the least certain on either sheet.

---

**Stage 5 — Go live and prove it**

*Scope*: the custom domain attached; end-to-end pass over both fixtures; the wording audit run across
every screen; accessibility and 375px/1280px pass; README and status docs; the founder's own
acceptance run.

*Acceptance criteria*: 84, 85, plus a full re-run of all 86 against the live domain.

*What the founder sees*: `fivecrowns.ribenajuice.xyz`, a real sheet from a real night going in, and
the game sitting in the record where it will still be in ten years.

*One cheap thing worth doing here*: re-run the Milestone 0 reading spike through the production API
path now that a key exists — about **A$0.30**, and it turns the spike's indicative error rates into
real ones.

##### Stage 5 — the checklist

*Written 2026-09-13, after Stage 4 shipped and the founder ran a real key on the live domain. This
is an audit checklist, not a feature spec. **Stage 5 adds no product behaviour and no acceptance
criterion** — 86 is the final count. Everything below either proves an existing criterion or updates
a document.*

**Already done. Do not redo any of this.**

- **Criterion 84 — done at Stage 1, as reworded.** The domain answers with a valid certificate
  (renewing to Mar 2027 through the kept validation CNAME), the CloudFront URL is deliberately 403,
  and the recovery path is documented. ⚠️ Stage 5's *scope line* says "the custom domain attached" —
  **that work happened early.** Re-confirm it in thirty seconds; do not re-provision anything.
- **Criterion 85 — substantially done 2026-09-13.** The founder pasted a real key into production,
  ran two real sheets end to end on the live domain, and both are saved in the record. This also
  closed Stage 2's reserved on-phone acceptance step and Stage 3's real-key check. What is left is a
  **sign-off**, not a re-run — see the open question below.
- **Per-stage QA passes stand.** 1–5, 72, 79, 81–83, 86 (Stage 1); 6–28 except 11, 46–49, 58–70, 73
  (Stage 2); 11, 50–57, 74–80 (Stage 3); 29–45, 71 (Stage 4). Stage 5 re-runs them; it does not
  re-litigate their results.

**What "a full re-run of all 86 against the live domain" actually means.**

⚠️ **It cannot be literal, and the reason is a criterion, not an inconvenience.** Criterion 64
asserts the database holds **exactly** 5 players, 2 rosters, 2 games and 99 round rows after both
fixtures are saved — that is a fresh-database assertion, and production now holds the founder's two
real games. Running 64 against production means **emptying the real record to test it**. 62, 63, 66,
67 and 59 carry the same fresh-database assumption. So:

- **Bucket A — the full 1–86 re-run, on a scratch environment.** The same build artefact deployed to
  production, the same schema and config shape, a disposable database, scratch passwords, the two
  fixtures. This is the re-run. QA owns it and it is the bulk of the stage. ⚠️ **The artefact must be
  the one on `main` that produced the live deploy** — a re-run against a different build proves
  nothing about the live site.
- **Bucket B — the live smoke set, on production, no credentials needed.** 1 (redirects leak no
  fragment of the record), 5 (lockout, including the forged-header path), 9 (unauthenticated GET on
  both photo objects denied), 57 (no key in any bundle served to the browser), 82, 83, 84, 86.
- **Bucket C — founder-only, on production, on a phone.** Anything needing a real password, a real
  key or a real camera: 2, 3, 4, 6, 8, 85, plus two things STATUS flags as still unverified live —
  **Stage 4's structural repairs and per-column re-photograph** (the founder's two real sheets
  didn't happen to need them) and **criterion 11's manual-versus-imported side-by-side**. Budget
  fifteen minutes on the sofa, not a session.

Every criterion ends the stage with a recorded result and **where it was run**. A criterion that
passed only in Bucket A says so.

**The wording audit.**

The banned set, from the milestone constraint: *checked, validated, verified, confirmed, correct,
looks right, all good* — plus, for the re-photograph flow, *checking, verifying, confirming,
double-check*. Three passes, in order:

1. **Mechanical sweep.** Case-insensitive grep of every banned stem across `app/`, `components/` and
   `lib/`, including `aria-label`s, `alt` text, placeholders, `<title>` and any toast. Every hit is
   triaged to *not user-facing* (recorded) or *fail*. Cheap and complete; do it first.
2. **Verbatim check against the fixed-strings table** in `docs/DESIGN-SYSTEM.md` (Voice & tone).
   Every row is rendered exactly as written. ⚠️ **A paraphrase is a fail even when it uses no banned
   word** — the table is the contract.
3. **Read-through of what the table doesn't cover.** Login, games list, game view, add-a-game, admin,
   and ⚠️ **every error and empty state**: upload failure, read failure, daily cap reached, presign
   failure, draft not found, no games yet, fresh-database venue and player lists.

**Numbered criteria this re-verifies**: 24 (all three states — clean read, flag resolved by hand,
fully manual), 45, 47. **Wording-bearing criteria that also re-run here**: 19, 20 (no wording of
*any* kind suspecting a repeat), 23, 25 (literal "10 of 11"), 42, 43, 53, 61, 69, 72, 75, 78, 80.

⚠️ **Yes, it covers copy no criterion names.** There is no marketing copy — the app is behind a
password gate — so "everything else" is the README and the login screen. ⚠️ **Scope guard: the audit
fixes copy and styling only.** `app/` has no `error.tsx`, `not-found.tsx` or `loading.tsx`, so an
unhandled error or a bad game URL falls through to Next's defaults, which are off-voice. **Designing
route-level error and 404 screens is new surface — it is an M2 follow-up, not Stage 5.** The single
exception: if a default error page leaks a stack trace or an internal path in production, that is a
security fail and is fixed here.

**Accessibility and the 375px/1280px pass.**

This is **criterion 73** — every M1 screen at 375px and 1280px, every touch target ≥ 44px, focus
visible on everything interactive — plus **criterion 21**'s "colour is never the only signal" and the
hard rules in `docs/DESIGN-SYSTEM.md`: semantic landmarks, real `<button>`s, labelled inputs, one
`h1` per page.

⚠️ **Decision, taken here: 73 stops being verified by reading code.** Stage 5 adds a **local,
on-demand Playwright audit harness** scoped to exactly this criterion — `npm run audit:a11y` against
a production build on the scratch database, visiting every M1 screen at 375×667 and 1280×800 and
asserting no horizontal overflow, a ≥44×44 CSS-px hit area on every interactive element, and a
computed focus indicator that actually changes on focus. ⚠️ **jsdom was never an option** — it has no
layout engine and no computed Tailwind styles, so it can answer none of those three questions. The
real choice was a headless browser or human eyes, and 73 is the largest block of M1 still unproven
while M1's whole definition of done is a phone. ⚠️ **It is deliberately not wired into PR CI in M1**
— a browser download and a layout-sensitive suite gating every PR is exactly the footprint this
milestone refuses. Revisit when M3's analytics screens land. Full reasoning in `docs/DECISIONS.md`.

⚠️ **The harness does not replace the founder's phone.** Criterion 6 (the camera opening directly),
8 (rotation surviving to the saved game days later) and 70 (pinch-zoom and pan) are real-device
facts. They stay in Bucket C.

**Docs, and the cheap spike.**

- **README is currently wrong** — it says Stages 1–3 are deployed and Stage 4 is waiting to merge.
  Stage 4 is live. README, CHANGELOG and `docs/STATUS.md` are all updated at the end of the stage.
- ⚠️ Criteria 83 and 84 both say **"documented"** in their own wording. The manual backup command and
  the CloudFront-reopen recovery path must each be findable from the README by someone who has not
  read this PRD.
- **Re-run the Milestone 0 spike through the production API path** (~A$0.30), both fixtures, scored
  against `fixtures/sheets/GROUND-TRUTH.md`, findings appended to `docs/SPIKE-M0-READING.md`. ⚠️ The
  founder's two real games **do not substitute** — there is no independently verified ground truth to
  score them against.

**Done means all six, and nothing beyond them.**

1. Every criterion 1–86 has a recorded result, a bucket and a date.
2. Wording audit: zero banned words in user-facing strings; every fixed string verbatim.
3. `npm run audit:a11y` green at both widths across every M1 screen.
4. README, CHANGELOG and STATUS current; this stage's decisions in DECISIONS.md.
5. Criterion 85 signed off by the founder.
6. M0 spike re-run recorded.

⚠️ **Explicitly not Stage 5**, so nobody widens it: route-level error and 404 screens; Playwright in
CI; STATUS's known follow-ups (arm64 CI coverage, the deploy role's SSM breadth, the HMAC-helper /
`resolvePlayers` / usage-cap duplications) — all M2 unless a numbered criterion fails without them.
The CloudFront 60s origin-timeout quota increase is a free AWS support request the founder can raise
whenever; it is not a build task and does not gate this stage.

#### Explicitly out of scope for Milestone 1

*Restated so nobody relitigates it mid-build. Each is a decision, not an oversight.*

**From the PRD's "Cut from M1" list**: all analytics and the records board; name suggestion from the
handwriting (the pick-list only); roster renaming; editing or deleting a saved game; player and roster
pages; everything in the admin panel except the API key — no password changes, no score download, no
usage or spend.

**Also deferred, deliberately**:

- **Merging two players, renaming or merging locations.** Names are consistent today; this is M2
  insurance.
- **Filtering the games list** by venue or roster. M3, with the analytics that need it.
- **Any second read for confirmation.** ⚠️ Not deferred — **prohibited**. Errors repeat.
- **Any plausibility rule that blocks a save.** Heuristics warn; humans decide.
- **Format detection or a per-hand-score sheet format.** Running totals, unconditionally.
- **Bulk import**, exports, printing, sharing links.
- **A staging environment, a second region, a queue, an async job system.** Revisit only if
  transcription regularly exceeds ~45 seconds.
- **Any record of who did what.** There are no accounts. Accepted, with the risk written down.
- **Automated or scheduled database backups.** Cut by the founder on 2026-09-11. The backup is a
  manual command run on demand; see Risk 7.

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

### Milestone 2 — delivery spec

*Written 2026-09-14, the day after Milestone 1 shipped. Same job as Milestone 1's delivery spec: the
build contract, not the decision document. Everything above it still governs — the wording
constraint, the "no second read" prohibition, the no-accounts stance, and the rule that heuristics
warn and humans decide. **Two founder decisions frame it** (`docs/DECISIONS.md`, 2026-09-14):
**merges are permanent**, like a game delete, with no undo and no merge-history table; and the
**score download is one combined CSV**.*

⚠️ **M1 had one risk it was built around (a bad read). M2 has a different one: a wrong change that
nobody can take back.** Everything new in this milestone either writes over history (edit, merge,
rename) or destroys it (delete), and this project has deliberately chosen no undo, no audit trail
and no accounts. So the discipline shifts from *"be checkable"* to *"be honest about what is about
to happen, and hard to do by accident"*. Criteria below test confirmation wording the way M1's
tested transcription wording.

⚠️ **Nothing here is a settings screen, and nothing here is analytics.** The admin panel gains four
functions because the founder cannot do them another way. Player and roster pages carry **games
played, wins and win rate, and nothing else** — the catalogue is Milestone 3, and a stat that
sneaks in here is a stat the records board then has to argue with.

#### Decisions taken in this spec

*Ours and the architect's to make, per `CLAUDE.md`. Recorded here with the reasoning so a future
session doesn't re-derive them. None of these is a founder question.*

1. **How a suggested match works.** Normalise both names (trim, collapse whitespace, lowercase,
   strip punctuation and diacritics), then score `similarity = 1 − levenshtein / max(len)`.
   **≥ 0.80 with a clear leader → suggested. 0.55–0.80 → offered, never suggested. < 0.55 → no
   suggestion at all.** Plus an ambiguity rule: if the best two candidates are within **0.10** of
   each other, nothing is suggested however high they score. Levenshtein over anything cleverer
   (phonetic, trigram, an embedding) because the real corpus is **five names**, the real failure is
   a one- or two-character misread (the spike's "Cady" for "Cody"), and a rule we can state in one
   line is a rule QA can test and a founder can be told. ⚠️ **`nameConfidence` from the vision path
   is deliberately not an input** — it is a reading aid, not a check, and letting it gate a
   suggestion would make the matching rule unexplainable for no measured gain.
   ⚠️ **What the rule does with its answer was the founder's call, and they made it on 2026-09-14: a
   suggestion is pre-selected and costs nothing to accept** — no per-column confirmation tap. The
   player pool is about six people, and the review screen already re-exposes every field for
   correction however it was filled. Criteria 172–173; ADR in `docs/DECISIONS.md`.
2. **Merges hard-delete the losing row, and `player.merged_into_id` goes.** The column exists in the
   schema today, commented "Milestone 2 player merge", and a populated `merged_into_id` **is** a
   merge history — exactly what the founder's decision says not to keep. It is dropped in M2's
   migration, with its reversing file.
3. **A merge that would put one person in a game twice is refused, not resolved.** If both
   identities appear in the same game, they are not the same person in that game — one column was
   misassigned. The app names the offending games and points at Stage 2's game edit. Nothing is
   guessed and nothing is repointed.
4. **Roster folding on merge**, because a roster signature is built from player IDs and two rosters
   can collide into one. The **survivor is the roster with more games** (tie: the older). A custom
   name carries across only if the survivor has none; if both have one, the survivor keeps its name
   and the result screen says so.
5. **A roster is never auto-deleted, but listings only show rosters with at least one game.** The
   alternative — deleting an emptied roster — would silently destroy a name like "Thursday crew"
   because someone edited a game. Hiding is free and reversible; deleting is neither. ⚠️ **This is
   about a roster emptied by a game edit, not the folding in point 4** — a player merge that collides
   two rosters' signatures *does* delete the losing one, deliberately (criterion 159): a
   `roster_signature_unique` constraint makes it impossible for both to survive, and the merge itself
   is already permanent and undoable-by-design, unlike an ordinary edit.
6. **"Basic record" means exactly three numbers**: games played, wins (a shared win is a full win
   for each), win rate as wins ÷ games. ⚠️ **The records board's withholding rules do not apply
   here.** Withholding exists to stop a *ranking* crowning someone on four games; a player page is a
   statement of fact about one person, and hiding "1 game, 1 win, 100%" from someone looking at
   their own page would be hiding the sample rather than the claim. Every number states its sample.
7. **Merging and deleting sit behind the group password, not the admin one.** The PRD already
   settled that anyone with the group password can edit or delete a game (decision 4, risk 4).
   A merge is the same class of act on the same data; putting it in the admin panel would be a
   second, contradictory trust model, not extra safety.
8. **The score CSV's grain is one row per player per game**, wide: the eleven running totals and
   eleven derived hands as columns. A decade is ~1,400 rows rather than ~15,000, it is skimmable in
   a spreadsheet on a phone, and it is lossless for the score data. ⚠️ **`docs/ARCHITECTURE.md`
   still describes a ZIP of CSVs with a `README.txt`** — written before the founder's decision. The
   architect updates it; the single CSV wins. One consequence: with no `README.txt` in the file,
   **the "this is not a backup, the photos are not in it" sentence lives on the panel screen and in
   the repo README**, and the CSV itself carries no prose (a comment row would break every
   spreadsheet that opens it).
9. **The forgotten-admin-password path is the SSM runbook that already exists**, promoted rather
   than invented: `node scripts/hash-password.js`, then two `aws ssm put-parameter` calls (hash,
   then the epoch bump). It needs no code change, no deploy and no developer, and it is the same
   path first-time setup uses — so it is exercised rather than theoretical. M2's work is making it
   **findable** (linked from the admin login screen, in the README under its own heading) and
   **runnable without a repo checkout** (AWS CloudShell: clone the public repo, run the script,
   run the two commands).
10. ⚠️ **A deleted game's photo leaves the record but its file stays in S3, and the wording must say
    so.** The app holds no `s3:DeleteObject` by deliberate design (2026-09-11 least-privilege ADR) —
    that restriction is what makes an accidental deletion recoverable at all. So a delete removes
    the game, its rounds, its roster membership and its photo rows; the image objects remain in the
    private, versioned bucket, reachable only with AWS credentials and by nothing in the app. The
    confirmation says the photos go **from the record**; it must not claim the files are destroyed.
    Pruning them is a founder-run `aws s3` command, documented, not an app feature.

#### User stories

**Keeping it running — the rest of the panel**

> As the founder, I want to change the group password from the panel, so that someone leaving the
> group is a thirty-second job and not a developer's afternoon.

- One new password, entered in the panel while holding an admin session. ⚠️ **The current group
  password is not required** — the reason to rotate it is often that you have lost control of it,
  and demanding it would be the one place the product locks you out on purpose.
- ⚠️ **Every device is logged out**, including the one doing it. That is the point, and the screen
  says so before, not after.

> As the founder, I want to change the admin password, so that a leak or a suspicion costs me a
> minute.

- ⚠️ **The current admin password is required first**, even inside an authenticated session.
  Someone at an unattended unlocked screen must not be able to take ownership.
- Every admin session dies, including the one that made the change. You log back in with the new one.
- The two passwords are independent: changing one does not log out the other's sessions.

> As the founder, I want a way back in when I have forgotten the admin password, so that the one
> unrecoverable state in this product isn't real.

- Written down, findable from the admin login screen, and runnable **from a machine with no
  checkout of this repo**.
- No deploy, no code change, no developer, and **no data is touched**.

> As the founder, I want my own copy of the scores as one file, so that I am not trapped inside
> somebody else's database.

- One CSV, one tap, openable in a spreadsheet with no tools.
- ⚠️ **It is not a backup and must never be worded as one**: the photos are not in it, and the
  guarantee that any number can be re-checked against the paper does not survive in this file alone.
- ⚠️ **No secret of any kind is ever in it.** Permanent criterion, not a one-off check.

> As the founder, I want to see what I am spending, so that a runaway or borrowed key shows up here
> rather than on a credit-card statement.

- This month's reads, sheet and column counted separately, and an estimate in A$.
- Today's usage against both daily caps, because that is what makes an abused password visible on
  the day rather than at the end of the month.

**Correcting the record**

> As a player, I want to fix a game that went in wrong, so that the archive stays true rather than
> just permanent.

- Editing a saved game opens **the same review screen** the game came in through, with the photo
  beside the numbers and every M1 rule still in force.
- Numbers, date, venue and who each column belongs to can all change. ⚠️ **Not the sheet photo** —
  it is the evidence of what the paper said, and swapping it is not a repair.
- ⚠️ **Not a bypass**: columns must still climb, hands are still derived, save is still gated.
- ⚠️ **Nothing marks a game as edited.** No stamp, no badge — consistent with a product that keeps
  no record of who did what.

> As a player, I want to delete a game that should never have been saved, so that a duplicate or a
> mis-shot sheet doesn't sit in the archive forever.

- Permanent. No undo. It takes the photos out of the record with it.
- ⚠️ **The screen says exactly that before it happens**, and it takes a deliberate second action —
  never a single tap.

**The people, the sets, and the places**

> As a player, I want a page for each player, so that "how many has he actually won?" has an answer
> instead of an argument.

- Games played, wins, win rate. **Three numbers, each with its sample.** Then their games, newest
  first.
- A shared win is a full win for each player, everywhere.

> As a player, I want a page for each roster, so that "how do we do when it's exactly these four?"
> has an answer too.

- The exact set only. Games played, and each member's wins and win rate **within this roster**.

> As the founder, I want to call a roster "Thursday crew", so that the archive reads like the group
> talks.

- Rename it once; it reads that way on the games list, the game view, the roster page, the players'
  pages and the rosters index. Clear it and the auto-name comes back.
- ⚠️ **A rename never changes identity.** The signature is built from player IDs, so the same four
  people still match the same roster afterwards.

> As the founder, I want to tidy up a venue's name, so that "Player C's" and "Player C's House"
> don't quietly become two places.

**Identity, repaired**

> As a player, I want the app to suggest who a handwritten name is, so that the common night — the
> same four faces — costs me almost nothing.

- A suggestion is a suggestion. **"Someone new" is one tap away at every confidence level**,
  including a perfect match.
- The handwritten name as read stays on screen beside whoever is selected, so a wrong suggestion is
  visible without opening anything.
- ⚠️ **Nothing here is worded as checked, confirmed or correct.**

> As a player, I want to merge two players who turn out to be one person, so that the stats stop
> being quietly wrong.

- Every game, round and roster the losing identity touched moves to the survivor.
- ⚠️ **Permanent, by the founder's own decision.** No undo, no history kept, nothing on screen
  afterwards says a merge happened. The confirmation says so plainly first.

> As the founder, I want to merge two places that are the same place, so that the venue stats M3
> will build are worth having.

- Same mechanism, same permanence, same wording as a player merge.

#### Acceptance criteria

*Numbering continues from Milestone 1's 86, so a criterion number means one thing across the whole
project. Executable by QA on a scratch environment with the two fixture sheets and a seeded
database, except where a criterion names production or the founder's own phone.*

**Changing the passwords**

87. `/admin`'s password controls are reachable only with an **admin** session. A valid group session
    at `/admin` still gets the admin prompt, and a direct POST to either change route with only a
    group cookie is refused.
88. The group password change takes **one new password and no current password**, enforces a
    **minimum of 12 characters**, offers a reveal control, and on save replaces
    `/five-crowns/prod/group-password-hash` and bumps `group-session-epoch`.
89. QA holds group sessions in two browsers, changes the group password from a third (admin), and
    **both are returned to `/login` on their next navigation**. The old password is refused; the new
    one works.
90. Before the change, the screen states that **every device will be logged out and has to be told
    the new password**, and that includes this one. The wording is verbatim against
    `docs/DESIGN-SYSTEM.md`.
91. The admin password change **requires the current admin password on the same form**. A wrong
    current password is refused, changes nothing, and leaves the existing password working.
92. The new admin password must be **entered twice** and be **at least 12 characters**; a mismatch
    or a short value is refused by the server, not only the browser. ⚠️ The asymmetry with the group
    password (one field there, two here) is deliberate: a typo'd group password is fixed from this
    panel, a typo'd admin password is fixed only through the SSM runbook.
93. After an admin change, `admin-session-epoch` is bumped: **the session that made the change is
    logged out** and lands on the admin login. A group session on another device is **unaffected**.
94. ⚠️ **Permanent, restated for M2's new writes**: after changing both passwords, a
    `npm run db:backup` dump contains **no password hash and no key**. Nothing admin-configurable is
    ever written to a table.
95. Ten wrong current-admin-password submissions on the change form inside ten minutes cause further
    attempts to be refused — including a correct one — through the same limiter and scope as admin
    login.
96. Neither new password appears in any response body, any server log line, or any client bundle.
    QA greps the served JavaScript and the CloudWatch log group for the value it typed.

**The way back in**

97. The admin login screen carries **"Forgotten the admin password?"**, leading to the procedure. The
    README carries it under its own heading, findable by someone who has read neither this PRD nor
    `docs/ARCHITECTURE.md`.
98. The written procedure is executable **from a machine with no checkout of this repo**: it names
    AWS CloudShell, the public clone, `node scripts/hash-password.js`, and both
    `aws ssm put-parameter` commands (the hash, then the epoch bump) with `--region ap-southeast-2`
    spelled out.
99. ⚠️ **QA runs it verbatim** against a scratch environment, from a fresh CloudShell with no
    checkout, and regains admin access. An admin session that existed before the epoch bump is dead
    afterwards. A procedure nobody has executed does not pass this criterion.
100. The same document covers the **group** password hash (one parameter name different) and states
     why: a founder locked out of both fixes admin first, then uses the panel.
101. The document states plainly that **no game, photo or score is touched** and that **nothing is
     redeployed**.

**Downloading the scores**

102. The download is **one file**, `five-crowns-scores-YYYY-MM-DD.csv`, UTF-8 with a BOM, RFC-4180
     quoted, with a header row.
103. The grain is **one row per player per game**. Columns, in order: `game_id`, `played_on`,
     `location`, `roster_name`, `roster_size`, `player_name`, `column_order`, `sheet_name`,
     `final_score`, `is_winner`, `rt_1`…`rt_11`, `hand_1`…`hand_11`.
104. Over both fixture games (4 players and 5), the file holds **9 data rows**, and for every row
     `rt_1`…`rt_11` equal that player's stored `running_total`s and `hand_1`…`hand_11` equal the
     stored derived `score`s, in hand order.
105. A game with no location has an **empty** `location` cell (not the words "No location"), and a
     roster with no custom name carries **the same auto-name the app displays**, so the file and the
     screen never disagree.
106. A game with two winners has `is_winner` set on **both** rows.
107. ⚠️ **Permanent criterion.** QA searches the downloaded file for the Anthropic key, both password
     hashes, the session secret and every SSM parameter value: none appears. **Every future change
     to the download re-runs this.**
108. The panel states, next to the button, that this is **the numbers only and the photos are not in
     it**, gives the `aws s3 sync s3://five-crowns-photos ./photos` command for the photos, and
     nowhere calls the file a backup. QA reads the button, the heading, the help text and the
     filename.
109. The download route requires an **admin session**: a group session gets the admin gate, not a
     file, and an unauthenticated GET gets nothing.

**Usage and spend**

110. The panel shows, for the current **UTC calendar month** (labelled as UTC), **sheet reads and
     column re-reads counted separately**, plus a total.
111. The spend figure is derived from the **stored `input_tokens`/`output_tokens`** on the
     `transcription` rows, not from a request count, and is shown in **A$** with the conversion rate
     stated and the word *estimate*.
112. Prices are a **dated constant**: the screen names the date they were checked and points at the
     Anthropic console as the authority for the real number.
113. Today's usage is shown against **both daily caps**, read from the real cap constants rather than
     a hardcoded number — e.g. "3 of 20 sheet reads today", "0 of 60 column re-reads". ⚠️ **20, not
     40**: the sheet-transcription cap (`DAILY_SHEET_TRANSCRIPTION_CAP`) is a different, smaller
     counter than the sheet-*upload* cap (40/day) this criterion's first draft was copied from. The
     panel must interpolate whichever number the code actually enforces, so this can never drift out
     of sync with reality again.
114. A month with no transcriptions renders **zeroes and A$0.00**, not a blank, a dash or an error.
     Attempts with status `error` or `invalid` are **counted as attempts** and contribute their
     stored tokens (or zero, where none were recorded) to the estimate.

**Editing a saved game**

115. **"Edit this game"** on the game view opens the review screen. Every M1 review behaviour
     applies: the photo beside the numbers, derived hands live, paired monotonicity flags, the final
     row called out, and the wording rules of criterion 24.
116. The save gate is identical: a column short of eleven values, or one that dips, blocks the save
     with the same paired flag an import gets.
117. Numbers, date, venue and **each column's player** can be changed, and saving updates **the same
     game** — the id is unchanged, the games list holds the same number of games, and no second game
     appears.
118. Changing the set of players **re-matches the roster**: to the existing roster for the new exact
     set, or a new one. The previous roster keeps its custom name and is still reachable if it has
     other games. ⚠️ **A roster left with zero games is not deleted**, but roster listings show only
     rosters with at least one game.
119. Saving an edit **replaces every round row** for that game — both `running_total` and the derived
     `score` — and recomputes the winner(s), including a tie newly introduced by the edit, on the
     game view and the games list.
120. ⚠️ **The sheet photo cannot be replaced.** QA looks for any control that would swap it and finds
     none. Column close-ups **can** be taken during an edit (rung 3 still works) and are kept with
     the game like any other.
121. Leaving an edit without saving leaves the saved game **exactly as it was**. The edit draft
     survives the page being evicted and can be resumed, as M1 criterion 28 requires of any draft.
122. Saving an edit over a game that was **deleted meanwhile** fails with a plain message and does
     **not** resurrect the game.
123. ⚠️ **Nothing marks a game as edited** — no "last edited" stamp, no badge, no ordering change on
     the games list. QA compares an edited game against an untouched one and finds nothing
     distinguishing them, the same test M1 criterion 11 applies to manual entry.

**Deleting a saved game**

124. Delete is on the game view and takes **a deliberate second action**: a confirmation naming the
     game (its date and roster) and a button labelled **"Delete permanently"**. No single tap deletes
     anything.
125. The confirmation states plainly that it is **permanent, cannot be undone, and takes the game's
     photos out of the record with it**. ⚠️ It does **not** claim the image files are destroyed —
     they are not, and the wording must not say otherwise (see decision 10).
126. After a delete: the `game`, its `game_player`, `round_score` and `photo` rows are gone; the
     game's URL shows the 404 screen; the games list no longer shows it. **Players and locations are
     untouched.** A roster left with no games survives in the database and drops out of the
     listings.
127. ⚠️ The photo objects **remain in S3** — the app holds no `s3:DeleteObject`, by design. QA
     confirms the object is still in the bucket **and** that no app route will mint a presigned URL
     for it any more.
128. The README documents the founder's own `aws s3` path for removing an orphaned image if they
     ever want to, described as a founder action rather than an app feature.
129. Player, roster and place pages recompute on the next view after a delete — games played, wins
     and win rates all drop accordingly, with no cached totals anywhere.

**Error and 404 screens** *(carried over from Stage 5's explicit deferral)*

130. A deleted game's URL, a made-up game URL, a made-up player, roster or place URL all render the
     app's own **404 screen in the design system's voice**, with a route back to the games list —
     not Next's default.
131. An unhandled server error renders the app's own error screen and ⚠️ **leaks no stack trace,
     file path or internal identifier** in production.

**Player, roster and place pages**

132. A **players index** lists every player with their games played, linking to each player's page.
133. A **player page** shows the player's name, **games played, wins, and win rate to one decimal
     place**, each stated with the sample it is drawn from, then that player's games newest first —
     date, venue or "No location", roster name, their final score, and a winner marker.
134. ⚠️ **Shared wins count in full for each player.** Using criterion 66's construction (two players
     tied on the lowest total), both players' pages show that game as a win and both win rates rise.
     Win rates across a roster may sum past 100% and nothing on screen treats that as an error.
135. A player with **one game** shows "1 game" and a 0% or 100% rate. ⚠️ **No withholding on these
     pages** — the M3 records board's 10-game and 5-game rules govern a ranking, not a statement of
     fact about one person.
136. A player with **zero games** — created, then edited out of their only game — renders an empty
     state, not an error and not a blank page.
137. A **rosters index** lists every roster **with at least one game**, showing its name (custom or
     auto), its members, and games played.
138. A **roster page** shows the roster's name, its members, games played, and **per member, wins and
     win rate within this roster only**, then the roster's games newest first.
139. Roster numbers cover that exact set only: QA saves a game with the same four people plus a
     fifth, and **neither roster's page moves the other's numbers**.
140. A **places index** lists every location with games played. A location that has never been used
     shows 0 and is still listed, and is still pickable on the review screen.

**Renaming**

141. A roster's name is editable from its page: trimmed, **40 characters maximum**, and the new name
     appears on the **games list, the game view, the roster page, every member's player page, and
     the rosters index** — QA checks all five.
142. Clearing a roster's name restores the **auto-name from its members** everywhere. There is no
     state in which a roster displays an empty name.
143. A roster name that matches another roster's name case-insensitively is **accepted after a
     non-blocking warning** naming the other set. ⚠️ It never blocks — heuristics warn, humans
     decide.
144. ⚠️ **A rename never changes identity.** After renaming, re-entering the same exact set of players
     still matches that roster (M1 criterion 67 still passes) and no second roster is created.
145. A location can be **renamed from the places index**, and the new name shows on every game that
     used it, the games list, the game view, the review screen's pick-list and the places index.
146. A location rename that collides with an existing location's `name_key` is **refused with a
     message offering to merge into that location instead** (the merge itself is Stage 4).
147. ~~**Renaming a player** from their player page.~~ ⚠️ **STRUCK 2026-09-14 — out of scope for
     Milestone 2.** It was offered as a flagged proposal, not part of the agreed scope list, and the
     founder did not ask for it. **This number is retired, not reused**, so no later criterion ever
     changes meaning. *Kept visible rather than deleted, per the house rule on preserving decision
     history. What was proposed, if it is ever wanted: rename from the player page, trimmed, 40
     characters, reflected everywhere, refused on a `name_key` collision with an offer to merge
     instead, `sheet_name` untouched. What it would have bought: a typo'd or misread player name is
     otherwise permanent, since merging only helps when the correctly-named player already exists.
     Revisit if a misread name ever actually lands in the record — it is a small, self-contained
     addition at any time.*

**Reaching these pages**

174. ⚠️ **Added 2026-09-14, founder-approved.** Nothing in 132–146 required these three page types to
     be reachable without typing a URL. **Every player, roster and place page is reachable by tapping
     through from the record**: a player's name on a game view links to their player page, the roster
     name on the games list and on the game view links to the roster page, and all three index pages
     are reachable from the games list. QA reaches every page type without typing a URL. Where the
     links sit on screen is a design call, not a further product decision.

**Suggested player match**

148. Matching follows **exactly** decision 1's rule, and unit tests assert the table: normalise, then
     `1 − levenshtein / max(len)`; **≥ 0.80 with a clear leader suggests**; **≥ 0.55 and < 0.80 offers
     the best two or three at the top of the pick-list without suggesting**; **< 0.55 suggests and
     offers nothing**, leaving M1's plain pick-list with "someone new" pre-filled with the handwritten
     name. ⚠️ **Boundary values are inclusive as written**: a score of exactly 0.80 is eligible to
     suggest (subject to 149's ambiguity rule), and exactly 0.55 is eligible to offer. Neither boundary
     is hypothetical — a one-character difference in a five-letter name scores exactly 0.80.
149. ⚠️ **The ambiguity rule.** With players "Jonny" and "Jenny" both in the book and a column read as
     "Janny", both score exactly **0.80** (one substitution each against a five-letter name) — the two
     best candidates are within 0.10 of each other with **no clear leader**, so **nothing is
     suggested** even though each individually clears the suggest threshold — both are offered first
     instead.
150. A player already assigned to another column of the same game is **never suggested or offered**
     for a second column. One person cannot hold two columns. ⚠️ **Where two unassigned columns would
     both match the same player**, only the **left-to-right first** column gets the suggestion or
     offer; later columns are matched as if that player were already taken.
151. On a **fresh database with no players**, behaviour is identical to M1: no suggestions anywhere,
     "someone new" pre-filled with the handwritten name.
152. **"Someone new" is one tap away on every column at every confidence level**, including one that
     matched exactly.
153. The **handwritten name as read stays displayed beside** whichever player is selected, on every
     column, so a wrong match is visible without opening the pick-list. The `sheet_name` saved with
     the game is still the handwritten one (M1 criterion 31 holds).
154. ⚠️ **The wording criterion, again.** QA reads every string in the matching flow and finds none of
     *checked, validated, verified, confirmed, correct, looks right, all good*. A suggestion reads as
     a suggestion.

*⚠️ **Open question 4 was answered by the founder on 2026-09-14: a suggestion is pre-selected, and
accepting it costs nothing.** The two criteria reserved against it are written below as **172 and
173** rather than inserted here, so that no criterion number already circulated ever changes
meaning. They belong to this block and to Stage 4. Reasoning in `docs/DECISIONS.md`.*

172. ⚠️ **A suggestion is pre-selected, and accepting it takes no action at all.** Where criterion 148
     produces a suggestion (similarity ≥ 0.80 with a clear leader, ambiguity rule not triggered),
     that player is **already selected on the column when the review screen first renders**. QA
     opens a sheet whose four names all match known players, changes nothing, and reaches save:
     **zero taps are spent on names**, no per-column confirmation exists anywhere in the flow, and
     the saved game names the four suggested players. A pre-selected column **counts as assigned**
     for the M1 save gate (criterion 26) exactly as a hand-picked one does — ⚠️ **no new blocking
     gate, no acknowledgement state, no "unconfirmed" badge.** The review screen is the check, and it
     holds that weight for a pre-filled name the same way it already does for a pre-filled number.
     ⚠️ **Suggestions apply only to unassigned columns.** A column that already carries a `playerId`
     — every column of an edit draft (Stage 2), and any column already hand-picked earlier in the same
     session — is never re-matched or re-suggested. Re-opening a saved game to edit it must show the
     game exactly as it was, not a fresh guess.
173. ⚠️ **Where there is no confident suggestion, nothing is guessed.** The three cases, each run by
     QA against a seeded player list:
     - **A near match (0.55–0.80), or two candidates within 0.10 of each other** — the column renders
       with **no player selected**. The best two or three are offered at the top of the pick-list, in
       order, and "someone new" is offered pre-filled with the handwritten name. ⚠️ **The column is
       not assigned**, so the M1 save gate applies to it and the screen says what is missing.
     - **No plausible match (< 0.55), or an empty player list** — the column renders with **no player
       selected**, M1's plain pick-list, and "someone new" pre-filled with the handwritten name.
       Behaviour is indistinguishable from M1 (criterion 151).
     - **A suggestion that is wrong** — changing it is **one tap to open the column's name control**
       and one to pick a different existing player or "someone new" (criterion 152), from a
       pre-selected column exactly as from an unassigned one. Nothing about a column having been
       pre-filled makes it harder to change than any other field on the review screen, and the
       handwritten name stays on screen beside the selection either way (criterion 153).

**Merging players**

155. Merge is reached **from a player page** — "this is the same person as…" — and is available to
     any holder of the **group** password, the same trust level as deleting a game. It is **not** in
     the admin panel.
156. The merge screen names both players, **shows each one's games played**, and states plainly which
     of the two will cease to exist. The founder chooses the survivor explicitly; nothing is picked
     for them by age or size.
157. The confirmation takes a deliberate second action — a button labelled **"Merge permanently"** —
     and states that **there is no undo and no record of the merge is kept**.
158. On merge, every `game_player`, `round_score`, `roster_member` **and `photo`** row referencing the
     losing player is **repointed to the survivor** — a column close-up already attributes to a
     `player_id`, and a hard delete without this step would leave it naming someone who no longer
     exists (same principle as the edit path's photo-attribution handling, `docs/DECISIONS.md`,
     2026-09-14) — the losing `player` row is **deleted**, and `player.merged_into_id` is dropped from
     the schema in the same migration, with its reversing file in `lib/db/migrations/down/`.
159. ⚠️ **Roster folding.** Where repointing makes two rosters' signatures identical, the rosters are
     folded per decision 4: the survivor is the one with more games (tie: the older), the other's
     games are repointed, its `roster_member` rows and the roster itself are deleted, and a custom
     name carries across only if the survivor had none. **If both had custom names, the result screen
     says which one was kept.** QA constructs this with rosters {A,B,C} and {A',B,C}.
160. ⚠️ **The same-game refusal.** Where both players appear in the same game, the merge is **refused
     before anything changes**, naming every offending game with a link to edit it. QA constructs
     this case and confirms **no row anywhere was repointed**.
161. After a merge: the surviving player's page shows the **combined** games played, wins and win
     rate; the losing player's page and URL show the 404 screen; the players index is one player
     shorter; every game that named the losing player now names the survivor.
162. ⚠️ **No merge history exists.** A database dump taken after a merge contains **no row naming the
     merged-away player**, and no screen anywhere mentions that a merge happened. The merge runs in a
     **single transaction**: QA forces a failure partway and finds the record exactly as it was.

**Merging places**

163. Merge is reached from the **places index**, with the same mechanism, the same "Merge
     permanently" confirmation and the same permanence wording as a player merge. ⚠️ **Fulfils
     criterion 146's promise.** Stage 3's location-rename collision refusal already says "merging two
     places into one is coming in a later update" — this stage is that update, so the refusal screen
     now offers the merge as one of its actions, not only the places index.
164. On merge, every game referencing the losing location is repointed to the survivor and the losing
     `location` row is deleted. No history is kept.
165. **Games with no location are untouched** by any merge.
166. After a places merge, the review screen's pick-list shows **one** entry, and the
     "most recently used" default resolves to the survivor. Row counts for players, rosters, rounds
     and photos are unchanged — QA checks all four.

**Across the milestone**

167. **Wording audit** over every new screen, run the same three ways Stage 5 established
     (mechanical grep, verbatim check against the fixed-strings table, read-through of what the table
     doesn't cover), and covering ⚠️ **every new confirmation, empty state and error state** —
     including the merge refusal, the empty player page and the zero-transcription usage panel.
168. `npm run audit:a11y` is **extended to every new screen** and passes at 375px and 1280px: no
     horizontal overflow, ≥44px targets, visible focus, and colour never the only signal on any
     destructive confirmation.
169. CI stays green with **real unit tests** over the new logic: the similarity table in criterion
     148 including its ambiguity rule, roster folding, the same-game refusal, the CSV's shape and
     grain, and the epoch bump on each password change. **A deliberately broken similarity threshold
     fails the build.**
170. ⚠️ **Permanent, restated**: no secret of any kind is written to the database by anything in this
     milestone, and the score download stays secret-free by construction.
171. **Running cost is unchanged.** M2 adds no AWS resource, no scheduled job and no new external
     service; expected running cost stays about **A$0.65/month**, effectively all Anthropic usage.
     QA confirms nothing new appears in `sst.config.ts`'s resource list.

**87 live acceptance criteria, numbered 87–174.** ⚠️ **147 is struck and retired** (player renaming,
cut 2026-09-14 — offered as a proposal, not asked for), and its number is never reused. **Nothing is
reserved and nothing is pending**: open question 4 was answered on 2026-09-14 and produced 172–173.
*(Count corrected 2026-09-14 when founder-approved criterion **174** was added mid-Stage-3; it read
"86 … numbered 87–173" before 174 existed. No scope changed with this edit.)*

#### The stages

*Four PRs, each reviewed as it lands, in dependency order rather than value order. The one real
dependency is that **merges need somewhere to live** — a player page and a places list — so the
pages come before the merges. Everything else is genuinely independent, which is why Stage 1 is the
self-contained one and can be worked on in parallel if the founder wants the panel finished first.*

---

**Stage 1 — The panel, finished**

*Scope*: both password changes and their session-epoch behaviour; the forgotten-password path made
findable and proven; the single combined CSV download; usage and spend.

*Acceptance criteria*: 87–114.

*What the founder sees*: the admin panel stops being a one-trick screen. They can rotate either
password, take their own copy of the scores, and see what the month has cost — and, for the first
time, there is a written way back in that somebody has actually run.

⚠️ **Depends on nothing else in M2** and touches no screen the group sees. It is first because it is
the only stage that removes a dependency on a developer.

---

**Stage 2 — Correcting the record**

*Scope*: edit a saved game through the existing review screen; delete a saved game with its
confirmation; the route-level 404 and error screens Stage 5 explicitly deferred.

*Acceptance criteria*: 115–131.

*What the founder sees*: the archive stops being append-only. A game that went in wrong can be
fixed against its photo, and a duplicate can go. ⚠️ **This is the stage to review hardest** — it is
the first code in this project that writes over history, and the delete confirmation's wording is a
build contract, not copy.

*Why second*: the two real games already in the record have no way to be corrected today, and every
later stage benefits — the merge refusal in Stage 4 literally points the founder at this screen.

---

**Stage 3 — People, sets and places**

*Scope*: players, rosters and places index pages; the player page and roster page with the three
numbers; roster renaming; location renaming. ⚠️ **Not player renaming** — criterion 147 was struck on
2026-09-14.

*Acceptance criteria*: 132–146, **plus 174** (page reachability, added 2026-09-14).

*What the founder sees*: the archive becomes browsable by person rather than only by night, and
"Thursday crew" replaces "Player C, Sam & Jo" everywhere at once.

*Why third*: ⚠️ **it builds the surfaces the merges need.** A player merge without a player page has
nowhere to be invoked from, and a places merge without a places list is a screen built to be used
once.

⚠️ **Three criteria from earlier stages land their proof here** (verified 2026-09-14 against the
shipped Stages 1 and 2 — restatements, not new scope):
- **129** ("player, roster and place pages recompute after a delete, no cached totals") sits in
  Stage 2's range but had no pages to be run against. **Stage 3's QA runs it.** It should fall out
  by construction: winners are derived at read time by `determineWinners` from the denormalised
  `game_player.final_score`, and nothing anywhere caches a total.
- **118**'s second clause ("roster listings show only rosters with at least one game") is Stage 3
  work, restated as **137**. Stage 2 could not show it.
- **105** ("a roster with no custom name carries the same auto-name the app displays, so the file and
  the screen never disagree") predates renaming. `lib/games/export.ts` already reads
  `roster.name ?? rosterDisplayName(...)` and `location.name`, so a rename flows into the CSV with no
  code change — **re-run 105 once 141 and 145 exist**, rather than assuming it.

---

**Stage 4 — Identity, repaired**

*Scope*: the name-similarity module and suggested matching on review; player merge including roster
folding and the same-game refusal; place merge; the `merged_into_id` migration.

*Acceptance criteria*: 148–166, **plus 172–173** (the pre-selected suggestion, answered 2026-09-14).

*What the founder sees*: the review screen stops asking who everyone is on a night with the usual
four, and the two repairs that fix a fractured identity exist for the day one is needed.

*Why last, deliberately*: the preventive feature ships **after** its repair tools, not before. A
suggestion that matches the wrong person is fixable by Stage 2's game edit and Stage 4's own merge;
the reverse ordering would put the silent-failure feature in front of the founder with nothing behind
it. Names are consistent today (decision 3 at kickoff), so nothing is at risk while it waits.

✅ **No longer blocked.** Open question 4 was answered on 2026-09-14 — suggestions are pre-selected,
and criteria 172–173 carry it. **Nothing in Milestone 2 is waiting on the founder.**

<!-- superseded 2026-09-14, kept for history:
⚠️ **Blocked on open question 4** for two of its criteria. The rest of the stage can be built; those
two cannot be guessed.
-->

---

**Closing the milestone**

Criteria 167–171 are run at the end of the last stage, the way Stage 5 ran M1's audits: the wording
audit, the accessibility pass extended to the new screens, CI, the permanent secret-free checks, and
a confirmation that the AWS footprint did not grow. ⚠️ **No separate stage** — M2 does not finish
live-and-prove-it the way M1 did, because it is already live; each stage deploys as it merges.

#### Explicitly out of scope for Milestone 2

*Restated so nobody widens it mid-build. Each is a decision, not an oversight.*

- **All analytics and the records board.** Player and roster pages carry three numbers each.
  Head-to-head, streaks, nemesis, averages, best/worst, hand-by-hand, location slices and the
  day-of-week cuts are **Milestone 3**, entire.
- **Filtering the games list** by venue or roster. M3, with the analytics that need it.
- **Any undo, trash, soft-delete, or record of who changed what.** Founder decision, twice over
  (deletes at kickoff, merges on 2026-09-14). ⚠️ Not deferred — **decided**.
- **Reversible merges, a merge-history table, or a merge preview beyond the plain warning.** The
  2026-09-14 ADR rejected all three by name.
- **A ZIP of per-table CSVs, a `.db` file, or a SQL dump from the panel.** One CSV. The SQL dump
  already exists as `npm run db:backup` and stays a command, not a button.
- **Deleting orphaned photo objects from S3.** The app has no delete permission by design; pruning
  is a documented founder-run AWS command.
- **Replacing a game's sheet photo during an edit.** The photo is the evidence; swapping it is not
  a repair.
- **A spend alert, a budget threshold email, or a cap the founder can set from the panel.** The
  zero-spend AWS budget alarm and the two daily caps already exist; a configurable cap would make
  the panel a settings screen.
- **Merging rosters directly.** Rosters fold as a *consequence* of a player merge and never as an
  action in their own right — a roster is a set, and two different sets are two different sets.
- **Bulk anything**: bulk delete, bulk merge, bulk rename, bulk import.
- **A second read for confirmation.** ⚠️ Still prohibited, not deferred. Errors repeat.
- **STATUS's engineering follow-ups** (arm64 CI coverage, the deploy role's remaining SSM/KMS
  breadth, Playwright in PR CI). They are tracked in `docs/STATUS.md` and folded into a stage by the
  team when convenient; ⚠️ **they are not product scope and carry no acceptance criterion here.**

### Milestone 3 — The records board and the analytics

- **The records board**, as the landing screen: the four named records plus the proposed extras,
  each with holder(s), number, and the games behind it.
- **Round winners** derived from the per-hand scores, which are themselves derived from the
  running totals — definitions all the way down, no new data and no migration.
- ~~Withholding rules honoured: nothing crowned under 10 games, no player ranked under 5.~~
  ⚠️ **REPLACED 2026-09-14 (open question 6): records are shown from game one**, every one stating
  its sample, with a single early-days line at the top of the board under 10 games.
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
is the same person and the board is a joke at its own expense ~~; the withholding rules would hide
all of it anyway~~ *(that second clause stopped being true on 2026-09-14 — see open question 6; the
first is why this call still stands)*. **M1 lands on the games list instead**, which is honest at one game and still
useful at fifty. The one thing worth pulling early is cheap and invisible: **M1 already records the
winner of each game** (lowest total, ties shared), so by the time the board is built the history
it needs is complete rather than backfilled.

### Milestone 3 — delivery spec

*Written 2026-09-14, the day Milestone 2 finished. Same job as M1's and M2's delivery specs: the
build contract, not the decision document. Everything above it still governs — the wording
constraint, the "no second read" prohibition, the no-accounts stance, and the rule that heuristics
warn and humans decide. **Four founder questions frame it** (open questions 3, 6, 7, 9 above), and
**Stage 2's spec added a fifth** (question 10, the nemesis's tone) **and Stage 3's added two more**
(questions 11 and 12, the cleanest-sheet reading and the board's legibility at twelve records); each
has a stated default, so **nothing here waits on an answer to start**.*

⚠️ **M1's risk was a bad read. M2's was a change nobody can take back. M3's is different again: a
number that is wrong, confident, and quoted at the table.** Every screen in this milestone turns
stored rows into a claim about a person — *"you have never beaten him"*, *"your worst night ever"* —
and nothing on the screen can tell a right number from a plausible wrong one. Two consequences run
through every criterion below:

1. ⚠️ **The exposed numbers are named, and they are not the obvious ones.** The 2026-09-14 ADR
   ("Row 11 is not self-cancelling") found the **final score misread in 3 of 6 real reads**, always
   the same way. Winners survive **by margin, not by construction** — so *most wins*, *most wins in
   a row* and every head-to-head record are as safe as they have ever been. **Average score, best
   and worst game ever, and biggest hammering read a final score as a number**, and a wrong one
   there is permanent and invisible. Hand-by-hand stats are exposed to every interior cell too.
   ⚠️ **No wording anywhere in this milestone may describe any of these as safe, protected,
   verified or checked.** The mitigation is unchanged and already shipped: the photo is kept
   forever, the final row is called out on the review screen, and every claim on the board links
   back to the games it came from.
2. ⚠️ **Sample size is a feature of this milestone, not a caption.** A stat without its sample is a
   lie told confidently. Every number states what it is drawn from, through a shared mechanism
   rather than a habit each new record has to remember. ⚠️ **Amended 2026-09-14**: this sentence
   used to end "and the withholding rules are a shared mechanism". **There is no withholding** — the
   founder chose to show records from game one (open question 6), which makes the sample statement
   the only thing doing this job, and therefore makes it matter more, not less.

⚠️ **This milestone captures nothing and stores nothing new.** No table, no column, no migration, no
backfill — every number is a definition over rows M1 and M2 already store, which is exactly the
property the "capture dimensions early, build reports whenever" principle was banked for. A stat
invented in Stage 4 applies to the two games saved in September the moment it exists.

#### Decisions taken in this spec

*Ours and the architect's to make, per `CLAUDE.md`. Recorded here so a future session doesn't
re-derive them. **None of these is a founder question** — those are open questions 3, 6, 7 and 9.*

1. ⚠️ **The board grows stage by stage, and the extras are not a stage of their own.** Each proposed
   extra record rests on a number some catalogue screen computes anyway — *best/worst game ever* on
   the distributions, *the catastrophe* and *cleanest sheet* on the hand-by-hand pass, *the drought*
   on the streak machinery, *home advantage* on the venue slice. So each record ships **in the stage
   that computes its number**, as one row on a screen that already exists, instead of a "records
   board part 2" that recomputes half the catalogue. The board is therefore visibly fuller after
   every stage, and no number is computed twice in two places.
2. **The definitions live in `lib/scoring`**, beside `determineWinners` and the hand derivation, as
   pure functions with unit tests over the fixture grids — no analytics service layer, no new
   module hierarchy. Reading them is how a future session learns what "a streak" means here.
3. ⚠️ **Nothing is cached, precomputed or summarised.** No summary table, no materialised total, no
   scheduled recompute — the 2026-09-10 ADR rejected exactly that trade, and it is what makes a
   delete, an edit or a merge in M2 show up on the board on the next page load with no invalidation
   logic to get wrong. At a decade's size (~300 games, ~15,000 round rows) this is a page load.
4. ⚠️ **Withholding is one shared mechanism, not per-record logic.** A single module answers two
   questions — *is the board eligible at all?* and *is this player eligible to hold a record?* —
   and every record is built through it. A record cannot forget the rule, because it never
   implements it. The two thresholds are named constants (open question 6 changes them in a line).
   ⚠️ **Amended 2026-09-14 by the founder's answer to question 6, and the shape of the decision is
   what survives, not the rule.** There is no withholding left to do: **the module answers neither
   question, and instead owns the one thing every record still needs — its sample statement, and
   whether the board is in its early days.** One named constant remains (`EARLY_DAYS_BELOW = 10`);
   the per-player threshold is deleted, not set to 1. ⚠️ **The structural argument is unchanged and
   is the reason this stays a module**: a record that renders its number through the shared
   component cannot forget to state its sample, and thirteen records will each forget eventually if
   asked to remember. Decision 5 below is now the whole of it.
5. **The sample statement is a shared presentation component**, for the same reason: a record that
   renders its own number renders it through the thing that states the sample, so "every stat states
   its sample" is structural rather than a review-time catch.
6. **Joint holders are listed alphabetically**, all of them, against one number. There is no
   tie-break and no "and 2 others" — the PRD is explicit that more than one holder is normal.
7. **A drill-through is a filtered games list**, reusing the games list's existing row component and
   its ordering, under a heading that states the claim. It is not a new list format and not a
   report; the point is that the claim lands you in the record you already know how to read.
8. ⚠️ **The catalogue attaches to the pages that already exist.** Player pages gain their own
   sections, roster pages gain theirs, venue numbers land per open question 9 — plus **one catalogue
   index** for the slices that belong to nobody in particular (hand-by-hand villains, day-of-week,
   best and worst ever). **The board stays separate from the catalogue**, per the PRD: the board
   answers before you ask, the catalogue is where you go with a question.
9. **M2's three numbers on the player and roster pages do not move or change meaning.** The
   catalogue is added around them. ⚠️ ~~**The board's withholding rules still do not apply to those
   pages** (M2 spec decision 6): withholding governs a ranking, not a statement of fact about one
   person.~~ *(Moot from 2026-09-14 — there are no withholding rules to not apply. M2 criteria 135
   and the player-page reasoning around criterion 133 refer to a rule that no longer exists; their
   own requirement — a one-game player's page shows "1 game" and a 0% or 100% rate — is unchanged
   and now simply matches the board.)*
10. **Playwright moves into PR CI during this milestone.** The 2026-09-13 ADR set its own
    revisit-if as *"when M3's analytics screens land"*, and this is that moment — a dozen new
    number-dense screens is exactly when a layout regression stops being visible by eye. An
    engineering call, folded into a stage by the team; it carries no product criterion beyond the
    per-stage a11y ones.

*Decisions 11–16 were added 2026-09-14 with **Stage 2's** criteria, the same way 1–10 were added
with Stage 1's. They are the team's and the architect's; the one genuinely founder-shaped question
this stage raised is **open question 10**, above.*

11. ⚠️ **Head-to-head rides on the player page. There is no versus screen.** "Alice vs Bob" is one
    row in a **head-to-head section on each player's page**, readable from either side — not a
    `/players/{a}/vs/{b}` route, not a player picker, not a grid of everyone against everyone. The
    group is **about six people**, so the section is five rows long and the page you are already on
    answers the question. A versus route would be a new page type, a new empty state and a new way
    in, to show numbers that fit on a page that already exists. *(Overrule at mockups if the section
    reads badly — it is a section, not an architecture.)*
12. ⚠️ **"Who beats who" is two different numbers, and both are kept.** **Head-to-head wins** count
    *games won* (M1's lowest total, ties shared) among the games both players were in. **The
    above-rate** counts the games one player's final score was **strictly lower** than the other's,
    whoever actually won the night. Keeping both is not indecision: in a group of five, **most games
    are won by neither of two named players**, so a win-count head-to-head is mostly zeros and says
    nothing, while the finish-above comparison is populated from the first shared game. **Nemesis is
    built on the above-rate only** (criterion 199); head-to-head shows both side by side.
13. ⚠️ **Second place is the second-lowest *distinct* final score, and it can be shared.** The
    winners hold the lowest distinct score; everyone on the next distinct score up is second. So a
    shared win still has a second place behind it, two players level on the second score are **both**
    second, and a game where everyone finished level has **no** second place at all. *Rejected:
    competition ranking* (a two-way tie for first makes the next player third and nobody second) —
    it erases second place in exactly the games where the near-miss stings most, and it contradicts
    how this product already ranks everywhere else: distinct score positions, ties shared.
    Criterion 214, and Stage 3's *biggest hammering* is bound to the same function (criterion 215,
    consumed by criterion 232). ⚠️ **Stage 3 was specced after this and defines no second place of
    its own** — it imports 214 by reference, which is the whole point of settling it here.
14. ⚠️ **The drought is the streak rule negated, including "ever, not current".** Same order, same
    "a game they missed neither extends nor breaks it", same "a shared win counts as a win" — and
    the same **longest ever recorded, not the run they are on now** (criterion 177). Written as its
    own criterion (212) rather than left implicit, because negating a streak is precisely where a
    second implementation drifts from the first.
15. **Per-roster win rates are gathered, not rebuilt.** M2 criterion 138 already gives per-member
    wins and win rates **inside a roster**, on the roster page, and it is not touched. What did not
    exist is those numbers **gathered on the person**, which is what the catalogue's "win rates,
    overall and per roster" asks for from a player's side. One shared function feeds both screens, so
    they cannot disagree (criteria 208–209). The "overall" half is M2 criterion 133, unchanged.
16. **Nemesis is per-player and never a board record.** Every player has their own, so there is no
    single holder and no number over the whole archive — it belongs on a player page, beside the
    head-to-head rows it is computed from. **The board gains exactly two rows this stage**: the
    drought and the nearly man.

*Decisions 17–24 were added 2026-09-14 with **Stage 3's** criteria, the same day as 11–16 and
immediately after them. They are the team's and the architect's; the founder-shaped questions this
stage raised are **open questions 3, 11 and 12**, above.* ⚠️ **There is deliberately no Stage 3
decision about second place or the winning margin.** Stage 2 settled both (decision 13, criteria
214–215) and Stage 3 imports them; a second definition anywhere is the failure this project's
shared-module habit exists to prevent.

17. ⚠️ **A single-event record is a different animal from an aggregate one, and says so.** Best
    game ever, worst game ever, the catastrophe, cleanest sheet and biggest hammering are each
    **one observation**, not a summary of anybody's history. Criterion 182's *"from {n} games"*
    would be a **false sample statement** on them — the holder having played 40 games says nothing
    about a number drawn from one night. **They state the game's date instead** (criterion 233).
    The board's archive line and early-days line are unaffected and still sit at the top.
18. **Cleanest sheet counts one player's zero-point hands in one game**, out of eleven — not a
    career total. A career total ranks by turning up, which the stalwart already measures, and it
    would drift upward forever with nothing to compare against. *(Founder-visible as open question
    11; default is this.)*
19. **Per-hand bleed is a mean, not a total.** ⚠️ For a single player the two rank **identically**
    — every player plays all eleven hands in every game, so each hand's total is its mean times the
    same *n* — which is precisely why the choice can be made on presentation grounds: **the mean is
    the number that compares across players and stays stable as the archive grows.**
20. **The roster's table average is a new definition; the per-member average is not.** M2 criterion
    138 puts wins and win rate per member on the roster page and **no average at all**, so both
    numbers are new *to the screen*; only the roster-level one is a new *definition* — the mean of
    **every final score posted in that roster's games by any member**. It answers "are our nights
    high-scoring?", which is a fact about the table, not about a person.
21. ⚠️ **The eleven-hand trend is eleven labelled numbers that happen to be drawn as bars.** No
    line, no smoothing, no curve fit, no trend arrow, and **no copy claiming where games are
    decided** — the screen shows the numbers and the reader makes the claim. A smooth line over
    eleven aggregates of derived scores implies a precision this data does not have, and these
    numbers are derived from running totals that can be misread.
22. **The catalogue index is `/stats`**, and it is where slices that belong to nobody in particular
    live (decision 8). Player-shaped numbers go on player pages, roster-shaped numbers on roster
    pages. ⚠️ **No per-game chart is built**: a game's eleven hands for four people is the grid the
    game view already shows, and drawing it twice adds decoration, not information.
23. **No new honesty mechanism is invented here.** The sample statement, the early-days line, joint
    holders, the fixed-strings contract, the no-cache rule and the wording ban all **continue**;
    criterion 246 is a re-run over new surfaces, not new scope. The one addition is decision 17's
    date-instead-of-count, which is a narrowing of criterion 182, not a second system.
24. **The drill-through pattern does not fork.** A single-event record still lands on a filtered
    games list under a heading stating the claim (criterion 186), even when that list has one row.
    ⚠️ **A one-row list is not a bug**: it keeps one pattern across twelve records, and the row is
    the ordinary `GameRow` whose link reaches the game and its photo — which is the whole mitigation.

#### User stories

**The board**

> As a player, I want one board of all-time records, so that I can see who is actually best in five
> seconds and start an argument about it.

- One screen, all-time, the first thing past the password gate. The games list and "add a game" are
  one tap away from it.
- Each record: a title, a name, a number. ⚠️ **No drilling required to read it** — drilling is for
  disputing it.
- More than one holder is normal, and all of them are named.
- ⚠️ **Every record says what it is drawn from**, and a board drawn from a handful of games says so
  at the top *(amended 2026-09-14, open question 6 — it used to withhold the records instead)*.

> As a player, I want to tap a record and see the games behind it, so that I can dispute it properly.

- Tapping a record lands on **exactly the games that number was computed from**, newest first.
- ⚠️ **This is the same guarantee the review screen makes about a number**: the app's job is to be
  checkable, not to be right. A record I cannot trace is a record I cannot argue with.

> As a player, I want a game I took the most hands in but still lost to show up as exactly that, so
> that the board exposes the argument rather than smoothing it over.

- Round winners are derived from the per-hand scores; a hand's lowest score takes it, and **ties are
  shared, which is the common case** in the early hands.
- ⚠️ **"Most rounds won" is allowed to disagree with "most wins", and nothing on screen reconciles
  the two.** Taking the most hands all night and losing on Kings is the point, not an inconsistency.

**Sample size and honesty**

> As a player, I want to know how much is behind a number, so that one lucky night is visibly one
> lucky night.

- Every stat on every screen states its sample, and a per-player record states its holder's own
  game count.
- ~~Nothing is crowned until the archive has enough games; a player with too few games is set aside,
  and the screen says how many were.~~ *(struck 2026-09-14, open question 6)* **Everything is shown
  from game one; under 10 games the board says once, at the top, that it is early days.**
- ⚠️ **Nothing claims a number is checked, verified or safe.** Final scores can be misread and the
  product knows it.

**Rivalry** *(Stage 2 — written 2026-09-14 with its criteria, 197–222)*

> As a player, I want to see how I do against one particular person, so that "I always beat you"
> can be settled with a number.

- One section on my player page, **one row per person I have ever shared a game with**: games
  together, wins each, and my win rate across those games.
- ⚠️ **A game counts only if we were both at the table.** Nights one of us missed are not part of it,
  and a night a third person won is still a night we both played.
- A shared win counts in full for both of us, so the two rates can sum past 100%.
- Tapping the row lands on exactly those games, like every other claim in this milestone.

> As a player, I want to know who my nemesis is, so that I know who to avoid inviting.

- ⚠️ **Winning the night and finishing above me are different things**, and this is about the
  second. In a group of five most games are won by neither of us; the person quietly ahead of me
  every time is who the stat is for.
- My nemesis is whoever finishes above me most reliably, stated as a rate **with the number of games
  we have played together** beside it.
- ⚠️ **Someone who has never once finished above me is not my nemesis**, at any sample size. Where
  nobody qualifies, the screen says so plainly rather than crowning the least-bad candidate.
- ⚠️ **This one is about a named friend who will read it.** It states a number. It does not
  editorialise about either of us.

> As a player, I want to know whether I do better with one set of people than another, so that the
> roster argument has a number attached to it.

- One row per **exact set** I have played in: games, wins, win rate. Four of us, and the same four
  plus one, are two rows and neither borrows the other's games.
- The same numbers the roster page already shows — gathered on me instead of on the set.

> As a player, I want the board to say who has gone longest without a win and who keeps coming
> second, so that the honours board is not only good news.

- **The drought** — the longest run of games someone played and did not win. **Longest ever, not the
  run they are on now.**
- **The nearly man** — most second places, where second place is the next score up from the
  winner's and can be shared like a win can.
- Both state their sample and both tap through to the games behind them, like every other record.

**Distributions and villains** *(Stage 3 — written 2026-09-14 with its criteria, 223–249)*

> As a player, I want to know my best and worst nights ever, so that I have something to brag about
> and something to live down.

- The lowest and the highest final score anyone has ever posted, each with the player, the number
  and the night it happened, on the board and in the catalogue.
- Tapping either lands on that game, where the photo is. ⚠️ **The photo is the only way to settle
  it** — nothing in the app can tell a right final score from a plausible wrong one.
- Two people who posted the same extreme score both hold it, and both are named.

> As a player, I want to know which hand I bleed on, so that I have something to blame.

- Every player's average points per hand, 3s through Kings, with their own worst hand marked.
- Read as a whole table on the catalogue index, and on my own page for just me.
- Each number says how many games it averages; a player on one game is shown, not withheld.

> As a player, I want to see where the points actually go across the eleven hands, so that the
> "it's all decided on Kings" argument has a number attached to it.

- Eleven numbers, one per hand, averaged across every game and every player in the archive.
- ⚠️ **The screen does not tell me where games are decided.** It shows what each hand costs on
  average and says what it is drawn from; the argument stays mine.

> As a player, I want the single worst hand anyone has ever taken to be a named, permanent record,
> so that nobody is allowed to forget it.

- The biggest points taken in one hand, all-time: who, how many, which hand, which night.
- The ten biggest, in the catalogue, for the ones that did not quite win.

> As a player, I want to know how a particular crowd scores together, so that "we always play high
> at that table" stops being a feeling.

- A roster's own average across every score posted in its games, plus each member's average within
  that roster only.

> As a player, I want the board to say who got hammered worst, so that a landslide is remembered as
> a landslide.

- The widest gap between the winner and whoever came second, in any one game, named and dated.
- ⚠️ **"Second" means the same thing here as it does in the nearly man** — Stage 2's criterion 214,
  used and not re-derived. A game everybody finished level on has no second place, so it cannot
  hold this record.

**The rest of the catalogue** *(detailed when its stage is specced — Stage 4)*

> As a player, I want to know whether we really do play differently at a particular house, so that
> the venue argument has a number attached to it.

#### Acceptance criteria

*Numbering continues from Milestone 2's 174, so a criterion number means one thing across the whole
project. Executable by QA on a scratch environment with a seeded archive, except where a criterion
names production or the founder's own phone. **Stage 1's criteria are 175–196**, **Stage 2's are
197–222** and **Stage 3's are 223–249**, each written before its build starts, the way M2 wrote its
stages' criteria before the stage ran; **Stage 4 continues from 250** when it is specced.
⚠️ **Numbers are allocated in writing order and never re-ordered afterwards** — a criterion number is
an identifier, not a position in the plan, which is the same rule that keeps 147 struck rather than
reused. Stages 1, 2 and 3 were specced in that order on 2026-09-14 and are built in that order too.
⚠️ **M2's closing criteria 167–171** (wording audit, the a11y pass, real unit tests in CI, the
permanent secret-free check, running cost unchanged) **are re-run over every screen this milestone
adds**, and are restated with their own M3 numbers when the last stage is specced — no number is
reserved for them now.*

**The definitions everything else is built on**

175. **Round winner, derived.** A pure function in `lib/scoring` takes one game's stored `round_score`
     rows and returns, for each of the eleven hands, **every player holding the lowest score in that
     hand**. ⚠️ **Ties are shared and are the common case** — several players go out clean in the
     early hands, so a hand with three holders is ordinary and any code path assuming one holder per
     hand is wrong. Unit tests assert it over both fixture games, including at least one hand with
     three zero-score holders. **No new data**: it reads the `score` column M1 already derives and
     stores.
176. **Most rounds won** is the count of hands a player held across every game they played, a shared
     hand counting **in full for each holder**. QA hand-counts one fixture game against
     `fixtures/sheets/GROUND-TRUTH.md` and matches the number on screen. ⚠️ **It may disagree with
     "most wins", and nothing on the board reconciles, footnotes or apologises for that.**
177. **A streak is consecutive games that player was in**, taken in the games list's own order
     (`played_on`, `created_at` as tie-break). ⚠️ **A game they did not play neither extends nor
     breaks it**, and **a shared win extends a streak exactly as a solo win does.** The record is
     the **longest ever recorded**, not the current run, and the screen says which it is. QA
     constructs a five-game archive where one player wins games 1, 2, 4 and 5 and misses game 3
     entirely (streak = 4), and a second where they played game 3 and lost it (streak = 2).
178. **Lowest average score** is the mean of that player's own `final_score`s over the games they
     played, shown to **one decimal place**, lower being better, **stated with the number of games it
     averages**. It reads `game_player.final_score` — the same number the game view, the player page
     and the CSV already use, so no two screens can disagree.

**The board**

⚠️ **Criteria 182–185 were rewritten 2026-09-14** by the founder's answer to open question 6 — the
board shows records **from game one** under an early-days line, rather than withholding them until
the archive reaches 10 games. **179, 180, 181 and 186–191 are unchanged**, and **no number moved**:
what was withholding in 183 and 184 is struck in place. The shape was the founder's call; the
mechanics below are the team's.

179. **`/` renders the records board** for a group session, replacing today's redirect to `/games`.
     The games list and "add a game" are each reachable from it **in one tap**; `/games` keeps
     working unchanged; and an unauthenticated request to `/` still 307s to `/login` with no
     fragment of the record in the response (M1 criterion 1 still passes).
180. Every record shows **its title, its holder or holders by name, and the number**, readable at
     375px **without tapping anything**.
181. A record with **more than one holder lists all of them**, jointly, alphabetically, against the
     one number. ⚠️ Nothing on screen treats this as a tie-break failure, an error, or an
     "and others" overflow.
182. ⚠️ **Every record states the sample it is drawn from**, and the board states the size of the
     whole archive once, at the top. QA finds no number anywhere on the screen without a sample
     beside it. ⚠️ **Amended 2026-09-14 (open question 6): a per-player record additionally states
     the holder's own game count** — "lowest average score — Sam, 41.5, from 1 game" — because with
     nothing withheld this sentence is now the only thing carrying the thinness of a sample.
     A jointly-held record states each holder's count. QA seeds a one-game player who holds a record
     and finds "from 1 game" beside it without tapping anything.
183. ~~⚠️ **Under 10 games the board crowns nobody.** With 9 games seeded, **no holder name and no
     record number appears anywhere on the screen**; it states how many games the archive has and
     how many it is waiting for, and points at the games list and "add a game". With the 10th game
     saved, the board appears in full. QA runs both.~~ ⚠️ **REWRITTEN 2026-09-14 — the founder chose
     the caveat over the gate (open question 6).** **Every record is shown in full, with its holder
     and its number, from the first saved game**; nothing on the board is ever hidden on grounds of
     sample size. **While the archive holds fewer than 10 games the board shows one fixed line as the
     first thing on the screen**:
     **"Early days — {n} games in the record. A single game can still change any of these."**
     At 10 games and above that line is **absent**, not reworded. QA runs the board at **1, 2, 9 and
     10 games**: records present and named at every count, the line present at 1, 2 and 9 with the
     right number in it, gone at 10. ⚠️ **The line is the board's, not a record's** — it appears once
     however many records are on screen, and no record carries a caveat of its own. **Under 10 games
     this line *is* criterion 182's archive statement** — the count is not printed twice on one
     screen. *(10 remains a named constant, `EARLY_DAYS_BELOW`; it is now a caveat threshold and not
     a gate.)*
184. ~~⚠️ **A per-player record ignores players with fewer than 5 games and says how many it set
     aside** — e.g. "2 players aren't counted yet — fewer than 5 games each". QA seeds a player with
     4 games who would otherwise hold **lowest average score**, and confirms they are absent from
     the record **and** counted in that sentence.~~ ⚠️ **REWRITTEN 2026-09-14 — the 5-game floor is
     deleted, not lowered (open question 6).** **Every player with at least one game is eligible for
     every per-player record**, and no sentence anywhere counts players who were "set aside", because
     none are. QA re-runs the old seed — a player on 4 games with the lowest average — and confirms
     they now **hold** the record, with "from 4 games" beside their name per criterion 182.
     ⚠️ **A degenerate-looking number is shown as it is and not apologised for**: with two games in
     the archive, *most wins in a row — Sam, 1* is a true statement about the record and is rendered
     plainly. **No special case, no footnote, no suppression at any value** — the early-days line and
     the sample statement are the whole of the disclosure, and QA fails the build on any per-record
     hedging added beyond them.
185. A record with **no holder at all** — nobody has yet done the thing it measures, which a
     non-empty archive can still produce (the drought over a group where everyone has won; any
     later record whose event has not happened) — **says so in its own row** rather than silently
     vanishing from the board, using the fixed string from criterion 193. ⚠️ **Amended 2026-09-14:
     this case is no longer reachable by withholding** (183 and 184 are struck), so it is now purely
     about a record nobody holds; **the criterion itself is unchanged — a record never disappears**.
186. ⚠️ **Every record is checkable.** Tapping one lands on **exactly the games the number was
     computed from**, newest first, in the games list's row format, under a heading stating the claim
     and its sample. QA counts the rows against the number for all four: **most wins** → that
     player's winning games; **most wins in a row** → the games of that streak, in order; **lowest
     average** → every game they played; **most rounds won** → the games in which they took at least
     one hand, each row showing how many they took there.
187. ⚠️ **Shared wins survive everything.** Using M1 criterion 66's constructed tie: both players'
     win totals rise, **both streaks stay alive**, both games appear in each player's drill-through,
     and no total, rate or streak on the board is broken by it. Win-based numbers across a group may
     sum past 100% and nothing on screen treats that as an error.
188. **Every game counts towards every number.** A game with no location, a four-player game and a
     five-player game all count alike, and there is no exclusion, asterisk or comparability caveat
     anywhere on the board.
189. ⚠️ **Nothing is cached.** Every number is computed from stored rows at read time — no summary
     table, no stored total, no scheduled recompute. QA **deletes a game** and **merges two players**
     (M2's own features), reloads the board, and finds every affected record has moved.
190. **The query count does not grow with the archive.** QA compares the board's database queries at
     10 games and at 60 and finds the **same bounded number**, with no per-player or per-game query
     in a loop.
191. **An empty archive renders an empty state** pointing at "add a game" — not an error, not a board
     of zeros, and not a record crowned on nobody.
192. ⚠️ **The wording rule, again, and one addition.** Nothing on the board or its drill-throughs
     describes a number as *checked, validated, verified, confirmed* or *correct* — **and nothing
     describes a final score, an average or a record as *safe*, *protected* or *self-cancelling***,
     which the 2026-09-14 ADR forbids by name. QA reads every string on the screen, including the
     empty state, no-holder rows, and the early-days line itself. ⚠️ **The early-days line is inside
     this rule, not an exception to it**: it says a record can change, never that a small sample is
     fine, and it may not acquire a reassuring second sentence.
193. Record titles, **the early-days line** and **the no-holder sentence** are rendered **verbatim
     from the fixed-strings table** in `docs/DESIGN-SYSTEM.md`, which gains a Milestone 3 section.
     ⚠️ **A paraphrase is a fail even where it uses no banned word** — the same contract Stage 5
     established. *(Amended 2026-09-14: "the withholding sentences" became these two; the early-days
     line's wording is fixed in criterion 183 and the ui-designer may not restyle it into
     reassurance.)*
194. `npm run audit:a11y` covers the board and its drill-throughs at **375px and 1280px**: no
     horizontal overflow, ≥44px targets, visible focus, and ⚠️ **colour is never the only signal**
     for a holder marker, the early-days line, a no-holder row or a winner row *(amended
     2026-09-14 — "a withheld record" no longer exists)*.
195. ⚠️ **No schema change.** Stage 1 adds no table, no column and no migration — QA confirms
     `lib/db/migrations/` is untouched and every number traces to rows M1 and M2 already store.
196. **The stalwart** — most games played — appears on the board with the same sample statement and
     drill-through as the other four: holder or holders by name, the number of games, and a tap
     landing on exactly those games. ✅ **ADOPTED 2026-09-14 — the founder said yes to open question
     7, so this is an ordinary criterion of Stage 1**, no longer conditional and no longer at risk of
     being struck. *(It was written as conditional on 2026-09-14 and would have been struck like 147
     rather than renumbered; that never happened, and its number was never in doubt either way.)*

**22 criteria for Stage 1, numbered 175–196.** ⚠️ **None of them is conditional any more** —
196 was adopted and 182–185 were rewritten on 2026-09-14, both on the founder's answers, and no
number moved in either change. **Stage 2 took 197–222 and Stage 3 took 223–249**, both specced the
same day and in that order; Stage 4 continues from **250**.

---

**Stage 2 — Rivalry: the criteria, 197–222**

*Written 2026-09-14, before the stage starts and while Stage 1 is still in build — the same way
Stage 1's criteria were written before its build. Three notes before the list:*

- ⚠️ **This stage captures nothing either.** No table, no column, no migration, no backfill. Every
  number below is a definition over rows M1 and M2 already store, and it applies to the whole
  archive the moment it exists. Criterion 219 makes that testable.
- **This is Stage 2's half of open question 7.** The drought and the nearly man are the two extra
  records this stage's numbers pay for; **the default is "build both"** and this spec is written to
  that default. Cutting either at the checkpoint is deleting one row and one criterion, not a
  re-plan. ⚠️ **After this stage the board carries seven records** — the legibility question in
  question 7 stops being hypothetical here (criterion 218).
- ⚠️ **One new founder question opened with this spec — open question 10, on the nemesis's tone.**
  It blocks nothing: the default is to build it exactly as specced below, titled with the founder's
  own word and saying nothing beyond the number.

**The definitions this stage is built on**

197. **Head-to-head is over games both players were in.** A pure function in `lib/scoring` takes two
     players and returns, over **the games both of them played**: games together, each player's
     **wins** (M1's lowest total, **ties shared**), and each player's win rate across those games to
     **one decimal place**. ⚠️ **A game either of them played without the other is not in the
     sample**, and a game both played that a **third player** won counts in games-together and in
     neither win column — so the two win counts need not sum to games together, in either direction.
     A win the two of them shared counts **in full for both**. Unit tests assert all four shapes
     (solo win each way, shared win between them, third-party win) and assert **symmetry**:
     head-to-head(A, B) is head-to-head(B, A) mirrored, from one function, never two.
198. **"Finishing above" is a comparison of final scores, and it is not the same thing as winning.**
     In a game both played, **A finishes above B when A's `final_score` is strictly lower than B's**.
     Equal final scores are **neither above nor below** and count **in the denominator only**. It
     reads `game_player.final_score` — the same column criterion 178 and the player page already use.
     ⚠️ **This is deliberately a finer measure than criterion 197's win count** (spec decision 12),
     and nothing on screen presents the two as the same number.
199. **Nemesis, precisely.** For a player **P**, take every other player who has shared at least one
     game with P. For each, the **above-rate** is *(games that opponent finished above P, per 198)
     ÷ (games both played)*, to one decimal place. **P's nemesis is the opponent with the highest
     above-rate.** ⚠️ **An opponent who has never once finished above P is never P's nemesis** — an
     above-rate of zero does not hold the title at any sample size, which is what stops an archive
     where nobody has beaten P from crowning someone anyway. **Ties are joint**: every opponent on
     the highest rate is named, alphabetically, exactly as criterion 181 requires of the board.
     ⚠️ **There is deliberately no secondary tie-break on games played** — this project lists joint
     holders rather than manufacturing a single one, and a rivalry stat is the last place to start.
     ⚠️ **Nemesis is asymmetric on purpose**: P's nemesis may be Q while Q's nemesis is R, and
     nothing on screen calls that a contradiction or tries to reconcile it.
200. ⚠️ **No minimum sample anywhere, and the sample is always on screen.** Per the founder's answer
     to open question 6, no head-to-head number, above-rate or nemesis is withheld, rounded away,
     greyed out or footnoted for thinness — each states the games it is drawn from through **Stage
     1's shared sample-statement component** (criterion 182), not through wording of its own. QA
     seeds a pair with **one** shared game and finds a **100.0%** head-to-head rate shown plainly
     with "1 game together" beside it, and no hedge beyond the board's early-days line.
201. **A player with no nemesis, and a player with nothing at all.** Where **no opponent has an
     above-rate greater than zero** — P has finished above or level with everyone, every time, which
     a one-game archive readily produces — the nemesis line renders the **fixed no-nemesis string**
     from criterion 193's table and crowns nobody. A player with **no shared games at all** renders
     the same way, and a player with **zero games** keeps M2 criterion 136's empty state unchanged.
202. ⚠️ **The wording rule, extended for the one stat that names a friend.** Criterion 192's bans
     apply unchanged (*checked, validated, verified, confirmed, correct*; *safe, protected,
     self-cancelling*), plus one addition for every rivalry screen: **nothing characterises a
     player, only their numbers.** No string calls anyone weak, hopeless, dominated, owned, a victim
     or a walkover; nothing says a player *can't* beat someone or *never* will; nothing advises
     anyone what to do about it. ⚠️ **Amended 2026-09-14 (open question 10): the founder chose
     banter over flat wording.** The ui-designer **may** write tone into the nemesis card's title and
     framing — this was the team's original hesitation, now lifted by the founder's own answer, not
     silently assumed — and proposes a short list of candidates for the founder to pick at the
     mockup checkpoint rather than the single flat sentence this criterion originally specified.
     Every other ban above still holds absolutely: banter lives in the title and the framing, never
     in a sentence about what the losing player is or should do. **"Nemesis" itself is the founder's
     own word** from the analytics catalogue and stays as at least one candidate.
     ⚠️ **The test is mechanical**: QA reads every string on the player page and its head-to-head
     rows and fails the stage on any sentence that would not be printable with **both named players
     reading it, one over each shoulder** — a cheeky title clears this bar; a sentence that calls one
     of them a loser does not.

**Head-to-head on screen**

203. **The head-to-head section lives on the player page, and there is no new page type.** A player
     page gains one section with **one row per player they have shared at least one game with**,
     each row stating: the opponent's name, **games together**, **wins each**, **this player's win
     rate in those games** (197) and **the opponent's above-rate** (198). Rows are ordered by games
     together, descending, then alphabetically. ⚠️ **No `/vs/` route, no player picker, no
     everyone-against-everyone matrix** (spec decision 11). A player with no shared games sees the
     section's own empty state, not a missing section.
204. ⚠️ **A head-to-head row is checkable.** Tapping one lands on **exactly the games both players
     played**, newest first, in the games list's row format, under a heading naming both players and
     stating the sample — **Stage 1's drill-through (186) reused**, not a second list format. QA
     counts the rows against the row's own games-together number.
205. **The same pair reads the same from either side.** QA opens A's page and B's page and finds the
     identical games-together count and mirrored win columns. Using M1 criterion 66's constructed
     tie: a win **shared between A and B** shows as a win in **both** columns of the same row, the
     two win rates therefore sum past 100%, and nothing on screen treats that as an error.
206. **Nemesis appears on the player page and nowhere else** — the opponent's name, the above-rate,
     and the games-together count, beside the head-to-head rows it is computed from. ⚠️ **It is not
     a board record** (spec decision 16): every player has a different one, so there is no single
     holder and no number over the whole archive. QA confirms the board gains no nemesis row.

**Win rates, overall and per roster**

207. **The overall win rate is not rebuilt.** M2 criterion 133's games played, wins and win rate on
     the player page **are** the "overall" half of the catalogue's "win rates, overall and per
     roster" — same number, same place, one decimal place, untouched by this stage. QA confirms the
     player page's headline numbers are unchanged after Stage 2 lands.
208. **Per-roster win rate, from the player's own side.** A player page gains a **by-roster
     section**: one row per roster they have played in, showing the roster's name (custom or auto,
     per M2 141–142), **games played in it, wins, and win rate to one decimal place**, each with its
     sample stated. ⚠️ **The roster page is not touched and M2 criterion 138 is not
     re-implemented** — both screens read one shared function (spec decision 15).
209. **The two sides cannot disagree.** For any player and any roster they play in, the number on the
     **roster page** (138) and the number in that player's **by-roster row** are the same figure to
     the same decimal place. QA checks one roster containing a shared win from both directions.
210. ⚠️ **Exact sets only, restated where it will bite.** A by-roster row is one **exact** set (M2
     139): four people, and the same four plus a fifth, are **two rows**, and neither borrows the
     other's games. QA saves both games and checks the invariant that makes this provable — **the
     by-roster rows' games sum exactly to the player's overall games played** (criterion 207), with
     no game counted twice and none missing.

**Streaks, in context**

211. **The longest winning streak is Stage 1's number, shown where the argument is.** The player page
     states that player's **longest winning streak ever recorded** — criterion 177's definition and
     **criterion 177's function**, never a second implementation — labelled so it cannot be read as
     the run they are on now, with the games of that streak reachable by tap (186's drill-through).
212. **The drought is that machinery negated, and the same rule about "ever".** A player's drought is
     the longest run of **consecutive games that player was in** which they did **not** win, in the
     games list's own order (`played_on`, `created_at` as tie-break). ⚠️ **A game they did not play
     neither extends nor breaks it**, and **a shared win ends a drought exactly as a solo win does.**
     ⚠️ **The record is the longest ever recorded, not the current run**, identical to criterion 177
     and stated here rather than left implicit (spec decision 14). QA runs criterion 177's own
     five-game construction inverted: a player who **loses games 1, 2, 4 and 5 and misses game 3
     entirely** has a drought of **4**; one who **played game 3 and won it** has a drought of **2**.

**The board gains two rows**

213. **The drought on the board** is the largest drought held by any player (212): holder or holders
     by name, the number of games, **its sample statement** (182) including each holder's own game
     count, and a **drill-through** (186) landing on exactly the games of that run, in order. Joint
     holders are listed alphabetically against the one number (181).
214. ⚠️ **Second place, defined where wins are shared — once, for the whole project.** Within one
     game, rank the **distinct** final scores ascending: the winners hold the lowest (M1's rule,
     unchanged), and **second place is every player holding the second-lowest distinct final
     score**. ⚠️ **Two records consume this definition and neither may re-derive it**: *the nearly
     man* (criterion 216, this stage) and *biggest hammering* (criterion 232, Stage 3, bound through
     criterion 215). One pure function in `lib/scoring`; a second implementation of second place
     anywhere in the codebase is a QA failure. Four cases, each of which QA constructs and runs:
     - **Two players tie the win on 100, one player has 110** → second place is **that one player**.
       ⚠️ Second place is *not* skipped because the win was shared.
     - **Two players tie on 110 behind a single winner** → **both are second**, counted in full for
       each, exactly as a shared win counts in full for each.
     - **Every player in the game finished level** → one distinct score, everybody won, and the game
       has **no second place**, contributing to nobody's count.
     - **A winner is never also a second place in the same game** — the definition makes it
       impossible rather than guarding against it.
     ⚠️ **The rejected alternative, recorded so it is not re-litigated**: competition ranking, where
     a two-way tie for first makes the next player *third* and nobody second. It erases second place
     in exactly the games where the near-miss stings most, and it disagrees with how this product
     ranks everywhere else — distinct score positions, ties shared.
215. **Stage 3 is bound to this function, not its own.** *Biggest hammering* (Stage 3) is the widest
     margin between the winning score and the **runner-up** score, where runner-up means criterion
     214's second-lowest distinct final score — so **a game with no second place cannot hold that
     record**. The margin itself is **the second-place score minus the winning score**: a positive
     integer, or **absent** where 214 returns no second place, which is why an all-level game
     contributes nothing rather than contributing a zero. ⚠️ **Written here because the definition
     is written here.** *(Stage 3 was specced later the same day and honours this: **criterion 232**
     is biggest hammering, and it states no rule of its own.)*
216. **The nearly man** — most second places, counted per 214, **a shared second counting in full for
     each holder** — appears on the board with holder or holders by name, the number, its sample
     statement (182) and a drill-through (186) landing on **exactly the games they came second in**.
     QA hand-counts one fixture game against `fixtures/sheets/GROUND-TRUTH.md` and matches the
     number on screen.
217. **Both new rows survive an archive where nobody holds them.** QA seeds the single degenerate
     game in which **every player finished level**: nobody has ever failed to win, so **the drought
     has no holder**, and no game has a second place, so **the nearly man has no holder**. Both rows
     render the **no-holder sentence** (185, verbatim per 193) rather than vanishing from the board,
     and neither ever shows **0 with a name beside it**.
218. **The board gains these two rows and nothing else in this stage.** After Stage 2 it carries
     **seven records**: the four the founder named, the stalwart (196), the drought and the nearly
     man. ⚠️ **Legibility is now live, not hypothetical** (open question 7's own warning): QA reports
     how the board reads at **375px** — how far it scrolls, and whether the five-second read still
     holds — as a finding for the founder, not as a pass/fail. **Cutting a row remains the founder's
     call and costs one deletion.**

**Nothing new is captured, nothing is stored, nothing is cached**

219. ⚠️ **No schema change, again.** Stage 2 adds no table, no column and no migration: QA confirms
     `lib/db/migrations/` is untouched and every number above traces to rows M1 and M2 already
     store. *(Restated rather than inherited from 195, because a pair-wise stat is exactly the thing
     a future session would be tempted to give a table of its own.)*
220. ⚠️ **Nothing is cached.** No head-to-head table, no stored pair matrix, no nemesis column, no
     scheduled recompute. QA **deletes a game** and **merges two players** (M2's own features),
     reloads a player page and the board, and finds the head-to-head rows, the nemesis, the
     by-roster rows, the drought and the nearly man **all moved**. ⚠️ **On the merge**: the surviving
     player's head-to-head rows are the **union** of both players' opponents and **no row names the
     player who was merged away**. A row of a player against *themselves* is unreachable by
     construction — M2 criterion 160 refuses a merge where both players appear in the same game — so
     this is a check, not a guard to build.
221. **The query count does not grow with the archive or with the group.** QA compares the player
     page's and the board's database queries at **10 games and at 60**, and at **4 players and at
     8**, and finds the same bounded number each time — ⚠️ **no per-opponent, per-roster or per-game
     query in a loop**, which is the specific temptation of a pair-wise screen (criterion 190,
     extended).
222. `npm run audit:a11y` covers the player page's new sections and the board's two new rows at
     **375px and 1280px**: no horizontal overflow, ≥44px targets, visible focus, and ⚠️ **colour is
     never the only signal** for a win column, a losing row, a no-holder row or the nemesis.

**26 criteria for Stage 2, numbered 197–222.** None is conditional. ⚠️ **Two of them are the ones
to read hardest at the checkpoint**: 214 (what "second place" means when a win is shared, which is
a definition the archive will live with forever) and 202 (the tone of a stat about a named friend).
**Stage 3 continues from 223**; Stage 4 from 250.

---

**Stage 3 — Distributions and villains: the criteria, 223–249**

*Written 2026-09-14, the same day as Stage 2's and immediately after them, before either stage
starts — the same way Stage 1's and Stage 2's criteria were written before their builds. Build order
is unchanged: Stage 2 ships first. Three notes before the list:*

- ⚠️ **This stage captures nothing either.** No table, no column, no migration, no backfill. Every
  number below is a definition over rows M1 and M2 already store. Criterion 246 makes that testable.
- ⚠️ **Second place is not defined here.** *Biggest hammering* needs the identical definition *the
  nearly man* needs, and **Stage 2 settled it first** — criterion 214, bound to this stage through
  criterion 215. **Criterion 232 uses that function and states no rule of its own.** Two stages
  computing second place two different ways is exactly the failure the shared-module habit exists to
  prevent; whichever stage is built first owns the function and the other imports it.
- ⚠️ **This is the most exposed stage in the milestone and it does not get to be coy about that.**
  Every number here reads a score **as a number rather than as a comparison**. *Most wins* survives
  a misread final score because a game is rarely close enough for 30 points to flip it; *worst game
  ever* **is** the number, and a final score misread into the record is permanent, quotable, and
  invisible to everything the app does automatically (risk 1; ADR "Row 11 is not self-cancelling",
  2026-09-14). **The mitigation is not a check and must never be written as one.** It is that every
  record here names the game it came from, and one tap from the record lands on that game, where the
  photo is. ⚠️ **Nothing on these screens may say *checked, verified, confirmed, correct, safe,
  protected* or *self-cancelling*** — criterion 192 already bans it and criterion 246 re-runs it
  over every string this stage adds. **The founder's standing call on whether these records should
  say more than that is open question 3, restated as 3a/3b above.**

*⚠️ **Stage 1's criteria 181, 182, 185, 186, 189, 190, 192, 193, 194 and 195 govern everything below
and are not restated as new scope** — criterion 246 is where QA re-runs them over this stage's
screens. **Stage 2's criteria 200 (no minimum sample) and 214–215 (second place, the margin) govern
too**, and are equally not restated.*

**The definitions this stage is built on**

223. **Averages reuse criterion 178's function unchanged** — mean of `game_player.final_score`, one
     decimal place. ⚠️ **No second mean is written anywhere in this stage.** QA greps for a second
     averaging implementation and finds none.
224. **A roster's table average** is the mean of **every final score posted in that roster's games,
     by any member** — a fact about the table, distinct from any member's own average. It is stated
     with **both** numbers behind it: the games and the scores (a four-person roster over 5 games
     averages 20 scores, and the screen says so).
225. **Per-hand mean.** A pure function groups stored `round_score.score` rows by hand and returns
     the mean to one decimal, with hands labelled **3s through Kings** from the existing
     `HAND_LABELS` rather than by number. Unit tests assert it over both fixture games.
226. **The hand a player bleeds on** is **the hand with their highest per-hand mean** across every
     game they have played. ⚠️ **Ties are joint and every tied hand is named** — "Jo bleeds on 9s
     and Kings" is an ordinary result, not a tie-break failure. A player with one game has one, and
     it is shown with "from 1 game" beside it.
227. **A zero-point hand is a stored `round_score.score` of exactly 0** — M1's derived value, read
     as-is. ⚠️ **Nothing in this stage re-derives zeros from running totals or reinterprets a
     repeat**, and nothing anywhere treats a run of identical running totals as a suspected
     duplicate read. QA hand-counts the zeros in fixture sheet 1 against
     `fixtures/sheets/GROUND-TRUTH.md` — including the column that holds the same value for five
     consecutive hands — and matches the count on screen.

**The five records the board gains**

228. **Best game ever** — the **lowest** `final_score` ever posted by anyone in any game. The card
     states the record title, the holder, the score, and **the date of that game**. ⚠️ **Joint
     holders are every (player, game) pair at that score**, listed alphabetically by player; where
     one player posted it in two different games, each instance is listed with its own date.
229. **Worst game ever** — the **highest** `final_score` ever posted, same shape, same tie rule.
     ⚠️ **Rendered exactly like every other record: no commiseration, no joke in the copy, no
     `warn` treatment.** It is a record, not a problem being flagged.
230. **The catastrophe** — the **highest single `round_score.score`** across every player, game and
     hand in the archive. The card names **the player, the score, the hand (3s … Kings) and the
     date**. Joint holders are **every (player, game, hand) triple** at that value, all listed; the
     same player appearing twice is listed twice, each with its own hand and date.
231. **Cleanest sheet** — the **most zero-point hands one player scored in one game**, out of
     eleven. The card names the player, the count, and the date. ⚠️ **It is not a career total**
     (decision 18). Joint holders are every (player, game) pair at that count. QA seeds a game in
     which a player scores nine zeros and confirms the record reads "9" and not "9 of 11 across 3
     games" or any career figure.
232. **Biggest hammering** — the **largest winning margin in any one game**, where the margin is
     **criterion 215's**: the second-place score minus the winning score, with second place being
     **criterion 214's** second-lowest distinct final score. ⚠️ **This criterion defines nothing.**
     It calls Stage 2's function, and QA fails the build on a second implementation of second place
     or of the margin anywhere in the codebase. The card names **the winner or winners, the margin,
     and the date**. ⚠️ **A game with no second place cannot hold it** and does not appear in its
     drill-through. Two games tied on the margin are joint holders, each listed with its own
     winner(s) and date. QA constructs a game with a **shared win** and confirms the margin is
     measured **to the next distinct score, not to the co-winner** (which would read as 0), and a
     game where **every player finished level** and confirms it contributes **nothing** rather than
     a margin of zero — criterion 214's own third case, read from this side.
233. ⚠️ **A single-event record states the game's date, not a game count.** Criteria 228–232 each
     render **the date of the game their number came from** where criterion 182 puts "from {n}
     games", because the number is one observation and the holder's own history is not its sample
     (decision 17). QA finds **no "from {n} games" anywhere on these five cards**, and finds a date
     on every one of them. The board's archive statement and the early-days line are unchanged and
     still appear once at the top.
234. **Each of the five drills through** to exactly the games its number came from, newest first,
     in the games list's own row format, under a heading stating the claim — criterion 186's
     pattern, unchanged. Each row is annotated with **that instance's own number** (the score, the
     count, the margin, the single-hand score with its hand). ⚠️ **A one-row list is correct and is
     not padded, decorated, or replaced by a redirect straight to the game** (decision 24).
235. **The board carries twelve cards after this stage and still works at 375px.** Stage 1 left five,
     Stage 2 made it seven (criterion 218), and these five make twelve. QA loads the board at 375px
     and 1280px with all twelve present: no horizontal overflow, one column on a phone, and the
     order **matching the fixed order documented in `docs/DESIGN-SYSTEM.md`** — not source order, not
     alphabetical, not "newest stage last". ⚠️ **Legibility at twelve records is a founder review
     point, not a QA pass** (open question 12, informed by criterion 218's finding at seven).

**The catalogue index**

236. **`/stats` exists and is the catalogue index.** It is reachable **in one tap from the board**
     and from the games list; an unauthenticated request 307s to `/login` with **no fragment of the
     record in the response**, exactly as M1 criterion 1 requires of every other screen.
237. **The eleven-hand trend** renders eleven values, labelled **3s through Kings**, each being the
     mean points scored in that hand across every player in every game, to one decimal. ⚠️ **Every
     value is printed as a number**, not only drawn — the bars are an aid to reading eleven numbers,
     never the only representation of them. The section states its sample once: the games, the
     players and the hand-scores behind it. ⚠️ **No copy on this section claims where games are
     decided, and there is no line, curve, fit, trend arrow or projection** (decision 21).
238. ⚠️ **The trend carries one fixed honesty line**, verbatim from the design system: per-hand
     scores are **derived from the running totals**, and one misread total moves the two hands
     either side of it in opposite directions. It states what the numbers are made of; **it does
     not claim they have been checked**, and it may not acquire a reassuring second sentence —
     criterion 192 covers it like everything else.
239. **Hand-by-hand villains** render as every player against the eleven hands, each cell a mean to
     one decimal, **each player's own worst hand marked**, and each player's row stating the number
     of games it averages. ⚠️ **The marker is not colour alone** (criterion 247). A player with one
     game appears, with "from 1 game" — **no floor, nobody set aside** (the 2026-09-14 decision, and
     Stage 2's criterion 200 on the same point).
240. **Biggest single-hand disasters** lists the **ten** biggest single-hand scores in the archive
     (`SINGLE_HAND_DISASTERS = 10`, a named constant), each naming the player, the score, the hand
     and the date, each row reaching that game. ⚠️ **Ties at the last place are all shown** — the
     list runs to eleven or twelve rows rather than cutting a tied score — and an archive with
     fewer than ten hands in it shows what exists rather than padding to ten.
241. ⚠️ **Amended 2026-09-15 — the catalogue and the board cannot disagree, but `/stats` does not
     re-render the card.** `getStatsPage()` computes best game ever and worst game ever from the
     **exact same function** the board uses (`bestGameEver`/`worstGameEver`), so the two numbers can
     never drift apart — QA's proof is that one function has one caller path, not a side-by-side
     screen read. `/stats` deliberately does **not** show a second copy of either card: the board
     already shows it, and a catalogue that repeats the board's own cards back to itself is the
     "records board and analytics catalogue are two different screens" line this project has held
     since Milestone 3 was sketched, not a new one. *(Original wording said QA "reads the two
     screens side by side" — written before the no-duplication call was made explicit; the intent,
     one shared function and no drift, was always what mattered and is unchanged.)*
242. **The averages table** lists **every player's average final score** (one decimal, with its game
     count) and **every roster's table average** (criterion 224, with its games and scores). ⚠️ **No
     ranking decoration** — no crown, no medal, no 1st/2nd/3rd, matching `RecordCard`'s precedent:
     these are facts listed together, not a podium.

**Player and roster pages**

243. **A player page gains three things**: their **average final score** with its game count, their
     **eleven-hand profile** with their worst hand marked (criterion 226), and their **best and
     worst game** — score, date, and a link to each. ⚠️ **M2's criterion 133 numbers do not move,
     change meaning or change position** (criterion 207 already requires this of Stage 2), and
     ⚠️ **Stage 2's head-to-head, by-roster and longest-streak sections are equally untouched** —
     the new sections are added around all of them.
244. **A roster page gains two things**: the **roster's table average** (criterion 224) and **each
     member's average within this roster only**. M2 criterion 138's per-member wins and win rates are
     untouched (Stage 2 did not touch this page either). QA re-runs M2 criterion 139's containment
     check — the same four people plus a fifth is a different roster, and **neither roster's averages
     move the other's**.
245. ⚠️ **No floor anywhere in this stage**, continuing criterion 200. A player or roster with **one
     game** shows every number in 243 and 244 with "1 game" beside it, and appears in the villains
     table and the averages table. QA seeds a one-game player and finds them present on every screen
     this stage adds, with the sample stated and **no sentence anywhere counting anyone as set
     aside** — there are none.

**Continuing rules, re-run rather than restated**

246. ⚠️ **Stage 1's rules govern every screen this stage adds, and QA re-runs each of them here**:
     **181** (all joint holders listed, never "and N others"), **182** (every number states its
     sample, as narrowed by 233 for the five single-event records), **185** (a record with no holder
     says so rather than vanishing), **186** (every record is checkable by tapping it), **189**
     (nothing cached — QA deletes a game **and** merges two players, reloads, and finds every new
     record, the trend, the villains table and both averages tables have moved), **192** (the
     wording ban, including *safe*, *protected* and *self-cancelling*, read across every new string
     on the board, `/stats`, the player page, the roster page and all five drill-throughs), **193**
     (the five new titles, their units, the no-holder sentence and criterion 238's honesty line
     rendered **verbatim** from the design system's Stage 3 fixed-strings table — a paraphrase is a
     fail), and **195** (**no schema change**: no table, no column, no migration, and
     `lib/db/migrations/` untouched).
247. **`npm run audit:a11y` covers `/stats` and every new section** at 375px and 1280px: no
     horizontal overflow, ≥44px targets, visible focus. ⚠️ **Colour is never the only signal** for a
     marked worst hand, a joint holder, a record card or a row in the disasters list, and **the
     eleven-hand trend has a text equivalent** — its numbers are readable without seeing the bars,
     by eye and by screen reader.
248. **The query count does not grow with the archive**, on `/stats`, the player page and the roster
     page. QA compares each screen's database queries at **10 games and at 60** and finds the same
     bounded number, with **no per-player, per-hand or per-game query in a loop** — eleven hands
     times six players is an aggregate, not sixty-six queries.
249. ⚠️ **Every number traces to a column the rest of the app already shows.** Each one on these
     screens comes from `game_player.final_score` or `round_score.score` — the same values the game
     view, the player page and the CSV download already use — so **no two screens in the product can
     disagree about a score**. QA picks one player, reads their average off the board, the player
     page and `/stats`, and hand-checks it against the game view's own final scores.

**27 criteria for Stage 3, numbered 223–249.** None is conditional. ⚠️ **The one to read hardest at
the checkpoint is 233** (a single-event record states a date, not a game count — the only narrowing
of criterion 182 anywhere in this milestone). **232 carries no definition of its own**: second place
and the margin are Stage 2's, at 214–215.

**Explicitly out of scope for Stage 3** *(each a decision, not an oversight)*

- **Any per-game chart.** The game view's grid already is the game (decision 22).
- **Medians, spreads, standard deviations, or "most consistent"** — M4, and a spread is a different
  claim from an average.
- **Any claim about where games are decided**, in copy or in a drawn trend line. The numbers are
  shown; the argument stays the founder's (decision 21).
- **Venue and date slices** — Stage 4, per open question 9.
- **Second place as a standing per-player record** — that is Stage 2's nearly man (criterion 216).
  Stage 3 uses second place only to measure one game's margin, and uses Stage 2's function to do it.
- **A career zero-count record** — decision 18, unless open question 11 comes back the other way.
- **Any second read, any new check on a final score, and any wording that implies one exists.** Open
  question 3 may add a *caveat*; it may not add a claim.

#### The stages

*Four PRs, each reviewed as it lands. The order is **the board first, then the catalogue in the
order that fills the board** — because the board is the landing screen, it is what the founder looks
at on a night nobody is uploading, and per decision 1 every later stage makes it fuller. Stage 1 is
the only one with a real dependency on nothing: the three stages after it each need its
sample-statement, early-days and drill-through machinery.*

---

**Stage 1 — The board, and the engine under it**

*Scope*: the definitions in `lib/scoring` (round winners, streaks, averages) with unit tests over the
fixture grids; the shared sample statement and the early-days line behind its one constant; the
records board screen with **the four records the founder named** plus the stalwart; the
drill-through from every record to the games behind it; `/` becoming the board. *(Scope amended
2026-09-14: "the shared withholding mechanism and its two constants" — there is no withholding and
one constant.)*

*Acceptance criteria*: **175–196**.

*What the founder sees*: **the app has a front page at last, with real names and real numbers on it
from the first game.** It opens on a board rather than a list — and with two games in the record
today, it says so in one line at the top and then shows the records anyway. ⚠️ **This is still the
stage to review hardest**: it is the screen everyone sees every time they open the app, and the
early-days line is the only thing standing between a two-game archive and a straight-faced claim.
If that line reads as either too loud or too quiet on a phone, this is the cheapest moment to say
so.

---

**Stage 2 — Rivalry** *(specced 2026-09-14 — criteria 197–222; the sketch it replaces is kept below)*

*Scope*: head-to-head records between any two players, as **a section on each player's page** rather
than a versus screen (who beats who, and by how much — kept as **two numbers**, games won and the
rate of finishing above, because in a group of five most games are won by neither of two named
people); **win rates per roster gathered on the player**, reading the same function as M2's roster
page rather than re-implementing it; **longest winning streak shown where the argument is**, reusing
Stage 1's streak function; and **nemesis** — the player who most reliably finishes above you, with
nobody crowned where nobody qualifies. Shared wins count for both players in every one of these, and
the screens do not hide win rates summing past 100%.

*The board gains*: **the drought** (longest run without a win — the streak machinery negated, and
**longest ever, not the current run**, criterion 212) and **the nearly man** (most second places).
⚠️ **Second place is now defined**, in criterion 214: the **second-lowest distinct final score**,
shared like a win is, so a shared win still has a second place behind it and a game where everyone
finished level has none. *(The sketch said this was "a team call to be written down when this stage
is specced, not guessed at now" — 214 is that call, and spec decision 13 records what was rejected.)*

*What the founder sees*: **the board stops being only good news**, and a player page starts
answering "how do I do against you" from either side. ⚠️ **Two things to review hardest**: the
board now carries **seven records** and the five-second read is the thing at risk (criterion 218),
and **nemesis is a stat about one named friend beating another** — its tone is open question 10.

*Why second*: it is the half of the catalogue the founder's own framing leads with, it needs nothing
but games and winners, and it reuses Stage 1's streak code rather than inventing a second one.

---

**Stage 3 — Distributions and villains** *(specced 2026-09-14 — criteria 223–249, in the Stage 3
criteria block above. Nothing built; Stage 2 still ships first.)*

*Scope*: average final score per player and per roster; **best and worst game ever**, named and
dated; how scores trend across the eleven hands; **which hand each player bleeds most on** (3s
through Kings); biggest single-hand disasters all-time; **`/stats`, the catalogue index** (decision
22). ⚠️ *The scope line used to read "where games are actually decided" — **the screens do not say
that**, because eleven averages do not establish it. The numbers are shown and the claim stays the
reader's (decision 21).*

*The board gains*: **best game ever**, **worst game ever**, **the catastrophe** (biggest single
hand), **cleanest sheet** (most zero-point hands **in one game** — a repeat in a column *is* a zero)
and **biggest hammering** (widest winner-to-runner-up margin, on **Stage 2's** second-place function,
criteria 214–215). ⚠️ **That takes the board from seven cards to twelve** — legibility at twelve is
open question 12.

*Acceptance criteria*: **223–249**.

⚠️ **This is the stage most exposed to a misread**, and its spec says so plainly: every number here
reads a score as a number rather than as a comparison, so a wrong cell is quotable forever. It is
also the stage open question 3 is really about, which is why 3 is now restated as **3a/3b**.

*What the founder sees*: **the board stops being only about winning**, and the archive starts
answering "how bad was that night, really". ⚠️ **Two things to review hardest**: the board at
**twelve records** on a phone (open question 12 — cutting one is deleting a row), and whether the
five single-event cards reading a **date** rather than "from {n} games" (criterion 233) is what you
expect to see.

*Why third*: it is the largest single block of new computation, and it wants Stage 1's
sample-statement and early-days machinery — and Stage 2's second-place function — to already be
boring.

---

**Stage 4 — Place, time, and the filters** *(sketch — full criteria written when the stage starts)*

*Scope*: win rates and average scores **by venue**; per-player performance by venue; **day-of-week
and time-of-year** slices, free from the date already stored; **location and roster as filters** on
the games list and across the analytics — shape per **open question 9**.

*The board gains*: **home advantage** — the biggest gap between a player's win rate at one venue and
everywhere else, **with the venue's own game count stated beside it** — the same sample rule as
every other record, since there is no withholding to obey *(amended 2026-09-14)*. ⚠️ **This is the
thirteenth card**, and the one open question 12 is really counting towards.

*Then, closing the milestone*: the wording audit, the a11y pass extended to every new screen, CI with
real unit tests over the new definitions, the permanent secret-free check and a confirmation that the
AWS footprint did not grow — M2's 167–171, restated with M3 numbers. ⚠️ **No separate stage**: M3 is
already live, and each stage deploys as it merges.

*Why last*: it is the only part of the catalogue with a real unanswered product question in front of
it, and the only board record that needs another screen's numbers to exist first.

#### Explicitly out of scope for Milestone 3

*Restated so nobody widens it mid-build. Each is a decision, not an oversight.*

- **The personality stats** — "the player who looks like they are cheating", "the player getting
  absolutely wrecked", most clutch comeback, most consistent. **Milestone 4**, per the milestone
  list, pending open question 8. ⚠️ Their wording is the founder's, not the team's, whenever they
  are built.
- **Any new dimension.** M3 captures nothing. The dimension set is closed at the founder's word, and
  a report invented later is retroactive anyway — that is the whole bargain.
- **Any summary table, cached total, materialised view or scheduled recompute.** Decision 3 above,
  and the 2026-09-10 database ADR before it.
- **Time windows on the board** — no "this year", no season toggle, no form guide. ⚠️ *"One screen.
  All-time."* If a year view is ever wanted it is a founder decision and a new screen, not a filter
  bolted onto the honours board.
- **Exporting, printing or sharing a record or a stat.** v2, unchanged.
- **Any stat that can be edited, pinned, annotated or overridden.** A record is a consequence of the
  archive, not a thing anyone sets.
- **Predictions, ratings, Elo, handicaps, or anything that models skill** rather than counting what
  happened. The app does not know the rules of Five Crowns and does not acquire opinions in M3.
- **Any second read for confirmation.** ⚠️ Still prohibited, not deferred. Errors repeat.
- **Player renaming.** Criterion 147 stays struck.

### Milestone 4 — Personality and polish

- "The player who looks like they are cheating", "the player getting absolutely wrecked", most
  clutch comeback, most consistent.
- Whatever the old sheets teach us once they're all entered.

### v2 and beyond (not now)

Exports, sharing outside the group, multiple groups, live scoring, anything that knows the rules.
