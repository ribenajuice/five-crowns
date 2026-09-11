/**
 * GET /api/photos/{id}/url.
 */

import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

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

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "photos-url-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();

  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(
    "fc_session",
    await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET),
  );
});

async function makePhoto(): Promise<string> {
  const { getDb } = await import("@/lib/db");
  const { photo } = await import("@/lib/db/schema");
  const { photoKey } = await import("@/lib/photos/keys");
  const photoId = `photo-${randomUUID()}`;
  await getDb()
    .insert(photo)
    .values({
      id: photoId,
      kind: "sheet",
      s3KeyOriginal: photoKey(photoId, "original"),
      s3KeyModel: photoKey(photoId, "model"),
    });
  return photoId;
}

describe("GET /api/photos/{id}/url", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { GET } = await import("@/app/api/photos/[id]/url/route");
    const response = await GET(new Request(`${ORIGIN}/api/photos/x/url?variant=original`), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("400s a missing or bad variant", async () => {
    const photoId = await makePhoto();
    const { GET } = await import("@/app/api/photos/[id]/url/route");
    const response = await GET(new Request(`${ORIGIN}/api/photos/${photoId}/url`), {
      params: Promise.resolve({ id: photoId }),
    });
    expect(response.status).toBe(400);
  });

  it("404s an unknown photo", async () => {
    const { GET } = await import("@/app/api/photos/[id]/url/route");
    const response = await GET(new Request(`${ORIGIN}/api/photos/ghost/url?variant=model`), {
      params: Promise.resolve({ id: "ghost" }),
    });
    expect(response.status).toBe(404);
  });

  it("happy path: a presigned URL, five minutes out (criterion 12)", async () => {
    const photoId = await makePhoto();
    const { GET } = await import("@/app/api/photos/[id]/url/route");
    const response = await GET(new Request(`${ORIGIN}/api/photos/${photoId}/url?variant=original`), {
      params: Promise.resolve({ id: photoId }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toContain("original.jpg");
    const seconds = (new Date(body.expiresAt).getTime() - Date.now()) / 1000;
    expect(seconds).toBeGreaterThan(295);
    expect(seconds).toBeLessThanOrEqual(300);
  });
});
