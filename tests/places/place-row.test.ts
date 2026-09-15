/**
 * `PlaceRow` — Stage 3, extended Stage 4 (criteria 259, 163). Static-markup
 * smoke test only — this project has no React Testing Library / jsdom set up
 * to simulate the click that reveals the chooser
 * (`tests/players/page.test.ts`'s header comment).
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

  it("⚠️ criterion 259: the whole row is now a Link to /places/{id}", () => {
    const html = renderToStaticMarkup(
      createElement(PlaceRow, { id: "loc1", name: "The Deck", gamesPlayed: 2 }),
    );
    expect(html).toContain('href="/places/loc1"');
  });

  it("⚠️ criterion 259: a used venue shows its table average with its dual sample", () => {
    const html = renderToStaticMarkup(
      createElement(PlaceRow, {
        id: "loc1",
        name: "The Deck",
        gamesPlayed: 2,
        tableAverage: { average: 61.5, gamesPlayed: 2, scoresCount: 8 },
      }),
    );
    expect(html).toContain("61.5");
    expect(html).toContain("2 games");
    expect(html).toContain("8 scores");
  });

  it("⚠️ criterion 259: a never-used venue shows the no-data string, never a zero average", () => {
    const html = renderToStaticMarkup(
      createElement(PlaceRow, { id: "loc1", name: "The Deck", gamesPlayed: 0, tableAverage: null }),
    );
    expect(html).toContain("The Deck");
    expect(html).toContain("Never used yet");
    expect(html).toContain("–");
    expect(html).not.toContain("0.0");
    // The chooser's rows aren't rendered until the pencil is tapped.
    expect(html).not.toContain("Merge with another place");
  });
});
