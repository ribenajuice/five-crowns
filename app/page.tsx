import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { ArchiveLine } from "@/components/ArchiveLine";
import { BoardNav } from "@/components/BoardNav";
import { RecordCard } from "@/components/RecordCard";
import { getBoard, type BoardRecord } from "@/lib/board/queries";
import { rosterDisplayName } from "@/lib/scoring";
import {
  BOARD_APPBAR_TITLE,
  BOARD_EMPTY_BODY,
  BOARD_EMPTY_TITLE,
  RECORD_TITLES,
  RECORD_UNITS,
  formatRecordValue,
  recordSampleLine,
} from "@/lib/ui/copy";

/**
 * The records board — PRD criteria 179–196. `/` now renders the board for a
 * group session instead of redirecting to `/games`; `/games` and "add a
 * game" stay one tap away via `BoardNav`. `docs/DESIGN-SYSTEM.md` §
 * "The records board".
 *
 * An unauthenticated request still 307s to `/login` before any of this runs
 * — `requireGroupSession()` is the same defence-in-depth every other page in
 * this app calls, on top of `middleware.ts`'s own gate on `/` (PRD criterion 1).
 */
export const dynamic = "force-dynamic";

/** A `RecordCard`'s props, worked out from one `BoardRecord` — the stalwart's
 *  documented exception (no sample line, its value already is the sample)
 *  lives here rather than inside `RecordCard` itself. */
function toCardProps(record: BoardRecord) {
  const title = RECORD_TITLES[record.key];
  const unit = RECORD_UNITS[record.key];

  if (record.value === null || record.holders.length === 0) {
    return { title, holderNames: "", value: null, unit, sample: null, href: `/records/${record.key}`, claim: title };
  }

  const holderNames = rosterDisplayName(record.holders.map((h) => h.displayName));
  const value = formatRecordValue(record.key, record.value);
  const sample = record.key === "stalwart" ? null : recordSampleLine(record.holders);
  const claim = sample
    ? `${title}: ${holderNames}, ${value} ${unit}, ${sample}`
    : `${title}: ${holderNames}, ${value} ${unit}`;

  return { title, holderNames, value, unit, sample, href: `/records/${record.key}`, claim };
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
            <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
              <p className="mb-2 font-bold">{BOARD_EMPTY_TITLE}</p>
              <p className="text-text-muted">{BOARD_EMPTY_BODY}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ArchiveLine archiveGameCount={board.archiveGameCount} earlyDays={board.earlyDays} />
            <BoardNav />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {board.records.map((record) => (
                <RecordCard key={record.key} {...toCardProps(record)} />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
