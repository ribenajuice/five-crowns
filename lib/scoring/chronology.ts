/**
 * Chronological ordering — playedOn primary, createdAt tie-break.
 *
 * The one "newest first" comparator every list in this app sorts games by
 * (the records board's drill-throughs, a player's head-to-head games), and
 * its oldest-first mirror, which a streak or a drought reads in the order it
 * was actually played (`longestStreak`, below). Extracted here for the same
 * reason `compareDisplayNames` (`./names.ts`) was: this exact two-field sort
 * was independently maintained in three places (`lib/board/queries.ts`,
 * `lib/players/rivalry.ts`, and inlined inside `longestStreak` itself) before
 * this file existed.
 */

/** Anything with a game's own two ordering fields — a `PlayerGameFact`, a `StreakGame`, a `GameRow`, and alike. */
export interface ChronologicalRow {
  /** ISO date — the primary sort key. */
  playedOn: string;
  /** Tie-break for two rows on the same date. */
  createdAt: string;
}

/** Oldest → newest — the order a streak or a drought was actually played in. */
export function compareOldestFirst(a: ChronologicalRow, b: ChronologicalRow): number {
  if (a.playedOn !== b.playedOn) return a.playedOn < b.playedOn ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return 0;
}

/** Newest → oldest — every ordinary games list's own order. Exactly `compareOldestFirst`, reversed. */
export function compareNewestFirst(a: ChronologicalRow, b: ChronologicalRow): number {
  return -compareOldestFirst(a, b);
}
