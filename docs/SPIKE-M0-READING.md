# Milestone 0 — reading spike: findings

*Run 2026-09-10. The spike itself was throwaway; this file is the part that survives.
Player names anonymised to Player A–E as everywhere else in `docs/` — the repo is public.
Mapping is stable across this document and the PRD.*

## The two questions, answered

The spike existed to answer two questions, and only two:

| | Result |
|---|---|
| **How often does monotonicity catch a misread?** | **0 out of 9.** Never. |
| **How often does a misread slip through it?** | **9 out of 9.** Always. |

**Monotonicity is not an error detector.** It is a floor that stops impossible data being
saved, and nothing more. Every claim in the PRD that rests on it catching things must be
read down accordingly.

## What was run

Six independent cold transcriptions — three of each fixture sheet — by `claude-opus-5`
reading the photograph with the production-shaped prompt (variable column count, eleven
non-decreasing running totals, no totals row, repeats are normal, take the surviving value
where struck through, return `null` rather than guess).

Images were pre-processed exactly as the architecture specifies the browser will do it:
EXIF rotation applied, downscaled to a 1568px long edge, ~170KB each.

Each reader ran in an isolated session that had never seen `GROUND-TRUTH.md`. Verified
afterwards by searching every session transcript for any reference to it: none.

⚠️ **Fidelity caveat.** These reads went through the Claude Code harness on the founder's
subscription, not through the Anthropic API with `output_config.format` structured outputs
as the product will. Same model, same images, same instructions; different plumbing, and
no schema validation on the way out. The error *rates* below should be treated as
indicative, not as a production benchmark. Re-running through the real API is a ~A$0.30
job once a key exists, and is worth doing before Milestone 1 ships.

## The numbers

- **297 cells read** (27 player-columns across 6 reads). **9 wrong** — **97.0% cell accuracy**.
- **18 of 27 columns (67%) were perfect.** So roughly **one column in three carries an error**.
- **5 of 6 whole-sheet reads contained at least one wrong number.** Assume every game
  arrives with a mistake in it.
- ~~**0 errors in row 11.** Every final score was read correctly in all six reads.~~ *Corrected
  2026-09-14: this was an unsampled zero, not a structural property — a second run through the
  real API found row 11 wrong in 3 of 6 reads. See "Re-run through the real API" below.*
- **The winner was correct in 6 out of 6.** *(Still true in the 2026-09-14 re-run too — but, per
  below, by margin rather than because final scores are protected.)*
- **2 of 6 reads misread a player's name** (one vowel wrong — a real name rendered as a
  plausible but different name).

## Why monotonicity fails, and it is structural

It is not bad luck, and a bigger sample will not rescue it. **The reader is told that
columns never decrease, so it reads in a way that satisfies that rule.** The check is
checking a constraint the transcriber already obeyed. A check the author of the data is
aware of is not an independent check.

## ⚠️ The errors repeat. Re-reading does not help.

The same cells were misread across independent runs:

| Sheet | Cell | Misread as | Truth | How often |
|---|---|---|---|---|
| 1 | Player C, row 7 | 59 | 57 | 2 of 3 reads |
| 1 | Player D, row 8 | 67 | 64 | 1 of 3 reads |
| 2 | Player B, row 1 | 16 | 10 | **3 of 3 reads** |
| 2 | Player C, row 3 | 78 | 76 | **3 of 3 reads** |

These are specific ambiguous digits on the paper, not random noise. **This kills
"transcribe it twice and compare the two readings" as a safety net** — a tempting and
cheap-sounding idea that would have produced two identical wrong answers and a false sense
of having checked something. Do not build it.

The targeted per-column re-photograph (ADR 2026-09-10) survives this finding, because it
supplies genuinely new pixels rather than a second opinion on the same ones. It should not
be described anywhere as "reading it again to check".

## Derived per-hand scores do not flag a slipped error either

The PRD hoped the derived hand scores would make slipped errors visible. **They do not.**

A single wrong interior cell changes exactly two adjacent hand scores, in opposite
directions, by the same amount. Both results stay entirely plausible:

| Case | Hands as read | Hands in truth |
|---|---|---|
| Player C, row 7 read as 59 | …13 → **15, 12** → 4… | …13 → **13, 14** → 4… |
| Player B, row 1 read as 16 | **16, 0**, 32… | **10, 6**, 32… |
| Player D, row 8 read as 67 | …14 → **3, 0** → 0… | …14 → **0, 3** → 0… |

Nothing here looks wrong. There is no threshold, no anomaly, no rule that separates the
left column from the right. **Derived hand scores are worth showing because they help a
human read the sheet, not because they validate anything.**

