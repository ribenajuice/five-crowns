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

  it("happy path: 201, a photo row, and two presigned POSTs with Content-Type: image/jpeg fields", async () => {
    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(post({ kind: "sheet", rotation: 90, width: 1200, height: 1600 }));
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(typeof body.photoId).toBe("string");
    expect(body.original.url).toContain("original.jpg");
    expect(body.model.url).toContain("model.jpg");
    expect(body.original.fields["Content-Type"]).toBe("image/jpeg");
    expect(body.model.fields["Content-Type"]).toBe("image/jpeg");

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

  it("⚠️ security review MEDIUM 1: 429 rate_limited once the daily cap is reached, and no photo row is created", async () => {
    const { getDb } = await import("@/lib/db");
    const { usageDay, photo } = await import("@/lib/db/schema");
    const today = new Date().toISOString().slice(0, 10);

    await getDb()
      .insert(usageDay)
      .values({ day: today, sheetUploads: 40 })
      .onConflictDoUpdate({ target: usageDay.day, set: { sheetUploads: 40 } });

    const before = (await getDb().select().from(photo)).length;

    const { POST } = await import("@/app/api/uploads/route");
    const response = await POST(post({ kind: "sheet", rotation: 0, width: 100, height: 100 }));
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe("rate_limited");

    const after = (await getDb().select().from(photo)).length;
    expect(after).toBe(before);
  });

  describe("kind: 'column'", () => {
    async function createDraftWithColumn(): Promise<{ draftId: string; columnId: string }> {
      const { getDb } = await import("@/lib/db");
      const { draft: draftTable } = await import("@/lib/db/schema");
      const { emptyDraftState } = await import("@/lib/draft/state");
      const { randomUUID } = await import("node:crypto");

      const draftId = randomUUID();
      const columnId = `col_${randomUUID()}`;
      const state = emptyDraftState({
        photoId: randomUUID(),
        playedOn: "2026-09-11",
        columnIds: [columnId],
      });
      const now = new Date().toISOString();
      await getDb()
        .insert(draftTable)
        .values({ id: draftId, stateJson: JSON.stringify(state), createdAt: now, updatedAt: now });
      return { draftId, columnId };
    }

    it("400s a bad body (missing columnId)", async () => {
      const { draftId } = await createDraftWithColumn();
      const { POST } = await import("@/app/api/uploads/route");
      const response = await POST(
        post({ kind: "column", draftId, rotation: 0, width: 100, height: 100 }),
      );
      expect(response.status).toBe(400);
    });

    it("404s an unknown draft", async () => {
      const { POST } = await import("@/app/api/uploads/route");
      const response = await POST(
        post({
          kind: "column",
          draftId: "no-such-draft",
          columnId: "col_x",
          rotation: 0,
          width: 100,
          height: 100,
        }),
      );
      expect(response.status).toBe(404);
    });

    it("400s a column that doesn't exist on that draft", async () => {
      const { draftId } = await createDraftWithColumn();
      const { POST } = await import("@/app/api/uploads/route");
      const response = await POST(
        post({
          kind: "column",
          draftId,
          columnId: "col_not_on_draft",
          rotation: 0,
          width: 100,
          height: 100,
        }),
      );
      expect(response.status).toBe(400);
    });

    it("409s a draft that's already been saved", async () => {
      const { draftId, columnId } = await createDraftWithColumn();
      const { getDb } = await import("@/lib/db");
      const { draft: draftTable, game, roster } = await import("@/lib/db/schema");
      await getDb().insert(roster).values({ id: "roster_x", signature: "p_x", size: 1 });
      await getDb()
        .insert(game)
        .values({ id: "game_x", playedOn: "2026-01-01", rosterId: "roster_x" });
      await getDb()
        .update(draftTable)
        .set({ savedGameId: "game_x" })
        .where(eq(draftTable.id, draftId));

      const { POST } = await import("@/app/api/uploads/route");
      const response = await POST(
        post({ kind: "column", draftId, columnId, rotation: 0, width: 100, height: 100 }),
      );
      expect(response.status).toBe(409);
    });

    it("happy path: 201, a photo row (kind='column') stamped with draftId and draftColumnId", async () => {
      const { draftId, columnId } = await createDraftWithColumn();
      const { POST } = await import("@/app/api/uploads/route");
      const response = await POST(
        post({ kind: "column", draftId, columnId, rotation: 0, width: 800, height: 1600 }),
      );
      expect(response.status).toBe(201);

      const body = await response.json();
      const { getDb } = await import("@/lib/db");
      const { photo } = await import("@/lib/db/schema");
      const row = (await getDb().select().from(photo).where(eq(photo.id, body.photoId)))[0]!;
      expect(row.kind).toBe("column");
      expect(row.draftId).toBe(draftId);
      expect(row.draftColumnId).toBe(columnId);
    });

    it("is never subject to the sheet upload cap", async () => {
      const { getDb } = await import("@/lib/db");
      const { usageDay } = await import("@/lib/db/schema");
      const today = new Date().toISOString().slice(0, 10);
      await getDb()
        .insert(usageDay)
        .values({ day: today, sheetUploads: 40 })
        .onConflictDoUpdate({ target: usageDay.day, set: { sheetUploads: 40 } });

      const { draftId, columnId } = await createDraftWithColumn();
      const { POST } = await import("@/app/api/uploads/route");
      const response = await POST(
        post({ kind: "column", draftId, columnId, rotation: 0, width: 800, height: 1600 }),
      );
      expect(response.status).toBe(201);
    });
  });
});
