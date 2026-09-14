/**
 * `PlayerGameRow` — the winner marker on a player page's own games list
 * (PRD criterion 133: "... their final score for that game, and a winner
 * marker").
 *
 * ⚠️ QA regression (Stage 3 review, 2026-09-14): unlike `FinalRow` (the game
 * view's "How it finished" list, which appends a literal " · Winner" string
 * alongside its crown icon and colour — see `components/FinalRow.tsx`) and
 * `RosterGameRow` (the roster page's games list, which names the winner(s)
 * as plain text via `sharedWinGamesListLabel` — see `components/RosterGameRow.tsx`),
 * `PlayerGameRow` marks a win with **only** a `CrownIcon` (rendered
 * `aria-hidden="true"`) and a `text-success` colour class on the score. There
 * is no text anywhere in the row a screen reader — or a colourblind reader
 * relying on shape rather than hue — can use to tell a won game from a lost
 * one.
 *
 * `docs/DESIGN-SYSTEM.md` § "Player page" promises "the same crown-plus-
 * label-plus-colour treatment `FinalRow` already uses" for this exact row;
 * this test asserts that promise directly and is expected to fail until
 * `PlayerGameRow` also renders a text label (e.g. the same " · Winner" suffix
 * `FinalRow` uses) when `isWinner` is true.
 *
 * Uses `react-dom/server`'s `renderToStaticMarkup`, not full DOM rendering —
 * this project has no React Testing Library / jsdom set up
 * (`tests/players/page.test.ts`'s header comment), but `PlayerGameRow` is a
 * plain presentational function component with no client-side behaviour to
 * exercise, so a markup string is enough to assert on visible text.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PlayerGameRow } from "@/components/PlayerGameRow";

function render(isWinner: boolean): string {
  return renderToStaticMarkup(
    PlayerGameRow({
      gameId: "g1",
      playedOn: "2026-01-02",
      locationName: "QA Venue",
      rosterId: "r1",
      rosterName: "Weekend Legends",
      finalScore: 78,
      isWinner,
    }),
  );
}

describe("PlayerGameRow", () => {
  it("⚠️ QA regression: a won game carries a text winner marker, not colour and an aria-hidden icon alone", () => {
    const html = render(true);
    // The crown is decorative (correctly aria-hidden); something else in the
    // row must carry the same information as text for it to reach a screen
    // reader. Today nothing does.
    expect(html).toMatch(/winner/i);
  });

  it("a lost game carries no winner marker of any kind", () => {
    const html = render(false);
    expect(html).not.toMatch(/winner/i);
    expect(html).not.toContain("text-success");
  });
});
