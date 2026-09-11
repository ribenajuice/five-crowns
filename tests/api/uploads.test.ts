/**
 * POST /api/uploads.
 */

import { eq } from "drizzle-orm";
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

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test", ...headers },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "uploads-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();

  const { signSession } = await import("@/lib/auth/token");
  const token = await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET);
  requestCookies.set("fc_session", token);
});

afterEach(() => {
  cookieJar.length = 0;
});

describe("POST /api/uploads", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(post({ kind: "sheet", rotation: 0, width: 100, height: 200 }));
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("415s a non-JSON content type", async () => {
    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(
      new Request(`${ORIGIN}/api/uploads`, {
        method: "POST",
        headers: { "content-type": "text/plain", origin: ORIGIN, host: "five-crowns.test" },
        body: "hi",
      }),
    );
    expect(response.status).toBe(415);
  });

  it("403s a cross-site Origin", async () => {
    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(
      post({ kind: "sheet", rotation: 0, width: 100, height: 200 }, { origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
  });

  it("400s a bad body", async () => {
    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(post({ kind: "column", rotation: 45, width: 0, height: 0 }));
    expect(response.status).toBe(400);
  });

  it("happy path: 201, a photo row, and two presigned PUT urls", async () => {
    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(post({ kind: "sheet", rotation: 90, width: 1200, height: 1600 }));
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(typeof body.photoId).toBe("string");
    expect(body.original.url).toContain("original.jpg");
    expect(body.model.url).toContain("model.jpg");

    const { getDb } = await import("@/lib/db");
    const { photo } = await import("@/lib/db/schema");
    const row = (await getDb().select().from(photo).where(eq(photo.id, body.photoId)))[0]!;
    expect(row.kind).toBe("sheet");
    expect(row.rotationApplied).toBe(90);
    expect(row.width).toBe(1200);
    expect(row.height).toBe(1600);
    expect(row.draftId).toBeNull();
    expect(row.gameId).toBeNull();
  });
});
