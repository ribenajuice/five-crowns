/**
 * GET /api/players/merge-preview and POST /api/players/merge — PRD criteria
 * 155–162.
 */

import { randomUUID } from "node:crypto";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";

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

function get(url: string): Request {
  return new Request(`${ORIGIN}${url}`, {
    headers: { origin: ORIGIN, host: "five-crowns.test" },
  });
}

function post(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test", ...headers },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "players-merge-route-test-secret";
});

async function freshSession() {
  await teardownTestDb();
  await setupTestDb();
  requestCookies.clear();
  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(
    "fc_session",
    await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!),
  );
}

afterEach(() => {
  cookieJar.length = 0;
});

async function makePlayer(displayName: string): Promise<string> {
  const { getDb } = await import("@/lib/db");
  const { player } = await import("@/lib/db/schema");
  const id = randomUUID();
  await getDb()
    .insert(player)
    .values({ id, displayName, slug: `p-${id.slice(-8)}`, nameKey: displayName.toLowerCase() });
  return id;
}

describe("GET /api/players/merge-preview", () => {
  it("401s with no session", async () => {
    await freshSession();
    requestCookies.clear();
    const { GET } = await import("@/app/api/players/merge-preview/route");
    const response = await GET(get("/api/players/merge-preview?a=1&b=2"));
    expect(response.status).toBe(401);
  });

  it("400s a missing query param", async () => {
    await freshSession();
    const { GET } = await import("@/app/api/players/merge-preview/route");
    const response = await GET(get("/api/players/merge-preview?a=1"));
    expect(response.status).toBe(400);
  });

  it("400s an id that isn't a UUID", async () => {
    await freshSession();
    const { GET } = await import("@/app/api/players/merge-preview/route");
    const response = await GET(get("/api/players/merge-preview?a=not-a-uuid&b=also-not"));
    expect(response.status).toBe(400);
  });

  it("400s the same id twice", async () => {
    await freshSession();
    const id = await makePlayer("Solo");
    const { GET } = await import("@/app/api/players/merge-preview/route");
    const response = await GET(get(`/api/players/merge-preview?a=${id}&b=${id}`));
    expect(response.status).toBe(400);
  });

  it("404s an unknown player id", async () => {
    await freshSession();
    const id = await makePlayer("Solo");
    const { GET } = await import("@/app/api/players/merge-preview/route");
    const response = await GET(get(`/api/players/merge-preview?a=${id}&b=${randomUUID()}`));
    expect(response.status).toBe(404);
  });

  it("happy path: both players' games played, no conflicts", async () => {
    await freshSession();
    const a = await makePlayer("Player A");
    const b = await makePlayer("Player B");
    const { GET } = await import("@/app/api/players/merge-preview/route");
    const response = await GET(get(`/api/players/merge-preview?a=${a}&b=${b}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.survivor.id).toBe(a);
    expect(body.other.id).toBe(b);
    expect(body.conflicts).toEqual([]);
  });
});

describe("POST /api/players/merge", () => {
  it("401s with no session", async () => {
    await freshSession();
    requestCookies.clear();
    const { POST } = await import("@/app/api/players/merge/route");
    const response = await POST(post("/api/players/merge", { survivorId: "a", loserId: "b" }));
    expect(response.status).toBe(401);
  });

  it("403s a cross-site origin", async () => {
    await freshSession();
    const { POST } = await import("@/app/api/players/merge/route");
    const response = await POST(
      post(
        "/api/players/merge",
        { survivorId: "a", loserId: "b" },
        { origin: "https://evil.example" },
      ),
    );
    expect(response.status).toBe(403);
  });

  it("400s a bad body", async () => {
    await freshSession();
    const { POST } = await import("@/app/api/players/merge/route");
    const response = await POST(post("/api/players/merge", {}));
    expect(response.status).toBe(400);
  });

  it("400s ids that aren't UUIDs", async () => {
    await freshSession();
    const { POST } = await import("@/app/api/players/merge/route");
    const response = await POST(
      post("/api/players/merge", { survivorId: "not-a-uuid", loserId: "also-not" }),
    );
    expect(response.status).toBe(400);
  });

  it("404s an unknown player id", async () => {
    await freshSession();
    const id = await makePlayer("Solo");
    const { POST } = await import("@/app/api/players/merge/route");
    const response = await POST(
      post("/api/players/merge", { survivorId: id, loserId: randomUUID() }),
    );
    expect(response.status).toBe(404);
  });

  it("⚠️ criterion 160: 409s with the conflicting games listed, and repoints nothing", async () => {
    await freshSession();
    const a = await makePlayer("Player A");
    const b = await makePlayer("Player B");

    const { getDb } = await import("@/lib/db");
    const { roster, rosterMember, game, gamePlayer } = await import("@/lib/db/schema");
    const { rosterSignature } = await import("@/lib/scoring");
    await getDb().insert(roster).values({ id: "r1", signature: rosterSignature([a, b]), size: 2 });
    await getDb()
      .insert(rosterMember)
      .values([{ rosterId: "r1", playerId: a }, { rosterId: "r1", playerId: b }]);
    await getDb().insert(game).values({ id: "g1", playedOn: "2026-06-01", rosterId: "r1" });
    await getDb()
      .insert(gamePlayer)
      .values([
        { gameId: "g1", playerId: a, columnOrder: 0, finalScore: 100 },
        { gameId: "g1", playerId: b, columnOrder: 1, finalScore: 90 },
      ]);

    const { POST } = await import("@/app/api/players/merge/route");
    const response = await POST(post("/api/players/merge", { survivorId: a, loserId: b }));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("conflict");
    expect(body.conflicts).toEqual([{ id: "g1", playedOn: "2026-06-01", locationName: null }]);

    const { player } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    expect(await getDb().select().from(player).where(eq(player.id, b))).toHaveLength(1);
  });

  it("happy path: merges and answers the survivor/deleted ids", async () => {
    await freshSession();
    const a = await makePlayer("Player A");
    const b = await makePlayer("Player B");

    const { POST } = await import("@/app/api/players/merge/route");
    const response = await POST(post("/api/players/merge", { survivorId: a, loserId: b }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ survivorId: a, deletedPlayerId: b, rosterFolds: [] });

    const { getDb } = await import("@/lib/db");
    const { player } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    expect(await getDb().select().from(player).where(eq(player.id, b))).toHaveLength(0);
  });
});
