/**
 * Name-similarity matching — PRD criteria 148–151, and the decision recorded
 * as "Decisions taken in this spec" #1 in `docs/PRD.md` (Milestone 2 delivery
 * spec).
 *
 * Pure, dependency-free, no database, no Next.js — same rule
 * `lib/scoring` follows, and for the same reason: this is exactly the kind of
 * logic a large, explicit unit-test table has to nail down, and a pure
 * function is what makes that possible without a database in every test.
 *
 * The rule, stated once so nothing downstream has to re-derive it:
 *   1. Normalise both names (trim, collapse whitespace, lowercase, strip
 *      punctuation and diacritics).
 *   2. Score `similarity = 1 − levenshtein(a, b) / max(len(a), len(b))`.
 *   3. **≥ 0.80 with a clear leader → suggest** (pre-selected, criterion 172).
 *   4. **≥ 0.55 and < 0.80 → offer** the best two or three, unselected.
 *   5. **< 0.55 → nothing**, exactly like Milestone 1's plain pick-list.
 *   6. **Ambiguity rule**: if the top two candidates are within 0.10 of each
 *      other, nothing is suggested even if the top score clears 0.80 — both
 *      are offered instead (criterion 149's worked example: "Jonny" and
 *      "Jenny" both scoring exactly 0.80 against a column read "Janny").
 *   7. **A player already assigned to another column of the same game is
 *      never suggested or offered for a second column** (criterion 150).
 *      Where two unassigned columns would both match the same player, only
 *      the left-to-right first column gets it — later columns are matched as
 *      if that player were already taken. `matchColumnsToPlayers` below
 *      enforces this by processing columns in order and removing whichever
 *      player a column's top candidate names from the pool before scoring the
 *      next column, whether that column ends up suggesting or merely
 *      offering that player.
 *
 * `nameConfidence` from the vision path is deliberately not an input here —
 * it is a reading aid, not a check (docs/PRD.md, decision 1), and letting it
 * gate a suggestion would make this rule unexplainable for no measured gain.
 */

/** ≥ this, with a clear leader, pre-selects a player (criterion 148). */
export const SUGGEST_THRESHOLD = 0.8;

/** ≥ this (below the suggest threshold) offers candidates, unselected. */
export const OFFER_THRESHOLD = 0.55;

/**
 * If the best two candidates' scores are within this of each other, there is
 * no "clear leader" and nothing is suggested, however high the top score is
 * (criterion 149). Inclusive: a gap of exactly 0.10 counts as ambiguous, the
 * same "boundaries are inclusive as written" stance criterion 148 takes for
 * its own two thresholds.
 */
export const AMBIGUITY_GAP = 0.1;

/** "The best two or three" (criterion 148) — the pick-list gets at most this many. */
export const MAX_CANDIDATES = 3;

export interface KnownPlayer {
  id: string;
  displayName: string;
}

/**
 * Trim, collapse whitespace, lowercase, strip punctuation and diacritics.
 * Shared normalisation for both the handwritten name and every known player's
 * display name, so "Jo" and "Jo." (or "José" and "Jose") compare fairly.
 *
 * ⚠️ Deliberately distinct from `lib/draft/state.ts`'s `nameKey` (which only
 * trims/lowercases/collapses whitespace, for the exact-match "someone new"
 * dedupe): this one also strips punctuation and diacritics, because a
 * similarity score has to survive a stray apostrophe or accent that an
 * exact-match key doesn't need to tolerate.
 */
export function normaliseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining diacritic marks (NFD splits é → e + ́)
    .replace(/[^\p{L}\p{N}\s]/gu, "") // punctuation — keep letters, digits, whitespace
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Classic Levenshtein edit distance, iterative, O(len(a) × len(b)). */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const currentRow = new Array<number>(b.length + 1);
    currentRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        currentRow[j - 1]! + 1, // insertion
        previousRow[j]! + 1, // deletion
        previousRow[j - 1]! + cost, // substitution
      );
    }
    previousRow = currentRow;
  }

  return previousRow[b.length]!;
}

/**
 * `1 − levenshtein(a, b) / max(len(a), len(b))`, over **already normalised**
 * strings. Two empty strings are identical (score 1); one empty and one not
 * scores 0. Levenshtein over anything cleverer (phonetic, trigram, an
 * embedding) because the real corpus is a handful of names and the real
 * failure is a one- or two-character misread — a rule stated in one line is
 * a rule QA can test and the founder can be told (docs/PRD.md, decision 1).
 */
