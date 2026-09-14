/**
 * `lib/players/match.ts` — PRD criteria 148–151 and `docs/PRD.md`'s "Decisions
 * taken in this spec" #1. Pure, no database — this is exactly the kind of
 * logic criterion 169 asks for "real unit tests" over, "including its
 * ambiguity rule", so the table below is deliberately large and explicit.
 */

import { describe, expect, it } from "vitest";

import {
  AMBIGUITY_GAP,
  levenshteinDistance,
  matchColumnsToPlayers,
  nameSimilarity,
  normaliseName,
  OFFER_THRESHOLD,
  type ColumnToMatch,
  type KnownPlayer,
} from "@/lib/players/match";

describe("normaliseName", () => {
  it("trims, collapses whitespace, and lowercases", () => {
    expect(normaliseName("  Player   C  ")).toBe("player c");
  });

  it("strips punctuation", () => {
    expect(normaliseName("D'Arcy")).toBe("darcy");
  });

  it("strips diacritics", () => {
    expect(normaliseName("José")).toBe("jose");
  });
});

describe("levenshteinDistance", () => {
  it("is 0 for identical strings", () => {
    expect(levenshteinDistance("cody", "cody")).toBe(0);
  });

  it("is the length of the other string when one is empty", () => {
    expect(levenshteinDistance("", "cody")).toBe(4);
    expect(levenshteinDistance("cody", "")).toBe(4);
  });

  it("counts a single substitution as 1", () => {
    expect(levenshteinDistance("cody", "cady")).toBe(1);
  });

  it("counts a single insertion/deletion as 1", () => {
    expect(levenshteinDistance("cody", "codyy")).toBe(1);
    expect(levenshteinDistance("codyy", "cody")).toBe(1);
  });
});

describe("nameSimilarity — the scoring table", () => {
  it("scores identical normalised strings as 1", () => {
    expect(nameSimilarity("cody", "cody")).toBe(1);
  });

  it("scores two empty strings as 1 (nothing to disagree about)", () => {
    expect(nameSimilarity("", "")).toBe(1);
  });

  it("scores completely disjoint strings below the offer threshold", () => {
    // "cody" vs "xyz": distance 4 (replace all four, or 4-edit path), max len 4 → 0.
    expect(nameSimilarity("cody", "xyz")).toBeLessThan(OFFER_THRESHOLD);
  });

  it("⚠️ boundary: a one-character difference in a five-letter name scores exactly 0.80", () => {
    // "sarah" vs "sarat": one substitution, length 5 → 1 - 1/5 = 0.80.
    expect(nameSimilarity("sarah", "sarat")).toBeCloseTo(0.8, 10);
  });

  it("⚠️ boundary: exactly 0.55 is reachable and is eligible to offer", () => {
    // length 20 with 9 edits: 1 - 9/20 = 0.55.
    const a = "a".repeat(20);
    const b = "b".repeat(9) + "a".repeat(11);
    expect(nameSimilarity(a, b)).toBeCloseTo(0.55, 10);
  });

  it("the worked example: Jonny and Jenny both score exactly 0.80 against Janny", () => {
    expect(nameSimilarity("janny", "jonny")).toBeCloseTo(0.8, 10);
    expect(nameSimilarity("janny", "jenny")).toBeCloseTo(0.8, 10);
  });
});

/** Convenience for building an unassigned, freshly-read column. */
function col(columnId: string, sheetName: string | null): ColumnToMatch {
  return { columnId, sheetName, assignedPlayerId: null };
}

function players(...names: string[]): KnownPlayer[] {
  return names.map((displayName, i) => ({ id: `p${i}`, displayName }));
}

