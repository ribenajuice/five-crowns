import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { ArchiveLine } from "@/components/ArchiveLine";
import { BoardNav } from "@/components/BoardNav";
import { FunFactCard } from "@/components/FunFactCard";
import { RecordCard, type RecordCardProps } from "@/components/RecordCard";
import { StatsNavLink } from "@/components/StatsNavLink";
import { getFunFacts, pickFunFact } from "@/lib/board/facts";
import {
  getBoard,
  getBoardData,
  type BoardRecord,
  type HomeAdvantageBoardRecord,
  type LooksLikeCheatingBoardRecord,
  type MetronomeBoardRecord,
  type SingleEventBoardRecord,
} from "@/lib/board/queries";
import {
  BOARD_APPBAR_TITLE,
  BOARD_EMPTY_BODY,
  BOARD_EMPTY_TITLE,
  HOME_ADVANTAGE_RECORD_TITLE,
  HOME_ADVANTAGE_RECORD_UNIT,
  LOOKS_LIKE_CHEATING_RECORD_TITLE,
  LOOKS_LIKE_CHEATING_RECORD_UNIT,
  METRONOME_RECORD_TITLE,
  METRONOME_RECORD_UNIT,
  NO_HOLDER_SENTENCE_BY_KEY,
  RECORD_TITLES,
  RECORD_UNITS,
  SINGLE_EVENT_RECORD_TITLES,
  SINGLE_EVENT_RECORD_UNITS,
  funFactDisplay,
  homeAdvantageDisplayFacts,
  looksLikeCheatingDisplayFacts,
  metronomeDisplayFacts,
  recordDisplayFacts,
  singleEventDisplayFacts,
} from "@/lib/ui/copy";

/**
 * The four personality stats' own fixed no-holder sentence (`NO_HOLDER_SENTENCE_BY_KEY`,
 * `lib/ui/copy.ts`) is keyed by only those four record keys, not by every
 * `BoardRecordKey`/`SingleEventRecordKey` — this guard is how `toCardProps`
 * and `toSingleEventCardProps` below tell whether a given record has one of
 * its own before looking it up, replacing what used to be a one-off ternary
 * per key.
 */
function hasFixedNoHolderSentence(key: string): key is keyof typeof NO_HOLDER_SENTENCE_BY_KEY {
  return key in NO_HOLDER_SENTENCE_BY_KEY;
}

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
    // Criterion 312: "getting absolutely wrecked" has its own fixed
    // no-holder sentence, not this shared builder's generic fallback — every
    // other record through this path (`toCardProps`) still gets
    // `RecordCard`'s own default.
    const noHolderSentence = hasFixedNoHolderSentence(record.key)
      ? NO_HOLDER_SENTENCE_BY_KEY[record.key]
      : undefined;
    return {
      title,
      holderNames: "",
      value: null,
      unit: RECORD_UNITS[record.key],
      sample: null,
      href,
      claim: title,
      noHolderSentence,
    };
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
    // Criterion 312: "most clutch comeback" has its own fixed no-holder
    // sentence — every other single-event record through this shared builder
    // still gets `RecordCard`'s own generic default.
    const noHolderSentence = hasFixedNoHolderSentence(record.key)
      ? NO_HOLDER_SENTENCE_BY_KEY[record.key]
      : undefined;
    return {
      title,
      holderNames: "",
      value: null,
      unit: SINGLE_EVENT_RECORD_UNITS[record.key],
      sample: null,
      href,
      claim: title,
      noHolderSentence,
    };
  }

  const { title, unit, value, holderNames, sample, instances, claim } = facts;
  return { title, holderNames, value, unit, sample, href, claim, instances: instances ?? undefined };
}

/**
 * A `RecordCard`'s props for the board's thirteenth card — home advantage
 * (criteria 253–254, 268–270). No new component or visual variant: the
 * ordinary `RecordCard` shape, reusing its existing slots (design system:
 * "`RecordCard` — home advantage").
 */