export function nameSimilarity(normalisedA: string, normalisedB: string): number {
  const maxLen = Math.max(normalisedA.length, normalisedB.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(normalisedA, normalisedB) / maxLen;
}

export type MatchTier = "suggest" | "offer" | "none";

export interface ColumnMatchResult {
  columnId: string;
  tier: MatchTier;
  /** Set only when `tier === "suggest"`. */
  suggestedPlayerId: string | null;
  /**
   * Best-first, at most {@link MAX_CANDIDATES}. Populated only when
   * `tier === "offer"` — a suggested column doesn't need a ranked list (the
   * ordinary alphabetical pick-list is enough once something is pre-selected)
   * and a `"none"` column has nothing worth ranking.
   */
  candidatePlayerIds: string[];
}

export interface ColumnToMatch {
  columnId: string;
  /** The handwritten name as read. `null`/empty ⇒ nothing to match against. */
  sheetName: string | null;
  /**
   * Already resolved to a real player (hand-picked, or assigned in an earlier
   * pass) — never re-matched or re-suggested (criterion 172's "suggestions
   * apply only to unassigned columns"), and this player is unavailable to
   * every other column in the same game (criterion 150).
   */
  assignedPlayerId: string | null;
}

/**
 * Match every column against the known player pool, in one left-to-right
 * pass. `columns` must already be in paper order (left to right) — the
 * left-to-right-first-column-wins rule (criterion 150) depends on it.
 *
 * On an empty player list, every column resolves to `"none"` — identical to
 * Milestone 1's plain pick-list (criterion 151).
 */
export function matchColumnsToPlayers(
  columns: readonly ColumnToMatch[],
  players: readonly KnownPlayer[],
): ColumnMatchResult[] {
  const taken = new Set<string>(
    columns.filter((c) => c.assignedPlayerId).map((c) => c.assignedPlayerId as string),
  );

  const normalisedPlayers = players.map((p) => ({
    id: p.id,
    normalised: normaliseName(p.displayName),
  }));

  const results: ColumnMatchResult[] = [];

  for (const column of columns) {
    if (column.assignedPlayerId) {
      // Already assigned — never re-matched, never re-suggested.
      results.push({ columnId: column.columnId, tier: "none", suggestedPlayerId: null, candidatePlayerIds: [] });
      continue;
    }

    const target = column.sheetName ? normaliseName(column.sheetName) : "";
    if (!target || normalisedPlayers.length === 0) {
      results.push({ columnId: column.columnId, tier: "none", suggestedPlayerId: null, candidatePlayerIds: [] });
      continue;
    }

    const pool = normalisedPlayers.filter((p) => !taken.has(p.id));
    if (pool.length === 0) {
      results.push({ columnId: column.columnId, tier: "none", suggestedPlayerId: null, candidatePlayerIds: [] });
      continue;
    }

    const scored = pool
      .map((p) => ({ id: p.id, score: nameSimilarity(target, p.normalised) }))
      // Score descending; ties broken by player id for a deterministic,
      // reproducible order (there is no meaningful ordering signal beyond the
      // score itself).
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    const top = scored[0]!;
    const second = scored[1];
    const ambiguous = second !== undefined && top.score - second.score <= AMBIGUITY_GAP;

    if (top.score >= SUGGEST_THRESHOLD && !ambiguous) {
      results.push({
        columnId: column.columnId,
        tier: "suggest",
        suggestedPlayerId: top.id,
        candidatePlayerIds: [],
      });
      taken.add(top.id);
    } else if (top.score >= OFFER_THRESHOLD) {
      const candidatePlayerIds = scored.slice(0, MAX_CANDIDATES).map((s) => s.id);
      results.push({
        columnId: column.columnId,
        tier: "offer",
        suggestedPlayerId: null,
        candidatePlayerIds,
      });
      // The column's best candidate is "claimed" for the left-to-right rule
      // (criterion 150) even though nothing was pre-selected — a later
      // column must not also be offered the same top match.
      taken.add(top.id);
    } else {
      results.push({ columnId: column.columnId, tier: "none", suggestedPlayerId: null, candidatePlayerIds: [] });
    }
  }

  return results;
}
