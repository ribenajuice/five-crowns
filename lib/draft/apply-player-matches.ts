/**
 * Wires `lib/players/match.ts`'s pure matcher into a draft — PRD criteria
 * 148–154, 172–173.
 *
 * Called after a sheet or column transcription is merged into the draft
 * (`lib/draft/merge-sheet.ts`, `lib/draft/merge-column.ts`), never before —
 * `sheetName` is what the matcher scores against, and those two are the only
 * places `sheetName` gets set on an *unassigned* column. Manual entry never
 * sets `sheetName` at all (`emptyDraftState`), so a hand-typed draft behaves
 * exactly like Milestone 1: nothing to match against, nothing suggested
 * (criterion 151).
 *
 * ⚠️ **Suggestions apply only to unassigned columns** (criterion 172). Any
 * column that already carries a `playerId` — an edit draft's columns (Stage
 * 2), or one already hand-picked earlier in the same session — is passed
 * straight through untouched below; `matchColumnsToPlayers` never overwrites
 * an existing assignment and always counts it as "taken" for the rest of the
 * game (criterion 150).
 */

import "server-only";

import { getDb } from "@/lib/db";
import { player } from "@/lib/db/schema";
import { matchColumnsToPlayers, type ColumnToMatch } from "@/lib/players/match";

import { nameKey } from "./state";
import type { DraftColumn, DraftState } from "./state";

/**
 * Re-runs matching over every unassigned column of `state`, in paper order,
 * and returns a new state with:
 *   - a confident suggestion (criterion 172) pre-selecting `playerId`, or
 *   - a near match (criterion 173) populating `nameCandidates`, unselected.
 *
 * A column already assigned, or with no `sheetName` yet, is returned exactly
 * as it was.
 */
export async function applySuggestedPlayerMatches(state: DraftState): Promise<DraftState> {
  const orderedColumns = [...state.columns].sort((a, b) => a.order - b.order);

  // Nothing to do if every column is already assigned or unnamed — skip the
  // query entirely rather than fetch the whole player table for nothing.
  const hasWorkToDo = orderedColumns.some(
    (c) => !c.playerId && !c.newPlayerName && c.sheetName,
  );
  if (!hasWorkToDo) return state;

  const players = await getDb()
    .select({ id: player.id, displayName: player.displayName, nameKey: player.nameKey })
    .from(player);

  // A pending "someone new" name resolves against an existing player by
  // `nameKey` at save time (`lib/games/resolve.ts`'s `resolvePlayers`) —
  // exactly the same rule applied here, so a column that will fold onto an
  // existing player at save is excluded from the pool just as if it already
  // held that player's id. A name that resolves to nobody is a genuinely new
  // person and excludes nothing.
  const playerIdByNameKey = new Map(players.map((p) => [p.nameKey, p.id]));

  const toMatch: ColumnToMatch[] = orderedColumns.map((column) => {
    const resolvedNewPlayerId = column.newPlayerName
      ? playerIdByNameKey.get(nameKey(column.newPlayerName))
      : undefined;
    return {
      columnId: column.id,
      sheetName: column.sheetName,
      // A pending "someone new" name also takes the column out of play for
      // matching (it already has an owner, just not an existing one yet) —
      // treated the same as an existing playerId for "already assigned".
      assignedPlayerId: column.playerId ?? resolvedNewPlayerId ?? null,
    };
  });

  const results = matchColumnsToPlayers(toMatch, players);
  const byColumnId = new Map(results.map((r) => [r.columnId, r]));

  const nextColumns: DraftColumn[] = state.columns.map((column) => {
    // Never re-match a column that already has an owner of any kind.
    if (column.playerId || column.newPlayerName) return column;

    const match = byColumnId.get(column.id);
    if (!match) return column;

    if (match.tier === "suggest") {
      // Criterion 172: pre-selected, counts as assigned, no further state.
      return { ...column, playerId: match.suggestedPlayerId, nameCandidates: undefined };
    }
    if (match.tier === "offer") {
      // Criterion 173: still unassigned, candidates surfaced for the pick-list.
      return { ...column, nameCandidates: match.candidatePlayerIds };
    }
    return column;
  });

  return { ...state, columns: nextColumns };
}
