import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { GameRow } from "@/components/GameRow";
import { getBoard, type BoardRecordKey } from "@/lib/board/queries";
import { rosterDisplayName } from "@/lib/scoring";
import {
  RECORD_TITLES,
  RECORD_UNITS,
  drillThroughHeading,
  formatRecordValue,
  recordSampleLine,
  roundsWonRowAnnotation,
  streakHolderRowAnnotation,
} from "@/lib/ui/copy";

/**
 * A record's drill-through — PRD criterion 186: tapping a record lands on
 * exactly the games it was computed from, in the games list's own row
 * format, under a heading stating the claim. `docs/DESIGN-SYSTEM.md` §
 * "the records board", "Drill-through".
 *
 * One dynamic route for all five records rather than five near-identical
 * pages, the same reasoning `/players/[id]` and `/rosters/[id]` already use
 * for "one page shape, many entities" — `getBoard()` is re-read on every
 * visit (criterion 189: nothing is cached), and its own row order is used
 * as-is: newest-first for four records, oldest→newest for the streak
 * (criterion 186's own wording, "the games of that streak, in order") — this
 * page never re-sorts what the backend already ordered.
 *
 * A made-up key, an empty archive, or a record with no holder (not reachable
 * by any of Stage 1's five over a non-empty archive, but the board's own
 * shared path can theoretically produce one) all render the app's ordinary
 * 404 — there is nothing to drill into, the same "made-up id" precedent
 * `/players/[id]` already sets.
 */
export const dynamic = "force-dynamic";

const RECORD_KEYS: readonly BoardRecordKey[] = [
  "mostWins",
  "mostWinsInARow",
  "lowestAverageScore",
  "mostRoundsWon",
  "stalwart",
];

function isRecordKey(value: string): value is BoardRecordKey {
  return (RECORD_KEYS as readonly string[]).includes(value);
}

export default async function RecordDrillThroughPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireGroupSession();
  const { key } = await params;
  if (!isRecordKey(key)) notFound();

  const board = await getBoard();
  if (board.empty) notFound();

  const record = board.records.find((r) => r.key === key);
  if (!record || record.value === null || record.holders.length === 0) notFound();

  const title = RECORD_TITLES[key];
  const unit = RECORD_UNITS[key];
  const holderNames = rosterDisplayName(record.holders.map((h) => h.displayName));
  const value = formatRecordValue(key, record.value);
  const sample = key === "stalwart" ? null : recordSampleLine(record.holders);
  const context = sample ? `${value} ${unit}, ${sample}` : `${value} ${unit}`;

  return (
    <>
      <AppBar
        title={drillThroughHeading(title, holderNames)}
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
