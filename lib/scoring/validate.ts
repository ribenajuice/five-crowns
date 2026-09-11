/**
 * The hard checks — the only things that block a save.
 *
 * ⚠️ These do not verify anything. They stop *impossible* data being written.
 * The Milestone 0 spike measured that a misread which preserves ordering passes
 * every check below, and that is the normal case rather than the exception.
 * Wording that implies otherwise is a build failure (PRD criterion 24).
 *
 * Soft warnings — an implausibly large jump, a digit-count anomaly — live
 * elsewhere and **never block a save**. Nothing here may ever warn about
 * repeated values, zero deltas, a column starting at 0, or a long run of an
 * identical value: all four appear in the verified fixtures.
 *
 * Pure and dependency-free.
 */

import { HANDS_PER_GAME, MAX_RUNNING_TOTAL, MIN_PLAYERS } from "./constants";
import { checkMonotonicity, type CellValue } from "./monotonicity";

export type ColumnIssueCode =
  | "wrong_length"
  | "unread_cells"
  | "not_an_integer"
  | "out_of_range"
  | "not_monotonic"
  /** Grid-level: one player picked for more than one column. */
  | "duplicate_player"
  /** Grid-level: a column with numbers in it but nobody picked. */
  | "unassigned_column";

export interface ColumnIssue {
  code: ColumnIssueCode;
  /** Plain, blunt, names the numbers. Safe to show to a person. */
  message: string;
  /** Cell indices this issue points at. Empty when it is about the column. */
  indices: number[];
  /** Grid-level issues only: the columns it is about, in paper order. */
  columnIds?: string[];
}

export interface ColumnValidation {
  /** True when the column can be saved. Not a claim that it is right. */
  ok: boolean;
  issues: ColumnIssue[];
  /** Every cell index any issue points at, ascending and de-duplicated. */
  flaggedIndices: number[];
  /** How many of the eleven values are present, for the "10 of 11" message. */
  filled: number;
  expected: number;
}

/**
 * Validate one player's column of running totals.
 *
 * Hard checks, in the order a person would notice them:
 *   1. exactly eleven values;
 *   2. every value present (a `null` is an unread cell, not a shorter game);
 *   3. every value a non-negative integer no greater than 999;
 *   4. the column never decreases.
 */
export function validateColumn(
  values: readonly CellValue[],
  expected: number = HANDS_PER_GAME,
): ColumnValidation {
  const issues: ColumnIssue[] = [];
  const filled = values.filter((v) => v !== null && v !== undefined).length;

  if (values.length !== expected) {
    issues.push({
      code: "wrong_length",
      message: `${values.length} of ${expected} rows.`,
      indices: [],
    });
  }

  const unread: number[] = [];
  const notInteger: number[] = [];
  const outOfRange: number[] = [];

  values.forEach((value, index) => {
    if (value === null || value === undefined) {
      unread.push(index);
      return;
    }
    if (!Number.isInteger(value)) {
      notInteger.push(index);
      return;
    }
    if (value < 0 || value > MAX_RUNNING_TOTAL) {
      outOfRange.push(index);
    }
  });

  if (unread.length > 0) {
    issues.push({
      code: "unread_cells",
      message: `${filled} of ${expected} numbers. Fill in the rest.`,
      indices: unread,
    });
  }

  if (notInteger.length > 0) {
    issues.push({
      code: "not_an_integer",
      message: "A running total has to be a whole number.",
      indices: notInteger,
    });
  }

  if (outOfRange.length > 0) {
    issues.push({
      code: "out_of_range",
      message: `A running total has to be between 0 and ${MAX_RUNNING_TOTAL}.`,
      indices: outOfRange,
    });
  }

  const monotonicity = checkMonotonicity(values);
  for (const b of monotonicity.breaks) {
    issues.push({
      code: "not_monotonic",
      // Both numbers named, both cells flagged: either could be the misread.
      message: `${b.value} is lower than the ${b.previous} above it.`,
      indices: [b.previousIndex, b.index],
    });
  }

  const flagged = new Set<number>();
  for (const issue of issues) for (const i of issue.indices) flagged.add(i);

  return {
    ok: issues.length === 0,
    issues,
    flaggedIndices: [...flagged].sort((a, b) => a - b),
    filled,
    expected,
  };
}

export interface GridColumn {
  /** Stable, client-generated column id. Identity is the id, never the position. */
  id: string;
  /** null until the founder has picked who this column belongs to. */
  playerId: string | null;
  values: readonly CellValue[];
}

export interface GridValidation {
  /** True when the game can be saved. Not a claim that it is right. */
  ok: boolean;
  /** Column-level results, keyed by column id. */
  columns: Record<string, ColumnValidation>;
  /** Issues about the grid as a whole rather than one column. */
  issues: ColumnIssue[];
}

/**
 * Validate a whole draft grid.
 *
 * On top of the per-column checks:
 *  - at least two columns must have a player assigned (a one-player game is a
 *    transcription failure);
 *  - ⚠️ no player may be picked for more than one column — one person cannot
 *    hold two running totals, and saving it would give them two final scores;
 *  - ⚠️ no column with numbers in it may be left without a player — those scores
 *    would be saved against nobody, or silently dropped.
 */
export function validateGrid(
  columns: readonly GridColumn[],
  expected: number = HANDS_PER_GAME,
): GridValidation {
  const perColumn: Record<string, ColumnValidation> = {};
  for (const column of columns) {
    perColumn[column.id] = validateColumn(column.values, expected);
  }

  const issues: ColumnIssue[] = [];
  const assigned = new Set(
    columns
      .map((c) => c.playerId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  if (assigned.size < MIN_PLAYERS) {
    issues.push({
      code: "wrong_length",
      message: `A game needs at least ${MIN_PLAYERS} players. ${assigned.size} so far.`,
      indices: [],
    });
  }

  // One issue per repeated player, naming how many columns they are in.
  const columnsByPlayer = new Map<string, string[]>();
  for (const column of columns) {
    if (typeof column.playerId !== "string" || column.playerId.length === 0) {
      continue;
    }
    const ids = columnsByPlayer.get(column.playerId) ?? [];
    ids.push(column.id);
    columnsByPlayer.set(column.playerId, ids);
  }
  for (const ids of columnsByPlayer.values()) {
    if (ids.length > 1) {
      issues.push({
        code: "duplicate_player",
        message: `The same player is picked for ${ids.length} columns. Pick a different player for each.`,
        indices: [],
        columnIds: ids,
      });
    }
  }

  const orphaned = columns
    .filter(
      (c) =>
        !(typeof c.playerId === "string" && c.playerId.length > 0) &&
        c.values.some((v) => v !== null && v !== undefined),
    )
    .map((c) => c.id);
  if (orphaned.length > 0) {
    issues.push({
      code: "unassigned_column",
      message:
        orphaned.length === 1
          ? "A column has scores but no player. Pick who it belongs to."
          : `${orphaned.length} columns have scores but no player. Pick who they belong to.`,
      indices: [],
      columnIds: orphaned,
    });
  }

  const ok =
    issues.length === 0 &&
    columns.length > 0 &&
    Object.values(perColumn).every((c) => c.ok);

  return { ok, columns: perColumn, issues };
}
