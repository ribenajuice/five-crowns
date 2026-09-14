/**
 * `MergeConflictRefusal` — PRD criterion 160. Static-markup smoke test: every
 * offending game named with a link to it and a link to edit it, and the
 * banner naming both players — no survivor picker anywhere in the markup.
 */
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("MergeConflictRefusal", () => {
  it("names both players, lists every offending game with an edit link, and offers only the way back", async () => {
    const { MergeConflictRefusal } = await import("@/components/MergeConflictRefusal");
    const html = renderToStaticMarkup(
      createElement(MergeConflictRefusal, {
        aName: "Sam",
        bName: "Player A",
        games: [{ id: "g1", playedOn: "2026-09-14", locationName: "Thursday crew" }],
        backHref: "/players/p1",
        backPlayerName: "Sam",
      }),
    );

    expect(html).toContain("Sam and Player A played the same game.");
    expect(html).toContain("One person can&#x27;t hold two seats at the same table");
    expect(html).toContain("/games/g1");
    expect(html).toContain("Edit this game");
    expect(html).toContain("Back to Sam");
    // No survivor-card / Stays-Deleted vocabulary anywhere — the refusal
    // replaces the picker entirely, it doesn't sit above a still-enabled one.
    expect(html).not.toContain("Stays");
    expect(html).not.toContain("Merge permanently");
  });

  it("names every game when more than one is shared", async () => {
    const { MergeConflictRefusal } = await import("@/components/MergeConflictRefusal");
    const html = renderToStaticMarkup(
      createElement(MergeConflictRefusal, {
        aName: "Sam",
        bName: "Player A",
        games: [
          { id: "g1", playedOn: "2026-09-14", locationName: null },
          { id: "g2", playedOn: "2026-09-01", locationName: "The Deck" },
        ],
        backHref: "/players/p1",
        backPlayerName: "Sam",
      }),
    );
    expect(html).toContain("/games/g1");
    expect(html).toContain("/games/g2");
    expect(html).toContain("No location");
    expect(html).toContain("The Deck");
  });
});