function toHomeAdvantageCardProps(record: HomeAdvantageBoardRecord): RecordCardProps {
  const href = "/records/homeAdvantage";
  const facts = homeAdvantageDisplayFacts(record);

  if (!facts) {
    return {
      title: HOME_ADVANTAGE_RECORD_TITLE,
      holderNames: "",
      value: null,
      unit: HOME_ADVANTAGE_RECORD_UNIT,
      sample: null,
      href,
      claim: HOME_ADVANTAGE_RECORD_TITLE,
    };
  }

  const { title, unit, holderNames, value, sample, claim } = facts;
  return { title, holderNames, value, unit, sample, href, claim };
}

/**
 * A `RecordCard`'s props for either of the board's fourth-animal cards —
 * "looks like cheating" and the metronome (criteria 297–299, 307–309): same
 * treatment as home advantage, no new component or visual variant, just the
 * ordinary `RecordCard` shape reusing its existing slots with new copy
 * grammar (design system, "The four personality cards"). The two record
 * families previously repeated this ~20-line shape with only their own
 * constants and display-facts function swapped in (code review); this is the
 * one shared builder both `toLooksLikeCheatingCardProps` and
 * `toMetronomeCardProps` below now call.
 */
function toFourthAnimalCardProps<R>(
  key: keyof typeof NO_HOLDER_SENTENCE_BY_KEY,
  title: string,
  unit: string,
  record: R,
  displayFacts: (record: R) => { holderNames: string; value: string; sample: string; claim: string } | null,
): RecordCardProps {
  const href = `/records/${key}`;
  const facts = displayFacts(record);

  if (!facts) {
    return {
      title,
      holderNames: "",
      value: null,
      unit,
      sample: null,
      href,
      claim: title,
      noHolderSentence: NO_HOLDER_SENTENCE_BY_KEY[key],
    };
  }

  const { holderNames, value, sample, claim } = facts;
  return { title, holderNames, value, unit, sample, href, claim };
}

/**
 * A `RecordCard`'s props for "looks like cheating" (criteria 297–299).
 */
function toLooksLikeCheatingCardProps(record: LooksLikeCheatingBoardRecord): RecordCardProps {
  return toFourthAnimalCardProps(
    "looksLikeCheating",
    LOOKS_LIKE_CHEATING_RECORD_TITLE,
    LOOKS_LIKE_CHEATING_RECORD_UNIT,
    record,
    looksLikeCheatingDisplayFacts,
  );
}

/**
 * A `RecordCard`'s props for the metronome (criteria 307–309). Criterion 309
 * requires the holder's own game count and both ends of the range stated
 * plainly on the card, not hidden: `metronomeDisplayFacts`'s `sample` carries
 * all three and is never optional here (unlike the stalwart's documented
 * exception), so it always renders.
 */
function toMetronomeCardProps(record: MetronomeBoardRecord): RecordCardProps {
  return toFourthAnimalCardProps(
    "metronome",
    METRONOME_RECORD_TITLE,
    METRONOME_RECORD_UNIT,
    record,
    metronomeDisplayFacts,
  );
}

/**
 * Pulls the one record matching `key` out of `records`, and every other
 * record in the same single pass — used below for "getting absolutely
 * wrecked" and "most clutch comeback", the two records `getBoard()` returns
 * in place inside `records`/`singleEventRecords` (`lib/board/queries.ts`'s
 * own doc comment) but this page renders in a different, fixed spot
 * (criterion 235's board order). One pass rather than a `.find(...)!`
 * followed by a separate `.filter(...)` re-scan of the same array (code
 * review), and `picked` is `null` rather than asserted non-null — reachable
 * only defensively (`getBoard()`'s own guarantee that every non-empty
 * archive holds both), so a record that's somehow missing simply doesn't
 * render its own designated card below, instead of throwing.
 */
function partitionByKey<T extends { key: string }>(
  records: readonly T[],
  key: string,
): { picked: T | null; rest: T[] } {
  const rest: T[] = [];
  let picked: T | null = null;
  for (const record of records) {
    if (record.key === key) picked = record;
    else rest.push(record);
  }
  return { picked, rest };
}

