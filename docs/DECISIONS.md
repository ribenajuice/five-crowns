# Decision log (ADRs)

*Append-only. Newest first. Every significant technical or product decision gets an entry — this is how future sessions avoid relitigating settled questions.*

Format:

## YYYY-MM-DD — Short decision title
- **Context**: what forced a choice
- **Decision**: what we chose
- **Alternatives**: what we didn't, and why not
- **Consequences**: what this makes easier/harder; revisit-if condition

---

<!-- Entries go below this line -->

> **Currency.** The founder is in Australia: **costs are quoted in Australian dollars (A$)**.
> AWS, Anthropic and Turso all bill in **US dollars**, so entries dated before 2026-09-10 quote
> their USD list prices as published. Conversions in this log assume **US$1 ≈ A$1.55**; re-check
> the rate before relying on a figure. The running-cost ceiling is **A$30/month** (originally
> written as US$20).

## 2026-09-15 — Milestone 3 Stage 4: open question 9 answered at the founder's checkpoint

- **Context**: Stage 4's spec (criteria 250–280) un-parked open question 9 — the one open question
  in Milestone 3 that changes what gets built rather than how it reads: whether venue numbers (home
  advantage, average score at a place, etc.) get a dedicated page per venue, a filter on the games
  list, or both. The spec was written to its stated default, (c), but flagged for a checkpoint
  before the branch opened, since a per-venue page is a new page type (its own empty state, 404,
  navigation) and not something to build on an assumed answer.
- **Decision**: the founder confirmed **(c) — both a venue page and a filter**. Criteria 260 and 261
  (the venue page at `/places/{id}` and its per-player table) are built as specced; nothing is
  struck.
- **Alternatives**: (a), a filter only, was the cheaper option (no new page type, two criteria
  struck) but not chosen. (b), a venue page with no filter shortcut, was on the table as a third
  shape but not recommended, since the filter costs a query string on a list that already exists.
- **Consequences**: no criteria change from what was already specced — Stage 4 builds exactly as
  written. This entry exists purely to record that the founder was actually asked rather than the
  team assuming the default silently, the same discipline Stage 3's two checkpoint questions
  followed.

## 2026-09-15 — Milestone 3 Stage 3: `/stats` doesn't re-render a card the board already shows

- **Context**: QA found that criterion 241, as originally worded, required best game ever and worst
  game ever to visibly "appear on `/stats` as well as on the board," verified by reading both
  screens side by side. `docs/DESIGN-SYSTEM.md`'s own `/stats` mockup had already decided
  otherwise — the catalogue reads the two numbers from `getStatsPage()`, which shares
  `bestGameEver()`/`worstGameEver()` with the board, but deliberately does not render a second copy
  of either card — and that decision was never recorded here, so the written criterion and the
  shipped screen quietly disagreed with no ADR reconciling them.