## The good news, and it genuinely is good

**A wrong interior cell is self-cancelling in the total.** Since every column is a running
total, an error at row *n* inflates hand *n* and deflates hand *n+1* by the same amount.
The eleventh number — the final score — is untouched.

All 9 errors were interior. All 6 reads produced the correct final scores and the correct
winner.

~~So the exposure is bounded and specific:~~

- ~~**Safe**: final scores, winners, the records board's headline stats, anything derived
  from a player's total.~~ ⚠️ **Corrected 2026-09-14: this claim does not follow from the
  data above, and a real-API re-run disproved it.** "All 9 errors were interior" was a fact
  about this specific 9-error sample, not a property of row 11 itself — row 11 simply never
  got unlucky in six reads. It has no hand 12 to self-cancel against, so it is exposed to
  exactly the same misread rate as every other cell. The re-run (below) found it wrong in 3
  of 6 reads. **Final scores, and anything derived from one as a number (average score,
  best/worst game ever) are not safe.** Winners survive in practice because a game is
  rarely close enough for one misread total to flip who won — that is a claim about margin,
  not about row 11 being protected.
- **Exposed**: everything hand-by-hand — per-hand villains, most rounds won, the
  eleven-hand trend. These are the analytics that will be **confidently wrong** with
  nobody able to tell. *(Row 11 belongs on this list too, per the correction above — it was
  never a separate, safer case.)*
- **The one cell that changes a total is row 11**, and the design already gives it its own
  treatment (`FinalRow`). That is now justified by evidence rather than instinct — the
  founder's own read of that called-out row is the actual mitigation, not any property of
  the cell itself.

## What this means for the product

1. **The review screen is the entire quality control.** Not mostly. Entirely. There is no
   automated check standing behind it — the PRD said the human review "carries most of the
   weight"; it carries all of it.
2. **Never tell the user a transcription passed anything.** The save-gate wording must not
   imply verification. "Not obviously wrong" is the strongest honest claim, and it is
   already the PRD's wording — keep it exactly.
3. **The Column Sweep review screen is the right call, and the readers agree.** Unprompted,
   every reader that met the sideways sheet rotated it and then cropped out one player's
   column at a time and enlarged it. That is the Column Sweep, arrived at independently by
   a reader that had never seen the design. Whatever makes a column readable for the model
   makes it readable for the founder at 11pm.
4. **The name pick-list earns its place immediately.** A name was misread in a third of
   reads. Confirming names against the existing player list (M1) is what stops one bad
   vowel creating a second identity.
5. **Consider cropping per column before transcription, not just for display.** The only
   perfectly clean read of sheet 1 was the one that cropped each column and enlarged it
   before reading. That is a single observation and the sideways sheet contradicts it —
   its readers cropped too and still erred — so this is a hypothesis worth testing, not a
   finding.

## Verdict

**Reading works well enough to build on, and the fallback is not needed.** 97% of cells,
~~100% of final scores,~~ 100% of winners *(winners by margin, not because final scores are
protected — see the 2026-09-14 correction above and the real-API re-run below)*.
Transcribe-then-check is a real time-saver over typing 44–55 numbers by hand.

**But the check is a human one, and the product must stop pretending otherwise anywhere in
its wording.** Milestone 1 proceeds unchanged — including its manual override in full,
which this spike does nothing to reduce the need for.

## Reproducing

The harness and the six raw readings are throwaway and were left in the session scratchpad
(`spike-m0/`), deliberately not committed: they contain real names, and `fixtures/` is
gitignored for the same reason. Regenerating them costs six cold reads and one scoring
script.

---

## 2026-09-14 — Re-run through the real API (Stage 5)

*The fidelity caveat above is now closed.* This run went through the product's own
`POST /api/transcribe`, on a disposable scratch environment, with a real `ANTHROPIC_API_KEY`
and the real structured-output schema (`output_config.format`) — not the Claude Code harness
the original spike used. Same method as before otherwise: three independent, cold reads of
each fixture, six total, each against a freshly uploaded photo and a fresh draft, scored
cell-by-cell against `fixtures/sheets/GROUND-TRUTH.md`. Full raw output (columns, values,
per-attempt diagnostics) is in the session scratchpad, not committed, same reasoning as above.

### The headline numbers, against the original spike

| | 2026-09-10 (harness) | 2026-09-14 (real API) |
|---|---|---|
| Cell accuracy | 97.0% (9/297 wrong) | 96.3% (11/297 wrong) |
| Columns perfect | 18/27 (67%) | 21/27 (78%) |
| Monotonicity catch rate | 0/9 | 0/11 |
| **Row 11 (final score) errors** | **0/6 reads** | **3/6 reads** ⚠️ |
| Winner correct | 6/6 | 6/6 |
| Name misreads | 2/6 | 4/6 (see below) |

