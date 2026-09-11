/**
 * The two verified fixture grids, anonymised.
 *
 * ⚠️ **Never put a real name in this file.** The repository is public. The
 * source of truth is `fixtures/sheets/GROUND-TRUTH.md`, which is gitignored
 * because it holds the founder's friends' real names and their photographs.
 * The numbers below are copied from it verbatim; only the labels change, to
 * the Player A–E scheme used throughout `docs/` (DESIGN-SYSTEM.md, "Hard
 * rules": *Player names in shared docs and mockups are Player A–E, never real
 * names*).
 *
 * The mapping between labels and people lives only in the founder's head and
 * in the gitignored file. Do not reconstruct it here.
 *
 * These grids are the Milestone 1 acceptance corpus (PRD criterion 81): a
 * deliberately broken derivation has to fail the build.
 */

/** Player labels, in the order `docs/` uses them. */
export const PLAYER_A = "Player A";
export const PLAYER_B = "Player B";
export const PLAYER_C = "Player C";
export const PLAYER_D = "Player D";
export const PLAYER_E = "Player E";

export interface FixtureColumn {
  /** The anonymised label, standing in for the handwritten column header. */
  player: string;
  /** The eleven running totals exactly as written on the pad. */
  runningTotals: number[];
  /** The per-hand scores those running totals derive to. */
  handScores: number[];
}

export interface FixtureSheet {
  file: string;
  /** Columns in the order they appear on the paper, left to right. */
  columns: FixtureColumn[];
  /** Lowest final total. An array because ties are shared. */
  winners: string[];
  winningScore: number;
}

/**
 * `sheet-01-four-players.jpg` — four players, portrait, hard shadow.
 *
 * Hard cases, all verified against the paper by the founder:
 *  - **Player D holds `64` for six consecutive rows** — five hands scored zero.
 *    Any validator that treats repeats as a suspected duplicate read is
 *    provably wrong here.
 *  - **Player B's hand 4 is a genuine 51-point hand** (54 − 3). The row above it
 *    has a struck-through value; `54` is the surviving one.
 *  - Player B's column starts at `0`, which is also ordinary.
 */
export const SHEET_01: FixtureSheet = {
  file: "sheet-01-four-players.jpg",
  columns: [
    {
      player: PLAYER_A,
      runningTotals: [28, 32, 60, 71, 74, 100, 118, 123, 123, 123, 137],
      handScores: [28, 4, 28, 11, 3, 26, 18, 5, 0, 0, 14],
    },
    {
      player: PLAYER_B,
      runningTotals: [0, 3, 3, 54, 80, 88, 105, 105, 109, 109, 109],
      handScores: [0, 3, 0, 51, 26, 8, 17, 0, 4, 0, 0],
    },
    {
      player: PLAYER_C,
      runningTotals: [23, 23, 27, 34, 37, 44, 57, 71, 75, 78, 78],
      handScores: [23, 0, 4, 7, 3, 7, 13, 14, 4, 3, 0],
    },
    {
      player: PLAYER_D,
      runningTotals: [29, 29, 64, 64, 64, 64, 64, 64, 67, 67, 111],
      handScores: [29, 0, 35, 0, 0, 0, 0, 0, 3, 0, 44],
    },
  ],
  winners: [PLAYER_C],
  winningScore: 78,
};

/**
 * `sheet-02-five-players-rotated.jpg` — five players, written along the long
 * edge and photographed sideways. A **different roster** from sheet 1: the same
 * friends plus Player E.
 *
 * Hard cases:
 *  - **Player B holds `48` for five consecutive rows** — four zero-point hands.
 *  - Player A's middle rows are heavily overwritten; the spike named this the
 *    least certain column on either sheet.
 *  - Player E's column starts at `0`.
 */
export const SHEET_02: FixtureSheet = {
  file: "sheet-02-five-players-rotated.jpg",
  columns: [
    {
      player: PLAYER_A,
      runningTotals: [29, 29, 29, 42, 91, 129, 148, 187, 216, 216, 222],
      handScores: [29, 0, 0, 13, 49, 38, 19, 39, 29, 0, 6],
    },
    {
      player: PLAYER_B,
      runningTotals: [10, 16, 48, 48, 48, 48, 48, 56, 56, 68, 71],
      handScores: [10, 6, 32, 0, 0, 0, 0, 8, 0, 12, 3],
    },
    {
      player: PLAYER_E,
      runningTotals: [0, 30, 41, 41, 66, 101, 137, 137, 140, 154, 154],
      handScores: [0, 30, 11, 0, 25, 35, 36, 0, 3, 14, 0],
    },
    {
      player: PLAYER_D,
      runningTotals: [31, 53, 66, 86, 90, 145, 162, 162, 198, 225, 240],
      handScores: [31, 22, 13, 20, 4, 55, 17, 0, 36, 27, 15],
    },
    {
      player: PLAYER_C,
      runningTotals: [16, 44, 76, 78, 78, 87, 105, 134, 134, 134, 144],
      handScores: [16, 28, 32, 2, 0, 9, 18, 29, 0, 0, 10],
    },
  ],
  winners: [PLAYER_B],
  winningScore: 71,
};

export const FIXTURE_SHEETS: FixtureSheet[] = [SHEET_01, SHEET_02];

/**
 * A two-way tie. **Synthetic** — neither real sheet has one, but the rule is
 * settled (lowest total wins, ties are shared) and a shared win is why no
 * winner is stored on `game` at all.
 *
 * Built from sheet 1 by giving Player A the same final total as Player C. Note
 * that the PRD's criterion 66 describes doing this by editing Player A's row 11
 * to `78`, which would also drop it below the `123` in row 10 and trip the
 * monotonicity gate — so the tie is constructed here at the final-score level,
 * where the winner rule actually lives.
 */
export const TIE_FINAL_SCORES: { playerId: string; score: number }[] = [
  { playerId: PLAYER_A, score: 78 },
  { playerId: PLAYER_B, score: 109 },
  { playerId: PLAYER_C, score: 78 },
  { playerId: PLAYER_D, score: 111 },
];

export const TIE_WINNERS = [PLAYER_A, PLAYER_C];