- **Decision**: the design system's call stands, and criterion 241 is amended to match it. `/stats`
  computes both numbers from the same function as the board (so they can never drift apart) but does
  not repeat either card visually — the board already shows it, and the whole reason this project
  keeps the board and the catalogue as separate screens (Milestone 3's original sketch) is that one
  answers before you ask and the other is where you go with a question, not two places showing the
  same answer twice.
- **Alternatives**: adding the two cards to `/stats` as well was the literal reading of the original
  criterion, and would have satisfied it without any wording change — rejected only because it adds
  visual duplication for no informational gain; a founder glancing at `/stats` who wants to know the
  best/worst game already knows to look at the board first, since it's the landing screen.
- **Consequences**: no code change — this is a docs-only reconciliation. The house rule that a
  criterion is checked by QA as literally written held exactly as it should: it caught a real,
  silent drift between two documents, which is what surfaced this decision needed to exist. The
  general lesson, restated for future stages: a mockup that changes what a written criterion
  requires needs a decision entry the same day, not a criterion that quietly stops matching what
  shipped.

## 2026-09-14 — Milestone 3 Stage 3: both open questions answered at the founder's checkpoint

- **Context**: Stage 3's spec (criteria 223–249) opened two founder questions before the build
  checkpoint: 3a, whether the five records that read a final score as a number (best/worst game
  ever, biggest hammering, the catastrophe, and every average) should carry any caveat about the
  known final-row misread risk beyond their sample statement; and 11, whether "cleanest sheet"
  (most zero-point hands) should be a single-game record or a career total.
- **Decision**: both answered as the stated defaults, put to the founder directly before the branch
  opened rather than assumed. **3a: no** — nothing beyond the existing sample statement (each record
  states the date of its game, per criterion 233, and one tap reaches the photo). No fixed caveat
  line added anywhere. **11: one game**, not a career count — cleanest sheet stays "the most zeros
  one player scored in one game" (criterion 231).
- **Alternatives**: 3a's alternative, one fixed line once on the board or `/stats` naming the
  final-row risk, was on the table but not recommended — a caveat per record is the exact failure
  the early-days line (question 6) was designed to avoid repeating. 11's alternative, a career count
  of zero-point hands, would have been a different and equally real record (the person who most
  often goes out clean), rejected only because "most games played" (the stalwart) already measures
  turning up and a career zero-count climbs forever with nothing to compare it against.
- **Consequences**: no code or criterion changes — both decisions matched what was already specced
  as the default, so this entry exists purely to record that the founder was actually asked rather
  than the team assuming silently. Stage 3 build proceeds exactly as specced.

## 2026-09-14 — Milestone 3 Stage 4: home advantage keeps no floor, and a game with no venue is shown rather than dropped

- **Context**: Stage 4 (place, time and the filters) was specced immediately after Stage 3 on the same
  day, before any of Stages 2–4 starts, completing Milestone 3 at criterion level. PRD criteria
  **250–280**, including the **milestone-closing audits at 275–280**. Almost nothing in this stage is
  a new definition — a venue slice is Stage 1's and Stage 3's aggregates handed a different set of
  games — which left exactly three things to reason about, plus one founder question that had been
  parked since the milestone opened. **First, home advantage.** The PRD's own sketch said it "needs
  enough games at that venue to mean anything", written when the board still withheld; the founder
  deleted every floor project-wide on the same day (open question 6). **Second, a game with no
  location.** Criterion 188 says every game counts towards every number and names an unlocated game
  as counting alike — a sentence that cannot hold for a number scoped to a place. **Third, what the
  day-of-week and time-of-year slices actually render as**, given the PRD frames them as "already
  bought and paid for" rather than a visualisation investment. **Fourth, open question 9** — what
  "location as a filter" means on screen — which is the only question in this milestone whose answer
  changes what gets built.
- **Decision**:
  1. ⚠️ **Home advantage carries no minimum-games floor, and it is not an exception to the
     project-wide deletion of floors.** Stage 2 faced the identical temptation and refused it ("a
     minimum number of shared games before a nemesis is named — rejected as a re-introduction of the
     withholding the founder deleted"), and the same answer holds. **Three definitional guards stand
     in place of a floor**, none of them a sample threshold: a player with **no other known venue**
     has no gap and contributes no pair; a gap of **zero or less** never holds the title at any
     sample size (criterion 199's zero-rate rule, same problem); and **both sides of the comparison
     are printed with their own samples** — "won 4 of 6 there, 2 of 14 elsewhere" — so the record
     cannot be read without its sample. ⚠️ **Stated plainly rather than buried**: in a small archive a
     one-game venue will usually *win* this record, because 100% beats any real pattern. That is a
     true statement about a small archive and is rendered as one, exactly as *most wins in a row —
     Sam, 1* is (PRD 184). **PRD 253–254.**
  2. ⚠️ **A game with no location belongs to no venue, and criterion 188 is narrowed exactly once,
     here.** The narrowing is **made visible rather than footnoted**: every by-venue table carries a
     final **"No location"** row using M1's own existing label, so the rows still sum to the games
     actually played. That row is **not a venue** — no home advantage, no venue page, not in the
     places index. The containment invariant (by-venue rows + "No location" row = games played,
     PRD 258) is what makes the narrowing provable rather than assertable. Same shape as PRD 233's
     narrowing of 182, and **the only other one in the milestone**. **PRD 251.**
  3. **"Elsewhere" means other *known* venues, not "every other game".** A game whose venue nobody
     remembers is not evidence about any venue, including the one it is being compared against.
     **PRD 253.**
  4. **The time slices are two plain tables that claim nothing.** Seven fixed rows Monday–Sunday and
     twelve fixed rows January–December, each with games and the mean score posted, each empty row
     shown as a zero rather than omitted. **No best-day marker, no ordering by score, no line, no
     copy saying where or when anyone plays best** — decision 21's rule for the eleven-hand trend,
     applied to the same kind of number. **Months, not seasons**: the founder is in Australia, so a
     season label is wrong for half the archive. **No per-player cross-tab** — six players by twelve
     months is 72 cells on a 375px screen, and "already bought and paid for" is a statement about
     cost, not a licence to build a matrix. **PRD 265–267.**
  5. ⚠️ **The weekday and month are derived from the stored `YYYY-MM-DD` with no timezone
     conversion**, never by constructing a timestamp whose UTC-versus-local reading can move a
     Saturday game to Friday. QA-executable: the same game reads as Sunday with the browser in UTC,
     Australia/Adelaide and America/Los_Angeles. **PRD 255.**
  6. **Per-player-by-venue lives on both the player page and the venue page, from one shared
     function**, exactly as Stage 2 did per-roster win rates (decision 15, PRD 208–209), with a
     criterion asserting the two sides agree to the decimal place. Neither is the "real" one.
     **PRD 256–257.**
  7. ⚠️ **Open question 9 is specced to its stated default (c) and the cut line is named rather than
     implied.** If the founder answers **(a), a filter only**, **PRD 260 and 261 are struck in place**
     like 147 and never renumbered, the venue-level numbers move to a places section on `/stats`, and
     **nothing else in the stage changes**. Raised at the checkpoint rather than assumed silently,
     because it is the only answer in this milestone that costs a **screen** rather than a sentence.
  8. **"Location as a filter across the analytics" *is* the venue page and the by-venue sections.**
     No global venue selector on `/stats` or on the board: it would multiply every number in the
     milestone by every venue, need a sample statement per cell, and put the board's "One screen.
     All-time." promise in tension with itself. The filter is on the **games list**, where a filter is
     a list of games; the analytics are sliced by having a page per place. **PRD 262–264.**
  9. **The milestone-closing audits are real criteria, not a checklist item.** M2's 167–171 land as
     **PRD 275–279**, plus **280** for the two promises no single stage can prove: `lib/db/migrations/`
     untouched across all four stages, and a delete-and-merge sweep proving **every** number in the
     milestone moves — all thirteen board records, every section of the player, roster and venue
     pages, the places index and every table on `/stats`. ⚠️ **Playwright moving into PR CI lands here
     too** (decision 10's own revisit-if) and deliberately **carries no product criterion**.
- **Alternatives**:
  - *A minimum games-at-venue floor for home advantage* — the PRD's own original sketch, and
    **rejected**: it reintroduces under a new name the withholding the founder deleted the same day,
    and Stage 2 already rejected the identical move for the nemesis. The argument for it is real
    (a one-game venue usually wins the record) and is answered by printing both samples, not by
    hiding the holder. **Revisit-if is recorded below.**
  - *Fold unlocated games into "elsewhere"* — rejected: it would let games with no known venue decide
    a comparison between two venues, which is the opposite of what the record claims to measure.
  - *Drop unlocated games silently from the by-venue tables* — rejected: the rows would then not sum
    to games played and nothing on screen would say why. The "No location" row costs one row and
    makes the gap visible and testable.
  - *A second board record for the venue a player is reliably terrible at* — rejected: the by-venue
    table already shows it, and the board is at thirteen with open question 12 live.
  - *Seasons, quarters or a holiday flag for the time-of-year slice* — rejected: hemisphere-dependent,
    argued-about definitions for a slice whose entire appeal is that it needed no new capture.
    Christmas is a December row.
  - *A per-player day-of-week or month cross-tab* — rejected on proportionality, not cost, and it is
    retroactive whenever the founder does ask for it.
  - *A global venue filter on `/stats` and the board* — rejected, see decision 8.
  - *Marking the best day or worst month* — rejected: a max marker on a table of dates invites a
    causal read the numbers do not support, unlike criterion 239's worst-hand marker, which marks a
    fact about one player's own row.
- **Consequences**:
  - **31 criteria, PRD 250–280**, of which **six close the milestone** and **two (260, 261) are
    conditional on open question 9**. ⚠️ **Milestone 3 is now fully specced at criterion level and
    nothing after 280 is reserved.** **No schema change, nothing cached, nothing captured** — like all
    three stages before it.
  - ⚠️ **This is the stage that spends what Milestone 1 banked.** `location_id` and `played_on` were
    captured in M1 explicitly so this stage would be possible; day-of-week and time-of-year need no
    new field and apply to the first saved game retroactively. It is the clearest evidence the
    "capture dimensions early, build reports whenever" principle earned its keep.
  - **The board reaches thirteen records**, which is the count open question 12 was really about,
    informed by criterion 218's finding at seven and 235's at twelve. Cutting a card stays the
    founder's call and costs one deletion.
  - **Criterion 188 now has exactly one named narrowing** (251, venue-scoped numbers) alongside 233's
    (single-event records). Criterion 271 requires QA to confirm the narrowing reaches no other
    number: the archive count, the time tables and every Stage 1–3 record still include unlocated
    games.
  - **Revisit if**: a home advantage held on a one-game venue is actually quoted at the table as
    though it were a pattern — that is the evidence a floor would have needed and has never had, and
    it is the same revisit-if the 2026-09-14 withholding ADR set for the board as a whole; or the
    founder answers open question 9 as (a), in which case 260 and 261 are struck and the venue
    numbers move to `/stats`; or a clock time is ever captured on a game, which would make a
    time-of-day slice possible and is a capture change, not a report.

## 2026-09-14 — Milestone 3 Stage 3: a single-event record states a date, and the trend claims nothing

- **Context**: Stage 3 (distributions and villains) was specced immediately after Stage 2 on the same
  day, before either stage starts. PRD criteria **223–249**. ⚠️ **It deliberately decides nothing
  about second place or the winning margin** — Stage 2's entry, immediately below, settled both
  (PRD 214–215) and Stage 3's *biggest hammering* (PRD 232) calls that function. *(An earlier draft
  of this entry was written without sight of Stage 2's spec and re-derived second place from
  scratch; the two derivations agreed in substance, and the duplicate was collapsed into Stage 2's
  entry rather than kept. That is why this entry starts at the next question.)* What is left is a
  family of presentation-shaped calls that change what a record **means**, not how it is built, plus
  one genuinely new definition (a roster's table average).
- **Decision**:
  1. ⚠️ **A single-event record states the game's date, not a game count.** Best game ever, worst
     game ever, the catastrophe, cleanest sheet and biggest hammering are **one observation each**,
     so criterion 182's *"from {n} games"* would be a **false sample statement** on them — the
     holder's own history is not the sample. They state the date instead (PRD 233). The board's
     archive line and early-days line are untouched. This is a **narrowing of 182, not a second
     honesty system**; nothing else about the sample statement changes.
  2. **Cleanest sheet counts one player's zeros in one game**, out of eleven — not a career total.
     A career total mostly measures turning up, which the stalwart already measures, and it drifts
     upward forever with nothing to compare against. Raised to the founder as **PRD open question
     11** with this as the default (PRD 231).
  3. **Per-hand bleed is a mean, not a total.** For one player the two rank **identically** (every
     player plays all eleven hands in every game), so the choice is free on correctness grounds and
     was made on comparability: a mean compares across players and stays stable as the archive grows
     (PRD 225–226).
  4. **A roster's table average is a new definition** — the mean of **every final score posted in
     that roster's games by any member**, a fact about the table rather than about a person. M2
     criterion 138 gives per-member wins and win rates and **no average at all**, so the per-member
     average is new to the screen but not a new definition (PRD 224, 244).
  5. ⚠️ **The eleven-hand trend is eleven labelled numbers drawn as bars.** No line, no smoothing,
     no curve fit, no trend arrow, and **no copy claiming where games are decided** — a smooth line
     over eleven aggregates of *derived* scores implies a precision this data does not have. The
     screen shows the numbers; the reader makes the claim (PRD 237). It carries one fixed honesty
     line about the derivation, which may not acquire a reassuring second sentence (PRD 238).
  6. **The catalogue index is `/stats`**, for the slices that belong to nobody in particular; player-
     shaped numbers stay on player pages and roster-shaped numbers on roster pages (spec decision 8).
     ⚠️ **No per-game chart**: the game view's grid already is the game (PRD 236).
  7. **The drill-through pattern does not fork.** A single-event record lands on a filtered games
     list under a heading stating the claim, **even when that list has one row** — one pattern across
     twelve records beats a special case, and the row is the ordinary `GameRow` whose link reaches
     the photo, which is the whole mitigation (PRD 234).
  8. ⚠️ **The board reaches twelve records** (five from Stage 1, seven after Stage 2, twelve after
     this). Whether that is still readable in five seconds is **PRD open question 12** — question 7's
     legibility warning arriving for real, and informed by criterion 218's finding at seven.
- **Alternatives**:
  - *Give the five single-event records the ordinary "from {n} games" statement* — rejected: the
    holder's 40 games say nothing about a number drawn from one night, so the sentence would be
    confidently false in the one place this milestone most needs it true.
  - *Cleanest sheet as a career count* — not rejected, **deferred to the founder** (open question 11).
    It is a real and different record; it is one line of SQL either way; it changes only meaning.
  - *Per-hand bleed as a total* — rejected on comparability only. It ranks identically per player, so
    nothing is lost and the mean survives the archive growing.
  - *A drawn trend line, or copy naming where games are decided* — rejected: eleven averages of
    derived scores do not establish it, and the PRD's own banter-not-dashboard tone is not a licence
    to assert something the numbers do not show.
  - *A per-game chart on the game view* — rejected as decoration; the grid already shows every hand.
  - *Redirect a one-row drill-through straight to the game* — rejected: it forks the pattern for a
    saving of one tap, and the list heading is what states the claim being checked.
- **Consequences**:
  - **27 criteria, PRD 223–249.** Stage 4 continues from 250. **No schema change, nothing cached,
    nothing captured** — like Stages 1 and 2, definitions over rows already stored.
  - ⚠️ **Stage 3 is the milestone's most exposed stage**: every record it adds reads a final score
    **as a number**, which the 2026-09-14 "Row 11 is not self-cancelling" entry found can be misread
    confidently and permanently. The mitigation is unchanged and is **not a check** — each record
    names its game and one tap reaches the photo — and **PRD open question 3 is restated as 3a/3b**
    so the founder can decide whether these records say anything more than that.
  - **Nothing here invents a new honesty mechanism.** The sample statement, early-days line, joint
    holders, fixed-strings contract, no-cache rule and wording ban all continue; PRD 246 is a re-run
    over new surfaces.
  - **Revisit if**: the founder answers open question 11 the other way (cleanest sheet becomes a
    career count, PRD 231 rewritten in place), or the board at twelve records fails the five-second
    read on a phone (open question 12 — cutting a card is deleting a row, not a re-plan).

## 2026-09-14 — Milestone 3 Stage 2: second place, "beating" someone, and the drought, where ties are shared

- **Context**: Stage 2 (rivalry) was specced while Stage 1 was still in build, and its own sketch had
  flagged one hole explicitly — *"second place needs a definition where wins are shared, and that is
  a team call to be written down when this stage is specced, not guessed at now."* Three further
  definitional traps turned up alongside it, all of the same family as M3 Stage 1's round-winner and
  streak definitions: **what "beating" someone means** when most games in a group of five are won by
  neither of two named players; **whether the drought is the current run or the longest ever**; and
  **how nemesis behaves when nobody has ever finished above you**. None of them needs data; all of
  them are permanent once the archive starts quoting them. PRD criteria **197–222**.
- **Decision**:
  1. ⚠️ **Second place is the second-lowest *distinct* final score, and it can be shared.** Winners
     hold the lowest distinct score; everyone on the next distinct score up is second. So a shared
     win still has a second place behind it, two players level on the second score are **both**
     second, and a game where everyone finished level has **no** second place at all. Stage 3's
     *biggest hammering* is bound to the same function, so the two cannot drift (PRD 214–215).
  2. ⚠️ **"Who beats who" is kept as two numbers, not reconciled into one.** **Head-to-head wins**
     count games actually won (lowest total, ties shared) among games both players were in; **the
     above-rate** counts games one player's final score was *strictly lower* than the other's,
     whoever won the night. Equal scores are neither above nor below and count in the denominator
     only. **Nemesis is built on the above-rate alone** — a win-count head-to-head is mostly zeros in
     a group of five and says nothing until the archive is years old (PRD 197–199).
  3. **An above-rate of zero never holds the nemesis title**, at any sample size; where no opponent
     qualifies the screen says so and crowns nobody. Ties are **joint holders, alphabetically**, with
     **no secondary tie-break on games played** — consistent with criterion 181 and with this
     project's refusal to manufacture single winners. Nemesis is **asymmetric** and nothing
     reconciles that (PRD 199, 201).
  4. **The drought is the streak rule negated, including "longest ever recorded, not the current
     run"** — same order, same "a game they missed neither extends nor breaks it", same "a shared win
     counts as a win". Written as its own criterion rather than inherited, because negating a streak
     is where a second implementation drifts (PRD 212).
  5. **Head-to-head rides on the player page**: one section, one row per opponent, readable from
     either side. **No `/vs/` route, no picker, no matrix.** The group is about six people.
  6. **Per-roster win rates are gathered, not rebuilt.** M2 criterion 138 (roster page, per member)
     is untouched; the player page gains the same numbers from the person's side, from **one shared
     function**, with a criterion asserting the two screens agree to the decimal place (PRD 208–209).
  7. **Nemesis is never a board record** — every player has a different one. The board gains exactly
     two rows this stage: the drought and the nearly man, taking it to **seven records**.
  8. ⚠️ **One wording rule specific to this stage**: nothing on a rivalry screen characterises a
     player, only their numbers — the test being that every string must be printable **with both
     named players reading it over one shoulder each** (PRD 202). The word *nemesis* is the
     founder's own, from the analytics catalogue; the team may not build tone around it. Whether the
     founder wants that tone dialled up, retitled or the stat cut is **PRD open question 10**, raised
     rather than guessed for the same reason the personality stats' wording was left to them.
- **Alternatives**:
  - *Competition ranking for second place* (a two-way tie for first makes the next player **third**,
    and nobody is second) — **rejected**: it erases second place in exactly the games where the near
    miss stings most, and it contradicts how this product ranks everywhere else (distinct score
    positions, ties shared, from the kickoff decision onward). It would also make *the nearly man*
    quietly under-count in precisely the archive the founder has — small, with shared wins in it.
  - *One "beats" number instead of two* — rejected both ways round. Win-count only is mostly zeros
    and leaves nemesis unanswerable for years; above-rate only silently redefines "beat" as "finished
    ahead of", which is not what the group means when they say it at the table. Both are cheap; the
    honest move is to show both and label them.
  - *A minimum number of shared games before a nemesis is named* — rejected as a re-introduction of
    the withholding the founder deleted on the same day (open question 6). The sample statement does
    the work: "in 1 game together" is self-evidently thin.
  - *A secondary tie-break on games played* — rejected: criterion 181's joint-holder rule exists so
    the product never invents a winner, and a rivalry stat is the last place to start.
  - *The drought as the current run* — rejected for consistency with criterion 177 (and because a
    "current run" of losses is the seed of M4's "the player getting absolutely wrecked", whose
    wording is the founder's).
  - *A dedicated head-to-head screen* — rejected as a new page type, a new empty state and a new way
    in, for numbers that fit on a page that already exists.
- **Consequences**:
  - **26 criteria, PRD 197–222.** Stage 3 took 223–249 later the same day; Stage 4 continues from
    250. **No schema change, nothing cached, nothing captured** — this stage, like Stage 1, is
    definitions over rows already stored.
  - **Stage 3 inherits a binding**: *biggest hammering* must use Stage 2's second-place function, and
    a game with no second place cannot hold that record. ⚠️ *Confirmed when Stage 3 was specced:*
    **PRD criterion 232 calls this function and defines nothing** — second place and the winning
    margin are canonical **here and at PRD 214–215 only**, and a second implementation anywhere is a
    QA failure. This entry is the only ADR that reasons about them.
  - **The board reaches seven records**, which is where open question 7's legibility warning stops
    being hypothetical. QA reports how the board reads at 375px as a founder-facing finding, not a
    pass/fail; cutting a row stays the founder's call and costs one deletion.
  - **One case left live and named**: a merge of two players who have played each other is refused by
    M2 criterion 160, so a head-to-head row of a player against themselves is unreachable by
    construction. It is checked (PRD 220), not guarded against.
  - **Revisit if**: the group grows past the point where a five-row head-to-head section on a player
    page stops being the whole answer, or a game is ever played where "second place" as defined here
    reads wrong at the table — that is the evidence this entry would need to reopen.

## 2026-09-14 — The board shows records from game one: an early-days line replaces withholding

- **Context**: the PRD has said since kickoff that the records board **withholds** — nothing crowned
  under **10 games in the archive**, no player counted in a per-player record under **5 games of
  their own** — on the reasoning that *"a board over four games crowns someone on nonsense and does
  it with a straight face"*. The Milestone 3 stage-breakdown ADR (below) turned that into a shared
  module and raised it as **PRD open question 6**, because the record holds **two real games** and
  grows at about a sheet a week: kept as written, the landing screen would show no name and no
  number until about November. The team recommended **keeping 10 and 5** and explicitly pushed back
  on showing the board early, arguing that **a caveat nobody reads is not a defence**.
- **Decision** (founder, 2026-09-14, **overruling the team's recommendation**): **the board shows
  every record, with its holder and its number, from the first saved game.** Nothing is withheld and
  no player is set aside.
  1. **The 5-game per-player floor is deleted outright**, not lowered. A player on one game is
     eligible for every per-player record.
  2. **The 10-game constant survives as a caveat threshold, not a gate.** Under 10 games the board
     carries **one fixed line, once, at the top**: **"Early days — {n} games in the record. A single
     game can still change any of these."** At 10 it is absent, not reworded. Named constant
     `EARLY_DAYS_BELOW`.
  3. ⚠️ **The honesty burden moves onto the sample statement**, which every record carried anyway
     (PRD criterion 182): a per-player record now also states **the holder's own game count** —
     "lowest average score — Sam, 41.5, from 1 game". **This is the part that makes the founder's
     choice defensible rather than merely cheerful**, and it is why the statement is a shared
     component rather than each record's own business.
  4. **Degenerate values are shown plainly and not apologised for.** *Most wins in a row — Sam, 1* is
     a true statement over a two-game archive and is rendered as one: no per-record caveat, no
     suppression at any value. A second layer of hedging would be the caveat-nobody-reads problem
     twice.
  5. **A record with no holder still says so in its own row** (criterion 185) rather than vanishing —
     unchanged as a requirement, but now reachable only when nobody has done the thing, never by
     withholding.
  ⚠️ **The founder chose the shape; points 2–5 are the team's mechanics**, written to it.
  **The reason, stated plainly and not dressed up**: this board is the landing screen of a hobby app
  for one group of about six friends, and **the months when the archive is small are exactly the
  months the founder most wants something on it**. The PRD's hazard — crowning someone on nonsense
  with a straight face — assumes an audience that can be misled by it. The audience here is the
  people who played the two games and know it. A screen that answers "waiting for eight more games"
  is not a safeguard for them; it is two months of a landing screen with nothing on it, on a product
  whose stated purpose is *the reason to open the app on a night nobody is uploading a sheet*.
- **Alternatives**: (a) *Keep 10 and 5* — the team's recommendation, and it is recorded here as
  having lost on a judgement the founder was better placed to make than we were. Its argument is not
  wrong, only outweighed: a board over four games really does overstate, and the mitigation now is a
  line of text rather than an absence. (b) *Lower the board gate to 6 and keep the per-player 5* —
  the compromise, rejected with (a): it buys six weeks of delay and still leaves a threshold whose
  only visible effect is a screen that refuses to say anything. (c) *A caveat on every record rather
  than one on the board* — rejected: thirteen apologies on a screen whose whole requirement is to be
  readable in five seconds, and repetition is how a caveat stops being read. (d) *Keep a tiny floor
  — say 2 games — so a single-game player cannot hold a record* — rejected as the worst of both: it
  reintroduces the "set aside" sentence and the module that computes it, to exclude a case the
  founder explicitly asked to see, and "from 1 game" beside the number already says the same thing
  more honestly than hiding it would.
- **Consequences**:
  - ⚠️ **Supersedes point 2 of the Milestone 3 stage-breakdown ADR below.** The shared module no
    longer answers *"is the board eligible?"* or *"is this player eligible?"* — **there is nothing
    left to withhold.** It keeps the other half of that entry's reasoning intact and the module with
    it: the sample statement stays structural, because thirteen records asked to remember a rule will
    eventually include one that forgets. One constant remains where there were two.
  - **PRD criteria 183 and 184 are struck in place and rewritten; 182 and 185 are amended; no
    criterion number moved.** 179–181 and 186–191 are untouched. The early-days line and the
    no-holder sentence join the fixed-strings table (criterion 193) and sit **inside** the wording
    ban (criterion 192) — the line says a record can change, never that a small sample is fine.
  - **Also settled the same day**: **the stalwart is adopted** (open question 7), so PRD criterion
    196 is unconditional and the stage-breakdown ADR's "196 is conditional, struck-and-retired like
    147 if trimmed" no longer applies; and **the personality stats stay in Milestone 4** (open
    question 8), confirming the team's reading with nothing built either way. **Nothing in Milestone
    3 Stage 1 is waiting on the founder.**
  - **Less code, not more**: one threshold, one fixed line, no waiting-room state to build or test.
    QA gains a four-count sweep of the board (1, 2, 9, 10 games) and loses the withheld-board case.
  - ⚠️ **The case this leaves live, named so nobody is surprised by it**: past 10 games the
    early-days line is gone, but a player who joins the group later can hold a per-player record on
    one or two games of their own. **Criterion 182's holder count is the only thing saying so**, which
    is why it is a criterion and not a design preference.
  - **Revisit if**: a record held on a joke sample is actually quoted at the table as though it were
    not one — that is the evidence the team's argument needed and never had — or the archive grows
    past the point where the founder still wants the line at all (it is a constant; setting it to 0
    removes the line and changes nothing else).

## 2026-09-14 — Milestone 3: the board grows stage by stage, and withholding is one mechanism

- **Context**: Milestone 3 ("the records board and the analytics") existed only as a bullet sketch
  and needed a delivery spec. Two structural questions had to be settled before any criteria could
  be written. **First, what is a stage here?** M3 is a records board of up to thirteen records plus a
  catalogue of a dozen aggregates, and the obvious split — "build the board, then build the
  catalogue" — double-counts: nine of the thirteen records *are* a catalogue number with a title on
  it (best/worst game ever is the distributions; the catastrophe and cleanest sheet are the
  hand-by-hand pass; the drought is the streak code backwards; home advantage is the venue slice).
  **Second, where does the withholding live?** The PRD's rules (10 games before the board crowns
  anyone, 5 before a player is counted in a per-player record, every stat states its sample) apply to
  every record including ones not yet imagined, and a rule re-implemented per record is a rule some
  future record will forget.
- **Decision**: four stages, ordered **board first, then the catalogue in the order that fills the
  board**.
  1. ⚠️ **Each extra record ships in the stage that computes its number**, as one row on a screen
     that already exists — there is no "records board part 2". Stage 1 is the board plus the four
     records the founder named (most wins, most wins in a row, lowest average score, most rounds
     won); Stage 2 (rivalry) adds the drought and the nearly man; Stage 3 (distributions and
     villains) adds best/worst game ever, the catastrophe, cleanest sheet and biggest hammering;
     Stage 4 (place and time) adds home advantage. The board is visibly fuller after every stage and
     no number is computed in two places.
  2. ⚠️ **SUPERSEDED the same day by the entry above** — the founder answered open question 6 and
     there is no withholding left; the module keeps only the sample statement and one constant. The
     original, for the record: **withholding is a single shared module** answering two questions —
     *is the board eligible at all?* and *is this player eligible to hold a record?* — with the two
     thresholds as named constants. Every record is built through it, so a record cannot forget the rule because it never
     implements it. The **sample statement is a shared presentation component** for the same reason:
     "every stat states its sample" becomes structural rather than a review-time catch.
  3. **The definitions live in `lib/scoring`** beside `determineWinners` and the hand derivation, as
     pure unit-tested functions: round winner (lowest score in a hand, **ties shared, and shared is
     the common case**), streak (**consecutive games that player was in**, in the games list's own
     order — a game they missed neither extends nor breaks it; a shared win extends it; the record is
     the longest ever, not the current run), and average (mean of `game_player.final_score`, one
     decimal place). No analytics service layer.
  4. ⚠️ **Nothing is cached, precomputed or summarised**, re-affirming the 2026-09-10 database ADR.
     This is what makes an M2 delete, edit or merge show up on the board on the next page load with
     no invalidation logic to get wrong.
  5. ⚠️ **M3 adds no schema at all** — no table, no column, no migration, no backfill. Criterion 195
     makes that testable.
  6. **The catalogue attaches to pages that already exist** (player, roster, venue) plus one
     catalogue index for the slices that belong to nobody; **the board stays separate from the
     catalogue**, per the PRD — the board answers before you ask, the catalogue is where you go with
     a question. M2's three numbers on the player and roster pages do not move or change meaning, and
     the withholding rules still do not apply to them (M2 spec decision 6).
  7. **Playwright moves into PR CI during this milestone** — the 2026-09-13 ADR's own revisit-if was
     "when M3's analytics screens land". An engineering call folded into a stage, carrying no product
     criterion.
  ⚠️ **Four things were deliberately *not* decided here and are open questions 3, 6, 7 and 9 in
  `docs/PRD.md`**: whether the 10/5 thresholds still feel right now that the record holds two real
  games, which of the proposed extra records the founder actually wants (a board of thirteen is not
  readable in five seconds — the reason to trim is legibility, not cost), whether the final row
  should cost more than a glance now that averages and best/worst are built on it, and what "location
  as a filter" means on screen given M2 shipped a places index but no per-venue page. Each has a
  stated default so the build is not blocked; **open question 8** additionally asks the founder to
  confirm the team's reading that the personality stats stay in Milestone 4 (the PRD's catalogue
  section says "all of these are in v1" while its milestone list puts those four in M4 — the
  milestone list is being read as the plan of record).
  ✅ **Three of those five were answered by the founder the same day** — 6 in full (see the entry
  above), 8 in full (the personality stats stay in M4), and the only part of 7 Stage 1 needed (the
  stalwart is in). **3 and 9 remain open and still block nothing.**
- **Alternatives**:
  - *Two stages: the whole board, then the whole catalogue* — rejected as the double-count above.
    Building all thirteen records first means computing per-hand bleed, margins and venue splits
    inside the board's stage and then building the screens that show the same numbers in the next
    one.
  - *Catalogue first, board last* — defensible on dependency grounds (the board is mostly titles over
    catalogue numbers), and rejected on product grounds: the board is the landing screen and the
    reason to open the app on a night nobody is uploading, so it would be the last thing delivered
    despite being the first thing seen. The four named records need nothing the catalogue provides.
  - *Per-record withholding logic* — rejected: it is the same rule thirteen times, and the failure
    mode is silent (a record that crowns someone on four games, with a straight face, which is the
    exact hazard the PRD names).
  - *Precompute stats into summary tables for speed* — rejected again, for the reason the 2026-09-10
    ADR gave: it trades the retroactivity that makes this data model valuable for performance nobody
    needs at ~15,000 round rows.
  - *Fully specifying all four stages at criterion level now* — rejected as the same mistake M2
    avoided: Stages 2–4 will be written against screens that exist, and open questions 7 and 9
    change what two of them contain.
- **Consequences**:
  - Stage 1 carries **22 criteria, 175–196**, of which ~~**196 (the stalwart) is conditional on open
    question 7** and will be struck-and-retired like 147 rather than renumbered if the founder trims
    it~~ ⚠️ **— the founder said yes on 2026-09-14, so 196 is unconditional and nothing is struck.**
    Stages 2–4 number from 197.
  - ⚠️ **The exposed-number set from the row-11 ADR lands in this milestone.** Winners, most wins and
    head-to-head stay safe *by margin, not by construction*; **average score, best/worst game ever
    and biggest hammering read a final score as a number**, and a misread one is permanent and
    quotable. Criterion 192 bans *safe*, *protected* and *self-cancelling* from every screen here, on
    top of M1's existing banned set.
  - No AWS resource, no external service, no new running cost — M3 is queries and screens over data
    already stored.
  - **Revisit if**: the founder trims the extras hard enough that a stage loses its board payload
    (Stage 2 in particular would then be catalogue-only), or open question 9 comes back as "(a), a
    filter only", which shrinks Stage 4's screen work but not its numbers.

## 2026-09-14 — Milestone 2 Stage 3: player/roster/place pages must be reachable, not just addressable

- **Context**: at the Stage 3 build checkpoint, the existing spec (criteria 132–146, written
  2026-09-10) fully covers what the players, rosters and places pages show and how renaming works,
  but no criterion required any of them to be reachable by tapping through the app. Built literally,
  the three new page types would exist only at a URL nobody is ever shown — and Stage 4's player
  merge (criterion 155) is specified as reached "from a player page," which has nowhere to start
  from without this.
- **Decision**: **add criterion 174**, requiring a player's name on a game view to link to their
  player page, a roster's name on the games list and game view to link to its roster page, and all
  three index pages to be reachable from the games list. Put to the founder as a yes/no rather than
  decided by the team, since it is new scope, however small; approved the same day. Where exactly the
  links sit on screen is left to the ui-designer's mockup, not reopened as a product question.
- **Alternatives**: *leave it out of Stage 3 and add navigation later, once the pages exist to react
  to* — rejected: cheap to build alongside the pages themselves, and Stage 4's merge flow already
  assumes a player page exists to launch it from.
- **Consequences**: no schema or scope change beyond this one criterion; the design pass for Stage 3
  now includes deciding where these links live (game view, games list, and the three index pages).

## 2026-09-14 — In-panel password rotation: widen the web Lambda's SSM write grant to all seven app-owned parameters

- **Context**: Milestone 2 Stage 1 (PRD open question 5, criteria 87–96) builds group- and
  admin-password-change forms in the admin panel. Both routes write four SSM parameters —
  `group-password-hash`, `admin-password-hash`, `group-session-epoch`, `admin-session-epoch` — but
  the web Lambda's IAM role could write only three unrelated ones (`anthropic-api-key`,
  `anthropic-api-key-last4`, `anthropic-api-key-set-at`), narrowed on 2026-09-11 specifically so a
  bug in the internet-facing app could never overwrite either password hash (see that ADR below).
  As built, both routes would have gotten `AccessDeniedException` from SSM and surfaced as a plain
  500 in production — QA and security review independently found the same gap before the PR opened.
  Two ways forward, put to the founder rather than decided by the team (PR #21's description):
  widen the grant to the four new parameters, or drop in-panel rotation and keep both passwords
  changing only through the SSM runbook this same stage wrote for the forgotten-password case.
- **Decision**: **widen the grant.** `sst.config.ts`'s `writableAppParameterArns` is now simply
  `appParameterArns` — every parameter the app may read, it may now also write. The founder chose
  in-panel rotation actually working over keeping the narrower, 2026-09-11 write scope.
  ⚠️ **This supersedes the write-scope half of the 2026-09-11 least-privilege ADR.** That entry's
  read/write split is no longer accurate; this entry is the current state for that grant.
- **Alternatives**: *keep the narrower grant, drop in-panel rotation* — both passwords would still
  be changeable, only exclusively through the AWS-console runbook (criteria 97–101), never from the
  panel a non-technical admin actually uses day to day. Rejected: the founder judged the actual
  convenience of in-panel rotation worth re-accepting the risk, given the admin panel is already
  gated by its own password and already trusted with the API key.
- **Consequences**:
  - The exact escalation the 2026-09-11 narrowing existed to prevent is back: a future bug in this
    internet-facing Lambda (a deserialisation flaw, a compromised dependency) could now overwrite
    `admin-password-hash` or `group-password-hash`, not just the API key. Nothing else about the
    Lambda's blast radius changes — still no S3 delete, no KMS statement, no other IAM action.
  - Criteria 87–96 (the panel's password forms) now ship for real rather than being cut from Stage 1.
  - No new AWS resource and no change to running cost — this widens an existing grant's resource
    list, nothing else.
  - **Revisit-if**: a future security review wants defence in depth here (e.g. a second, harder gate
    in front of the password-change routes themselves, independent of IAM) — not proposed now,
    since the founder's own admin password already gates these routes.

## 2026-09-14 — Editing a saved game: an ordinary draft that carries its target, saved by a separate in-place transaction

- **Context**: Milestone 2 Stage 2, criteria **115–123** — the first code in this project that writes
  over history. Criterion 115 pins the mechanism harder than it looks: "Edit this game" must open
  **the same `/review/{draftId}` screen** an import opens, with the same photo-beside-numbers, the
  same live validation and the same save gate. Criterion 117 then requires the save to update the
  **same `game` row** (same id, no second game in the list), 118 allows the set of players to change,
  119 requires **every** round row replaced, 120 forbids ever replacing the sheet photo while still
  allowing column close-ups, 121 requires an abandoned edit to survive as a resumable draft, and 122
  requires a save over a meanwhile-deleted game to fail cleanly rather than resurrect it.
  Four facts in the M1 code decided most of this before any option was weighed:
  1. ⚠️ **The review screen already loads its photo from `state.photoId`**, through
     `GET /api/photos/{id}/url` (`app/review/[draftId]/ReviewScreen.tsx`, the effect keyed on
     `draft?.photoId`). It has never queried `photo.draft_id`. So a draft whose state names an
     existing sheet photo renders the photo correctly with **no code change and no re-link**.
  2. `saveGame` is the only thing that *resolves* a sheet photo through `photo.draft_id` (the other
     readers of that column — `POST /api/drafts`, `POST /api/transcribe` — only check that it is
     still unclaimed), and it closes its
     double-submit race with `UPDATE photo SET game_id = … WHERE id = :sheet AND game_id IS NULL`
     (`lib/games/save.ts`). An edit's sheet photo **already has a `game_id`**, so that conditional
     can never match: reusing `saveGame` unchanged for an edit would fail as a phantom concurrent
     save, every time.
  3. The per-game rows are keyed `(game_id, player_id)` and `(game_id, player_id, hand)`. When
     criterion 118's player set changes, the departing player's rows are unreachable by any UPDATE —
     they have to be deleted.
  4. `POST /api/transcribe` already refuses a photo whose draft is saved ("This game has already been
     saved", 409), so no full-sheet re-read can reach a saved game's photo. Only the close-up path
     needs to keep working during an edit.
- **Decision**: **an edit is an ordinary draft with a target.** No second screen, no second draft
  format, no "edit mode" on the review screen.
  1. **One new column, `draft.editing_game_id`** (migration `0003_draft_editing_game`, with its
     reversing file). Null for every ordinary draft; set once, at creation, to the game being
     edited. ⚠️ **It carries no `REFERENCES` clause, deliberately** — an edit draft has to remain
     representable *after* its target is deleted, because that is the exact state criterion 122 asks
     the save to detect. A real FK would either block the delete wherever
     `PRAGMA foreign_keys = ON` takes, or, with `ON DELETE SET NULL`, quietly demote an abandoned
     edit into a new-game draft that resurrects the deleted game under a fresh id. A partial unique
     index, `draft_one_open_edit_per_game` (`editing_game_id IS NOT NULL AND saved_game_id IS NULL`),
     keeps at most one *open* edit per game while allowing any number of finished ones — the same
     backstop role `photo_one_sheet_per_game` plays inside the save. Both directions of the migration
     were applied to a scratch database and the index's three cases (second open edit refused, two
     finished edits allowed, ordinary drafts unaffected) checked.
     ⚠️ **Why a column and not a flag inside `state_json`**: `state` arrives in the body of
     `POST /api/games`. A draft's edit-ness decides whether the save *overwrites an existing game*,
     so it must live somewhere the client cannot set. It also has to be indexable, for resume.
  2. **`POST /api/games/{id}/edit` creates or resumes the edit draft** and answers `{ draftId }`;
     the game view's "Edit this game" posts to it and navigates to `/review/{draftId}`. A POST, not
     a GET page, so a link prefetch cannot mint drafts. If an open edit draft for that game already
     exists it is **returned as-is** — that is what makes criterion 121 true in the strongest sense:
     press Edit again after the tab was evicted and the half-finished corrections are still there.
     The state is built from the **game's own rows**: `playedOn`, `locationId`, one column per
     `game_player` in `column_order` (its `playerId` and `sheetName`), the eleven `running_total`s
     written into `manualEdits` (`{"0": …, "10": …}`, which `effectiveValues` layers over an empty
     reading stack), and `photoId` = the game's existing `kind='sheet'` photo. Column ids are fresh
     UUIDs; `readings` empty, `crop` null. ⚠️ **`photo.draft_id` is not touched**: the sheet photo
     stays linked to the draft that first imported it, and the edit draft simply names it. Per fact 1
     the screen is satisfied by that alone.
  3. **The save branches on the column, in a separate file.** `POST /api/games` keeps its single
     entry point; `saveGame` gains a two-line dispatch (`if (existing.editingGameId) return
     saveEditedGame(existing, state)`) after its own `savedGameId` idempotency check, and the edit
     transaction lives in **`lib/games/save-edit.ts`**. The shared resolvers —
     `resolveLocation`, `resolvePlayers`, `assertNoDuplicatePlayers`, `upsertRoster`, `nowIso`, the
     `Tx` type and the four existing error classes — **move unchanged into `lib/games/resolve.ts`**
     and are imported by both (`save.ts` re-exports the error classes so
     `app/api/games/route.ts`'s imports keep working). ⚠️ A pure move, no behaviour change: criterion
     118's roster re-match **is** `upsertRoster`, and two copies of player resolution would drift
     apart on the first fix to either.
  4. **The edit transaction**, in order, mirroring `saveGame` step for step so the two can be read
     side by side: persist `state` to the draft first; find the sheet photo **by
     `game_id = editing_game_id AND kind='sheet'`** (not by `draft_id`) and check both S3 objects;
     refuse if `state.photoId` names anything else; re-validate and re-derive server-side. Then one
     transaction: assert the game still exists; resolve location and players and upsert the roster;
     `UPDATE game SET played_on, location_id, roster_id WHERE id = :gameId` and treat
     `rowsAffected === 0` as the deleted-game case; `DELETE FROM round_score` then
     `DELETE FROM game_player` for that game and **re-insert both from the resolved columns** (that
     is what criterion 119's "replaces every round row" means concretely — delete-and-insert, not
     upsert, because of fact 3); run `saveGame`'s two close-up sweeps unchanged but scoped to this
     draft and setting `game_id = :gameId`; **null the `player_id` of any close-up already on the
     game whose player is no longer in it**, so a reassigned column degrades to the fallback label
     the game view already renders rather than naming someone who is not in the game; finally
     `UPDATE draft SET saved_game_id = :gameId WHERE id = :draftId AND saved_game_id IS NULL`, whose
     `rowsAffected === 0` is the concurrent-save guard, caught and answered like `saveGame`'s.
     ⚠️ **The `UPDATE game` sets exactly three columns.** Not `created_at`, not `note`: criterion 123
     says nothing marks a game as edited, and `created_at` is the games list's tiebreaker — touching
     it would reorder the list, which is a badge by another name. (A changed `played_on` moving the
     game is the founder's own edit, not a marker.)
  5. **The old roster is left completely alone** (criterion 118) — not renamed, not emptied, not
     deleted, even when this was its only game. `upsertRoster` finds the existing roster for the new
     exact set or creates one, exactly as a new save does, and Stage 3's listings filter out
     roster rows with no games (spec decision 5). An unchanged player set resolves to the same
     signature and rewrites the same `roster_id`.
  6. **The sheet photo is locked in two places, and one of them is new work.** The review screen has
     never had a control that replaces the sheet photo — the upload happens in `AddGameFlow`, before
     a draft exists — so criterion 120's front end is satisfied by omission, with nothing to remove.
     The real gap is server-side: `PUT /api/drafts/{id}` accepts **any** schema-valid state, so a
     crafted request could point a draft's `state.photoId` at a freshly uploaded sheet photo. That is
     closed where it happens — **`PUT /api/drafts/{id}` refuses a state whose `photoId` differs from
     the stored one** (409 `conflict`, "The sheet photo can't be changed."), for every draft, not
     only edits — and again at save time, where the edit path reads the photo from the `game` row and
     refuses if `state.photoId` disagrees. ⚠️ Note this also closes a smaller M1 hole: on the
     new-game path the same trick would have shown the human one photo and filed a different one,
     since `saveGame` resolves the photo by `draft_id`. **Column close-ups need no change at all**:
     `POST /api/uploads` (`kind:'column'`) asks only that the draft exists and is unsaved, both true
     of an open edit draft, and the sweeps in step 4 attach them to the game like any other.
  7. **Criterion 122** is an existence check inside the transaction plus the conditional
     `UPDATE game … WHERE id = :gameId`, symmetric with the existing `ConcurrentSaveError` /
     `AlreadySavedInTransaction` sentinels: a new `GameDeletedError` thrown inside, caught outside,
     mapped by the route to a new `game_deleted` error code (409) and a plain sentence
     ("This game was deleted. Nothing was saved." — final wording is the ui-designer's). Nothing is
     inserted on that path, so there is no way for it to resurrect the game.
     ⚠️ **This constrains the delete being built alongside it**: the delete transaction must
     `DELETE FROM draft WHERE saved_game_id = :gameId` (finished drafts, new-game and edit alike, are
     worthless once the game is gone) and **leave open edit drafts alone**, so that a save arriving
     afterwards lands on the check above rather than on "that draft doesn't exist". It must **not**
     null `saved_game_id` instead — proven on a scratch database: that turns finished edit drafts back
     into open ones and they collide on `draft_one_open_edit_per_game`.
  8. **Nothing else changes.** `GET`/`PUT /api/drafts/{id}` work on an edit draft unmodified, which
     is criterion 121 — autosave, offline banner, eviction and resume are all the M1 code (`GET`
     additionally returns `editingGameId` so the screen can adjust its wording and its
     post-save redirect; additive, nothing branches on it in the back end). Idempotency is M1's:
     a second `POST /api/games` for a saved edit draft returns `{ gameId, alreadySaved: true }`
     without touching the database. The edit path answers **200**, not 201 — nothing was created.
- **Alternatives**:
  - *Re-point `photo.draft_id` at the edit draft so `saveGame` works unchanged* — traced against the
    real code and rejected on both halves: it is unnecessary (fact 1 — the screen never reads that
    column) and insufficient (fact 2 — `saveGame`'s photo-link guard still cannot match a photo that
    already has a `game_id`, so the save fails anyway). It would also overwrite the one row that
    records which import a photo arrived in, to satisfy a query nobody makes.
  - *A second code path in the review screen that loads the photo by `gameId` when the draft is an
    edit* — rejected as machinery for a problem that does not exist: `state.photoId` already carries
    it, and a second photo-loading path is a second thing that can be wrong on the screen criterion
    115 says must be identical.
  - *Delete the game and re-insert it with the same id* — one code path for save and edit, but it
    destroys and rebuilds `photo.game_id` links and `created_at`, and a failure between the two
    halves loses a game outright. Delete-and-reinsert of the **child** rows inside a transaction has
    the same shape with none of that exposure.
  - *`UPDATE`/upsert the child rows in place* — fails criterion 118: `(game_id, player_id)` rows for
    a player who left the game are unreachable by an upsert and would silently keep them in the game,
    in the winner calculation and in every Stage 3 stat.
  - *Mark the edit inside `state_json` rather than with a column* — rejected on security grounds:
    `state` is request-body data, and "overwrite game X" is not a decision the client may hand the
    server. Unindexable for resume, too.
  - *`editing_game_id REFERENCES game(id) ON DELETE SET NULL` / `ON DELETE CASCADE`* — SET NULL turns
    an abandoned edit into a new-game draft that would re-insert the deleted game under a new id
    (criterion 122's exact prohibition); CASCADE makes criterion 122 fail as "that draft doesn't
    exist", a worse sentence for the one case the criterion exists to make legible. The unenforced
    reference is the honest shape: **this pointer is allowed to dangle, and the save is where that is
    handled.**
  - *Seed the edit draft with the original draft's `readings` and `crop`s* (found via
    `draft.saved_game_id`) — attractive, because the column strip beside the numbers is tighter with
    a crop. Rejected for now: the original draft may be absent or unmappable (columns removed by a
    structural repair, players that were pending names at save time), so the edit screen would behave
    differently depending on history nobody can see, and matching columns back up needs name-key
    resolution to be even approximately right. Criterion 15 already covers the no-crop case — the
    strip shows the whole photo — and re-marking a crop is one gesture. **Revisit if** editing turns
    out to be common enough that re-cropping is a real annoyance.
- **Consequences**:
  - Schema: one nullable column and two indexes on `draft`. **No new table, no new AWS resource, no
    change to the ~A$0.65/month running cost** (criterion 171's "the footprint did not grow" still
    holds; `sst.config.ts` is untouched).
  - `lib/games/save.ts` shrinks by the moved helpers and gains two lines; the QA-visible behaviour of
    the new-game path is unchanged, which the existing save tests should prove on their own.
  - ⚠️ **One place where an edit writes over a photo's attribution**: a close-up whose player is no
    longer in the game loses its `player_id`. Nothing is deleted and the image still shows on the
    game view under the fallback label. The case it cannot fix — two players *swapped* between
    columns, both still in the game — leaves each old close-up attributed to the other, and there is
    no stored link to correct it by. Documented in `docs/ARCHITECTURE.md` § "The edit" rather than
    guessed at.
  - The edit screen shows the numbers as **manual edits over an empty reading stack**. A column
    re-photographed during an edit pushes a new reading, and the founder's typed values stay layered
    on top exactly as in an import — but "restore the previous reading" has nothing to restore to
    from before the original save. Consistent with the record: the game rows are the record, the old
    draft is an artifact of how it arrived.
  - For the delete feature, in the same stage: delete `round_score`, `game_player`, `transcription`
    and `photo` rows **explicitly**, not by leaning on the declared cascades —
    `PRAGMA foreign_keys` is best-effort on Turso's HTTP driver, as `lib/games/save.ts` already
    documents at its call site, so a cascade that works in tests may silently not fire in production.
  - **Revisit if**: a second person ever edits concurrently (the whole design assumes one editor, per
    § "Concurrency, deliberately not solved"), or if edit drafts start accumulating enough that
    pruning abandoned ones becomes worth a job.

## 2026-09-14 — A suggested player match is pre-selected, not tap-to-confirm

- **Context**: Milestone 2 adds a suggested player match on the review screen (fuzzy match of the
  handwritten name against existing players). The spec settled *how* matching works — normalise,
  `1 − levenshtein / max(len)`, suggest at ≥ 0.80 with a clear leader, ambiguity rule at 0.10 — but
  not what the screen does with a suggestion. Two readings of the agreed scope pulled opposite ways:
  the PRD says the match is presented *"to confirm or change"* (a tap per column), while the user
  story it serves says *"never more than a tap or two"* and *"never retype the roster"* (no tap at
  all). ⚠️ **That is a question about friction in the thing the founder does every game, not a
  technical one**, so it was raised as PRD open question 4 and two acceptance criteria were left
  deliberately unwritten rather than guessed.
- **Decision** (founder, 2026-09-14): **the suggestion is pre-selected and accepting it costs
  nothing** — no per-column confirmation tap, no acknowledgement state, no "unconfirmed" badge, and
  no new save gate. A pre-selected column counts as assigned exactly as a hand-picked one does. The
  founder's reasoning: this is for themselves and **about five other people**, so a wrong guess is
  rare, and it is still visible and correctable on the review screen like everything else there —
  *the review screen does not stop being the check just because one field starts pre-filled*. ⚠️ It
  is the **same stance the product already takes on transcribed numbers**: they arrive pre-filled
  from a source that is known to be wrong sometimes, every one of them stays editable, and the human
  read against the photo is the control. A name is not held to a stricter standard than a score.
  ⚠️ **Where there is no confident suggestion, nothing is guessed**: a near match (0.55–0.80) or a
  0.10 ambiguity leaves the column **unassigned** with the best candidates offered first, and the
  existing save gate applies to it. PRD criteria **172–173**.
- **Alternatives**: (a) *A mandatory per-column confirmation tap* — rejected as friction bought
  against a risk this group does not have. With six known people and consistent handwriting
  (kickoff decision 3), the common night is four exact matches, so the tap would be four
  acknowledgements of something already right, every game, forever — and a confirmation people
  always accept stops being read, which would weaken the review screen rather than strengthen it.
  (b) *Pre-select, but mark the column until it is touched* — rejected as the worst of both: it adds
  a state to the screen and an "is this done?" question without ever blocking anything, and M1's
  wording rules would then have to stop it reading as *confirmed*. (c) *Pre-select only at
  similarity 1.0 and offer everything else* — rejected: the exact-match case is the one nobody needs
  help with, and a one-character misread ("Cady" for "Cody") is precisely the case the feature
  exists for.
- **Consequences**: Stage 4 loses its blocker; **nothing in Milestone 2 is waiting on the founder**.
  ⚠️ **Wording stays under the M1 constraint** — a suggestion reads as a suggestion, and nothing in
  this flow may say *checked, confirmed, verified* or *correct* (criterion 154). The handwritten name
  stays displayed beside the selection on every column, which is what makes a wrong pre-selection
  visible without opening anything, and `sheet_name` still stores the original read, so an identity
  mistake stays traceable. The repair path if one slips through is already in this milestone: Stage
  2's game edit, or Stage 4's player merge. **Revisit if**: the group grows enough that two players'
  names sit inside the 0.10 ambiguity window as a matter of routine, or a mis-assignment actually
  reaches the record — either is the signal that the tap was worth its cost after all.

## 2026-09-14 — Milestone 2: player/location merges are permanent; score download is one CSV

- **Context**: Milestone 2 spec work started while Stage 5 wrapped up. Two behaviors needed the
  founder's sign-off before building, raised directly rather than guessed: whether merging two
  player (or location) records should be reversible, and how the score download should be
  packaged.
- **Decision**: **merges are permanent, like a game delete** — merging reassigns every game,
  round and roster reference from the losing identity to the surviving one, and the losing
  record is gone, with no stored record of what was merged and no way to split it back apart.
  Consistent with this project's existing stance (no accounts, no audit trail, deletes are
  already permanent and silent). **The score download is one combined CSV**, not a zip of
  per-table files — simplest to open and skim as a single spreadsheet.
- **Alternatives**: a reversible merge (keeps a record of which rows moved from which original
  player, so it can be undone) was rejected — extra data model and build cost for a safety net
  this project doesn't extend to deletes either, and it raises its own edge cases (what if the
  "wrong" identity plays a genuinely new game before anyone notices the mismerge?). A zip of
  per-table CSVs (players/games/rounds/rosters) was rejected as over-structured for what the
  founder actually wants: something to open and eyeball, not feed to a script.
- **Consequences**: Milestone 2's merge feature needs no undo path, no "merge history" table, and
  no confirmation-with-preview beyond a plain "this can't be undone" warning (matching the
  existing delete-game warning's pattern). The download is a single flattened CSV joining
  players, games, rounds and rosters, one row per round-per-player being the natural grain, or
  whatever grain the architect/backend developer judges most useful for a spreadsheet skim —
  that shape is a technical call, not reopened here. **Revisit if**: multiple founders/admins
  ever share write access and a mis-merge becomes a real, not hypothetical, risk.

## 2026-09-14 — Row 11 is not self-cancelling: correcting "exposure is bounded"

- **Context**: "Monotonicity is a floor, not an error detector" (2026-09-10) closed with *"final
  scores, winners and total-derived records are safe (0 errors in row 11 across all six reads)"*,
  and set its own revisit-if as a re-run through the production API path. Stage 5's go-live
  checklist ran exactly that on 2026-09-14: six cold reads through `POST /api/transcribe` with a
  real key and the real structured-output schema. **That revisit-if has fired.** Workings in
  `docs/SPIKE-M0-READING.md`.
- **Decision**: **the monotonicity verdict stands unchanged; the "exposure is bounded" consequence
  is corrected, not superseded.** Cell accuracy (96%), catch rate (0 of 11) and winner-correctness
  (6/6) all reproduced. What did not reproduce is the row-11 claim: **3 of 6 reads misread a final
  score of 144 as 174**, identically each time. The reasoning behind the original claim only ever
  covered *interior* cells — an error at hand *n* cancels against hand *n+1* — and **row 11 has no
  hand 12 to cancel against**. The original sentence generalised a zero-count in a six-read sample
  into a structural guarantee. ⚠️ **No product wording may describe final scores, averages or
  best/worst records as safe, protected or self-cancelling.** Winners and win-rate stats stay safe
  **in practice, by margin** — a game is rarely close enough for one misread total to flip it —
  which is a different and weaker claim than "safe by construction", and must be written as such.
  **The mitigation is unchanged and already shipped**: the final row gets its own `FinalRow`
  treatment on the review screen (PRD criterion 23) and the founder reads it. This ADR adds no
  build work.
- **Alternatives**: (a) *Read row 11 a second time and compare* — **prohibited, not deferred**, and
  this run is the strongest evidence yet: the 174 came back in 3 of 3 independent reads, as did a
  Cody/hand-4 error and the name "Cady". A second read manufactures confidence and buys nothing.
  (b) *Lean on `leastConfidentIndex` to flag it* — measured and rejected: all three affected reads
  pointed at hand 5 or 6, never at 11. The read-hint is a reading aid, not a check; the design
  system already says so and this is now observed rather than reasoned. (c) *A new check or forced
  confirmation on the final row* — a scope change, and therefore **the founder's call, not ours**;
  raised as open question 3 in `docs/PRD.md` against Milestone 3, where average score and
  best/worst game get built on these numbers. Deliberately not decided here.
- **Consequences**:
  - `docs/PRD.md` risk 1 carries the correction, and its two stale "100% of final scores correct"
    claims (risk 2, the Milestone 0 box) are struck through and pointed at it.
  - **The exposed set is now larger than hand-by-hand analytics**: average score, best/worst game
    ever, and anything else treating a final score as a number join it. M3's analytics catalogue
    should be read with that in mind.
  - The fidelity caveat on the 2026-09-10 spike numbers ("development runs on the founder's Claude
    subscription", same date) is **closed** — these numbers came through the product's own path.
  - **Revisit if**: row 11 misreads at a materially different rate over a larger sample (the real
    corpus grows by a sheet a week, and any founder-caught final-score error is a data point worth
    logging here), or a later model changes the profile again.

## 2026-09-14 — The deploy role's Parameter Store grant is scoped to this project (and to SST's own paths)

- **Context**: the Milestone 1 go-live security audit found that the GitHub Actions OIDC deploy role
  (`infra/github-oidc.yaml`) held `ssm:GetParameter*`, `ssm:PutParameter` **and** `ssm:DeleteParameter`
  on `Resource: "*"`. This AWS account is shared with other projects, so that is read, overwrite and
  delete over every parameter in it — other projects' secrets included. It also quietly undid the
  2026-09-11 least-privilege ADR: the web Lambda's own write grant was narrowed to the three
  `anthropic-api-key*` parameters *specifically* so that a bug in the internet-facing app could not
  overwrite `/five-crowns/prod/admin-password-hash`. The deploy role could do exactly that, and
  anyone who can land a commit on `main` reaches it. `docs/STATUS.md` had this listed as "broad
  SSM/KMS read"; the write and delete halves were the part nobody had noticed.
- **Decision**: the three parameter-**value** actions move to their own `SsmScoped` statement,
  limited to four prefixes: `parameter/five-crowns/*` (everything the app and `scripts/deploy.sh`
  actually touch — `session-secret`, both password hashes, the API-key trio, `app-domain`,
  `app-cert-arn`, `budget-alert-email`), plus `parameter/sst/passphrase/five-crowns/*`,
  `parameter/sst/five-crowns/*` and `parameter/sst/bootstrap*`.
  ⚠️ **The `/sst/*` prefixes are required, not decoration**: SST v4 keeps its state-encryption
  passphrase at `/sst/passphrase/<app>/<stage>` and its per-region bootstrap record at
  `/sst/bootstrap` (`sst.dev/docs/state`, `sst.dev/docs/iam-credentials`). Without them a deploy
  cannot read its own state. `/sst/bootstrap` is account- and region-wide by SST's design and
  cannot be narrowed to one app.
  `ssm:DescribeParameters` stays on `*` because SSM supports **no** resource-level permission for
  it (it lists names and metadata, never values); `ssm:AddTagsToResource` / `ListTagsForResource`
  stay as they were, for the same "no values, and SST tags parameters we do not name up front"
  reason. KMS and S3 on this role are deliberately untouched here.
- **Alternatives**: (a) *Grant `parameter/sst/*`, SST's own published policy* — simpler, but in a
  shared account it leaves every other SST app's passphrase readable, which is the same class of
  problem one level down. Kept as the documented fallback if a deploy ever fails on an `/sst/...`
  path this list misses. (b) *Add explicit `Deny` on the two password hashes* — a deny list over a
  still-unscoped allow is brittle, and the deploy legitimately reads those two (the preflight
  check). (c) *Leave it and rely on branch protection* — branch protection is the control that was
  already assumed; this is what stops it being the only one. (d) *Narrow KMS at the same time* —
  rejected for now: the audit costed the SSM change only, and the `aws/ssm` key's own policy
  already limits use to Parameter Store; narrowing it blind risks breaking SecureString reads that
  cannot be tested from a sandbox.
- **Consequences**: cost impact **A$0.00** — no resource is created or removed, IAM is free.
  ⚠️ **`scripts/aws-bootstrap.sh` must be re-run to apply it**; merging the template changes
  nothing in AWS. The failure mode if a prefix is wrong is safe but misleading: `sst secret list`
  in `scripts/deploy.sh` returns nothing on an IAM denial, and the script then refuses to deploy
  with "SST secrets not set", *before* `sst deploy` touches anything — so a half-deploy is not
  possible, but the message will point at secrets rather than at permissions.
  **Revisit if**: a second app is deployed from this repo, the SST app name ever changes (the SSM
  prefix follows it), or SST changes where it keeps its state.

## 2026-09-13 — Criterion 73 is verified by a local Playwright audit, not jsdom and not in CI

- **Context**: Stage 5 has to run "accessibility and a 375px/1280px pass". That is PRD criterion 73
  — every M1 screen at 375px and 1280px, every touch target ≥ 44px, focus visible on everything
  interactive. It has been verified by **reading code** since Stage 2, which `docs/STATUS.md` records
  as a known follow-up ("no component-rendering test harness exists yet… worth a Playwright smoke
  test in a later stage"). Stage 5 is the last stage of M1, so it is decide-or-ship-it-unproven.
- **Decision**: add **Playwright** as a dev dependency and a single audit spec, run on demand via
  `npm run audit:a11y` against a production build on the scratch database. It logs in once, visits
  every M1 screen at 375×667 and 1280×800, and asserts three things mechanically: no horizontal
  overflow (`document.scrollWidth <= clientWidth`), a ≥44×44 CSS-px hit area on every `button`, link,
  input, select and `[role="button"]`, and a computed focus indicator (`outline`/`box-shadow`) that
  actually changes when the element is focused. ⚠️ **Not wired into the PR CI job in Milestone 1.**
- **Alternatives**: (a) *jsdom + Testing Library* — **not an option at all**, and this is the
  decisive fact rather than a preference: jsdom has no layout engine and does not compute Tailwind
  styles, so it can answer none of criterion 73's three questions. It would produce a green suite
  that proves nothing about the thing being claimed. The real choice was therefore a headless browser
  or human eyes, never a middle tier. (b) *Keep code-reading* — rejected: 73 covers ten screens and is
  now the largest unproven block left in M1, while M1's whole definition of done (criterion 85) is a
  phone. Reading Tailwind classes cannot tell you a flex row overflows at 375px. (c) *Playwright
  wired into CI on every PR* — rejected for M1: a browser download plus a layout-sensitive suite
  gating every PR is exactly the footprint the milestone refuses ("no queue, no staging environment,
  running costs stay minimal"), for a check that only changes when the design does.
- **Consequences**: 73 gets a real, repeatable result instead of a judgement call, and M2/M3 inherit
  a harness that is already configured. The cost is that an on-demand suite can rot between stages —
  mitigated by making it part of every future stage's QA pass rather than a one-off script.
  ⚠️ **It does not replace the founder's phone**: criteria 6 (camera opens directly), 8 (rotation
  surviving to the saved game) and 70 (pinch-zoom and pan) are real-device facts and stay founder-run.
  *Revisit if* M3's analytics screens land — that is the point to wire it into CI.

## 2026-09-13 — Stage 5's "full re-run of all 86" runs on a scratch environment, not production

- **Context**: Stage 5's scope line reads "a full re-run of all 86 against the live domain". Taken
  literally that means executing every acceptance criterion against `fivecrowns.ribenajuice.xyz`.
  It also needs credentials QA does not hold — both passwords and a real Anthropic key.
- **Decision**: the full 1–86 re-run happens on a **disposable scratch environment** built from the
  same `main` artefact that produced the live deploy, with the same schema and config shape, scratch
  passwords and a scratch database. Production gets two much smaller sets instead: a
  **credential-free live smoke set** (criteria 1, 5, 9, 57, 82, 83, 84, 86) and a **founder-only
  live set** (2, 3, 4, 6, 8, 85, plus a first live exercise of Stage 4's repairs and criterion 11).
  Every criterion is recorded with the bucket it was run in.
- **Alternatives**: *Literally re-run all 86 against production* — rejected, and not on grounds of
  convenience: ⚠️ **criterion 64 is unrunnable there.** It asserts the database holds *exactly*
  5 players, 2 rosters, 2 games and 99 round rows after both fixtures save — a fresh-database
  assertion. Production now holds the founder's two real games (saved 2026-09-13), so running 64
  against it means deleting the real record to test it. 59, 62, 63, 66 and 67 carry the same
  assumption. A test that destroys the artefact it exists to protect is the wrong test.
  *Stand up a permanent staging environment* — rejected: explicitly out of scope for M1, and a
  disposable scratch environment (which QA already used for Stages 2–4) does the same job for the
  duration of a QA pass and then goes away.
- **Consequences**: the re-run proves the **build**; the live smoke set proves the **deployment** is
  that build and is correctly locked down; the founder's run proves the **product**. ⚠️ The
  scratch-environment pass is only as good as its fidelity to production — if the artefact under test
  is not the one on `main` that deployed, the re-run proves nothing, so pinning the commit is part of
  the task rather than a nicety. *Revisit if* a defect is ever found live that the scratch
  environment could not reproduce — that is the signal the two have drifted.

## 2026-09-12 — Insert/delete-a-value repairs push a new reading rather than widening `manualEdits`

- **Context**: Stage 4 needed `insertValueAt`/`deleteValueAt` (PRD criterion 33: inserting leaves
  twelve values and reports "12 of 11", deleting leaves ten and reports "10 of 11"). The obvious
  first attempt — write every post-splice value into `manualEdits` as an explicit index override —
  works for insert but is silently broken for delete: `effectiveValues` (`lib/draft/state.ts`)
  builds its base array from the active reading (or eleven empty cells) and only ever *extends*
  that base to fit a higher edit index, it never truncates it. A column with an 11-value active
  reading can't be shrunk to 10 by an overlay that can only add or override entries — the eleventh
  value survives underneath, untouched, and `validateColumn` would still see eleven.
- **Decision**: both repairs compute the correct post-splice array once (`effectiveValues`, then
  `slice`/`splice`) and push it as a **brand new reading** onto the column's stack — the same
  rung-3 "push, move `activeReadingId`, never overwrite" pattern `lib/draft/merge-sheet.ts` already
  established for a fresh vision read, reused here for a fresh *hand* read. `manualEdits` is
  cleared on the column, because the new reading's `values` now *is* the current shape and every
  prior edit is already folded into it. The new reading's `source`/`photoId` are inherited from
  whichever reading was previously active, so a repaired column still says where its numbers came
  from; a column typed from scratch (no reading at all yet) is tagged `source: "sheet"` against
  the draft's own `state.photoId` — the one photo a draft is always guaranteed to have, and the one
  the founder was looking at while typing it.
- **Alternatives**: (a) *Add a `valueCount` field to `DraftColumn`* that overrides the base array's
  length before the `manualEdits` overlay runs — considered first, technically correct, but it's a
  second, parallel way to express "how long is this column" alongside the reading's own `values`
  length, needs a backward-compatible zod default for every already-persisted draft, and touches
  `effectiveValues` itself (used everywhere: autosave, save, the sheet and column merges) for a
  benefit only these two functions need. (b) *Mutate the active reading's `values` array in
  place*, keeping its `id`/`photoId`/`transcriptionId` — rejected: `readings` is otherwise treated
  as an immutable, append-only history (criterion 41, "every reading a column has ever had is
  retained and reachable"), and starting to overwrite one after the fact for structural edits only
  would make that guarantee conditional in a way nothing else in the codebase is.
- **Consequences**: `reorderColumns`, by contrast, needed no new mechanism at all — column identity
  is already the id, not array position, so renumbering `order` is the whole repair (criterion 32
  falls out for free). Every structural insert/delete now shows up in a column's reading history
  like any other read, which is arguably a feature (the founder can see exactly when a repair
  happened) rather than a cost. *Revisit if* the review screen ever needs to distinguish "this
  reading came from a repair" from "this reading came from a photo" in its own right — `source` has
  no third value for that today and reuses `"sheet"`/`"close-up"` as the closest fit.

## 2026-09-12 — Column re-read diagnostics: one object, not a one-element array

- **Context**: `POST /api/transcribe` (Stage 3) returns `columns: [{columnId, nameConfidence,
  leastConfidentIndex}]` — one diagnostic per column, because that route can touch every column on
  the sheet in one call. `POST /api/transcribe/column` (Stage 4) is scoped to exactly one column by
  its own contract (`{photoId, columnId}` in, that one column's reading out), plus two fields the
  sheet path has no equivalent for: `possibleWrongColumn` (criterion 42) and
  `disagreesWithTypedCells` (criterion 43). The response shape for these was left as this build's
  call.
- **Decision**: a single `diagnostics` object, not a `diagnostics: [...]` array of length one.
  `{ columnId, nameConfidence, leastConfidentIndex, readPlayerName, possibleWrongColumn,
  disagreesWithTypedCells }` — see `lib/draft/merge-column.ts`'s `ColumnMergeDiagnostics`.
- **Alternatives**: *Keep the array shape* so the frontend could reuse whatever component renders
  the sheet path's `columns[]` — rejected: there is exactly one column here by construction (the
  route's own request already names it), and a length-one array the caller must immediately
  `[0]`-index adds a layer of "why is this a list" with no case where it's ever anything else.
  A single object is also where `possibleWrongColumn` and `disagreesWithTypedCells` read more
  naturally — they're facts about *this* re-read, not about a column in a list of columns.
- **Consequences**: ⚠️ **Follow-up for the frontend.** The two routes' diagnostics are shaped
  differently on purpose (a list for the sheet path, an object for the column path) — do not
  write one shared "diagnostics" component expecting the same envelope from both; the column
  path's extra two fields (`possibleWrongColumn`, `disagreesWithTypedCells`) are what criteria 42
  and 43 need on screen (a non-blocking "this looks like Player B's column, not Player D's" banner,
  and a per-cell "you typed 64; the close-up reads 84" callout) and have no sheet-path equivalent.

## 2026-09-12 — The API key's status is derived, not stored

- **Context**: Stage 3 needed somewhere for the admin panel's "last four characters, when it was
  set, whether it currently works" (PRD criteria 75, 76; `docs/ARCHITECTURE.md` § The Claude API
  key). Last-4 and set-at aren't secrets, but "whether it currently works" is a *fact about usage*,
  not a value anyone writes — and the architecture doc is explicit that it must be a fact, not an
  assumption.
- **Decision**: **last-4 and set-at live in SSM as two small, non-secret `String` parameters**
  (`anthropic-api-key-last4`, `anthropic-api-key-set-at`), written alongside the key itself by
  `lib/vision/api-key.ts`. **"Whether it currently works" is not stored anywhere** — it is derived,
  on every read, from the most recent `sheet`-kind row in the `transcription` table: `status =
  'error'` (the upstream call itself failed — auth, network, timeout) reads as "no"; `'ok'` or
  `'invalid'` (a schema-parse failure, which says nothing about the key) both read as "yes"; no
  sheet transcription yet reads as "untried"; no key configured at all reads as "unknown".
- **Alternatives**: (a) *A `last_successful_use_at` / `last_failed_use_at` pair*, written by the
  transcribe route on every attempt — closer to the architecture doc's literal wording ("the last
  successful and last failed use are recorded"), but it is a second place that same fact already
  lives (the `transcription` table, kept forever, one row per attempt) and the two could drift if a
  code path ever wrote one and not the other. (b) *A field on some new `admin_settings` row in the
  database* — rejected outright: `docs/ARCHITECTURE.md`'s whole hazard analysis is that nothing
  admin-configurable belongs in a table the panel can export, and this would be the first exception
  for no real gain. (c) *Not exposing "works" at all, only last-4 and set-at* — cheaper, but leaves
  the founder to find out the key is dead by trying to photograph a sheet at the table, exactly the
  failure mode criterion 78 exists to prevent.
- **Consequences**: no new secret-shaped storage anywhere, and the "works" answer is always
  consistent with what `transcription` already says happened — there is no second bookkeeping path
  that could disagree with it. The cost is a small `SELECT … ORDER BY created_at DESC LIMIT 1` on
  every status read, which is free at this volume (a decade of games is ~15,000 rows). *Revisit-if*
  the transcription table ever needs pruning or archiving — the derivation would need to keep
  reading from wherever the *most recent* rows land, not necessarily this table forever.

## 2026-09-12 — `POST /api/transcribe` creates its own draft, and merges by pushing a reading

- **Context**: `docs/ARCHITECTURE.md`'s Flow 2 sequence diagram goes straight from
  `POST /api/uploads` to `POST /api/transcribe {photoId}`, with no `POST /api/drafts` step shown in
  between — unlike Stage 2, where the client always creates the draft first. The route needed a
  concrete contract for what happens when no draft exists yet, and for what "merge into the draft"
  means precisely.
- **Decision**: the request body is `{ photoId, playedOn? }`. The route resolves the photo's draft
  if one already exists (the retry path, and the path where a client *does* call
  `POST /api/drafts` first); if none exists, it creates one — an empty draft, exactly
  `emptyDraftState` with zero columns, defaulting `playedOn` to UTC-today when the caller doesn't
  supply it — using the same claim-with-conditional-`UPDATE` race guard `POST /api/drafts` already
  uses, so two concurrent first-transcribes of the same photo can't create two drafts. Merging a
  vision column into the draft follows rung 3 of the override ladder (push a new reading onto the
  matching column's stack, move `activeReadingId`, never touch `manualEdits`) rather than replacing
  the column outright — the ordinary case (an empty draft) is indistinguishable from "replace", but
  it also makes a same-photo retry after an `invalid` first attempt safe: nothing the founder
  already typed is lost.
- **Alternatives**: (a) *Require `POST /api/drafts` first, always* — simpler, and arguably more
  consistent with Stage 2, but it would make the sequence diagram in the architecture doc wrong
  without a note, and it pushes the "what if the client skips it" case onto every caller instead of
  handling it once, here. (b) *Take the full initial `state` in the request body*, the way
  `POST /api/drafts` does — rejected because the whole point of this route, for the common case, is
  that the client doesn't know the columns yet; it only knows a photo. (c) *Overwrite
  `state.columns` outright on every transcribe call* — simpler code, but loses manual edits made
  during a prior `invalid` attempt on retry, which criterion 53 ("Try again" reuses the photo)
  implies should not happen to typed corrections either.
- **Consequences**: the frontend may call `POST /api/transcribe` directly after upload with no
  intervening `POST /api/drafts`, or may still create the draft first (e.g. to capture the local
  calendar day before anything else happens) — both work. ⚠️ **Follow-up for the frontend**: if it
  never calls `POST /api/drafts` first, send `playedOn` (the browser's local calendar day) in the
  transcribe request explicitly; otherwise the very first draft's date silently defaults to
  UTC-today, which is wrong for roughly ten hours a day in Australia (the same hazard
  `docs/ARCHITECTURE.md`'s `game.played_on` note already calls out) — the frontend has this local
  date at capture time as of Stage 2 and just needs to forward it here too.

## 2026-09-11 — One address: the CloudFront URL closes once the custom domain is attached

- **Context**: criterion 84 asked for `fivecrowns.ribenajuice.xyz` to work *and* for the CloudFront URL
  (`darn4m0ss1uf4.cloudfront.net`) to keep working alongside it, as a spare way in. After the domain
  was attached, the CloudFront URL answered **403** (`x-cache: FunctionGeneratedResponse`). SST
  injects a block into the site's CloudFront function (`CF_BLOCK_CLOUDFRONT_URL_INJECTION`,
  `ssr-site.ts`) whenever a custom domain is set, and it has no option to disable it. The docs call
  it a feature: "Disable CloudFront default URL if custom domain is set".
- **Decision** (founder, 2026-09-11): **keep SST's behaviour.** The site has one address. Criterion 84
  is reworded to match.
- **Alternatives**: *Force the CloudFront URL open* by transforming SST's generated CloudFront
  function to strip the block on every deploy. It works, but it patches generated code that SST can
  change in any release, and it would fail silently when it did. Rejected as fragile for a benefit
  the recovery below already provides.
- **Consequences**: one address for bookmarks, sessions and the login cookie (cookies are per
  hostname, so two addresses would have meant two separate logins anyway). **Recovery if the domain
  breaks:** delete `/five-crowns/prod/app-domain` and `/five-crowns/prod/app-cert-arn` from Parameter
  Store (region `ap-southeast-2`) and deploy once. SST then stops injecting the block, and the
  CloudFront URL answers again in about 15 minutes. *Revisit-if*: SST adds an option to keep the
  default URL, or the domain proves unreliable.

## 2026-09-11 — The Turso database lives in Tokyo, because Turso has no Sydney location

- **Context**: the region-correction ADR below put the Turso database in Sydney (`syd`) beside the
  app. At the first deploy, `turso db locations` offered only six locations, **none in Australia**:
  Tokyo (`aws-ap-northeast-1`), Mumbai (`aws-ap-south-1`, Turso's default), Ireland, Virginia,
  Ohio and Oregon. The `syd` code belonged to Turso's older platform and is no longer offered.
- **Decision**: the database `five-crowns` lives in **Tokyo (`aws-ap-northeast-1`)**, in a Turso
  group named `default` created there. The app stays in **Sydney**: Lambda, CloudFront origin, the
  photo bucket and Parameter Store are unchanged.
- **Alternatives**: (a) *Mumbai*, Turso's default. Roughly 150 ms each way from Sydney, against
  about 110 ms for Tokyo, so it's strictly worse. (b) *Move the whole app to Tokyo, next to the
  database*. Each page would then pay one 110 ms trip from the phone instead of one per query. But
  photo uploads would cross the sea too, and it would undo a region move made the day before,
  requiring edits to `sst.config.ts`, `deploy.sh`, the OIDC stack and every runbook.
  Not worth it at a handful of users. (c) *A different database host with a Sydney region*. That
  reopens the stack decision for a latency cost nobody has felt yet. (d) *Turso embedded replicas*
  (a local read copy inside Lambda). A real option if reads ever feel slow, but it's complexity
  bought in advance.
- **Consequences**: every database query from the app waits one Sydney↔Tokyo round trip
  (about 110 ms). A page doing two or three queries is a few tenths of a second slower than a
  same-region database. That's acceptable for a private app used once or twice a week. Cost is
  unchanged: the free plan covers this, and data transfer at this volume is negligible. Measured
  after the first deploy (2026-09-11), from Adelaide through CloudFront: a warm login attempt,
  which makes two or three database round trips plus a ~50 ms scrypt check, took **0.45–0.58 s**.
  A page load that touches no database took **0.13–0.21 s**. So each Sydney↔Tokyo query adds roughly
  **110–130 ms**, as estimated. The first request after a deploy (Lambda cold start) took 3.9 s,
  which is unrelated to Tokyo. Verdict: acceptable, and the decision stands.
  *Revisit-if*: pages feel slow on a phone, Turso adds an Australian location (move it: `turso db
  create` there, restore from `npm run db:backup`, update the two SST secrets), or the review
  screen's save turns out to need many sequential queries.

## 2026-09-11 — Trust only what our own proxy wrote: client address, attempt counting, and same-origin login posts

- **Context**: pre-ship security review, code review and QA on Milestone 1 Stage 1 found the login
  rate limiter could be bypassed three ways: (1) it keyed on the left-most `X-Forwarded-For` entry,
  which is client-typed — rotating it gave QA a fresh bucket per guess, and prepending a fake entry
  let a correct password through while the real address was blocked; (2) the failure count was read,
  then scrypt ran (~50 ms), then the failure was recorded — so N parallel guesses all read the same
  stale count and all got evaluated; (3) the login routes accepted any `Content-Type` and any
  `Origin`, so a hostile page could burn a household's ten attempts with a cross-site form post, no
  script permission needed.
- **Decision**:
  - **Client address**: `CloudFront-Viewer-Address` first (see the ADR below this one for why that
    header can be trusted — the Function URL is behind OAC with edge signing, so only our
    CloudFront distribution can call it and a client-forged header is overwritten). If that header
    is absent **and we are running on Lambda, `X-Forwarded-For` is never consulted** — AWS Lambda
    Function URLs truncate an inbound `X-Forwarded-For` to its left-most (client) entry rather than
    appending, so off-Lambda that header would just be handing the bypass back. Off Lambda (local
    dev, or any future non-Lambda host), the **right-most** `X-Forwarded-For` entry is used instead
    — the one a trusted proxy appends, never the client-supplied left end. Failing all of that,
    every caller shares one `"unknown"` bucket: a nuisance, never a bypass.
  - **Count first, verify second**: `reserveAttempt()` increments the attempt row and re-reads the
    window sum *before* the password is compared, so the k-th concurrent request always sees a
    total of at least k and no more than 10 can ever be evaluated in a window. Only a wrong password
    keeps its increment; a refusal, a success or a server fault releases it. A **successful login
    does not clear the counter** — kept as-is, since PRD criterion 5 requires a correct password to
    still be refused while blocked, and the window aging out is simpler than an explicit reset.
  - **Same-origin only**: both login routes now require `Content-Type: application/json` (415
    otherwise) and, when `Origin` is present, that it match the `Host` / `X-Forwarded-Host` the app
    actually sees (403 otherwise) — comparing against `X-Forwarded-Host` rather than `Host` alone is
    what keeps this working behind CloudFront, where `Host` is the Lambda's own address. Two new
    API error codes: `unsupported_media_type` (415) and `forbidden` (403).
- **Alternatives**: (a) *Trust the left-most XFF entry* — the status quo, and the thing QA broke.
  (b) *`SELECT ... FOR UPDATE` / a mutex around check-then-record* — libSQL/Turso has no row locking
  primitive worth relying on here; an atomic increment-then-read does the same job with plain SQL.
  (c) *Clear the counter on success* — rejected, it would let a blocked address in in exactly the
  case criterion 5 is about.
- **Consequences**: a distribution that ever stops forwarding `CloudFront-Viewer-Address` degrades
  to the shared `"unknown"` bucket rather than reopening the bypass — see the post-deploy check in
  `docs/ARCHITECTURE.md`. `docs/ARCHITECTURE.md` § Flow 1 and § API errors are updated to match.

## 2026-09-11 — Least-privilege runtime grants, a server function only CloudFront can call, and a deploy role only `main` can reach

- **Context**: the pre-ship security review of Milestone 1 Stage 1, before anything is deployed,
  found four infrastructure problems:
  (1) the photo bucket was **linked** to the web app and the backup job, and SST's Bucket link
  grants `s3:*` on the bucket and every object. That let the internet-facing Lambda delete old
  versions, suspend versioning, and rewrite the lifecycle rules and the public-access block, which
  undoes the protection criterion 83 relies on;
  (2) the GitHub OIDC deploy role trusted `repo:ribenajuice/five-crowns:*`, so a workflow on any
  branch could assume the production role;
  (3) the web Lambda could `ssm:PutParameter` anything under `/five-crowns/prod/*`, the session
  secret included, and held unconditioned KMS actions on `*`;
  (4) the login rate limiter trusts only `CloudFront-Viewer-Address`, but SST's default leaves the
  server's Lambda function URL public, so anyone could call it directly with a forged header and
  get a fresh bucket for every guess.
  Checking against the installed **SST 4.17.1** (the docs said v3) also found that v4's `Nextjs`
  takes `permissions` at the top level. The old `server.permissions` grants would have been
  **silently dropped**.
- **Decision**:
  - **S3**: the bucket is never linked. The web app gets `s3:GetObject` and `s3:PutObject` on
    `five-crowns-photos/*` only. It gets no delete action and no bucket-level action. The bucket
    keeps versioning on, public access blocked, `forceDestroy: false`, and no expiry rule. (The
    only lifecycle rule left aborts abandoned multipart uploads. It never expires an object or a
    version.)
  - **SSM**: reads and writes are limited to exactly the five app-owned parameters
    (`group-password-hash`, `admin-password-hash`, `group-session-epoch`,
    `admin-session-epoch`, `anthropic-api-key`). The session secret is injected at deploy. The
    domain and budget parameters are read only by `scripts/deploy.sh`. ⚠️ **Superseded twice since.**
    A Stage 3 security review found the write grant was still wider than the app's actual writes and
    narrowed it to exactly the three `anthropic-api-key*` parameters. The 2026-09-14 ADR above then
    widened it back to all seven, by founder decision, so the panel's password-change routes could
    write the two password hashes and two session epochs. That 2026-09-14 entry is the current
    state of this grant.
  - **KMS: no statement at all.** The AWS-managed `aws/ssm` key's own policy already allows any
    principal in the account to use it *through Parameter Store only* (`kms:ViaService =
    ssm.ap-southeast-2.amazonaws.com` plus `kms:CallerAccount`). This was read from the live key
    on 2026-09-11. An IAM grant would only add a way to call KMS directly.
  - **Server function**: `protection: "oac-with-edge-signing"`. The function URL requires IAM
    auth, and only this CloudFront distribution may invoke it. SST's Lambda@Edge function adds the
    body hash that Origin Access Control needs on POST, PUT and PATCH. SST uses the
    `Managed-AllViewerExceptHostHeader` origin request policy (verified in the 4.17.1 source),
    which forwards CloudFront's viewer-location headers, `CloudFront-Viewer-Address` among them.
    `docs/ARCHITECTURE.md` has a post-deploy check proving a forged header gets nothing.
  - **Deploy role**: trusts exactly `<subject prefix>:environment:production` with `StringEquals`.
    *(Corrected 2026-09-11 at the first deploy: this repo uses GitHub's **immutable** OIDC subject
    format, `repo:ribenajuice@75055493/five-crowns@1362884474`, so the originally written
    `repo:ribenajuice/five-crowns:…` never matched and the first deploy was refused with "Not
    authorized to perform sts:AssumeRoleWithWebIdentity". `aws-bootstrap.sh` now reads the prefix
    from GitHub's API. The immutable form is the stronger one: a renamed, recreated or transferred
    repo cannot match it.)* The `production` GitHub environment accepts deploys from `main` only
    (`scripts/aws-bootstrap.sh`). `deploy.yml` also refuses any other ref at job level. For a job
    that names an environment, GitHub puts the environment, not the branch, in the token. So the
    environment's branch rule is the real gate, and the other two are belt and braces.
- **Alternatives**: (a) *Keep `link` and add Deny statements*. Deny lists over `s3:*` are brittle,
  and the link is what grants the access. Rejected. (b) *Subject `ref:refs/heads/main`*. This
  never matches: a job with an environment sends `environment:production`. (c) *Plain
  `protection: "oac"`*. Every POST would need a client-computed `x-amz-content-sha256`, which
  browsers never send, so logins would break. Rejected. (d) *A secret header injected by
  CloudFront and checked in middleware*. That is a second secret to create and rotate. It depends
  on SST's per-request origin rewrite keeping custom origin headers, and one middleware slip would
  silently reopen the hole. Kept as the fallback if edge signing ever has to go. (e) *KMS with a
  `ViaService` condition*. Harmless but redundant with the key policy, so it was dropped.
- **Consequences**:
  - Lambda@Edge costs under A$0.01/month (US$0.60 per million requests, no free tier) and adds a
    few milliseconds to each POST.
  - Request bodies through the app are capped at **1 MB**. Photos must go to S3 by presigned URL,
    never through a route handler.
  - Removing the stage takes 5–10 minutes while edge replicas are deleted.
  - The first deploy creates Lambda's replication service-linked role. The deploy role may create
    exactly that role and nothing else.
  - Any later feature needing another AWS action must add it by hand in `sst.config.ts`. That is
    the point.
  - *Revisit-if*: a feature needs large bodies through the app (use presigned S3, don't loosen
    this), GitHub changes the OIDC subject format, or edge signing causes a production problem.
    In that case switch to (d); don't switch back to `"none"`.

## 2026-09-11 — Database backups are manual

- **Context**: the architecture had a nightly Lambda writing a SQL dump to
  `s3://five-crowns-photos/backups/`, with a 90-day expiry rule. The founder reviewed it and
  decided: *"leave the backups as manual, this isnt sensitive data, its just a pet project. if
  something gets lost, its not the end of the world."*
- **Decision**: no scheduled backup. `npm run db:backup` (`scripts/db-backup.mjs`, reusing
  `lib/backup/dump.ts`) writes `five-crowns-YYYY-MM-DD.sql` to the gitignored `backups/` folder,
  or to `$BACKUP_DIR`, and prints the path. For production, run it under `npx sst shell --stage
  prod`. It needs no S3 and makes no AWS changes. The nightly Lambda, its schedule, its S3 grant
  and the `backups/` expiry rule are removed. The admin panel's download stays.
- **Alternatives**: (a) *Nightly dump kept 90 days* (the previous design). It cost about A$0.00,
  but it meant a scheduled Lambda, an IAM grant into the photo bucket, and an expiry rule on a
  bucket that is otherwise "no delete lifecycle". The founder judged those moving parts not worth
  it for this data. (b) *Nightly dump kept forever*. It needs the same moving parts, plus a
  storage line that grows forever. Rejected for the same reason.
- **Consequences**:
  - If Turso lost the database, games since the last manual dump or download would be lost.
  - The photos are unaffected. They stay in the versioned bucket, and lost games can be
    re-entered from them.
  - The photo bucket now has no expiry rule at all.
  - *Revisit-if*: the founder wants a guarantee, the group starts relying on the record, or
    Turso's free tier changes. Re-adding the nightly job is a `Cron` around `dumpDatabase`.

## 2026-09-11 — Fraunces loaded through next/font/google, self-hosted at build

- **Context**: `docs/DESIGN-SYSTEM.md` names one webfont, Fraunces, "self-hosted and subset", but
  the Stage 1 scaffold named it in CSS without ever loading it, so every heading fell back to
  Georgia. Found by the Stage 1 design review.
- **Decision**: load **Fraunces 700, Latin subset, `display: swap`** via **`next/font/google`**,
  exposed as `--font-display` with a Georgia fallback. Next downloads the font at build time and
  serves it from `/_next/static/media` — **the browser never contacts Google**, which keeps the
  "self-hosted" requirement and adds no third-party request to a private app.
- **Alternatives**: (a) *`next/font/local` with a committed woff2* — equally self-hosted, but a binary
  in the repo to keep current and subset by hand. (b) *A `<link>` to Google Fonts* — a third-party
  request on every page view of a private app; rejected.
- **Consequences**: the build needs network access to Google Fonts (CI has it). The build emits
  three subset files (Latin, Latin-ext, Vietnamese); only the ~18 KB Latin file is preloaded, and
  the others are fetched only if a page renders those characters — `next/font/google` cannot drop
  them. Revisit if builds must run offline: switch to `next/font/local`.

## 2026-09-11 — $-free password hash format

- **Context**: QA followed `lib/config/README.md` § Local development verbatim and the app refused
  the correct password with nothing in the logs. The stored hash was `scrypt$N$r$p$salt$hash`, and
  Next's `.env.local` loader expands every `$` (quoted or not — the quotes are gone before
  expansion runs), so the salt and hash were silently deleted. Whether a given hash survived
  depended on its random bytes, which also made one test flaky. The same hash is pasted into an
  `aws ssm put-parameter` command in the first-time-setup / lockout runbook, where a `$` in double
  quotes is mangled the same way. Nothing has been deployed and no hash exists anywhere yet.
- **Decision**: the stored format is now **`scrypt:N:r:p:salt:hash`, with salt and hash in unpadded
  base64url** — only `[A-Za-z0-9:_-]`. scrypt and its parameters (N=16384, r=8, p=1, 32-byte key,
  16-byte salt) and the constant-time compare are unchanged. The parser is strict and **the old `$`
  form is not accepted**. The login path now logs `login.malformed_password_hash` (never the value)
  when the stored hash does not parse, so this failure can never again look like a wrong password.
- **Alternatives**: (a) *Document "escape every `$` as `\$`"* — works, but relies on a human doing
  it perfectly at a lockout, and the README's plain paste would still break. (b) *Have `lib/config`
  repair the value* — impossible; expansion destroys the bytes. (c) *Tell people to quote it* — does
  nothing, as `tests/config/local-env.test.ts` shows. (d) *Keep reading the `$` form too* — nothing
  holds one, and a second accepted format is a second thing to get wrong.
- **Consequences**: the hash pastes safely into `.env.local`, a shell command or the AWS console
  with no quoting rules to remember. Any `$`-format hash generated before this change (e.g. in a
  developer's `.env.local`) must be regenerated with `node scripts/hash-password.js`; the log line
  says so. Revisit if the hash algorithm changes — the new format must keep to the same alphabet.

## 2026-09-10 — Region correction: ap-southeast-2 (Sydney), not eu-west-2 (London)

- **Context**: the hosting ADR below ("Stack and hosting", same date) placed the app in
  **`eu-west-2` (London)** and justified it as *"founder and players are UK-based"*. ⚠️ **That
  justification rested on a factual error: the founder is in Australia, not the UK.** It was never
  a weighing of options that went the wrong way — the input was simply wrong, which is also why
  this log now carries a currency note quoting costs in Australian dollars. The error was caught
  **before anything was provisioned**: no stack has been deployed, and no AWS resource — bucket,
  distribution, Lambda, parameter, schedule — exists in any region. The founder's AWS CLI is
  already configured for `ap-southeast-2`, and the Stage 1 infrastructure code (`sst.config.ts`,
  `scripts/deploy.sh`) was written against `ap-southeast-2`. **The code was right; the docs were
  behind.** Fixing this today costs an editing session. Fixing it after a deploy means recreating
  every resource, re-issuing DNS, and moving photos between buckets.
- **Decision**: **the app region is `ap-southeast-2` (Sydney)**, one region, prod only. Everything
  that has a region follows it:
  - **Lambda, CloudFront's origin, SSM Parameter Store, CloudWatch Logs, EventBridge Scheduler** —
    `ap-southeast-2`.
  - **The S3 photo bucket `five-crowns-photos`** — `ap-southeast-2`, so browser uploads go to the
    near bucket and the Lambda reads it in-region.
  - **The Turso database** — *(⚠️ superseded 2026-09-11: Turso no longer offers Sydney; the
    database is in **Tokyo**. See "The Turso database lives in Tokyo" at the top of this log.)*
    Its primary location is ~~Sydney (`syd`)~~, not London (`lhr`). The photo
    upload and the vision call dominate the latency budget, but there is no reason to put the
    database on the other side of the planet from the only thing that queries it.
  - **The nightly backup Lambda and its S3 destination** — same region, same bucket.
  - ⚠️ **The one thing that does *not* follow the app region: the ACM certificate for the custom
    domain must still be issued in `us-east-1`.** CloudFront accepts certificates from `us-east-1`
    only, whatever region the app runs in. This constraint is **unchanged by this ADR** and is the
    single most common way a first deploy fails, because the error message never says so. The
    runbook in `docs/ARCHITECTURE.md` is correct as written and was deliberately left alone.
  - **The "Stack and hosting" ADR below is not rewritten.** This log is append-only; its region
    line is marked superseded and points here, so the history of the mistake survives.
- **Alternatives**: (a) *Stay in `eu-west-2`* — the only argument for it was a false premise, and
  it carries a real cost (below). (b) *`us-east-1`* — cheapest headline prices and no certificate
  special-casing, but ~200 ms away from every user of this app to save a fraction of a cent a
  month. (c) *Multi-region or CloudFront-with-a-distant-origin-plus-caching* — the pages that
  matter are authenticated and dynamic, so they do not cache; this would be complexity bought to
  paper over a wrong region. (d) *Defer the change until the first deploy* — rejected; that is
  precisely the moment it stops being free.
- **Consequences**:
  - **The consequence that actually matters is round-trip latency.** Sydney↔London is roughly
    **250–300 ms of round trip**, and every uncached request in this app is a round trip to the
    origin: the login POST, the presigned-URL request, the save, and every page of the archive.
    Serving Australian users from London would have added that to all of them, and the photo
    upload — several MB from a phone on domestic broadband — would have crossed the planet as
    well. From Sydney the same requests are ~10–30 ms away. Nothing about the app's design changes;
    it simply stops being needlessly slow for the only people who use it.
  - **Cost is unchanged: still about A$0.65/month all in.** Checked rather than assumed, at this
    volume (8 uploads/month, ~0.6 GB stored after a year, a few hundred page views):
    - **Lambda** — the *always-free* 1 M requests + 400 k GB-s tier applies in `ap-southeast-2`
      exactly as in `eu-west-2`, and this app uses a rounding error of it. **No difference.**
    - **CloudFront** — priced by the **viewer's edge location, not the origin region**, so moving
      the origin does not move the bill at all; and the always-free 1 TB/10 M-request tier covers
      this app either way. **No difference.**
    - **S3** — Sydney's per-GB Standard rate is within a fraction of a cent of London's. On ~0.6 GB
      that is **well under one cent a month**, and it stays under a cent even at the decade-scale
      ~6 GB projection.
    - **Verdict: the difference is negligible — it does not move the A$0.65/month figure and is not
      an open question.** No cost table anywhere needs a new number because of this change.
  - ⚠️ **Anything already written down with `eu-west-2` in it is wrong.** `docs/ARCHITECTURE.md`
    has been corrected throughout — the stack table, the system diagram, and every runbook command
    carrying a `--region` flag, including the lockout-recovery and custom-domain procedures. If a
    stray `eu-west-2` turns up later, it is a typo to fix, not a second opinion to reconcile.
  - ⚠️ **Deploying with the CLI pointed at the wrong region is a silent way to create a second,
    empty copy of the app.** `scripts/deploy.sh` pins the region; nobody should override it with
    `AWS_REGION` or an `aws configure` profile that disagrees.
  - **The same wrong assumption was swept for elsewhere, and it had left two other marks.**
    ⚠️ **The date default is now specified as the browser's local calendar day, not the server's.**
    Lambda runs on UTC; at UTC+0/+1 a UTC "today" is right nearly always, but at UTC+10/+11 it names
    *yesterday* for the first ten-to-eleven hours of every local day — so a game entered the morning
    after would have been filed a day early. This was latent under the UK assumption and is now
    written down in `docs/ARCHITECTURE.md`. Separately, the PRD described a re-read as costing "a few
    pence" (now "a few cents"), and the cost section of `docs/ARCHITECTURE.md` carries a note that
    its bare `$` figures are USD list prices, ≈ A$0.65/month all in.
  - **Revisit if**: the founder moves, or players outside Australia become a meaningful share of
    use — neither of which is true of a game played around one kitchen table.

## 2026-09-10 — Monotonicity is a floor, not an error detector (Milestone 0 verdict)

- **Context**: the PRD, corrected on 2026-09-10, replaced the lost summation proof with three
  weaker checks and named monotonicity the main one. Milestone 0 existed to measure how much
  work it actually does. Full workings in `docs/SPIKE-M0-READING.md`.
- **Decision**: **treat monotonicity as a save-gate against impossible data and as nothing else.**
  The spike measured **0 misreads caught out of 9; 9 of 9 slipped through.** ⚠️ **No product
  wording, anywhere, may describe a transcription as checked, validated or verified.** The
  strongest honest claim is *not obviously wrong*, which is already the PRD's wording.
  ⚠️ **Do not build "transcribe twice and compare"** — the spike found errors repeat
  deterministically on the same ambiguous digits (two cells were misread identically in 3 of 3
  independent reads), so a second read returns the same wrong answer and manufactures false
  confidence. Targeted per-column re-photograph survives, because it supplies new pixels rather
  than a second opinion on the same ones, and must never be worded as "reading it again to check".
  **Derived per-hand scores stay on the review screen as a reading aid, not as a validator** —
  a wrong interior cell perturbs two adjacent hand scores in opposite directions and both remain
  plausible.
- **Alternatives**: (a) drop monotonicity entirely — no; it is free and it does stop genuinely
  impossible states being saved. (b) Add a plausibility band on per-hand deltas — the spike's
  slipped errors produced hands of 15, 12, 16 and 3, all ordinary; any band tight enough to catch
  them would fire constantly on real play. (c) Second-model cross-read — unevaluated, and the
  deterministic-error finding makes it likely to agree with the first.
- **Consequences**:
  - **The human review step is the entire quality control**, not most of it. Every argument for
    the Column Sweep and against a "looks fine, save" shortcut is now evidence-backed.
  - Exposure is **bounded**: a wrong interior cell is self-cancelling in a running total, so
    ~~final scores, winners and total-derived records are safe (**0 errors in row 11 across all six
    reads; winner correct 6/6**)~~.
    ⚠️ ***Corrected 2026-09-14**: that struck-through clause reported this spike's six-read sample
    as if it were a structural property. Self-cancelling covers **interior** cells only — row 11 has
    no hand 12 to cancel against — and a real-API re-run found **row 11 wrong in 3 of 6 reads**
    (winners still 6/6, by margin rather than by construction). Final scores and total-derived
    records are **not** safe. See "Row 11 is not self-cancelling" at the top of this log.*
    ⚠️ **Hand-by-hand analytics are the exposed ones** and will be
    confidently wrong when a cell is wrong.
  - Row 11 gets its own treatment on the review screen (`FinalRow`) — already in the design
    system, now justified by evidence.
  - The **name pick-list in M1 is load-bearing**: a player's name was misread in 2 of 6 reads.
  - **Revisit if**: a re-run through the production API path with structured outputs shows a
    materially different error profile, or a later model changes the numbers. *(⚠️ **This condition
    fired on 2026-09-14.** The re-run confirmed the monotonicity verdict and corrected the row-11
    claim above — see the 2026-09-14 entry at the top of this log.)*

## 2026-09-10 — Development runs on the founder's Claude subscription until an API key is needed

- **Context**: the reading spike needed transcriptions, and no `ANTHROPIC_API_KEY` exists on the
  machine. The founder asked to keep development costs inside the existing subscription for now.
- **Decision**: **development and experiments run through the Claude Code session on the
  subscription. The founder supplies an API key when the product itself needs to call the API** —
  which is Milestone 1's admin panel, where the key is set and verified with a real call.
- **Alternatives**: provision a key immediately — rejected by the founder for now; nothing before
  M1 requires one.
- **Consequences**:
  - ⚠️ Spike results carry a **fidelity caveat**: same model and images, but through the harness
    rather than the API with `output_config.format`. Error rates are indicative, not a benchmark.
  - **Re-run the spike through the real API once a key exists** (~A$0.30, and the sheets are kept),
    before relying on its numbers for anything load-bearing.
  - No AWS or API spend is incurred before the founder decides to start it.

## 2026-09-10 — Custom domain on external (Lightsail) DNS; no Route 53 hosted zone

- **Context**: the founder owns `ribenajuice.xyz` and wants the app at
  **`fivecrowns.ribenajuice.xyz`**. ⚠️ A `dig NS` lookup returns AWS nameservers, which we initially
  read as "the zone is in Route 53" — **it is not**. DNS is managed in **AWS Lightsail**, which also
  serves from `awsdns` nameservers, so the lookup is ambiguous and cannot settle the question.
  Recorded because it is a plausible wrong turn for anyone re-deriving this later. The founder is
  happy to administer DNS records themselves.
- **Decision**: **no Route 53 hosted zone is created**, by SST or CloudFormation. The domain is
  configured with SST's external-DNS idiom — **`dns: false` plus an explicitly supplied certificate
  ARN** — and the founder adds two CNAMEs in Lightsail by hand, following a step-by-step runbook in
  `docs/ARCHITECTURE.md` written for a product manager rather than an engineer.
  - The **ACM certificate is issued in `us-east-1`**, even though the app runs in ~~`eu-west-2`~~
    *(region superseded 2026-09-10 → `ap-southeast-2`)*, because CloudFront accepts certificates
    from us-east-1 only. ⚠️ **The us-east-1 requirement is unaffected by the region correction.**
  - ⚠️ **`fivecrowns` is a subdomain, so a plain CNAME to the CloudFront distribution works** — no
    apex/ALIAS complication, which is the whole reason this stays a two-record job.
  - ⚠️ **The custom domain is not part of the first deploy.** `sst.config.ts` attaches it only when
    both `APP_DOMAIN` and `APP_CERT_ARN` exist as optional SSM parameters, read by
    `scripts/deploy.sh`. Absent them, the app deploys and works on its CloudFront URL.
- **Alternatives**: (a) *Create a Route 53 hosted zone for the subdomain and delegate to it* —
  rejected; **$0.50/month forever**, and it would have been the only line in the entire design that
  bills while nobody is using the app, bought to replace two records the founder can add in a
  minute. (b) *Let SST do automatic DNS validation and record creation* — rejected outright; ⚠️ SST
  cannot write to Lightsail DNS, so it would sit waiting on a validation record that never appears,
  producing a hung first deploy with no useful error. (c) *Move DNS to Route 53* — a migration of a
  domain used for other things, to save the founder two manual records once.
- **Consequences**: AWS running cost returns to **~$0.01/month**, and **the entire running cost of
  the product is now the Anthropic usage**. The cost of that is one manual, ordered procedure the
  founder performs alone — hence the runbook, which spells out the record shapes, the 5–30 minute
  ACM wait, and ⚠️ the one real ordering constraint (**the certificate must reach *Issued* before
  CloudFront will serve the domain**). Milestone 1 can be finished, demonstrated and used before the
  domain exists, and the CloudFront URL ~~keeps working permanently alongside it~~ *(⚠️ superseded 2026-09-11: SST
  closes the CloudFront URL once the domain is attached, and the founder chose one address. See "One
  address" at the top of this log.)*, so a mistyped record
  can never take the app down. **Revisit if** DNS ever moves into Route 53 for other reasons, at
  which point automatic validation becomes free to switch on.

## 2026-09-10 — Location is a table, captured from Milestone 1

- **Context**: the founder asked for it directly — *"I need the ability to log the date of the game,
  as well as the location, as this just provides more data for later analytics."* Date was already
  handled; location is new.
- **Decision**: a **`location` table** with a nullable, indexed FK from `game` — ⚠️ **not a text
  column**. Pick from existing or create new, exactly as players work, with a unique normalised
  `name_key` as a backstop behind the pick-list. **Capture ships in Milestone 1; location analytics
  land in Milestone 3.**
  - **Nullable, and a save is never blocked for want of a location** — old sheets may have no
    recoverable venue, and refusing the game would lose real scores to protect a nice-to-have.
  - **But designed to be dense**: the field defaults to the most recently used location, one tap to
    change. Most games happen in the same few places, so the common case is zero interaction.
- **Alternatives**: (a) *A free-text column on `game`* — rejected for the same reason `player` is a
  table: ⚠️ "Player C's place" / "player cs" / "Player C's House" become three rows, and every location
  stat is then quietly wrong in a way nothing on screen would reveal. It is the fractured-player
  failure mode with the same silence. (b) *Defer the whole thing to Milestone 3 with the analytics*
  — rejected, and the reason is the general principle below. (c) *Make location required* —
  rejected; it would block saving a game over a detail nobody may remember.
- **Consequences**: `game` is now `id`, `played_on`, `location_id`, `roster_id`, `note`,
  `created_at`, indexed on all three dimensions. ⚠️ **Nothing about the roster signature changes** —
  a roster is the set of people, not the room, and keeping them independent is exactly what makes
  "how do these four do at Player C's place?" a cross-tab that already works rather than a fourth
  entity. Win rate by location, per-player performance by venue, and location as a games-list filter
  are all one `GROUP BY` away, and **day-of-week and seasonal slices come free** from `played_on`
  with no extra capture at all.

## 2026-09-10 — Reports are cheap forever; dimensions are only cheap today

- **Context**: the founder asked directly how hard it will be to add reporting features later. The
  honest answer is "it depends entirely on which kind of thing you mean", and that distinction
  deserves to be a written rule rather than something each future session re-derives.
- **Decision**: state it in `docs/ARCHITECTURE.md` as a **property the design is required to keep**,
  and use it to govern sequencing decisions:
  > **Capture dimensions early, build reports whenever.**
  - **A new report is a query plus a screen.** No migration, no backfill, nothing precomputed to
    invalidate — and ✅ **it applies retroactively to the entire history the moment it ships.** A stat
    invented in 2032 covers every game back to the first one.
  - ⚠️ **A new dimension is a five-minute migration and an unfixable hole.** Every game recorded
    before it existed lacks it permanently. Nobody remembers where a game three years ago was
    played, and no model can read it off a photo that never showed it. The data is not recoverable
    at any price.
- **Alternatives**: (a) *Leave it implicit* — it is already true of the design, but an unwritten
  property is one refactor away from being lost, and the founder would keep having to ask.
  (b) *Precompute stats into summary tables for speed* — would trade the retroactivity that makes
  this property valuable for performance we do not need at ~15,000 rows.
- **Consequences**: this is why **location ships in Milestone 1** though its analytics are Milestone
  3 — the field costs an afternoon now, and waiting would cost every game played in between,
  forever. The dimension set is **closed for now** at the founder's word (*"I think we have
  everything covered but we will cross that bridge should we need to"*), which is the right call;
  the rule is what to apply when that bridge arrives. ⚠️ It also sets the standing answer to every
  future *"can we add X later?"*: **a report, yes, whenever — a dimension, only from the day we
  start capturing it.**


## 2026-09-10 — Admin panel behind a second password; no secret ever stored in the database

- **Context**: the founder needs to set the Claude API key, rotate the group password, and take a
  copy of their scores, without a developer and without a deploy — *"I'd also need an admin panel
  to configure things such as the Claude API key, as well as downloading the database too. This can
  be behind an additional password... this admin panel should also be able to set the main password
  as well as the admin password."* ⚠️ The two requests **combine into a hazard**: if the API key is
  in the database and the panel offers a database download, the download is a working API key, and
  the founder hands out a file that can spend their money.
- **Decision**: an admin panel at `/admin`, gated by a **second password independent of the group
  password** — a valid group session grants nothing there. It does exactly five things: set/rotate
  the API key, download the score data, set/rotate the group password, set/rotate the admin
  password, and show this month's usage and estimated spend. Not a settings screen; no toggles, no
  theming, no user management.
  - **No secret is ever written to the database.** The API key, both password hashes and the cookie
    signing secret live in **SSM Parameter Store as SecureStrings**, read *and written* by the
    Lambda role. The hazard becomes structurally impossible rather than something to remember: there
    is no table a secret could be in, so neither the download nor the nightly backup can leak one
    however the export is written.
  - **API key is write-only** — never rendered back; last four characters, when set, and whether it
    works. ⚠️ **Verified with a real API call before it is accepted**, because otherwise a bad key is
    discovered by the founder standing at a table with a sheet to photograph.
  - **Changing the admin password requires the current admin password**, even inside an
    authenticated session, so an unattended unlocked screen cannot be used to take ownership.
  - **Session revocation via epochs.** The cookies are stateless and HMAC-signed, so a signed
    `epoch` claim is checked against `group-session-epoch` / `admin-session-epoch` in SSM. Rotating
    the group password bumps the group epoch and logs out every device — that is the whole point of
    rotating it. Rotating the admin password bumps the admin epoch and logs out **every admin
    session including the one doing the rotating**: if the reason to rotate is a leak, leaving other
    sessions alive defeats it. The two epochs are independent.
  - **Staleness is handled with both mechanisms**: explicit cache invalidation on write (so the
    admin's next request is immediately correct in that container) **plus a 60-second TTL** (so
    every other container converges without any cross-container messaging). ⚠️ A Lambda holding a
    stale key after rotation is a real failure mode with a baffling symptom, and 60 seconds of
    bounded staleness is cheaper than a cache-invalidation fan-out to operate.
  - **Lockout recovery is documented, not folklore**: `scripts/hash-password.js` plus two
    `aws ssm put-parameter` calls, written out in `docs/ARCHITECTURE.md`. **The same path is used
    for first-time setup**, so the recovery procedure is exercised on day one instead of being a
    theory. There is deliberately **no first-run setup screen** — that would leave a window in which
    whoever loads the URL first takes ownership; instead `scripts/deploy.sh` refuses to deploy until
    both password hashes exist.
  - **Setting the API key ships in Milestone 1.** The app cannot transcribe without a key, and a
    walking skeleton that needs a developer awake to fix one is not a walking skeleton.
- **Reconciling with `CLAUDE.md`'s "environment variables only, never in code"**: this reads like a
  departure and is not. The house rule exists to keep secrets out of the repository, and it is fully
  honoured — nothing secret is in git, in the bundle, or in the browser. The only change is *where
  the environment gets its values*: SSM at runtime rather than baked in at deploy, which is what
  makes rotation-without-a-deploy possible. SST secrets already live in SSM; this extends the same
  store to values the app writes as well as reads.
- **Alternatives**:
  (a) *Secrets in the database, filtered out of the export* — rejected outright; it makes a
  money-spending leak one forgotten `WHERE` clause away, and the export code will be edited again.
  (b) *API key only settable by redeploy* — rejected; it makes the founder dependent on a developer
  for the one failure they are most likely to hit alone.
  (c) *AWS Secrets Manager instead of Parameter Store* — rotation features we do not need, at
  **$0.40 per secret per month** — six secrets would cost more than the entire rest of the stack.
  (d) *One password for both group and admin* — rejected; the whole point is that the group password
  gets texted around, and it must not reach the key that spends money.
  (e) *A server-side session table for revocation* — a table and a cleanup job to buy what an
  integer in SSM buys.
- **Consequences**: rotation without a deploy; a download that cannot contain a secret by
  construction; up to 60 seconds of staleness after a rotation, stated on screen. The Lambda
  execution role gains `ssm:GetParameter*`/`ssm:PutParameter` on `/five-crowns/prod/*` plus KMS on
  the `aws/ssm` key, and the OIDC deploy role in `infra/github-oidc.yaml` gains the matching
  actions — ⚠️ **`scripts/aws-bootstrap.sh` must be re-run.** Cost impact is **zero**: standard
  parameters and their reads are free, and the AWS-managed `aws/ssm` key carries no monthly charge
  (⚠️ a customer-managed key would be $1/month, so we do not create one).
  **Revisit if**: more than one person ever needs admin access, at which point this is real auth and
  a managed provider.

## 2026-09-10 — Score-data download: a ZIP of CSVs, and it is explicitly not a backup

- **Context**: the admin panel offers a download. The founder clarified what they mean by it —
  *"the database I'm talking about is just the player scores"* — so this is the numbers, not an
  archive restore. It also doubles as their escape hatch from Turso, the one dependency in this
  design that AWS does not host and that we do not own.
- **Decision**: **a ZIP of CSVs**, generated on demand — `players.csv`, `games.csv`, `rosters.csv`,
  `roster_members.csv`, `round_scores.csv`, a denormalised `games-wide.csv` (one row per player per
  game, the eleven running totals and eleven derived hands as columns) that a human can actually
  read, plus `schema.sql` and a `README.txt`. **Generated in the Lambda and streamed straight back**,
  with no S3 round trip and no presigned URL to expire.
  ⚠️ **It is stated plainly — in this ADR, in `docs/ARCHITECTURE.md`, on screen in the panel, and in
  the download's own README — that the photos are not in it.** A full archive is this file *plus*
  `aws s3 sync s3://five-crowns-photos ./photos`.
- **Alternatives**: (a) *The raw SQLite/libSQL file* — one file and a perfect restore, but it needs
  software the founder does not have, which would make the escape hatch depend on finding a
  developer. (b) *A SQL dump* — restores beautifully, opens in nothing. (c) *Include the photos in
  the ZIP* — gigabytes over a decade, past every Lambda response limit, and it would need S3 and a
  presigned URL and a lifecycle rule to clean up. (d) *Say nothing about the photos* — the failure
  mode is that the omission is discovered at the exact moment it matters most.
- **Consequences**: the founder can open years of games in a spreadsheet on their phone with no
  tools, and can rebuild the record in any database if Turso disappears. Delivery stays trivial
  because the data is tiny — ~15,000 round rows over a decade is well under 1 MB zipped, against a
  6 MB buffered Lambda response limit; **revisit at around 4 MB**, which on this trajectory arrives
  some time after 2100. Photos remain covered separately by bucket versioning with no delete
  lifecycle, and the database by the nightly S3 dump — both of which are now the things to point at
  when someone asks "so what *is* the backup?".

## 2026-09-10 — Targeted per-column re-photograph as a second transcription path

- **Context**: with the summation proof gone, the review screen carries the correctness of the
  record, and the error class monotonicity cannot catch — a misread that preserves ordering — has no
  automated defence at all. The founder asked for a fourth override rung: *"The tool asks for an
  additional photo of a specific column for clarification."*
- **Decision**: build it, as a **second, distinct transcription path** with its own prompt and its
  own structured-output schema (one column: player name, eleven running totals, least-confident
  index) — ⚠️ **not the full-sheet schema with most of it discarded.** Same `claude-opus-5`, same
  adaptive thinking, same structured outputs.
  - **Scoped merge**: only the target column changes; every other column, including cells corrected
    by hand, is untouched.
  - **Non-destructive and repeatable**: each column keeps **every reading it has ever had** as a
    version stack, so restoring the previous values is one tap with no re-upload, and a column can
    be re-shot as often as the founder likes. ⚠️ **A re-read is never automatically authoritative** —
    a close-up can come back worse.
  - **Offered and invokable**: offered on a column that breaks monotonicity or reads as uncertain,
    and invokable by the founder on **any** column at any time. The app cannot tell a plausible
    wrong number from a right one, so it must never gatekeep what may be re-checked.
  - ⚠️ **The expected player name is not given to the model** — that would bias it into reading that
    name and destroy the only cheap check on whether the right column was photographed. The model
    reports what it sees; the server compares afterwards and warns without blocking.
  - **Close-ups are stored permanently with the game**, even when their reading was rejected. They
    are further evidence of what the paper said, which is the same reason the sheet photo is kept.
- **Why it earns its place**: two compounding effects. **Resolution** — the full sheet is downscaled
  to a 1568px long edge, leaving each digit a couple of dozen pixels tall, which is the direct cause
  of the 3-vs-8 error class; a close-up spends the same token budget on a tenth of the page.
  **A narrower task** — eleven numbers in a line for a known player that must climb, versus locating
  a hand-drawn grid and segmenting twenty-plus cells. Same camera, same model, better data and an
  easier question.
- **Alternatives**: (a) *Lean on manual typing* — always available as rung 4, but it makes the
  founder the OCR, and it discards a mechanism that attacks the error at source. (b) *A cheaper
  model for re-reads* — explicitly rejected; a re-read happens precisely when accuracy already
  failed. (c) *Automatically re-reading every uncertain column* — spends money and time on the
  founder's behalf and takes the decision away from the person holding the paper.
- **Consequences**:
  - ⚠️ **The data model changes from one photo per game to many**: `photo` gains `kind`
    (`'sheet'`|`'column'`), a nullable `player_id`, and a partial unique index enforcing exactly one
    sheet photo per game.
  - ⚠️ **Review state can no longer be client-side only.** On iOS, opening the camera can evict the
    web page from memory, and this feature *is* "go and open the camera". A server-persisted `draft`
    row (one JSON blob, autosaved) is required so corrections are not silently lost on the exact
    interaction the founder reaches for when things have already gone wrong. That draft also becomes
    the single object all four override rungs operate on, including the structural edits.
  - **Cost is not a constraint and no cheap-out is designed in**: a narrow column crop is ~1,100
    image tokens rather than ~2,500, so a re-read costs **about 1.5¢ — less than half a full-sheet
    read**. No re-read cap, no cheaper model, no discarding close-ups to save space. Estimated
    Anthropic spend rises from ~$0.28 to ~$0.40/month.
  - The daily abuse cap is now **counted separately for sheets and columns** (20 and 60/day), so a
    legitimate session re-shooting several columns cannot trip a limit aimed at a leaked password.
  - `transcription.kind` records which path produced a reading, which will answer **"how often does
    a close-up beat the full-sheet read?"** — the evidence that justifies or retires this path.
  - **Revisit if**: close-ups turn out to be no more accurate than the full-sheet read, in which case
    the rung collapses back into manual typing.


## 2026-09-10 — The pad records running totals; monotonicity replaces the summation check

- **Context**: the PRD rests on a stated property of the sheet — "eleven round scores and a total,
  and the rounds must sum to the total... every column carries its own proof". Two real
  scoresheets then arrived (`fixtures/sheets/`, transcribed and founder-verified in
  `fixtures/sheets/GROUND-TRUTH.md`) and **the pad does not work that way**. Columns are **running
  totals**, monotonically non-decreasing, and there is **no totals row** — the eleventh number *is*
  the final score. Sheet 1 even has a totals box ruled underneath, left blank. The founder has
  since confirmed the pad is *never* kept as per-hand scores. The self-proving property the whole
  product was designed around does not exist.
- **Decision**: assume the running-total format **unconditionally** — no detection, no toggle, no
  branch. Validation becomes:
  - **Hard, blocks the save**: exactly 11 values per column; non-negative integers; **monotonic
    non-decreasing** (`v[i] >= v[i-1]`); at least two named columns.
  - **Per-hand scores are derived** as first differences (`d[1] = v[1]`,
    `d[i] = v[i] − v[i−1]`). The PRD's "store every round separately" requirement survives — we
    compute the rounds instead of reading them. Both the running total and the derived score are
    stored, because the running total is the artifact a human actually verified against the paper.
  - **Soft, never blocks**: implausibly large deltas, digit-count anomalies. The app stays
    ignorant of the rules of Five Crowns, so every plausibility bound is a heuristic about
    handwriting, not a rule about the game.
  - ⚠️ **Repeats are never flagged.** Player D's six consecutive 64s on sheet 1 (five zero-point hands)
    are verified correct. Any validator treating consecutive repeats as a duplicate-read is
    provably wrong on a real sheet. Likewise Player B's genuine **51-point single hand** would trip
    any large-delta threshold worth having — which is exactly why that check can only ever warn.
- **Alternatives**:
  (a) *Keep the summation check by asking players to also write per-hand scores* — rejected;
  changing how people keep score at the table to suit the software inverts the PRD's core ethic
  that the paper is the game and the app adapts to it.
  (b) *Support both formats with detection* — rejected after the founder confirmed there is only
  one. A detection branch is a permanent source of subtle bugs bought for a case that never occurs.
  (c) *Have the model output per-hand scores directly* — rejected; it would be inventing arithmetic
  we can do deterministically, and it discards the running totals, which are the numbers actually
  written on the paper and therefore the only thing a human can verify against the photo.
- **Consequences**:
  - ⚠️ **The check is strictly weaker.** Monotonicity catches order-breaking misreads only. Any
    error preserving the ordering — 123 read as 128 between 118 and 137 — passes cleanly.
  - ⚠️ **One misread value now corrupts two derived hands**, the delta into it and the delta out of
    it. Under the assumed format a bad cell damaged one round. The error surface is larger.
  - ⚠️ **A misread of the last value is the worst case**: wrong final score, wrong winner, wrong
    entry in every stat mentioning that player.
  - **The human review step is now the primary correctness mechanism, not a backstop.** The PRD's
    "show the transcription beside the photo every time" is upgraded from a courtesy to the main
    guarantee. Concretely this forces three UI requirements: a pinch-zoomable photo, the derived
    per-hand scores displayed live beside the running totals on every keystroke (a misread that
    hides in the totals often looks obviously wrong as a hand score — the only partial defence
    against the error class monotonicity cannot catch), and the final row called out separately so
    a wrong winner is spotted in one glance.
  - **Cross-column row alignment stops mattering**, which is a genuine simplification: each column
    is read and validated independently, and the fixtures show the rows visibly do not line up.
  - `fixtures/sheets/GROUND-TRUTH.md` is the reading spike's reference corpus **and** the Milestone
    1 acceptance test. It is founder-verified — do not edit it.
  - **Revisit if**: the spike shows monotonicity catches too small a share of real errors to be
    worth the review burden, in which case the honest answer is a second independent read of each
    column and a disagreement flag, not a cleverer rule.

## 2026-09-10 — Vision model: `claude-opus-5`, adaptive thinking, structured outputs

- **Context**: reading a hand-ruled grid photographed at an angle in kitchen light is the entire
  product risk. The founder chose an image-interpreting model over traditional OCR and is happy to
  pay per use. The remaining question was which model.
- **Decision**: **`claude-opus-5`** (exact string, no date suffix), with `thinking: {type:
  "adaptive"}` and **structured outputs** via `output_config: {format: {...}}` so the transcription
  arrives as a validated object rather than prose to be parsed. The arithmetic, at the founder's
  volume of ~8 sheets/month:

  | | tokens | rate | cost |
  |---|---|---|---|
  | Image (1568px long edge ≈ 1568×1176; ÷750) | ~2,500 | $5/MTok | $0.0125 |
  | Prompt | ~500 | $5/MTok | $0.0025 |
  | Output incl. adaptive thinking | ~800 | $25/MTok | $0.0200 |
  | **Per sheet** | | | **$0.035 (3.5¢)** |
  | **Per month at 8 sheets** | | | **~$0.28** |

  Sonnet 5 at $3/$15 would be ~$0.021/sheet, about **$0.17/month** — a saving of roughly **$0.11 a
  month, well under 20p**. Transcription accuracy *is* the product risk; trading it for a tenth of
  a dollar is not a trade worth making.
- **Alternatives**: (a) Tesseract or AWS Textract — settled against by the founder, not
  relitigated; both are built for printed or form-shaped documents and this pad is neither.
  (b) Sonnet 5 — the arithmetic above. (c) A cheap model with an Opus fallback on failure — extra
  code paths and a second prompt to maintain to save pennies.
- **Consequences**:
  - ⚠️ **`budget_tokens` must not be passed** — Opus 5 returns 400. Use adaptive thinking only.
  - ⚠️ **No assistant prefill** — it 400s on Opus 5.
  - ⚠️ **Never `output_format`** (deprecated) — it is `output_config.format`. Use `strict: true` on
    any tool definition.
  - ⚠️ Implementers must read the bundled **`claude-api` skill** for exact SDK signatures rather
    than reconstructing them from memory.
  - The prompt is written from the fixtures and must state: variable column count, exactly 11
    non-decreasing running totals per column, no totals row, repeats are normal, read the surviving
    value where something is struck through, rows do not align across columns, the page may be
    rotated/shadowed/have a finger in frame, blank ruled lines are not rows, and **an unreadable
    cell must return `null` rather than a guess**.
  - Every attempt is stored in a `transcription` table with its raw JSON and token counts —
    the only way to ever answer "is the new model better than the old one on *our* sheets?"
  - Cost scales only with uploads, so a leaked password is the one runaway risk; capped in the app
    (25 transcriptions/day) and on the API key (console spend limit).
  - **Revisit if**: the spike shows Opus 5 is not materially better than Sonnet 5 on these sheets,
    or a later model reads the fixtures more accurately. Re-transcription is cheap because the
    original photo is kept forever.

## 2026-09-10 — Photos: browser-side rotate and downscale, direct to a private versioned S3 bucket

- **Context**: the photo is the permanent evidence and must be re-checkable against the paper for
  years, and re-transcribable by a better model later without re-photographing. It is also 3–4 MB
  coming off a phone on a domestic connection. Sheet 2 in the fixtures is written along the long
  edge and photographed sideways, so orientation is not fixed.
- **Decision**:
  - The browser applies EXIF orientation, offers a **one-tap rotate control** (four states), then
    produces **two** JPEGs: `original.jpg` (long edge 3000px, q0.9 — the permanent record) and
    `model.jpg` (long edge 1568px, q0.85 — what the model sees). The chosen rotation is baked into
    both and recorded on the `photo` row.
  - Both are uploaded **directly to S3 via presigned PUTs**. Nothing large ever transits Lambda.
  - The bucket is **private and versioned**, with no delete lifecycle. Reads are 5-minute presigned
    GETs.
- **Alternatives**: (a) *Upload through the API* — rejected; needless Lambda payload limits, cost
  and latency for zero benefit. (b) *Resize server-side with `sharp`* — rejected; a native binary
  in the Lambda bundle is a whole category of deploy pain, bought to do something a canvas does for
  free. (c) *Store only the original and let the API downscale* — rejected; 1568px is the point
  above which the API downscales anyway, so sending more costs upload time on a phone and makes the
  image-token count, and therefore the cost, unpredictable. (d) *Model-detected orientation* —
  rejected; one tap from a human who is holding the sheet beats a round trip to a model.
- **Consequences**: no image processing in Lambda at all; predictable per-sheet cost; photo storage
  is fractions of a cent a month and roughly $0.09/month after a decade. Versioning means an
  accidental or malicious delete is recoverable, which matters when everyone shares one password.
  Abandoned reviews leave orphan photos and `photo` rows; harmless at a few megabytes, and they are
  the evidence for why a sheet failed. **Revisit if**: 3000px turns out to be too coarse to settle
  an argument about a smudged digit.

## 2026-09-10 — Access control: one shared password, scrypt hash, stateless signed cookie

- **Context**: the PRD is explicit — one shared password on the front page, no accounts, no signup,
  no per-user identity, and everything past the gate is the same for everyone. A password gate is
  the one thing here that is genuinely easy to build badly.
- **Decision**:
  - Store **only a scrypt hash** of the password, in SSM as a SecureString. The plaintext exists
    nowhere in the repo, the database, or the pipeline. ⚠️ Never in code.
  - On success, set an **HMAC-signed, `HttpOnly`, `Secure`, `SameSite=Lax` cookie** carrying
    `{v, iat, exp}`, `Max-Age` 400 days. **Stateless — no session table.**
  - Next.js middleware **denies by default**; only `/login` and `POST /api/login` are allowlisted.
  - Rate-limit login attempts per IP in the database (~10 per 10 minutes), on top of scrypt's cost.
  - Revocation is an **epoch bump** — the signed cookie carries an `epoch` claim checked against
    `/five-crowns/prod/group-session-epoch`. Rotating the group password from the admin panel bumps
    it and logs out every device at once. That is the entire revocation story. *(Superseded detail:
    an earlier version of this ADR said `SESSION_VERSION`; the admin-panel ADR above makes it a
    runtime-mutable SSM parameter so rotation needs no deploy.)*
  - Photo URLs are 5-minute presigned GETs, so a copied image link is not a permanent hole.
  - A **daily transcription cap** plus a spend limit on the Anthropic API key. *(Revised by the
    per-column re-read ADR above: counted separately as 20 sheet reads and 60 column reads per day,
    so a legitimate session re-shooting several columns cannot trip it.)*
- **Alternatives**: (a) *Clerk / Auth.js / Cognito* — the house default is managed auth, and it is
  the right default, but all three model **user identity**, which the PRD explicitly does not want.
  Adopting one would mean either creating fake accounts or using ~5% of a service and maintaining
  an integration for it. This is the deviation-with-an-ADR case. (b) *HTTP Basic auth at
  CloudFront* — no logout, ugly browser prompt, awkward on mobile, and the password ends up in a
  CloudFront Function. (c) *A server-side session table* — a table and a cleanup job to buy
  revocation we already get by bumping a version number. (d) *Plaintext password in an env var* —
  rejected outright.
- **Consequences**: honestly stated, this protects against search engines and passers-by, and
  nothing else.
  - ⚠️ Anyone the password is texted to can read, edit and delete everything, and **nothing records
    who did it**. The PRD accepts this.
  - ⚠️ It will be forwarded, and it cannot be un-shared except by changing it and re-texting
    everyone.
  - The only exposure that costs real money — someone spending the founder's Anthropic budget — is
    the one that *is* mitigated, twice, because it is the only one with a bill attached.
  - **Revisit if**: the group grows past friends, the record is ever shared outside it, or an audit
    trail is wanted — any of which means real accounts and a managed provider.

## 2026-09-10 — Roster identity: a sorted-player-id signature

- **Context**: the founder's "roster" is the *exact, order-independent set* of players in a game,
  used to ask "how do we do when it's exactly these four?" separately from per-player stats. It
  needs a stable identity so the same set of people always resolves to the same roster. The two
  fixture sheets are a four-player and a five-player night among the same friends, so this is not
  hypothetical.
- **Decision**: `roster.signature` = **the roster's player IDs, sorted ascending, joined with
  `:`** — e.g. `p_3f2a:p_9ab1:p_c410` — with a `UNIQUE` index on it. The save handler upserts on
  the signature; that index *is* the "created the first time its exact set appears, reused silently
  after" behaviour. `size` is denormalised alongside it. `name` is `NULL` until someone renames the
  roster, and the UI renders an auto-name from the members when it is null.
- **Alternatives**: (a) *A signature built from names* — rejected; renaming "Jo" to "Joanne" would
  silently fork the roster, which is the exact failure mode the PRD warns about. (b) *A hash of the
  sorted IDs* — same properties but unreadable in the database, and at ten players there is nothing
  to save. (c) *Lookup by joining `roster_member` and counting* — a correct-but-fiddly query
  repeated everywhere, versus one unique index. (d) *Subset grouping* — explicitly a non-goal.
- **Consequences**: order-independent and rename-proof by construction. Exact matching falls out
  for free: a 3-player and a 4-player signature are different strings and cannot collide. Leaving
  `name` null means the auto-name follows a player rename automatically while a custom "Thursday
  crew" sticks — no stale-name bug.
  ⚠️ **The Milestone 2 player-merge feature must recompute signatures**: merging two people changes
  the signature of every roster containing either, and two rosters can collide onto the same
  signature. Merge therefore has to fold the colliding rosters together, moving games onto the
  survivor and preferring the human-named one. Recorded here so it is not discovered mid-merge.

## 2026-09-10 — Database: Turso (libSQL/SQLite), with a nightly SQL dump to S3

- **Context**: the analytics catalogue is a headline v1 feature and is a dozen relational
  aggregates — head-to-head, nemesis, streaks, per-hand villains, comebacks. The data is tiny:
  ~300 games × 4–5 players × 11 hands ≈ **15,000 round rows over a decade**. Fixed cost must be
  near zero, which rules out anything always-on.
- **Decision**: **Turso** (hosted libSQL/SQLite) over its HTTP driver, with **Drizzle ORM** for
  schema and migrations. Every stat is computed on demand as a full-table SQL aggregate — **no
  materialised views, no summary tables, no caching, no precomputation.** A nightly scheduled
  Lambda dumps the whole database to `s3://five-crowns-photos/backups/`.
- **Alternatives**: (a) *DynamoDB* — the AWS-native, genuinely-free, zero-account option, and
  defensible on volume, but every stat in the catalogue would become a table scan plus hand-rolled
  aggregation in application code. The founder will keep asking for new stats; SQL answers those in
  a query, DynamoDB answers them in a pull request. (b) *RDS Postgres* — ~$15/month minimum,
  always-on, for 15,000 rows. (c) *Aurora Serverless v2* — floors at ~$43/month at 0.5 ACU.
  (d) *Neon Postgres* — genuinely comparable (free tier, scales to zero); SQLite wins on being the
  more boring of the two for a dataset this size. (e) *A SQLite file on EFS or in S3* — write
  concurrency and durability problems in exchange for nothing.
- **Consequences**: SQL for the analytics, no connection-pool problem in Lambda (the driver is
  HTTP), and the local dev database is a plain file. ⚠️ **It is a third-party dependency outside
  AWS and outside the OIDC deploy path** — its free tier is a company's commercial decision, not a
  contract. The nightly dump is the mitigation: losing Turso entirely costs at most one day of
  games and an afternoon restoring into a fresh libSQL database, and the paid tier is $5/month if
  it ever came to that. **Revisit if**: Turso's terms change, or a stats page ever takes more than
  300 ms — which, at 15,000 rows, it will not.

## 2026-09-10 — Stack and hosting: Next.js on AWS Lambda via SST, one region, prod only

- **Context**: the Anthropic API key must never reach the browser, so a pure static SPA is out —
  there has to be a server. The house deploy path is AWS via GitHub Actions with OIDC and
  `scripts/deploy.sh` as the single entrypoint. Traffic is 1–2 uploads a week and a handful of page
  views, so anything always-on is a fixed bill for an idle machine.
- **Decision**: **Next.js 15 (App Router, TypeScript) + Tailwind**, deployed by **SST v3** to
  **Lambda + CloudFront + S3** in **~~eu-west-2 (London)~~ → `ap-southeast-2` (Sydney)**
  *(⚠️ **region superseded 2026-09-10** — see “Region correction: ap-southeast-2 (Sydney), not
  eu-west-2 (London)” at the top of this log. The London choice rested on a factual error about
  where the founder is; it was corrected before anything was provisioned. The original wording is
  left struck through rather than edited, because this log is append-only.)*, one stage (`prod`).
  Secrets are SST
  Secrets in SSM Parameter Store. `scripts/deploy.sh` runs `sst deploy --stage prod` then applies
  migrations through `sst shell`, and CI runs exactly that script under OIDC.
- **Alternatives**: (a) *Vite SPA on S3+CloudFront plus a separate Hono Lambda* — simpler infra but
  two deployables, CORS, and duplicated auth wiring; Next.js Server Components also let the browse
  and stats pages render straight from SQL with no client data-fetching layer at all. (b) *AWS
  Amplify Hosting* — the lowest-ops way to run Next.js on AWS, but it is git-connected with its own
  build system, which bypasses `scripts/deploy.sh` and the OIDC wiring the repo already has.
  (c) *App Runner or Fargate* — always-on, ~$5–25/month, for an app used twice a week.
  (d) *Leaving AWS for Vercel or Fly* — genuinely cheaper in effort, but the CI/CD, the OIDC role
  and the photo bucket are all already AWS, and splitting the footprint across two providers costs
  more in operational surface than it saves.
- **Consequences**:
  - **Estimated cost: ~US$0.01/month on AWS**, plus ~US$0.40 of Anthropic and US$0 of Turso —
    **about US$0.42/month all in (≈ A$0.65), custom domain included.** Well inside the ceiling
    (US$20 ≈ A$30).
  - ✅ **Nothing bills while nobody is using the app.** *(Superseded detail: this ADR originally
    flagged a Route 53 hosted zone at $0.50/month as the one line that would. The custom-domain ADR
    above removes it — DNS lives in Lightsail, so no zone is created and the AWS bill is
    ~$0.01/month.)*
  - Lambda's and CloudFront's free tiers are perpetual; the S3 5 GB tier is 12-month only, after
    which photos cost cents.
  - ⚠️ **Cold starts** of roughly a second are the normal case at this traffic, not the exception.
    Acceptable for an archive nobody opens mid-game; it would not be for a live scoreboard, which
    the PRD explicitly says this is not.
  - ⚠️ **CloudFront's default 30 s origin read timeout would cut off a vision call.**
    `/api/transcribe` is therefore a **streaming route handler** that emits a progress event
    immediately, so time-to-first-byte is milliseconds; the origin timeout is raised to 60 s and
    the Lambda timeout to 120 s as belt-and-braces. **Revisit if** the spike shows transcription
    regularly exceeding ~45 s, in which case switch to an async Lambda invoke plus client polling —
    but not before, because that is a moving part we do not yet need.
  - ⚠️ **The SST app name must be `five-crowns`**, because `infra/github-oidc.yaml` scopes IAM to
    `role/five-crowns-*`. Any other name fails with an IAM denial that reads like something else.
    A handful of extra IAM read/tag actions SST needs have been added to that template.
  - One region, one environment, no staging, no containers, no queues, no Kubernetes. A second
    environment would double the operational surface to protect a group of friends from a bad
    Thursday.


## 2026-09-10 — Reading spike stays a spike; walking skeleton is Milestone 1

- **Context**: the 2026-09-09 draft said "first thing to build: the reading step, alone, tested
  against real sheets" — because if a photo of the pad can't be read, that is worth knowing in an
  afternoon rather than after a website is built around it. The founder has since confirmed the
  sheet is **hand-ruled and drawn fresh each game**, not a printed grid, which makes reading
  harder and the argument stronger.
- **Decision**: keep the de-risking, but as a time-boxed throwaway **Milestone 0** (half a day,
  3–5 real sheets including a deliberately bad photo). **Milestone 1** remains an end-to-end
  slice a real user can touch: password → photo → review beside photo → arithmetic gate → saved
  game → games list.
- **Alternatives**: (a) make the reading spike Milestone 1 — rejected, it produces nothing a user
  can use and the arithmetic check can't be evaluated outside the review screen anyway;
  (b) skip the spike and build the skeleton straight through — rejected, it risks discovering the
  core assumption is wrong after the product is built around it.
- **Consequences**: half a day before anything shippable, and a set of real sheet photos kept as
  test fixtures. If reading proves hopeless, the fallback is manual grid entry and the rest of the
  product is unaffected. Revisit if the spike shows reading is reliable enough to be uninteresting.

## 2026-09-10 — Superseded assumptions from the 2026-09-09 draft plan

Recorded so they are not relitigated. All four were overturned by the founder at kickoff.

- **Analytics deferred to a later version** → **superseded**: analytics are a headline feature of
  v1. The draft's supporting decision — *store every round separately, never just a final score* —
  survives unchanged and is now load-bearing rather than speculative.
- **"One keeper of the record", no other players logging in** → **superseded**: a single shared
  password on the front page; anyone in the group can upload and browse. Still no accounts, no
  per-user login, no signup. Consequence: no audit trail of who did what. Accepted.
- **Open question "is there a backlog of old sheets?"** → **answered**: a handful. No bulk-import
  mode; the normal flow used a few times in a row is enough.
- **Open question "does the same group play, or does it vary?"** → **answered**: it varies, which
  is why **Player** (a person, persisting across games) and **Roster** (the exact, order-independent
  set of players in a game, auto-named and renameable) are both first-class concepts, and why
  name-matching sits inside the review step.
- **Open question "phone only or PC as well?"** → **answered**: mobile-first web app, phone primary.
- **Open question "what does the sheet look like?"** → **answered**: hand-ruled on a notepad, drawn
  fresh each game, names across the top, rounds down the side.

**Unchanged and still central**: the paper stays; this is an archive, not a scoreboard; the
arithmetic self-check is the whole idea; nothing saves until the columns agree; the transcription
is shown beside the photo every time; the app does not know the rules of Five Crowns.
