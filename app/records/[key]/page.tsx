import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { GameRow } from "@/components/GameRow";
import { getBoard, type BoardRecordKey, type SingleEventRecordKey } from "@/lib/board/queries";
import { compareNewestFirst } from "@/lib/scoring/chronology";
import {
  RECORD_TITLES,
  SINGLE_EVENT_RECORD_TITLES,
  drillThroughHeading,
  homeAdvantageDisplayFacts,
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
 * One dynamic route for all twelve records rather than near-identical pages,
 * the same reasoning `/players/[id]` and `/rosters/[id]` already use for "one
 * page shape, many entities" — `getBoard()` is re-read on every visit
 * (criterion 189: nothing is cached), and its own row order is used as-is:
 * newest-first for most records, oldest→newest for the streak (criterion
 * 186's own wording) — this page never re-sorts what the backend already
 * ordered.
 *
 * A made-up key, an empty archive, or a record with no holder (not reachable
 * by any of Stage 1's five, Stage 2's two or Stage 3's five over a
 * non-empty archive, but the board's own shared path can theoretically
 * produce one) all render the app's ordinary 404 — there is nothing to
 * drill into, the same "made-up id" precedent `/players/[id]` already sets.
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

async function renderSingleEventDrillThrough(key: SingleEventRecordKey) {
  const board = await getBoard();
  if (board.empty) notFound();

  const record = board.singleEventRecords.find((r) => r.key === key);
  if (!record) notFound();

  const facts = singleEventDisplayFacts(record);
  if (!facts) notFound();

  const context = facts.sample
    ? `${facts.value} ${facts.unit}, ${facts.sample}`
    : `${facts.value} ${facts.unit}`;

  return (
    <>
      <AppBar
        title={drillThroughHeading(facts.title, facts.holderNames)}
        context={context}
        back={{ href: "/", label: "Back to the board" }}
      />
      <main className="mx-auto w-full max-w-wide px-4 py-6">
        <div className="flex flex-col gap-2">
          {record.games.map((g) => (
            <GameRow
              key={g.id}
              id={g.id}
              playedOn={g.playedOn}
              locationName={g.locationName}
              rosterId={g.rosterId}
              rosterName={g.rosterName}
              winners={g.winners}
              annotation={
                g.singleEventValue !== undefined
                  ? singleEventGameAnnotation(key, g.singleEventValue, g.singleEventHand)
                  : undefined
              }
            />
          ))}
        </div>
      </main>
    </>
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

  const context = `${facts.value} ${facts.unit}, ${facts.sample}`;

  const byId = new Map<string, (typeof record.holders)[number]["games"][number]>();
  for (const holder of record.holders) {
    for (const g of holder.games) byId.set(g.id, g);
  }
  const games = [...byId.values()].sort(compareNewestFirst);

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
            />
          ))}
        </div>
      </main>
    </>
  );
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
          {record.games.map((g) => {
            const annotation = g.streakOwner
              ? streakHolderRowAnnotation(g.streakOwner)
              : g.roundsWonByHolder && g.roundsWonByHolder.length > 0
                ? g.roundsWonByHolder
                    .map((r) => roundsWonRowAnnotation(r.displayName, r.rounds))
                    .join(" · ")
                : undefined;

            return (
              <GameRow
                key={g.id}
                id={g.id}
                playedOn={g.playedOn}
                locationName={g.locationName}
                rosterId={g.rosterId}
                rosterName={g.rosterName}
                winners={g.winners}
                annotation={annotation}
              />
            );
          })}
        </div>
      </main>
    </>
  );
}
