# Five Crowns Ledger — PRD

> ⚠️ **DRAFT, and not yet a PRD.** This is the plan agreed in conversation on **2026-09-09**,
> written down so nothing is lost. **`/kickoff` has not been run** — it needs the founder at a
> terminal, and it will interview them and replace most of this. The four questions at the
> bottom are what it should start from.
>
> A formatted version of this plan, written to be read on a phone, is at
> `docs/plan-2026-09-09.html` and was published at
> https://claude.ai/code/artifact/9909f3f0-8fc2-4013-abbc-fd7aba8fd5c5

## What it is

**The paper stays.** Five Crowns is scored on a pad at the table, by tradition, and nothing
about this replaces that. After the game, the finished sheet is photographed, becomes rows in
a database, and years of games turn into something that can be asked questions of.

**It is an archive, not a scoreboard.** Nobody opens it during a game.

## The idea the whole thing rests on

Reading handwriting is unreliable — a 7 becomes a 1, a 4 becomes a 9, and a photo taken at an
angle in kitchen light makes it worse. **Normally that would make this a coin toss.**

But a Five Crowns sheet has a property most documents do not: **eleven round scores per player
and a total, and the rounds must sum to the total.** Every column carries its own proof. If the
transcription does not add up, it is wrong — and the app knows before the founder does.

⚠️ **This is the difference between a tool worth trusting and a database quietly full of wrong
numbers.** Analytics built on unverified transcription are not merely useless, they are
*confidently wrong*, and nobody would ever know.

## The loop

1. **Photograph the finished sheet** — from a phone, at the table, before the pad goes away.
2. **It reads the grid.** The shape is known in advance: players across, eleven rounds down,
   totals at the bottom. Knowing the shape is most of what makes reading it possible.
3. **It shows what it read, beside the photo.** Columns that add up are marked sound; columns
   that do not are flagged, with the least-confident round highlighted.
4. **The founder corrects what is wrong.** Usually nothing, sometimes one number.
   **Nothing is saved until the arithmetic agrees.**
5. **It becomes a game in the log** — date, players, every round, the winner. **The photo is
   kept with it**, so any number can be checked against the paper for as long as the record
   exists.

## What it deliberately is not

Each of these is a decision rather than an omission.

- **Not a scoreboard.** The paper is the game.
- **It does not know the rules of Five Crowns.** No wild cards, no going out, no scoring a
  hand. ⚠️ **Every rule it learns is a rule that can disagree with the pad — and the pad wins.**
- **No accounts and no other players logging in.** One keeper of the record, as now.
- **No analytics in the first version** — but see below.

## Analytics later, and the shape that keeps them possible

Storing a game as one row with a final score would foreclose them. **Storing every round
separately costs nothing today** and is what later makes these answerable: who actually wins
over years rather than over a night; whether the late rounds are where games are really
decided; whether anyone is consistent or occasionally lucky; what a typical round looks like as
hands grow from three cards to thirteen.

**None of it needs building now. All of it needs the rounds kept.**

## The risk, named

**Handwriting recognition is the whole risk and it will get things wrong.** The arithmetic check
catches any error that changes a column total, which is most of them. ⚠️ **It cannot catch two
errors that cancel out** in the same column, and it cannot catch a total the founder wrote down
wrong themselves. That is why the transcription is shown beside the photo **every time, even
when it adds up**: the app's job is to be *checkable*, not to be right.

## The four open questions — answer these before anything is built

1. **Is there a backlog of old sheets?** Years of pads in a drawer makes the first version a
   **bulk import**, which is a different app from one that takes a photo a week.
2. **Does the same group play, or does it vary?** A fixed four or five means players are just
   names. A changing group means a player list, and *"is this the same Sam as last year"*
   becomes a real question the moment analytics run.
3. **What does the sheet actually look like?** ⚠️ **A photo of one blank and one finished sheet
   is worth more than any description** — printed grid or hand-ruled, running totals or just a
   final, names across the top or down the side. It decides how hard the reading is.
4. **Phone only, or the PC as well?** The photo is taken on a phone; whether there is also a
   sit-down backlog session changes what gets built first.

## First thing to build

**The reading step, alone, tested against real sheets.** If a photograph of the actual pad
cannot be read reliably, that is worth knowing in an afternoon rather than after a website has
been built around it.
