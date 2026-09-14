/**
 * `PickList` — Stage 4 (PRD criterion 173): a near-match column's sheet opens
 * with a "Closest matches" section pinned above the ordinary roster, in the
 * order the matcher ranked them. Static-markup smoke test only (no jsdom to
 * simulate a tap), same convention `tests/players/player-game-row.test.ts`
 * already established for a presentational component with no client-side
 * behaviour worth exercising via markup alone.
 */
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PickList } from "@/components/PickList";

describe("PickList — Stage 4 'Closest matches' section", () => {
  it("renders the closest-matches section, pinned above the ordinary roster", () => {
    const html = renderToStaticMarkup(
      createElement(PickList, {
        items: [
          { id: "p-a", label: "Player A" },
          { id: "p-d", label: "Player D" },
        ],
        closestMatches: [
          { id: "p-jonny", label: "Jonny" },
          { id: "p-jenny", label: "Jenny" },
        ],
        selectedId: null,
        pendingLabel: "Janny",
        addNewLabel: "Someone new",
        onSelect: () => {},
        onAddNew: () => {},
      }),
    );

    expect(html).toContain("Closest matches");
    expect(html).toContain("Jonny");
    expect(html).toContain("Jenny");
    expect(html).toContain("Player A");
    expect(html).toContain("Player D");
    // "Someone new", pre-filled, stays pinned last regardless.
    expect(html).toContain("Janny");

    const closestIndex = html.indexOf("Jonny");
    const ordinaryIndex = html.indexOf("Player A");
    expect(closestIndex).toBeLessThan(ordinaryIndex);
  });

  it("renders no 'Closest matches' section when there are no candidates (M1/none-tier behaviour, unchanged)", () => {
    const html = renderToStaticMarkup(
      createElement(PickList, {
        items: [{ id: "p-a", label: "Player A" }],
        selectedId: null,
        pendingLabel: null,
        addNewLabel: "Someone new",
        onSelect: () => {},
        onAddNew: () => {},
      }),
    );
    expect(html).not.toContain("Closest matches");
  });
});
