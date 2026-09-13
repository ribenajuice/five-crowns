/**
 * POST /api/games/{id}/edit — starts or resumes an edit draft.
 */

import { randomUUID } from "node:crypto";

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

function post(url: string, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test", ...headers },
    body: "{}",
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "games-edit-route-test-secret";
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

describe("POST /api/games/{id}/edit", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { POST } = await import("@/app/api/games/[id]/edit/route");
    const response = await POST(post(`/api/games/${randomUUID()}/edit`), {
      params: Promise.resolve({ id: randomUUID() }),
    });
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("403s a cross-site origin", async () => {
    const { POST } = await import("@/app/api/games/[id]/edit/route");
    const id = randomUUID();
    const response = await POST(post(`/api/games/${id}/edit`, { origin: "https://evil.example" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(403);
  });

  it("400s a game id that isn't a UUID", async () => {
    const { POST } = await import("@/app/api/games/[id]/edit/route");
    const response = await POST(post("/api/games/nope/edit"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(response.status).toBe(400);
  });

  it("404s a well-formed but unknown game id", async () => {
    const { POST } = await import("@/app/api/games/[id]/edit/route");
    const id = randomUUID();
    const response = await POST(post(`/api/games/${id}/edit`), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(404);
  });

  it("happy path: 201 the first time, 200 resuming the same draft the second", async () => {
    const gameId = await saveOriginalGame();
    const { POST } = await import("@/app/api/games/[id]/edit/route");

    const first = await POST(post(`/api/games/${gameId}/edit`), {
      params: Promise.resolve({ id: gameId }),
    });
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    expect(typeof firstBody.draftId).toBe("string");

    const second = await POST(post(`/api/games/${gameId}/edit`), {
      params: Promise.resolve({ id: gameId }),
    });
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.draftId).toBe(firstBody.draftId);
  });
});
