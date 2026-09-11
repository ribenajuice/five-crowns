/**
 * GET /api/players.
 */

import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb } from "../helpers/db";

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
  process.env.SESSION_SECRET = "players-test-secret";
  await setupTestDb();

  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(
    "fc_session",
    await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET),
  );

  const { getDb } = await import("@/lib/db");
  const { player } = await import("@/lib/db/schema");
  for (const name of ["Player C", "Player A", "Player B"]) {
    const id = `player-${randomUUID()}`;
    await getDb().insert(player).values({ id, displayName: name, slug: `${name}-${id}` });
  }
});

describe("GET /api/players", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { GET } = await import("@/app/api/players/route");
    const response = await GET();
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("returns players alphabetically by display name", async () => {
    const { GET } = await import("@/app/api/players/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.players.map((p: { displayName: string }) => p.displayName)).toEqual([
      "Player A",
      "Player B",
      "Player C",
    ]);
  });
});
