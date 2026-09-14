/**
 * `/places/{id}/merge` and `/places/{id}/merge/{otherId}` — PRD criterion 163.
 * Same shallow "call the async server component, inspect the returned
 * element" style as `tests/players/page.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const hoisted = vi.hoisted(() => {
  class NotFoundSignal extends Error {}
  return { NotFoundSignal };
});

vi.mock("@/lib/auth/session", () => ({
  requireGroupSession: vi.fn(async () => ({ s: "group", v: 1 })),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new hoisted.NotFoundSignal("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/locations/queries", () => ({
  getPlace: vi.fn(),
  listPlaces: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

type FragmentElement = { type: unknown; props: { children: unknown[] } };

describe("/places/{id}/merge — which place?", () => {
  it("404s a made-up place id", async () => {
    const { getPlace } = await import("@/lib/locations/queries");
    vi.mocked(getPlace).mockResolvedValueOnce(null);

    const { default: Page } = await import("@/app/places/[id]/merge/page");
    await expect(
      Page({ params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("lists every other place with its own games-played count, excluding self", async () => {
    const { getPlace, listPlaces } = await import("@/lib/locations/queries");
    vi.mocked(getPlace).mockResolvedValueOnce({ id: "loc1", name: "The Deck (typo)", gamesPlayed: 1 });
    vi.mocked(listPlaces).mockResolvedValueOnce([
      { id: "loc1", name: "The Deck (typo)", gamesPlayed: 1 },
      { id: "loc2", name: "The Deck", gamesPlayed: 2 },
      { id: "loc3", name: "Player C's House", gamesPlayed: 4 },
    ]);

    const { default: Page } = await import("@/app/places/[id]/merge/page");
    const element = await Page({ params: Promise.resolve({ id: "loc1" }) });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Merge The Deck (typo) with which place?");
    expect(html).toContain("/places/loc1/merge/loc2");
    expect(html).not.toContain("/places/loc1/merge/loc1");
  });

  it("⚠️ renders the empty state when nobody else exists", async () => {
    const { getPlace, listPlaces } = await import("@/lib/locations/queries");
    vi.mocked(getPlace).mockResolvedValueOnce({ id: "loc1", name: "The Deck", gamesPlayed: 2 });
    vi.mocked(listPlaces).mockResolvedValueOnce([{ id: "loc1", name: "The Deck", gamesPlayed: 2 }]);

    const { default: Page } = await import("@/app/places/[id]/merge/page");
    const element = await Page({ params: Promise.resolve({ id: "loc1" }) });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Nobody else to merge with");
  });
});

describe("/places/{id}/merge/{otherId} — MergeConfirmScreen", () => {
  it("404s when the two ids are the same", async () => {
    const { getPlace } = await import("@/lib/locations/queries");
    const { default: Page } = await import("@/app/places/[id]/merge/[otherId]/page");
    await expect(
      Page({ params: Promise.resolve({ id: "loc1", otherId: "loc1" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
    expect(getPlace).not.toHaveBeenCalled();
  });

  it("404s when either id doesn't name a real place", async () => {
    const { getPlace } = await import("@/lib/locations/queries");
    vi.mocked(getPlace).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const { default: Page } = await import("@/app/places/[id]/merge/[otherId]/page");
    await expect(
      Page({ params: Promise.resolve({ id: "loc1", otherId: "loc2" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("titles the AppBar 'Merge two places?' and the back arrow returns to the places index", async () => {
    const { getPlace } = await import("@/lib/locations/queries");
    vi.mocked(getPlace).mockImplementation(async (id: string) =>
      id === "loc1"
        ? { id: "loc1", name: "The Deck (typo)", gamesPlayed: 1 }
        : { id: "loc2", name: "The Deck", gamesPlayed: 2 },
    );

    const { default: Page } = await import("@/app/places/[id]/merge/[otherId]/page");
    const element = (await Page({
      params: Promise.resolve({ id: "loc1", otherId: "loc2" }),
    })) as FragmentElement;
    const appBar = element.props.children[0] as { props: { title: string; back: { href: string } } };
    expect(appBar.props.title).toBe("Merge two places?");
    expect(appBar.props.back.href).toBe("/places");
  });
});
