/**
 * `requestPlayerMergePreview`/`requestPlayerMerge`/`requestLocationMerge`
 * (`lib/ui/merge-actions.ts`) — the exact fetch calls `PlayerMergeConfirm` /
 * `PlaceMergeConfirm` issue (PRD criteria 155–166).
 *
 * Same regression this project already guards against for the game and
 * rename actions (`tests/ui/game-actions.test.ts`, `tests/ui/rename-actions.test.ts`):
 * `rejectCrossSitePost` (`lib/http/same-origin.ts`) 415s any mutating request
 * without a `Content-Type: application/json` header, and every route-level
 * test hands a `Request` with that header already set, so only a test of the
 * caller itself would catch a real tap losing it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  requestLocationMerge,
  requestPlayerMerge,
  requestPlayerMergePreview,
} from "@/lib/ui/merge-actions";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestPlayerMergePreview", () => {
  it("GETs /api/players/merge-preview with both ids as query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestPlayerMergePreview("player-a", "player-b");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/players/merge-preview?a=player-a&b=player-b");
  });
});

describe("requestPlayerMerge", () => {
  it("POSTs /api/players/merge with a JSON content-type and the survivor/loser body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestPlayerMerge("survivor-id", "loser-id");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/players/merge");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ survivorId: "survivor-id", loserId: "loser-id" });
  });
});

describe("requestLocationMerge", () => {
  it("POSTs /api/locations/merge with a JSON content-type and the survivor/loser body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestLocationMerge("survivor-id", "loser-id");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/locations/merge");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ survivorId: "survivor-id", loserId: "loser-id" });
  });
});
