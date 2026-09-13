/**
 * DELETE /api/games/{id}.
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb } from "../helpers/db";
import { setUpDraft } from "../helpers/draft";
import { SHEET_01 } from "../fixtures/sheets";

interface SetCookie {
  name: string;
  value: string;
  attributes: Record<string, unknown>;
}

const cookieJar: SetCookie[] = [];
const requestCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      requestCookies.has(name) ? { name, value: requestCookies.get(name)! } : undefined,
    set: (name: string, value: string, attributes: Record<string, unknown>) => {
      cookieJar.push({ name, value, attributes });
    },
  }),
}));

const ORIGIN = "https://five-crowns.test";

function del(url: string, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${url}`, {
    method: "DELETE",
    headers: { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test", ...headers },
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "games-delete-route-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();

  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(
    "fc_session",
    await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET),
  );
});

afterEach(() => {
  cookieJar.length = 0;
});

async function saveOriginalGame(): Promise<string> {
  const { saveGame } = await import("@/lib/games/save");
  const { draftId, state } = await setUpDraft(SHEET_01);
  const result = await saveGame(draftId, state);
  return result.gameId;
}

describe("DELETE /api/games/{id}", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { DELETE } = await import("@/app/api/games/[id]/route");
    const id = randomUUID();
    const response = await DELETE(del(`/api/games/${id}`), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("403s a cross-site origin", async () => {
    const { DELETE } = await import("@/app/api/games/[id]/route");
    const id = randomUUID();
    const response = await DELETE(del(`/api/games/${id}`, { origin: "https://evil.example" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(403);
  });

  it("400s a game id that isn't a UUID", async () => {
    const { DELETE } = await import("@/app/api/games/[id]/route");
    const response = await DELETE(del("/api/games/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(response.status).toBe(400);
  });

  it("404s a well-formed but unknown game id", async () => {
    const { DELETE } = await import("@/app/api/games/[id]/route");
    const id = randomUUID();
    const response = await DELETE(del(`/api/games/${id}`), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(404);
  });

  it("happy path: 200, and the game view's own query returns null afterwards (criterion 130's 404 trigger)", async () => {
    const gameId = await saveOriginalGame();
    const { DELETE } = await import("@/app/api/games/[id]/route");

    const response = await DELETE(del(`/api/games/${gameId}`), {
      params: Promise.resolve({ id: gameId }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);

    const { getGame } = await import("@/lib/games/queries");
    expect(await getGame(gameId)).toBeNull();
  });

  it("⚠️ criterion 127: the photo row is gone, so no route can presign it again — but this isn't an S3 delete", async () => {
    const gameId = await saveOriginalGame();
    const { getDb } = await import("@/lib/db");
    const { photo } = await import("@/lib/db/schema");
    const sheetPhoto = (
      await getDb()
        .select()
        .from(photo)
        .where(eq(photo.gameId, gameId))
    )[0]!;

    const { DELETE } = await import("@/app/api/games/[id]/route");
    await DELETE(del(`/api/games/${gameId}`), { params: Promise.resolve({ id: gameId }) });

    expect(await getDb().select().from(photo).where(eq(photo.id, sheetPhoto.id))).toHaveLength(0);

    // The object itself is untouched in local storage — the app never calls
    // a delete on the storage driver at all.
    const { getPhotoStorage } = await import("@/lib/photos");
    const exists = await getPhotoStorage().objectExists(sheetPhoto.id, "original");
    expect(exists).toBe(true);
  });
});
