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

import { PickList, seedNewName } from "@/components/PickList";

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

describe("PickList — 'someone new' pre-filled with the handwritten name (criteria 148, 173)", () => {
  // `seedNewName` is the add-new input's initial-value logic, exported off the
  // component precisely so it's checkable directly: the input it feeds only
  // renders after a tap that opens the add-new row, and this project has no
  // jsdom/React Testing Library harness to simulate that tap and read the
  // rendered value back out — a static markup render always shows `adding`
  // at its default (closed) state, same as every other test in this file.
  it("seeds with the handwritten name as read, for a near-match, no-match, or wrong-suggestion column alike", () => {
    expect(seedNewName("Playr D")).toBe("Playr D");
  });

  it("seeds empty when the column has no handwritten name to seed from", () => {
    expect(seedNewName(null)).toBe("");
    expect(seedNewName(undefined)).toBe("");
  });

  it("renders the same 'Someone new' add-new row regardless of whether a seed is passed — pre-filled, not a visible label change", () => {
    const withSeed = renderToStaticMarkup(
      createElement(PickList, {
        items: [{ id: "p-a", label: "Player A" }],
        selectedId: null,
        pendingLabel: null,
        newNameSeed: "Playr D",
        addNewLabel: "Someone new",
        onSelect: () => {},
        onAddNew: () => {},
      }),
    );
    const withoutSeed = renderToStaticMarkup(
      createElement(PickList, {
        items: [{ id: "p-a", label: "Player A" }],
        selectedId: null,
        pendingLabel: null,
        addNewLabel: "Someone new",
        onSelect: () => {},
        onAddNew: () => {},
      }),
    );
    // The add-new row is closed by default either way — the seed only
    // changes what's inside the input once it's opened (see `seedNewName`
    // above), never the row's own closed-state markup.
    expect(withSeed).toContain("Someone new");
    expect(withoutSeed).toContain("Someone new");
    expect(withSeed).not.toContain("picklist-new-name");
    expect(withoutSeed).not.toContain("picklist-new-name");
  });
});
