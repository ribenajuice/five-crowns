/**
 * PATCH /api/locations/{id} — PRD criteria 145–146.
 */

import { randomUUID } from "node:crypto";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb } from "../helpers/db";

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
  process.env.SESSION_SECRET = "locations-rename-route-test-secret";
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

async function makeLocation(name: string): Promise<string> {
  const { getDb } = await import("@/lib/db");
  const { location } = await import("@/lib/db/schema");
  const { nameKey } = await import("@/lib/draft/state");
  const id = randomUUID();
  await getDb()
    .insert(location)
    .values({ id, name, slug: `place-${id.slice(-8)}`, nameKey: nameKey(name) });
  return id;
}

describe("PATCH /api/locations/{id}", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { PATCH } = await import("@/app/api/locations/[id]/route");
    const id = randomUUID();
    const response = await PATCH(patch(`/api/locations/${id}`, { name: "The pub" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("403s a cross-site origin", async () => {
    const { PATCH } = await import("@/app/api/locations/[id]/route");
    const id = randomUUID();
    const response = await PATCH(
      patch(`/api/locations/${id}`, { name: "x" }, { origin: "https://evil.example" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(403);
  });

  it("400s a location id that isn't a UUID", async () => {
    const { PATCH } = await import("@/app/api/locations/[id]/route");
    const response = await PATCH(patch("/api/locations/nope", { name: "x" }), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(response.status).toBe(400);
  });

  it("400s a blank name", async () => {
    const id = await makeLocation("The blank-name pub");
    const { PATCH } = await import("@/app/api/locations/[id]/route");
    const response = await PATCH(patch(`/api/locations/${id}`, { name: "   " }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(400);
  });

  it("404s a well-formed but unknown location id", async () => {
    const { PATCH } = await import("@/app/api/locations/[id]/route");
    const id = randomUUID();
    const response = await PATCH(patch(`/api/locations/${id}`, { name: "x" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(404);
  });

  it("⚠️ criterion 146: 409s a name_key collision, naming the other place, and does not rename", async () => {
    const existingId = await makeLocation("Player C's House");
    const otherId = await makeLocation("The pub");

    const { PATCH } = await import("@/app/api/locations/[id]/route");
    const response = await PATCH(patch(`/api/locations/${otherId}`, { name: "  PLAYER C'S   HOUSE  " }), {
      params: Promise.resolve({ id: otherId }),
    });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.message).toContain("Player C's House");
    // ⚠️ Stage 4 (criterion 163 fulfils criterion 146's promise): the existing
    // place's own id travels alongside `error`, so `PlaceRow` can offer a
    // direct "Merge with {existing place}" button without a second request.
    expect(body.existingLocation).toEqual({ id: existingId, name: "Player C's House" });

    const { listPlaces } = await import("@/lib/locations/queries");
    expect((await listPlaces()).find((p) => p.id === otherId)!.name).toBe("The pub");
  });

  it("happy path: renames, trimmed", async () => {
    const id = await makeLocation("Old name");
    const { PATCH } = await import("@/app/api/locations/[id]/route");
    const response = await PATCH(patch(`/api/locations/${id}`, { name: "  New name  " }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.location.name).toBe("New name");
  });
});
