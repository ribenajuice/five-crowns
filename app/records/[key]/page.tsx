import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { GameRow } from "@/components/GameRow";
import {
  getBoard,
  type BoardRecordKey,
  type RecordGame,
  type SingleEventRecordKey,
} from "@/lib/board/queries";
import { compareNewestFirst } from "@/lib/scoring/chronology";
import {
  RECORD_TITLES,
  SINGLE_EVENT_RECORD_TITLES,
  drillThroughHeading,
  homeAdvantageDisplayFacts,
  looksLikeCheatingDisplayFacts,
  metronomeDisplayFacts,
  recordDisplayFacts,
  roundsWonRowAnnotation,
  singleEventDisplayFacts,
  singleEventGameAnnotation,
  streakHolderRowAnnotation,
} from "@/lib/ui/copy";

/**
 * A record's drill-through — PRD criterion 186: tapping a record lands on
 * exactly the games it was computed from, in the games list's own row
 * format, under a heading stating the claim. `docs/DESIGN-SYSTEM.md` §
 * "the records board", "Drill-through". Extended by M3 Stage 3 (criteria
 * 233–234) to the board's five new single-event records — same route, same
 * pattern, unchanged (criterion 234: "criterion 186's pattern, unchanged"),
 * just reading `board.singleEventRecords` instead of `board.records` and
 * stating a date rather than a game count.
 *
 * One dynamic route for all seventeen records rather than near-identical
 * pages, the same reasoning `/players/[id]` and `/rosters/[id]` already use
 * for "one page shape, many entities" — `getBoard()` is re-read on every
 * visit (criterion 189: nothing is cached), and its own row order is used
 * as-is: newest-first for most records, oldest→newest for the streak
 * (criterion 186's own wording) — this page never re-sorts what the backend
 * already ordered.
 *
 * A made-up key, an empty archive, or a record with no holder (not reachable
 * by any of Stage 1's five, Stage 2's two, Stage 3's five or M4 second
 * slice's four over a non-empty archive, but the board's own shared path can
 * theoretically produce one) all render the app's ordinary 404 — there is
 * nothing to drill into, the same "made-up id" precedent `/players/[id]`
 * already sets.
 *
 * Five render paths — ordinary board records, Stage 3's five single-event
 * records (plus M4's clutch comeback, folded into the same shape), Stage 4's
 * home advantage, and M4 second slice's own two fourth-animal records
 * ("looks like cheating", the metronome) — because each reads a different
 * shape off `Board` and annotates its rows differently; all five share the
 * actual rendering (the `AppBar` header and the `GameRow` list) through
 * `renderDrillThroughShell` (code review, M3 Stage 3 follow-up), so only the
 * part that's genuinely different per record family is written more than
 * once. "Getting absolutely wrecked" needs no render path of its own — it
 * fits `board.records`' own shape unchanged and falls through to the
 * ordinary board-record path at the bottom of this function, same as every
 * one of Stage 1 and 2's seven.
 */
export const dynamic = "force-dynamic";

/**
 * Derived from `RECORD_TITLES` rather than hand-enumerated (code review,
 * M3 Stage 1): `RECORD_TITLES` is typed `Record<BoardRecordKey, string>`, so
 * TypeScript itself refuses to compile if a `BoardRecordKey` is ever added
 * without a title for it — the same guarantee this derivation then hands to
 * `RECORD_KEYS`, which otherwise couldn't miss an entry `RECORD_TITLES` has.
 * `SINGLE_EVENT_RECORD_KEYS` mirrors this for Stage 3's five.
 */
const RECORD_KEYS: readonly BoardRecordKey[] = Object.keys(RECORD_TITLES) as BoardRecordKey[];
const SINGLE_EVENT_RECORD_KEYS: readonly SingleEventRecordKey[] = Object.keys(
  SINGLE_EVENT_RECORD_TITLES,
) as SingleEventRecordKey[];

function isRecordKey(value: string): value is BoardRecordKey {
  return (RECORD_KEYS as readonly string[]).includes(value);
}

function isSingleEventRecordKey(value: string): value is SingleEventRecordKey {
  return (SINGLE_EVENT_RECORD_KEYS as readonly string[]).includes(value);
}

/**
 * The one piece every drill-through renders identically (code review, M3
 * Stage 3 follow-up): the `AppBar` header (title via `drillThroughHeading`,
 * context stating the claim), and the games list, one `GameRow` per game,
 * each optionally annotated. The three render functions below differ only in
 * *which* record they read, how they arrive at `games`, and what — if
 * anything — `annotate` says about each one; this shell owns everything
 * that's genuinely shared rather than three copies of the same JSX.
 */
function renderDrillThroughShell(
  facts: { title: string; holderNames: string; value: string; unit: string; sample: string | null },
  games: readonly RecordGame[],
  annotate?: (game: RecordGame) => string | undefined,
) {
  const context = facts.sample ? `${facts.value} ${facts.unit}, ${facts.sample}` : `${facts.value} ${facts.unit}`;

  return (
    <>
      <AppBar
        title={drillThroughHeading(facts.title, facts.holderNames)}
        context={context}
        back={{ href: "/", label: "Back to the board" }}
      />
      <main className="mx-auto w-full max-w-wide px-4 py-6">
        <div className="flex flex-col gap-2">
          {games.map((g) => (
            <GameRow
              key={g.id}
              id={g.id}
              playedOn={g.playedOn}
              locationName={g.locationName}
              rosterId={g.rosterId}
              rosterName={g.rosterName}
              winners={g.winners}
              annotation={annotate?.(g)}
            />
          ))}
        </div>
      </main>
    </>
  );
}

