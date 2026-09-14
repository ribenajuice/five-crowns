/**
 * POST /api/locations/merge — PRD criteria 163–166.
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

function post(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test", ...headers },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "locations-merge-route-test-secret";
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

async function makeLocation(name: string): Promise<string> {
  const { getDb } = await import("@/lib/db");
  const { location } = await import("@/lib/db/schema");
  const id = randomUUID();
  await getDb()
    .insert(location)
    .values({ id, name, slug: `loc-${id.slice(-8)}`, nameKey: name.toLowerCase() });
  return id;
}

describe("POST /api/locations/merge", () => {
  it("401s with no session", async () => {
    await freshSession();
    requestCookies.clear();
    const { POST } = await import("@/app/api/locations/merge/route");
    const response = await POST(post("/api/locations/merge", { survivorId: "a", loserId: "b" }));
    expect(response.status).toBe(401);
  });

  it("403s a cross-site origin", async () => {
    await freshSession();
    const { POST } = await import("@/app/api/locations/merge/route");
    const response = await POST(
      post(
        "/api/locations/merge",
        { survivorId: "a", loserId: "b" },
        { origin: "https://evil.example" },
      ),
    );
    expect(response.status).toBe(403);
  });

  it("400s a bad body", async () => {
    await freshSession();
    const { POST } = await import("@/app/api/locations/merge/route");
    const response = await POST(post("/api/locations/merge", {}));
    expect(response.status).toBe(400);
  });

  it("400s ids that aren't UUIDs", async () => {
    await freshSession();
    const { POST } = await import("@/app/api/locations/merge/route");
    const response = await POST(
      post("/api/locations/merge", { survivorId: "not-a-uuid", loserId: "also-not" }),
    );
    expect(response.status).toBe(400);
  });

  it("404s an unknown location id", async () => {
    await freshSession();
    const id = await makeLocation("Solo place");
    const { POST } = await import("@/app/api/locations/merge/route");
    const response = await POST(
      post("/api/locations/merge", { survivorId: id, loserId: randomUUID() }),
    );
    expect(response.status).toBe(404);
  });

  it("happy path: merges and answers the survivor/deleted ids", async () => {
    await freshSession();
    const a = await makeLocation("Player C's House");
    const b = await makeLocation("player cs house v2");

    const { POST } = await import("@/app/api/locations/merge/route");
    const response = await POST(post("/api/locations/merge", { survivorId: a, loserId: b }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ survivorId: a, deletedLocationId: b });

    const { getDb } = await import("@/lib/db");
    const { location } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    expect(await getDb().select().from(location).where(eq(location.id, b))).toHaveLength(0);
  });
});
