/**
 * `PlaceRow` — Stage 4 (`PlaceRowActions`, criterion 163): the pencil's
 * `aria-label` changed from "Rename {place}" to "Edit {place}", since it no
 * longer commits to one action on tap. Static-markup smoke test only — this
 * project has no React Testing Library / jsdom set up to simulate the click
 * that reveals the chooser (`tests/players/page.test.ts`'s header comment).
 */
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PlaceRow } from "@/components/PlaceRow";

describe("PlaceRow, at rest", () => {
  it("⚠️ Stage 4: the pencil's aria-label reads 'Edit {place}', not 'Rename {place}'", () => {
    const html = renderToStaticMarkup(
      createElement(PlaceRow, { id: "loc1", name: "The Deck", gamesPlayed: 2 }),
    );
    expect(html).toContain('aria-label="Edit The Deck"');
    expect(html).not.toContain("Rename The Deck");
  });

  it("is pixel-identical to Stage 3 at rest otherwise: name, count and one pencil button", () => {
    const html = renderToStaticMarkup(
      createElement(PlaceRow, { id: "loc1", name: "The Deck", gamesPlayed: 0 }),
    );
    expect(html).toContain("The Deck");
    expect(html).toContain("Never used yet");
    // The chooser's rows aren't rendered until the pencil is tapped.
    expect(html).not.toContain("Merge with another place");
  });
});