**Cell accuracy, the monotonicity-catch rate, and winner-correctness all confirm the original
verdict, within noise of a 297-cell sample.** Nothing here changes the headline "reading
works well enough to build on, and monotonicity is not an error detector."

### ⚠️ One number is meaningfully different, and it matters: row 11 was wrong in half the reads

The original spike's "good news" section rests on **all 9 of its errors happening to be
interior cells** — self-cancelling by construction, since a running total's error at hand
*n* inflates hand *n* and deflates hand *n+1* by the same amount, leaving the final total
untouched. **Row 11 has no hand *n+1* to cancel against.** The original spike never actually
tested what happens when the error lands there; it simply didn't sample one.

This run did. All three `sheet-02` reads — independently, identically — read Darren's final
score as **174** against the true **144** (the tens digit, a 4 read as a 7). This is not
noise: it is the same wrong number, three times, on the one cell where a running-total error
cannot cancel itself out.

**Winner-correctness survived by margin, not by structure.** Darren's real score (144) and
misread score (174) are both far above Caitlyn's winning 71 either way, so the wrong final
score never touched who won. A closer game would not have this luxury: **a 30-point,
100%-reproducible misread on the final row of a real game would silently corrupt that
player's average score, and any "best/worst game ever" record built on it, with nothing
short of a photo re-check ever catching it** — because it doesn't break monotonicity (134 →
174 still climbs) and the model reported normal-to-medium confidence on it (see below).

⚠️ **Correction to the 2026-09-10 ADR's "exposure is bounded" claim.** "Monotonicity is a
floor, not an error detector" states *"final scores, winners… are safe (0 errors in row 11
across all six reads)"*. That sentence described this run's predecessor's sample, not a
structural guarantee, and this run shows the difference: **row 11 is exposed to the same
misread risk as every other cell — it is simply not exposed to the interior cells'
self-cancelling property.** Winners and win-rate stats stay safe in practice because a game
is rarely close enough for a single misread final score to flip who won — but average
score, best/worst game ever, and anything that reads a final score as a number rather than a
comparison are **not** structurally protected, and should not be described as such anywhere.

### The read-hint (`leastConfidentIndex`) did not catch it either

Every one of the three `sheet-02` reads reported its own `leastConfidentIndex` for Darren's
column at **hand 5 or 6** — never at hand 11, where the actual error was. The model's own
uncertainty signal was confidently looking at the wrong cell. This is exactly why the design
system already treats the read-hint as "a reading aid, not a check" (never a validator) —
this run is concrete evidence for a claim that was previously reasoned from first principles
rather than observed.

### Errors repeat, confirmed again

Consistent with the original finding: the Darren/row-11 error (174) and a Cody/hand-4 error
(80 read for a true 86) appeared identically in **all three** `sheet-02` reads. Two further
cells (Dani/hand-5, Caitlyn/hand-1) repeated in 2 of 3. "Cody" was misread as **"Cady"** in
all three `sheet-02` reads — a name misread, not a digit one, but the same deterministic
character. Nothing here supports "transcribe it twice and compare"; it would have
reproduced every one of these errors twice over with no independent signal.

### Cost and timing

Six sheet reads: 37,680 input tokens, 7,543 output tokens, 9.2–29.3s each
(`claude-opus-5`). Two column re-reads (run for Stage 5's criteria 36–45, not part of the
six-read spike count): 11,972 input, 1,257 output tokens, ~12s each. **Total: ~US$0.47
(≈ A$0.73** at the ~1.55 rate this log already uses), for all eight calls combined — in the
PRD's ~A$0.30–0.60 estimated range once the sheet-only six reads are considered on their
own (~US$0.38 / A$0.58), with the two extra column re-reads (bundled in because a real key
was available in the same session) accounting for the small excess over the six-read
estimate.

### Verdict

**The original spike's verdict stands: read, then have a human check it, every time.**
What changes is a specific, previously-unstated risk: **the final row is not immune.** It is
the least frequently wrong cell (self-cancelling neighbours protect it from *interior*
misreads propagating into it, and the sample size here is still small — 6 reads, 1
reproducible row-11 error), but when it is wrong, nothing in the product — not
monotonicity, not the read-hint, not the derived hand scores — will say so. The founder's
own read-through of the final row (already given its own `FinalRow` treatment on the review
screen) is the only thing standing between a 30-point final-score error and a permanently
wrong record. Worth a line in `docs/PRD.md`'s risk section if this is seen again at a larger
sample.
