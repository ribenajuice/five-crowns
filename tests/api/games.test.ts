/**
 * POST /api/games — the save route.
 */

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

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/games`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test", ...headers },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "games-route-test-secret";
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

describe("POST /api/games", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { POST } = await import("@/app/api/games/route");
    const response = await POST(post({ draftId: "x", state: {} }));
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("415s a non-JSON body, 403s a cross-site origin, 400s a bad body", async () => {
    const { POST } = await import("@/app/api/games/route");

    const plain = await POST(
      new Request(`${ORIGIN}/api/games`, {
        method: "POST",
        headers: { "content-type": "text/plain", origin: ORIGIN, host: "five-crowns.test" },
        body: "x",
      }),
    );
    expect(plain.status).toBe(415);

    const crossSite = await POST(
      post({ draftId: "x", state: {} }, { origin: "https://evil.example" }),
    );
    expect(crossSite.status).toBe(403);

    const bad = await POST(post({ draftId: "x", state: { nonsense: true } }));
    expect(bad.status).toBe(400);
  });

  it("404s an unknown draft", async () => {
    const { POST } = await import("@/app/api/games/route");
    const { draftStateFromSheet } = await import("../helpers/draft");
    const state = draftStateFromSheet(SHEET_01);
    const response = await POST(post({ draftId: "no-such-draft", state }));
    expect(response.status).toBe(404);
  });

  it("⚠️ 409 missing_photo when the draft's sheet photo has no objects", async () => {
    const { createDraft, draftStateFromSheet } = await import("../helpers/draft");
    const state = draftStateFromSheet(SHEET_01);
    const draftId = await createDraft(state); // no photo row at all

    const { POST } = await import("@/app/api/games/route");
    const response = await POST(post({ draftId, state }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("missing_photo");
  });

  it("⚠️ 422 invalid_grid when a column decreases, with issues in the body (criterion 26)", async () => {
    const totals = [...SHEET_01.columns[0]!.runningTotals];
    totals[5] = 70; // breaks monotonicity
    const { draftId, state } = await setUpDraft(SHEET_01, { overrides: { 0: totals } });

    const { POST } = await import("@/app/api/games/route");
    const response = await POST(post({ draftId, state }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_grid");
    expect(body.issues.ok).toBe(false);
  });

  it("⚠️ security review MEDIUM 2: 422 invalid_grid when a playerId doesn't exist", async () => {
    const { setUpDraft } = await import("../helpers/draft");
    const { draftId, state } = await setUpDraft(SHEET_01, {
      playerIds: { "Player A": "not-a-real-player-id" },
    });

    const { POST } = await import("@/app/api/games/route");
    const response = await POST(post({ draftId, state }));
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("invalid_grid");
  });

  it("happy path: 201 then idempotent 200 on a repeat", async () => {
    const { draftId, state } = await setUpDraft(SHEET_01);

    const { POST } = await import("@/app/api/games/route");
    const first = await POST(post({ draftId, state }));
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    expect(typeof firstBody.gameId).toBe("string");

    const second = await POST(post({ draftId, state }));
    expect(second.status).toBe(200);
    expect((await second.json()).gameId).toBe(firstBody.gameId);
  });
});
