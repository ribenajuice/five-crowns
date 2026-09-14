/**
 * PATCH /api/rosters/{id} — PRD criteria 141–144.
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

function patch(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${url}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test", ...headers },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "rosters-rename-route-test-secret";
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

async function saveRosterId(): Promise<string> {
  const { saveGame } = await import("@/lib/games/save");
  const { draftId, state } = await setUpDraft(SHEET_01);
  const saved = await saveGame(draftId, state);
  const { getGame } = await import("@/lib/games/queries");
  return (await getGame(saved.gameId))!.rosterId;
}

describe("PATCH /api/rosters/{id}", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { PATCH } = await import("@/app/api/rosters/[id]/route");
    const id = randomUUID();
    const response = await PATCH(patch(`/api/rosters/${id}`, { name: "Thursday crew" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("403s a cross-site origin", async () => {
    const { PATCH } = await import("@/app/api/rosters/[id]/route");
    const id = randomUUID();
    const response = await PATCH(
      patch(`/api/rosters/${id}`, { name: "x" }, { origin: "https://evil.example" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(403);
  });

  it("400s a roster id that isn't a UUID", async () => {
    const { PATCH } = await import("@/app/api/rosters/[id]/route");
    const response = await PATCH(patch("/api/rosters/nope", { name: "x" }), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(response.status).toBe(400);
  });

  it("400s a malformed body", async () => {
    const { PATCH } = await import("@/app/api/rosters/[id]/route");
    const id = randomUUID();
    const response = await PATCH(patch(`/api/rosters/${id}`, { name: 5 }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(400);
  });

  it("404s a well-formed but unknown roster id", async () => {
    const { PATCH } = await import("@/app/api/rosters/[id]/route");
    const id = randomUUID();
    const response = await PATCH(patch(`/api/rosters/${id}`, { name: "x" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(404);
  });

  it("happy path: renames and returns the new display name", async () => {
    const rosterId = await saveRosterId();
    const { PATCH } = await import("@/app/api/rosters/[id]/route");
    const response = await PATCH(patch(`/api/rosters/${rosterId}`, { name: "Thursday crew" }), {
      params: Promise.resolve({ id: rosterId }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.roster.name).toBe("Thursday crew");
    expect(body.roster.displayName).toBe("Thursday crew");
    expect(body.duplicate).toBeNull();
    expect(body.saved).toBe(true);
  });

  it("dryRun does not persist, and reports saved: false", async () => {
    const rosterId = await saveRosterId();
    const { PATCH } = await import("@/app/api/rosters/[id]/route");
    const response = await PATCH(
      patch(`/api/rosters/${rosterId}`, { name: "Preview only", dryRun: true }),
      { params: Promise.resolve({ id: rosterId }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.saved).toBe(false);

    const { getRosterPage } = await import("@/lib/rosters/queries");
    expect((await getRosterPage(rosterId))!.name).not.toBe("Preview only");
  });
});
