import { describe, expect, it } from "vitest";

import {
  isPlayableRoster,
  isSameRoster,
  rosterDisplayName,
  rosterMembers,
  rosterSignature,
  RosterSignatureError,
  rosterSize,
} from "@/lib/scoring";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";

// Stand-ins for immutable player.id values. The signature is built from ids,
// never from names, which is what makes it rename-proof.
const IDS: Record<string, string> = {
  "Player A": "p_3f2a",
  "Player B": "p_9ab1",
  "Player C": "p_c410",
  "Player D": "p_1d77",
  "Player E": "p_e502",
};

const idsFor = (sheet: typeof SHEET_01) =>
  sheet.columns.map((c) => IDS[c.player]!);

describe("rosterSignature — the two verified fixture grids", () => {
  it("gives sheet 1 a four-player signature", () => {
    expect(rosterSignature(idsFor(SHEET_01))).toBe(
      "p_1d77:p_3f2a:p_9ab1:p_c410",
    );
    expect(rosterSize(idsFor(SHEET_01))).toBe(4);
  });

  it("gives sheet 2 a five-player signature", () => {
    expect(rosterSignature(idsFor(SHEET_02))).toBe(
      "p_1d77:p_3f2a:p_9ab1:p_c410:p_e502",
    );
    expect(rosterSize(idsFor(SHEET_02))).toBe(5);
  });

  it("keeps the two sheets as different rosters — the same friends, one extra", () => {
    // Exact-set matching, deliberately. No subset grouping.
    expect(rosterSignature(idsFor(SHEET_01))).not.toBe(
      rosterSignature(idsFor(SHEET_02)),
    );
    expect(isSameRoster(idsFor(SHEET_01), idsFor(SHEET_02))).toBe(false);
  });
});

describe("rosterSignature — order independence", () => {
  it("is identical however the columns were ordered on the paper", () => {
    const paperOrder = idsFor(SHEET_01);
    const reversed = [...paperOrder].reverse();
    const shuffled = [paperOrder[2]!, paperOrder[0]!, paperOrder[3]!, paperOrder[1]!];

    const expected = rosterSignature(paperOrder);
    expect(rosterSignature(reversed)).toBe(expected);
    expect(rosterSignature(shuffled)).toBe(expected);
    expect(isSameRoster(paperOrder, shuffled)).toBe(true);
  });

  it("matches an existing roster when the same four are re-entered in a new order", () => {
    // PRD criterion 67.
    const first = ["p_3f2a", "p_9ab1", "p_c410", "p_1d77"];
    const later = ["p_c410", "p_1d77", "p_3f2a", "p_9ab1"];
    expect(rosterSignature(later)).toBe(rosterSignature(first));
  });

  it("survives every permutation of a five-player roster", () => {
    const base = idsFor(SHEET_02);
    const expected = rosterSignature(base);

    const permute = (xs: string[]): string[][] =>
      xs.length <= 1
        ? [xs]
        : xs.flatMap((x, i) =>
            permute([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [
              x,
              ...rest,
            ]),
          );

    const all = permute(base);
    expect(all).toHaveLength(120);
    for (const order of all) {
      expect(rosterSignature(order)).toBe(expected);
    }
  });
});

describe("rosterSignature — identity properties", () => {
  it("collapses a player listed twice into one member", () => {
    expect(rosterSignature(["p_a", "p_b", "p_a"])).toBe("p_a:p_b");
    expect(rosterSize(["p_a", "p_b", "p_a"])).toBe(2);
  });

  it("is built from ids, so a rename cannot fork a roster", () => {
    // Same ids, different display names — the names never enter the signature.
    expect(rosterSignature(["p_a", "p_b"])).toBe(rosterSignature(["p_b", "p_a"]));
  });

  it("round-trips through rosterMembers", () => {
    const ids = idsFor(SHEET_02);
    expect(rosterMembers(rosterSignature(ids)).sort()).toEqual([...ids].sort());
  });
});

describe("rosterSignature — rejected input", () => {
  it("refuses an id containing the separator, which would be ambiguous", () => {
    expect(() => rosterSignature(["p_a:p_b"])).toThrow(RosterSignatureError);
  });

  it("refuses an empty id", () => {
    expect(() => rosterSignature(["p_a", ""])).toThrow(RosterSignatureError);
  });

  it("refuses an empty roster", () => {
    expect(() => rosterSignature([])).toThrow(RosterSignatureError);
  });
});

describe("isPlayableRoster", () => {
  it("accepts both fixture rosters", () => {
    expect(isPlayableRoster(idsFor(SHEET_01))).toBe(true);
    expect(isPlayableRoster(idsFor(SHEET_02))).toBe(true);
  });

  it("rejects a one-player game — that is a transcription failure", () => {
    expect(isPlayableRoster(["p_a"])).toBe(false);
    expect(isPlayableRoster(["p_a", "p_a"])).toBe(false);
  });
});

describe("rosterDisplayName — the auto-name (criterion 68)", () => {
  it("is a single name for one member", () => {
    expect(rosterDisplayName(["Player C"])).toBe("Player C");
  });

  it("joins two members with '&', not a comma", () => {
    expect(rosterDisplayName(["Player B", "Player A"])).toBe("Player A & Player B");
  });

  it("sorts alphabetically and joins three or more with a comma list and a final '&'", () => {
    expect(rosterDisplayName(["Player D", "Player B", "Player A", "Player C"])).toBe(
      "Player A, Player B, Player C & Player D",
    );
  });

  it("is empty for no members", () => {
    expect(rosterDisplayName([])).toBe("");
  });

  it("is stable regardless of input order — the same roster always reads the same", () => {
    const a = rosterDisplayName(["Player E", "Player A", "Player D", "Player B", "Player C"]);
    const b = rosterDisplayName(["Player C", "Player D", "Player A", "Player E", "Player B"]);
    expect(a).toBe(b);
  });
});
