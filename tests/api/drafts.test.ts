/**
 * POST /api/drafts and GET/PUT /api/drafts/{id}.
 */

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb } from "../helpers/db";
import { draftStateFromSheet } from "../helpers/draft";
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

function req(url: string, method: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${url}`, {
    method,
    headers:
      body === undefined
        ? { origin: ORIGIN, host: "five-crowns.test", ...headers }
        : { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "drafts-test-secret";
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

async function makeSheetPhoto(): Promise<string> {
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

describe("POST /api/drafts", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { POST } = await import("@/app/api/drafts/route");
    const response = await POST(req("/api/drafts", "POST", { photoId: "x", state: {} }));
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("415s a non-JSON body, 403s a cross-site origin", async () => {
    const { POST } = await import("@/app/api/drafts/route");
    const plain = await POST(
      new Request(`${ORIGIN}/api/drafts`, {
        method: "POST",
        headers: { "content-type": "text/plain", origin: ORIGIN, host: "five-crowns.test" },
        body: "x",
      }),
    );
    expect(plain.status).toBe(415);

    const crossSite = await POST(
      req("/api/drafts", "POST", { photoId: "x", state: {} }, { origin: "https://evil.example" }),
    );
    expect(crossSite.status).toBe(403);
  });

  it("400s when the state's photoId doesn't match the body's photoId", async () => {
    const photoId = await makeSheetPhoto();
    const state = draftStateFromSheet(SHEET_01, { photoId: "someone-elses-photo" });
    const { POST } = await import("@/app/api/drafts/route");
    const response = await POST(req("/api/drafts", "POST", { photoId, state }));
    expect(response.status).toBe(400);
  });

  it("404s when the photo doesn't exist", async () => {
    const state = draftStateFromSheet(SHEET_01, { photoId: "ghost-photo" });
    const { POST } = await import("@/app/api/drafts/route");
    const response = await POST(req("/api/drafts", "POST", { photoId: "ghost-photo", state }));
    expect(response.status).toBe(404);
  });

  it("happy path: 201, links the photo, stores the state", async () => {
    const photoId = await makeSheetPhoto();
    const state = draftStateFromSheet(SHEET_01, { photoId });
    const { POST } = await import("@/app/api/drafts/route");
    const response = await POST(req("/api/drafts", "POST", { photoId, state }));
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(typeof body.draftId).toBe("string");

    const { getDb } = await import("@/lib/db");
    const { photo } = await import("@/lib/db/schema");
    const row = (await getDb().select().from(photo).where(eq(photo.id, photoId)))[0]!;
    expect(row.draftId).toBe(body.draftId);
  });

  it("409s a photo already attached to another draft", async () => {
    const photoId = await makeSheetPhoto();
    const state = draftStateFromSheet(SHEET_01, { photoId });
    const { POST } = await import("@/app/api/drafts/route");
    const first = await POST(req("/api/drafts", "POST", { photoId, state }));
    expect(first.status).toBe(201);

    const second = await POST(req("/api/drafts", "POST", { photoId, state }));
    expect(second.status).toBe(409);
  });
});

describe("GET /api/drafts/{id}", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(req("/api/drafts/x", "GET"), { params: Promise.resolve({ id: "x" }) });
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("404s an unknown draft", async () => {
    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(req("/api/drafts/nope", "GET"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns the stored state, updatedAt and a null savedGameId for a fresh draft", async () => {
    const photoId = await makeSheetPhoto();
    const state = draftStateFromSheet(SHEET_01, { photoId });
    const { POST } = await import("@/app/api/drafts/route");
    const created = await (await POST(req("/api/drafts", "POST", { photoId, state }))).json();

    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(req(`/api/drafts/${created.draftId}`, "GET"), {
      params: Promise.resolve({ id: created.draftId }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.draftId).toBe(created.draftId);
    expect(body.state.photoId).toBe(photoId);
    expect(body.savedGameId).toBeNull();
  });
});

describe("PUT /api/drafts/{id}", () => {
  async function createDraftViaRoute(): Promise<{ draftId: string; state: ReturnType<typeof draftStateFromSheet> }> {
    const photoId = await makeSheetPhoto();
    const state = draftStateFromSheet(SHEET_01, { photoId });
    const { POST } = await import("@/app/api/drafts/route");
    const created = await (await POST(req("/api/drafts", "POST", { photoId, state }))).json();
    return { draftId: created.draftId, state };
  }

  it("401s with no session", async () => {
    const { draftId, state } = await createDraftViaRoute();
    requestCookies.clear();
    const { PUT } = await import("@/app/api/drafts/[id]/route");
    const response = await PUT(req(`/api/drafts/${draftId}`, "PUT", { state }), {
      params: Promise.resolve({ id: draftId }),
    });
    expect(response.status).toBe(401);

    const { signSession } = await import("@/lib/auth/token");
    requestCookies.set("fc_session", await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  });

  it("415s a non-JSON body, 403s a cross-site origin, 400s a bad body", async () => {
    const { draftId, state } = await createDraftViaRoute();
    const { PUT } = await import("@/app/api/drafts/[id]/route");

    const plain = await PUT(
      new Request(`${ORIGIN}/api/drafts/${draftId}`, {
        method: "PUT",
        headers: { "content-type": "text/plain", origin: ORIGIN, host: "five-crowns.test" },
        body: "x",
      }),
      { params: Promise.resolve({ id: draftId }) },
    );
    expect(plain.status).toBe(415);

    const crossSite = await PUT(
      req(`/api/drafts/${draftId}`, "PUT", { state }, { origin: "https://evil.example" }),
      { params: Promise.resolve({ id: draftId }) },
    );
    expect(crossSite.status).toBe(403);

    const bad = await PUT(req(`/api/drafts/${draftId}`, "PUT", { state: { nonsense: true } }), {
      params: Promise.resolve({ id: draftId }),
    });
    expect(bad.status).toBe(400);
  });

  it("happy path: whole-state replace, 200 with updatedAt", async () => {
    const { draftId, state } = await createDraftViaRoute();
    const edited = { ...state, playedOn: "2021-11-05" };

    const { PUT } = await import("@/app/api/drafts/[id]/route");
    const response = await PUT(req(`/api/drafts/${draftId}`, "PUT", { state: edited }), {
      params: Promise.resolve({ id: draftId }),
    });
    expect(response.status).toBe(200);
    expect(typeof (await response.json()).updatedAt).toBe("string");

    const { GET } = await import("@/app/api/drafts/[id]/route");
    const after = await (
      await GET(req(`/api/drafts/${draftId}`, "GET"), { params: Promise.resolve({ id: draftId }) })
    ).json();
    expect(after.state.playedOn).toBe("2021-11-05");
  });

  it("409s once the draft has been saved", async () => {
    const { draftId, state } = await createDraftViaRoute();
    const { saveGame } = await import("@/lib/games/save");
    const { writeLocalPhoto } = await import("@/lib/photos/local");
    await writeLocalPhoto(state.photoId, "original", Buffer.from("x"));
    await writeLocalPhoto(state.photoId, "model", Buffer.from("x"));
    await saveGame(draftId, state);

    const { PUT } = await import("@/app/api/drafts/[id]/route");
    const response = await PUT(req(`/api/drafts/${draftId}`, "PUT", { state }), {
      params: Promise.resolve({ id: draftId }),
    });
    expect(response.status).toBe(409);
  });
});