describe("matchColumnsToPlayers — criterion 148's tiers", () => {
  it("suggests a confident, unambiguous match (≥ 0.80, clear leader)", () => {
    const known = players("Cody");
    const [result] = matchColumnsToPlayers([col("c1", "Cody")], known);
    expect(result).toMatchObject({ tier: "suggest", suggestedPlayerId: "p0" });
  });

  it("⚠️ boundary: exactly 0.80 with a clear leader still suggests", () => {
    const known = players("Sarat", "Someone Else Entirely");
    const [result] = matchColumnsToPlayers([col("c1", "Sarah")], known);
    expect(result?.tier).toBe("suggest");
    expect(result?.suggestedPlayerId).toBe("p0");
  });

  it("offers (never suggests) a near match between 0.55 and 0.80", () => {
    // "Kate" vs "Cate": one substitution over 4 chars → 0.75, inside the offer band.
    const known = players("Cate");
    const [result] = matchColumnsToPlayers([col("c1", "Kate")], known);
    expect(result?.tier).toBe("offer");
    expect(result?.suggestedPlayerId).toBeNull();
    expect(result?.candidatePlayerIds).toEqual(["p0"]);
  });

  it("⚠️ boundary: exactly 0.55 is eligible to offer", () => {
    const a = "a".repeat(20);
    const b = "b".repeat(9) + "a".repeat(11);
    const known = players(b);
    const [result] = matchColumnsToPlayers([col("c1", a)], known);
    expect(nameSimilarity(normaliseName(a), normaliseName(b))).toBeCloseTo(0.55, 10);
    expect(result?.tier).toBe("offer");
  });

  it("suggests and offers nothing below 0.55", () => {
    const known = players("Zzyzx");
    const [result] = matchColumnsToPlayers([col("c1", "Cody")], known);
    expect(result).toMatchObject({ tier: "none", suggestedPlayerId: null, candidatePlayerIds: [] });
  });

  it("offers at most three candidates, best first", () => {
    // Four players all within one substitution of "Kort" (4 letters): 0.75 each.
    const known = players("Kort", "Sort", "Fort", "Mort", "Bort");
    const [result] = matchColumnsToPlayers([col("c1", "Cort")], known);
    expect(result?.tier).toBe("offer");
    expect(result?.candidatePlayerIds).toHaveLength(3);
  });
});

describe("matchColumnsToPlayers — criterion 149's ambiguity rule", () => {
  it("the worked example: Jonny and Jenny both at 0.80 against Janny — nothing suggested, both offered", () => {
    const known = players("Jonny", "Jenny");
    const [result] = matchColumnsToPlayers([col("c1", "Janny")], known);
    expect(result?.tier).toBe("offer");
    expect(result?.suggestedPlayerId).toBeNull();
    expect(result?.candidatePlayerIds).toEqual(expect.arrayContaining(["p0", "p1"]));
    expect(result?.candidatePlayerIds).toHaveLength(2);
  });

  it("⚠️ boundary: a gap of exactly 0.10 between the top two is still ambiguous (inclusive)", () => {
    // "abcdefghij" (10 chars). One candidate differs by 1 edit (0.90), another
    // by 2 edits (0.80) — a gap of exactly AMBIGUITY_GAP.
    const target = "abcdefghij";
    const closeOne = "abcdefghix"; // 1 substitution → 0.90
    const closeTwo = "abcdefghxx"; // 2 substitutions → 0.80
    expect(nameSimilarity(target, closeOne) - nameSimilarity(target, closeTwo)).toBeCloseTo(
      AMBIGUITY_GAP,
      10,
    );
    const known = players(closeOne, closeTwo);
    const [result] = matchColumnsToPlayers([col("c1", target)], known);
    // 0.90 clears the suggest threshold, but the runner-up is within 0.10 —
    // no clear leader, so this must not suggest.
    expect(result?.tier).toBe("offer");
    expect(result?.suggestedPlayerId).toBeNull();
  });

  it("a gap just over 0.10 is a clear leader and suggests", () => {
    // 20 distinct letters, so replacing a position with a digit (which
    // appears nowhere else in either string) can only cost exactly one
    // substitution — no cheaper insert/delete alignment is available.
    const target = "abcdefghijklmnopqrst"; // 20 chars
    const closeOne = "abcdefghijklmnopqrs0"; // 1 substitution → 0.95
    const farther = "abcd1234ijklmnopqrst"; // 4 substitutions → 0.80
    expect(nameSimilarity(target, closeOne)).toBeCloseTo(0.95, 10);
    expect(nameSimilarity(target, farther)).toBeCloseTo(0.8, 10);

    const known = players(farther, closeOne);
    const [result] = matchColumnsToPlayers([col("c1", target)], known);
    expect(result?.tier).toBe("suggest");
    expect(result?.suggestedPlayerId).toBe("p1"); // closeOne
  });
});

