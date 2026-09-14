/**
 * `requestRosterRename`/`requestLocationRename` (`lib/ui/rename-actions.ts`) —
 * the exact fetch call `RosterRenameControl`/`PlaceRow` issue to rename a
 * roster or a location (PRD criteria 141–146).
 *
 * Same regression this project already guards against for the game actions
 * (`tests/ui/game-actions.test.ts`): `rejectCrossSitePost`
 * (`lib/http/same-origin.ts`) 415s any mutating request without a
 * `Content-Type: application/json` header, and every route-level test hands
 * a `Request` with that header already set, so only a test of the caller
 * itself would catch a real tap losing it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { requestLocationRename, requestRosterRename } from "@/lib/ui/rename-actions";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestRosterRename", () => {
  it("PATCHes /api/rosters/{id} with a JSON content-type and the name/dryRun body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestRosterRename("roster-123", "Thursday crew", true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/rosters/roster-123");
    expect(init.method).toBe("PATCH");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ name: "Thursday crew", dryRun: true });
  });

  it("sends dryRun: false for a real commit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestRosterRename("roster-123", "Thursday crew", false);

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({ name: "Thursday crew", dryRun: false });
  });
});

describe("requestLocationRename", () => {
  it("PATCHes /api/locations/{id} with a JSON content-type and the name body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestLocationRename("place-456", "The Deck");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/locations/place-456");
    expect(init.method).toBe("PATCH");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ name: "The Deck" });
  });
});
