/**
 * `/places` — PRD criterion 140, and Stage 4's post-merge one-time banner
 * (criteria 163–166). Same shallow style as `tests/players/page.test.ts`.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth/session", () => ({
  requireGroupSession: vi.fn(async () => ({ s: "group", v: 1 })),
}));

vi.mock("@/lib/locations/queries", () => ({
  listPlaces: vi.fn(async () => [
    { id: "loc1", name: "Player C's House", gamesPlayed: 4 },
    { id: "loc2", name: "The Deck", gamesPlayed: 3 },
  ]),
}));

describe("/places", () => {
  it("renders every place, no merge banner without a `merged` query param", async () => {
    const { default: PlacesIndexPage } = await import("@/app/places/page");
    const element = await PlacesIndexPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Player C");
    expect(html).toContain("The Deck");
    expect(html).not.toContain("Merged.");
  });

  it("⚠️ criteria 163–166: a successful merge's one-time banner names the loser and the survivor", async () => {
    const { default: PlacesIndexPage } = await import("@/app/places/page");
    const element = await PlacesIndexPage({
      searchParams: Promise.resolve({ merged: "The Deck (typo)", mergedInto: "The Deck" }),
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Merged.");
    expect(html).toContain("The Deck (typo) is now part of The Deck.");
  });
});
