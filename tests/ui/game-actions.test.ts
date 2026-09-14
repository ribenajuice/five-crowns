/**
 * `requestGameEdit`/`requestGameDelete` (`lib/ui/game-actions.ts`) — the exact
 * fetch call `GameActions`/`DeleteGameCard` issue for "Edit this game" and
 * "Delete permanently".
 *
 * ⚠️ This is the regression test for a real bug: both calls previously had no
 * `Content-Type` header at all, so `rejectCrossSitePost`
 * (`lib/http/same-origin.ts`) 415'd every real tap in a browser, even though
 * every route-level test (`tests/api/games-edit.test.ts`,
 * `tests/api/games-delete.test.ts`) passed, because those hand-build a
 * `Request` with the header already set — they test the route, never the
 * caller. Asserting the header here is what would have caught it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { requestGameDelete, requestGameEdit } from "@/lib/ui/game-actions";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestGameEdit", () => {
  it("POSTs to /api/games/{id}/edit with a JSON content-type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestGameEdit("game-123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/games/game-123/edit");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
  });
});

describe("requestGameDelete", () => {
  it("DELETEs /api/games/{id} with a JSON content-type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestGameDelete("game-456");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/games/game-456");
    expect(init.method).toBe("DELETE");
    expect(init.headers).toEqual({ "content-type": "application/json" });
  });
});