export default async function Home() {
  await requireGroupSession();

  // Code review fix: `getBoard()` and `getFunFacts()` both read the same
  // three tables (`lib/board/queries.ts`'s `getBoardData()`) — fetched once
  // here and threaded into each, rather than each independently re-querying,
  // the same "fetch once, thread it through" shape `getPlayerGameFacts`
  // establishes for the player page (`lib/players/rivalry.ts`).
  const data = await getBoardData();
  const board = await getBoard(data);

  // Milestone 4, first slice (criteria 281, 292): freshly computed and freshly
  // picked on every load, never cached — an empty archive already 404s the
  // pool's own first query, so this is skipped entirely on that path rather
  // than run only to be thrown away (criterion 293's bounded-query stance).
  const fact = board.empty ? null : pickFunFact(await getFunFacts(data));

  // M4 second slice: "getting absolutely wrecked" and "most clutch comeback"
  // fit the pre-existing `records`/`singleEventRecords` shapes unchanged, so
  // `getBoard()` returns them in place — last in each array, alongside the
  // records those arrays already held (`lib/board/queries.ts`'s own doc
  // comment). That in-place position is *not* this slice's board order (it
  // would land them ahead of Stage 3's five and home advantage), so both are
  // pulled out here — in the same pass as filtering them out of the grid's
  // own arrays, via `partitionByKey` — and rendered in their own designated
  // spot below, after home advantage — the frontend's own job, since
  // `getBoard()` "doesn't impose an order across them itself" (same module
  // comment).
  const boardRecordsSource: readonly BoardRecord[] = board.empty ? [] : board.records;
  const singleEventRecordsSource: readonly SingleEventBoardRecord[] = board.empty
    ? []
    : board.singleEventRecords;
  const { picked: gettingWreckedRecord, rest: boardRecords } = partitionByKey(
    boardRecordsSource,
    "gettingWrecked",
  );
  const { picked: clutchComebackRecord, rest: singleEventRecords } = partitionByKey(
    singleEventRecordsSource,
    "clutchComeback",
  );

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
            {fact ? <FunFactCard {...funFactDisplay(fact)} /> : null}
            <BoardNav />
            <StatsNavLink />
            {/*
             * Criterion 235's fixed order: the founder's four, then the
             * stalwart, then Stage 2's drought and nearly man, then Stage 3's
             * four remaining single-event records (best/worst game ever, the
             * catastrophe, cleanest sheet, biggest hammering), then Stage 4's
             * home advantage, then M4 second slice's four personality stats
             * appended after it, in the PRD's own order — "looks like
             * cheating," "getting absolutely wrecked," most clutch comeback,
             * the metronome (design system, "the board gains four more rows").
             * "Getting absolutely wrecked" and "most clutch comeback" are
             * pulled out of `board.records`/`board.singleEventRecords` above
             * (`boardRecords`/`singleEventRecords`, already filtered) and
             * rendered here instead, in their own designated spot.
             */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {boardRecords.map((record) => (
                <RecordCard key={record.key} {...toCardProps(record)} />
              ))}
              {singleEventRecords.map((record) => (
                <RecordCard key={record.key} {...toSingleEventCardProps(record)} />
              ))}
              <RecordCard key="homeAdvantage" {...toHomeAdvantageCardProps(board.homeAdvantage)} />
              <RecordCard key="looksLikeCheating" {...toLooksLikeCheatingCardProps(board.looksLikeCheating)} />
              {gettingWreckedRecord ? (
                <RecordCard key="gettingWrecked" {...toCardProps(gettingWreckedRecord)} />
              ) : null}
              {clutchComebackRecord ? (
                <RecordCard key="clutchComeback" {...toSingleEventCardProps(clutchComebackRecord)} />
              ) : null}
              <RecordCard key="metronome" {...toMetronomeCardProps(board.metronome)} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
