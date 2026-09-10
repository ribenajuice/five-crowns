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
indicative, not as a production benchmark. Re-running through the real API is a ~£0.20
job once a key exists, and is worth doing before Milestone 1 ships.

## The numbers

- **297 cells read** (27 player-columns across 6 reads). **9 wrong** — **97.0% cell accuracy**.
- **18 of 27 columns (67%) were perfect.** So roughly **one column in three carries an error**.
- **5 of 6 whole-sheet reads contained at least one wrong number.** Assume every game
  arrives with a mistake in it.
- **0 errors in row 11.** Every final score was read correctly in all six reads.
- **The winner was correct in 6 out of 6.**
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

So the exposure is bounded and specific:

- **Safe**: final scores, winners, the records board's headline stats, anything derived
  from a player's total.
- **Exposed**: everything hand-by-hand — per-hand villains, most rounds won, the
  eleven-hand trend. These are the analytics that will be **confidently wrong** with
  nobody able to tell.
- **The one cell that changes a total is row 11**, and the design already gives it its own
  treatment (`FinalRow`). That is now justified by evidence rather than instinct.

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
100% of final scores, 100% of winners. Transcribe-then-check is a real time-saver over
typing 44–55 numbers by hand.

**But the check is a human one, and the product must stop pretending otherwise anywhere in
its wording.** Milestone 1 proceeds unchanged — including its manual override in full,
which this spike does nothing to reduce the need for.

## Reproducing

The harness and the six raw readings are throwaway and were left in the session scratchpad
(`spike-m0/`), deliberately not committed: they contain real names, and `fixtures/` is
gitignored for the same reason. Regenerating them costs six cold reads and one scoring
script.
