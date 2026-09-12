/**
 * What the games list and the game view show.
 *
 * Written up front as part of the Stage 2 interface (`docs/ARCHITECTURE.md`
 * § "The Stage 2 interface: draft, upload, save") so the pages and the queries
 * could be built in parallel: `lib/games/queries.ts` returns these, and the
 * pages only render them.
 *
 * Winners are derived from final scores every time, never stored, and a tie
 * lists more than one (PRD criterion 66).
 */

export interface GameListItem {
  id: string;
  /** ISO date, exactly as chosen at save (criterion 58). */
  playedOn: string;
  /** Null renders as "No location", never a gap (criterion 61). */
  locationName: string | null;
  /** `roster.name`, or the auto-name built from its members (criterion 68). */
  rosterName: string;
  /** Display names. More than one on a shared win. */
  winners: string[];
  winningScore: number;
}

export interface GameColumn {
  playerId: string;
  displayName: string;
  /** The handwritten header as read, when known. Null for games typed by hand. */
  sheetName: string | null;
  /** 0-based position on the paper (criterion 70). */
  columnOrder: number;
  /** The eleven numbers as written on the pad. */
  runningTotals: number[];
  /** The per-hand scores derived from them at save. */
  handScores: number[];
  finalScore: number;
  isWinner: boolean;
}

export interface GameDetail {
  id: string;
  playedOn: string;
  locationName: string | null;
  rosterName: string;
  /** In the paper's column order. */
  columns: GameColumn[];
  winners: string[];
  winningScore: number;
  /** Presigned, five minutes (criterion 12). Null only if the stored object is missing. */
  sheetPhoto: {
    url: string;
    expiresAt: string;
    width: number | null;
    height: number | null;
  } | null;
}