describe("matchColumnsToPlayers — criterion 150: no player holds two columns", () => {
  it("never suggests or offers a player already assigned to another column of the same game", () => {
    const known = players("Cody");
    const columns: ColumnToMatch[] = [
      { columnId: "c1", sheetName: null, assignedPlayerId: "p0" }, // already Cody
      col("c2", "Cody"), // sheet also reads "Cody" here
    ];
    const results = matchColumnsToPlayers(columns, known);
    expect(results[0]).toMatchObject({ tier: "none" }); // untouched: already assigned
    expect(results[1]).toMatchObject({ tier: "none", suggestedPlayerId: null }); // p0 is taken
  });

  it("⚠️ the two-column-same-target case: only the left-to-right first column gets the suggestion", () => {
    const known = players("Cody");
    const columns = [col("left", "Cody"), col("right", "Cody")];
    const results = matchColumnsToPlayers(columns, known);
    expect(results[0]).toMatchObject({ tier: "suggest", suggestedPlayerId: "p0" });
    // The second column has nobody left to match against.
    expect(results[1]).toMatchObject({ tier: "none", suggestedPlayerId: null, candidatePlayerIds: [] });
  });

  it("the two-column-same-target case at offer tier: the second column loses the same top candidate", () => {
    const known = players("Cate");
    const columns = [col("left", "Kate"), col("right", "Kate")];
    const results = matchColumnsToPlayers(columns, known);
    expect(results[0]).toMatchObject({ tier: "offer", candidatePlayerIds: ["p0"] });
    // "Cate" was claimed by the left column's offer — nothing left to offer here.
    expect(results[1]).toMatchObject({ tier: "none", candidatePlayerIds: [] });
  });

  it("a later column still matches a different remaining player once the top one is taken", () => {
    const known = players("Cody", "Cory");
    const columns = [col("left", "Cody"), col("right", "Cody")];
    const results = matchColumnsToPlayers(columns, known);
    expect(results[0]).toMatchObject({ tier: "suggest", suggestedPlayerId: "p0" });
    // "Cody" is taken; "Cory" (1 edit, len 4 → 0.75) is what's left — an offer.
    expect(results[1]?.tier).toBe("offer");
    expect(results[1]?.candidatePlayerIds).toEqual(["p1"]);
  });
});

describe("matchColumnsToPlayers — criterion 151: empty player list behaves like M1", () => {
  it("suggests and offers nothing when there are no known players at all", () => {
    const [result] = matchColumnsToPlayers([col("c1", "Cody")], []);
    expect(result).toMatchObject({ tier: "none", suggestedPlayerId: null, candidatePlayerIds: [] });
  });
});

describe("matchColumnsToPlayers — edge inputs", () => {
  it("does nothing for a column with no sheetName", () => {
    const [result] = matchColumnsToPlayers([col("c1", null)], players("Cody"));
    expect(result).toMatchObject({ tier: "none" });
  });

  it("never touches an already-assigned column, even with a perfect-match sheetName", () => {
    const known = players("Cody");
    const [result] = matchColumnsToPlayers(
      [{ columnId: "c1", sheetName: "Cody", assignedPlayerId: "someone-else" }],
      known,
    );
    expect(result).toMatchObject({ tier: "none", suggestedPlayerId: null, candidatePlayerIds: [] });
  });

  it("is stable under whitespace and case differences alone (exact match after normalising)", () => {
    const known = players("Player C");
    const [result] = matchColumnsToPlayers([col("c1", "  player   c ")], known);
    expect(result).toMatchObject({ tier: "suggest", suggestedPlayerId: "p0" });
  });
});