async function renderSingleEventDrillThrough(key: SingleEventRecordKey) {
  const board = await getBoard();
  if (board.empty) notFound();

  const record = board.singleEventRecords.find((r) => r.key === key);
  if (!record) notFound();

  const facts = singleEventDisplayFacts(record);
  if (!facts) notFound();

  return renderDrillThroughShell(facts, record.games, (g) =>
    g.singleEventValue !== undefined ? singleEventGameAnnotation(key, g.singleEventValue, g.singleEventHand) : undefined,
  );
}

/**
 * Home advantage's own drill-through (criteria 268–269) — the ordinary
 * board-record pattern, unchanged: `drillThroughHeading` for the `AppBar`
 * title, "{value} {unit}, {sample}" for its context line (the whole claim,
 * including the elsewhere figure). ⚠️ **A joint holder's pairs each drill
 * through to their own venue's games** (criterion 269) — merged here into
 * the one list this route renders (every row already states its own venue
 * name via `GameRow`'s own `locationName`), newest first, deduplicated by id
 * in case two pairs happen to share a game.
 */
async function renderHomeAdvantageDrillThrough() {
  const board = await getBoard();
  if (board.empty) notFound();

  const record = board.homeAdvantage;
  const facts = homeAdvantageDisplayFacts(record);
  if (!facts) notFound();

  const byId = new Map<string, (typeof record.holders)[number]["games"][number]>();
  for (const holder of record.holders) {
    for (const g of holder.games) byId.set(g.id, g);
  }
  const games = [...byId.values()].sort(compareNewestFirst);

  return renderDrillThroughShell(facts, games);
}

/**
 * The shared body of "looks like cheating"'s and the metronome's own
 * drill-throughs (criteria 299, 309) — the same fourth-animal pattern as home
 * advantage above: each holder's own `games` merged and deduplicated across
 * every tied holder, newest first, then handed to the shared shell. The two
 * record families differ only in which board field they read and which
 * display-facts function turns it into a heading (code review: the two
 * functions were line-for-line identical bodies otherwise).
 */
function renderMergedGamesDrillThrough<R extends { holders: readonly { games: readonly RecordGame[] }[] }>(
  record: R,
  displayFacts: (record: R) => Parameters<typeof renderDrillThroughShell>[0] | null,
) {
  const facts = displayFacts(record);
  if (!facts) notFound();

  const byId = new Map<string, RecordGame>();
  for (const holder of record.holders) {
    for (const g of holder.games) byId.set(g.id, g);
  }
  const games = [...byId.values()].sort(compareNewestFirst);

  return renderDrillThroughShell(facts, games);
}

/**
 * "Looks like cheating"'s own drill-through (criterion 299). Unlike home
 * advantage's (player, venue) pairs, each holder here is a unique player, so
 * there is only ever one `games` list per holder to merge — the merge step
 * still matters for a tie, where two holders' own game lists can overlap
 * (they played each other).
 */
async function renderLooksLikeCheatingDrillThrough() {
  const board = await getBoard();
  if (board.empty) notFound();

  return renderMergedGamesDrillThrough(board.looksLikeCheating, looksLikeCheatingDisplayFacts);
}

/**
 * The metronome's own drill-through (criterion 309) — "tapping lands on that
 * player's games": each holder's own `games` is their **whole** game history
 * (`MetronomeBoardRecord`'s own doc comment), not just the two games at
 * either end of the range, merged and deduplicated across every tied holder
 * the same way as "looks like cheating" above.
 */
async function renderMetronomeDrillThrough() {
  const board = await getBoard();
  if (board.empty) notFound();

  return renderMergedGamesDrillThrough(board.metronome, metronomeDisplayFacts);
}

export default async function RecordDrillThroughPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireGroupSession();
  const { key } = await params;

  if (key === "homeAdvantage") {
    return renderHomeAdvantageDrillThrough();
  }
  if (key === "looksLikeCheating") {
    return renderLooksLikeCheatingDrillThrough();
  }
  if (key === "metronome") {
    return renderMetronomeDrillThrough();
  }
  if (isSingleEventRecordKey(key)) {
    return renderSingleEventDrillThrough(key);
  }
  if (!isRecordKey(key)) notFound();

  const board = await getBoard();
  if (board.empty) notFound();

  const record = board.records.find((r) => r.key === key);
  if (!record) notFound();

  const facts = recordDisplayFacts(record);
  if (!facts) notFound();

  return renderDrillThroughShell(facts, record.games, (g) =>
    g.streakOwner
      ? streakHolderRowAnnotation(g.streakOwner)
      : g.roundsWonByHolder && g.roundsWonByHolder.length > 0
        ? g.roundsWonByHolder.map((r) => roundsWonRowAnnotation(r.displayName, r.rounds)).join(" · ")
        : undefined,
  );
}
