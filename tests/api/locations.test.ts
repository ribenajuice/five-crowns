/**
 * GET /api/locations — the pick-list and criterion 59's `mostRecentLocationId`.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb } from "../helpers/db";
import { setUpDraft } from "../helpers/draft";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";

const requestCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      requestCookies.has(name) ? { name, value: requestCookies.get(name)! } : undefined,
    set: () => undefined,
  }),
}));

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "locations-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();

  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(
    "fc_session",
    await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET),
  );
});

describe("GET /api/locations", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { GET } = await import("@/app/api/locations/route");
    const response = await GET();
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("is empty with a null mostRecentLocationId on a fresh database", async () => {
    const { GET } = await import("@/app/api/locations/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.locations).toEqual([]);
    expect(body.mostRecentLocationId).toBeNull();
  });

  it("⚠️ criterion 59: mostRecentLocationId is the newest SAVED game's venue", async () => {
    const older = await setUpDraft(SHEET_01, {
      playedOn: "2020-01-01",
      newLocationName: "The old place",
    });
    const { saveGame } = await import("@/lib/games/save");
    await saveGame(older.draftId, older.state);

    const newer = await setUpDraft(SHEET_02, {
      playedOn: "2024-06-01",
      newLocationName: "The new place",
    });
    await saveGame(newer.draftId, newer.state);

    const { GET } = await import("@/app/api/locations/route");
    const response = await GET();
    const body = await response.json();
    expect(body.locations.map((l: { name: string }) => l.name).sort()).toEqual([
      "The new place",
      "The old place",
    ]);

    const { getDb } = await import("@/lib/db");
    const { location } = await import("@/lib/db/schema");
    const newPlace = (await getDb().select().from(location)).find((l) => l.name === "The new place")!;
    expect(body.mostRecentLocationId).toBe(newPlace.id);
  });
});
