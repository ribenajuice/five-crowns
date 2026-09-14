import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { ArchiveLine } from "@/components/ArchiveLine";
import { BoardNav } from "@/components/BoardNav";
import { RecordCard, type RecordCardProps } from "@/components/RecordCard";
import { StatsNavLink } from "@/components/StatsNavLink";
import { getBoard, type BoardRecord, type SingleEventBoardRecord } from "@/lib/board/queries";
import {
  BOARD_APPBAR_TITLE,
  BOARD_EMPTY_BODY,
  BOARD_EMPTY_TITLE,
  RECORD_TITLES,
  RECORD_UNITS,
  SINGLE_EVENT_RECORD_TITLES,
  SINGLE_EVENT_RECORD_UNITS,
  recordDisplayFacts,
  singleEventDisplayFacts,
} from "@/lib/ui/copy";

/**
 * The records board — PRD criteria 179–196, extended by Stage 2 (criteria
 * 197–222) and Stage 3 (criteria 228–235) to twelve cards. `/` now renders
 * the board for a group session instead of redirecting to `/games`;
 * `/games` and "add a game" stay one tap away via `BoardNav`.
 * `docs/DESIGN-SYSTEM.md` § "The records board".
 *
 * An unauthenticated request still 307s to `/login` before any of this runs
 * — `requireGroupSession()` is the same defence-in-depth every other page in
 * this app calls, on top of `middleware.ts`'s own gate on `/` (PRD criterion 1).
 */
export const dynamic = "force-dynamic";

/** A `RecordCard`'s props, worked out from one `BoardRecord` — the stalwart's
 *  documented exception (no sample line, its value already is the sample)
 *  lives here rather than inside `RecordCard` itself. */
function toCardProps(record: BoardRecord): RecordCardProps {
  const href = `/records/${record.key}`;
  const facts = recordDisplayFacts(record);

  if (!facts) {
    const title = RECORD_TITLES[record.key];
    return { title, holderNames: "", value: null, unit: RECORD_UNITS[record.key], sample: null, href, claim: title };
  }

  const { title, unit, holderNames, value, sample } = facts;
  const claim = sample
    ? `${title}: ${holderNames}, ${value} ${unit}, ${sample}`
    : `${title}: ${holderNames}, ${value} ${unit}`;

  return { title, holderNames, value, unit, sample, href, claim };
}

/**
 * A `RecordCard`'s props for one of Stage 3's five single-event records
 * (criteria 228–235) — the instance-list variant (`instances`) is populated
 * only when the record is tied; the ordinary one-holder path (`holderNames` +
 * a date-based `sample`, criterion 233) covers every other case.
 */
function toSingleEventCardProps(record: SingleEventBoardRecord): RecordCardProps {
  const href = `/records/${record.key}`;
  const facts = singleEventDisplayFacts(record);

  if (!facts) {
    const title = SINGLE_EVENT_RECORD_TITLES[record.key];
    return {
      title,
      holderNames: "",
      value: null,
      unit: SINGLE_EVENT_RECORD_UNITS[record.key],
      sample: null,
      href,
      claim: title,
    };
  }

  const { title, unit, value, holderNames, sample, instances, claim } = facts;
  return { title, holderNames, value, unit, sample, href, claim, instances: instances ?? undefined };
}

export default async function Home() {
  await requireGroupSession();
  const board = await getBoard();

  return (
    <>
      <AppBar title={BOARD_APPBAR_TITLE} />
      <main className="mx-auto w-full max-w-wide px-4 py-6">
        {board.empty ? (
          <div className="flex flex-col gap-4">
            <BoardNav />
            <StatsNavLink />
            <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
              <p className="mb-2 font-bold">{BOARD_EMPTY_TITLE}</p>
              <p className="text-text-muted">{BOARD_EMPTY_BODY}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ArchiveLine archiveGameCount={board.archiveGameCount} earlyDays={board.earlyDays} />
            <BoardNav />
            <StatsNavLink />
            {/*
             * Criterion 235's fixed order: the founder's four, then the
             * stalwart, then Stage 2's drought and nearly man (all already in
             * that order on `board.records`), then Stage 3's five, in the
             * order the PRD's own user stories introduce them (already the
             * order `board.singleEventRecords` is returned in) — a plain
             * concatenation, never a re-sort.
             */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {board.records.map((record) => (
                <RecordCard key={record.key} {...toCardProps(record)} />
              ))}
              {board.singleEventRecords.map((record) => (
                <RecordCard key={record.key} {...toSingleEventCardProps(record)} />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
