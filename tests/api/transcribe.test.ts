/**
 * POST /api/transcribe.
 *
 * `transcribeSheet` itself is mocked — its three outcomes are covered by
 * `tests/vision/transcribe-sheet.test.ts` — so this file is about the route's
 * own responsibilities: auth, the daily cap, draft creation-if-none-exists,
 * merging into an existing draft, and never opening the streaming response at
 * all for anything decidable up front.
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GROUP_COOKIE } from "@/lib/auth/cookies";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createDraft, createSheetPhoto, draftStateFromSheet } from "../helpers/draft";
import { SHEET_01 } from "../fixtures/sheets";

interface FakeAttempt {
  status: "ok" | "invalid" | "error";
  columns: unknown[];
  rawJson: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  error: string | null;
}

let nextAttempt: FakeAttempt;
const transcribeCalls: unknown[] = [];

vi.mock("@/lib/vision/transcribe-sheet", () => ({
  transcribeSheet: async (args: unknown) => {
    transcribeCalls.push(args);
    return nextAttempt;
  },
}));

const requestCookies = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      requestCookies.has(name) ? { name, value: requestCookies.get(name)! } : undefined,
  }),
}));

const ORIGIN = "https://five-crowns.test";

function post(body: unknown): Request {
  return new Request(`${ORIGIN}/api/transcribe`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test" },
    body: JSON.stringify(body),
  });
}

async function readNdjson(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function okColumn(overrides: Record<string, unknown> = {}) {
  return {
    name: "Player C",
    name_confidence: "high",
    running_totals: [23, 23, 27, 34, 37, 44, 57, 71, 75, 78, 78],
    least_confident_index: null,
    ...overrides,
  };
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "transcribe-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  process.env.FIVE_CROWNS_ANTHROPIC_API_KEY = "sk-ant-test-key-for-transcribe";
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  transcribeCalls.length = 0;
  nextAttempt = {
    status: "ok",
    columns: [okColumn()],
    rawJson: JSON.stringify({ columns: [okColumn()] }),
    inputTokens: 100,
    outputTokens: 50,
    latencyMs: 1234,
    error: null,
  };

  const { invalidateAllParameters } = await import("@/lib/config");
  invalidateAllParameters();

  requestCookies.clear();
  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(
    GROUP_COOKIE,
    await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!),
  );
});

describe("POST /api/transcribe", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { POST } = await import("@/app/api/transcribe/route");
    const response = await POST(post({ photoId: "ph_1" }));
    expect(response.status).toBe(401);
  });

  it("403s a cross-site Origin", async () => {
    const { POST } = await import("@/app/api/transcribe/route");
    const response = await POST(
      new Request(`${ORIGIN}/api/transcribe`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          host: "five-crowns.test",
        },
        body: JSON.stringify({ photoId: "ph_1" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("400s a bad body", async () => {
    const { POST } = await import("@/app/api/transcribe/route");
    const response = await POST(post({}));
    expect(response.status).toBe(400);
  });

  it("404s an unknown photo", async () => {
    const { POST } = await import("@/app/api/transcribe/route");
    const response = await POST(post({ photoId: "no-such-photo" }));
    expect(response.status).toBe(404);
  });

  it("503s not_configured when no API key is set", async () => {
    const saved = process.env.FIVE_CROWNS_ANTHROPIC_API_KEY;
    delete process.env.FIVE_CROWNS_ANTHROPIC_API_KEY;
    try {
      await createSheetPhoto("ph_no_key");
      const { POST } = await import("@/app/api/transcribe/route");
      const response = await POST(post({ photoId: "ph_no_key" }));
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe("not_configured");
      expect(transcribeCalls).toHaveLength(0);
    } finally {
      process.env.FIVE_CROWNS_ANTHROPIC_API_KEY = saved;
    }
  });

  it("409s a photo whose draft has already been saved", async () => {
    const state = draftStateFromSheet(SHEET_01, { photoId: "ph_saved" });
    await createSheetPhoto("ph_saved");
    const draftId = await createDraft(state);
    const { getDb } = await import("@/lib/db");
    const { draft: draftTable, game, roster } = await import("@/lib/db/schema");
    // A real (minimal) game row: `draft.saved_game_id` is a foreign key.
    await getDb().insert(roster).values({ id: "roster_already", signature: "p_x", size: 1 });
    await getDb()
      .insert(game)
      .values({ id: "game_already", playedOn: "2026-01-01", rosterId: "roster_already" });
    await getDb()
      .update(draftTable)
      .set({ savedGameId: "game_already" })
      .where(eq(draftTable.id, draftId));

    const { POST } = await import("@/app/api/transcribe/route");
    const response = await POST(post({ photoId: "ph_saved" }));
    expect(response.status).toBe(409);
    expect(transcribeCalls).toHaveLength(0);
  });

  it("missing_photo (409) when the photo row exists but its model.jpg object doesn't", async () => {
    await createSheetPhoto("ph_missing_object", { missingModel: true });
    const { POST } = await import("@/app/api/transcribe/route");
    const response = await POST(post({ photoId: "ph_missing_object" }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("missing_photo");
  });

  // ⚠️ Mutates the shared "today" usage_day row, and is cleaned up at the end
  // — every other test in this file posts against the same real UTC day, and
  // would otherwise be rate-limited by whichever test happened to run first.
  it("429s once the daily transcription cap is exhausted, and never calls the vision function", async () => {
    await createSheetPhoto("ph_capped");
    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const today = new Date().toISOString().slice(0, 10);
    await getDb()
      .insert(usageDay)
      .values({ day: today, sheetTranscriptions: 20 })
      .onConflictDoUpdate({ target: usageDay.day, set: { sheetTranscriptions: 20 } });

    try {
      const { POST } = await import("@/app/api/transcribe/route");
      const response = await POST(post({ photoId: "ph_capped" }));
      expect(response.status).toBe(429);
      expect((await response.json()).error.code).toBe("rate_limited");
      expect(transcribeCalls).toHaveLength(0);
    } finally {
      await getDb()
        .update(usageDay)
        .set({ sheetTranscriptions: 0 })
        .where(eq(usageDay.day, today));
    }
  });

  it("⚠️ code review: a capped attempt leaves the photo unclaimed, so manual entry still works on it", async () => {
    // Criterion 56's "manual entry still works" would be false for this one
    // photo if a capped transcribe attempt had already attached a draft to
    // it — POST /api/drafts refuses a photo already claimed by another draft.
    await createSheetPhoto("ph_capped_unclaimed");
    const { getDb } = await import("@/lib/db");
    const { usageDay, photo } = await import("@/lib/db/schema");
    const today = new Date().toISOString().slice(0, 10);
    await getDb()
      .insert(usageDay)
      .values({ day: today, sheetTranscriptions: 20 })
      .onConflictDoUpdate({ target: usageDay.day, set: { sheetTranscriptions: 20 } });

    try {
      const { POST } = await import("@/app/api/transcribe/route");
      const response = await POST(post({ photoId: "ph_capped_unclaimed" }));
      expect(response.status).toBe(429);

      const photoRow = (
        await getDb().select().from(photo).where(eq(photo.id, "ph_capped_unclaimed"))
      )[0]!;
      expect(photoRow.draftId).toBeNull();
    } finally {
      await getDb()
        .update(usageDay)
        .set({ sheetTranscriptions: 0 })
        .where(eq(usageDay.day, today));
    }
  });

  it("happy path: creates a draft, merges the reading, and streams a result event", async () => {
    await createSheetPhoto("ph_fresh");
    const { POST } = await import("@/app/api/transcribe/route");
    const response = await POST(post({ photoId: "ph_fresh", playedOn: "2026-09-11" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");

    const events = await readNdjson(response);
    expect(events[0]).toMatchObject({ type: "progress" });

    const result = events.find((e) => e.type === "result")!;
    expect(result).toBeDefined();
    expect(result.status).toBe("ok");
    const state = result.state as { columns: { id: string; sheetName: string }[]; photoId: string };
    expect(state.columns).toHaveLength(1);
    expect(state.columns[0]!.sheetName).toBe("Player C");
    expect(result.columns).toEqual([
      { columnId: state.columns[0]!.id, nameConfidence: "high", leastConfidentIndex: null },
    ]);

    // A transcription row was recorded.
    const { getDb } = await import("@/lib/db");
    const { transcription, photo, draft: draftTable } = await import("@/lib/db/schema");
    const transcriptionRow = (
      await getDb().select().from(transcription).where(eq(transcription.id, result.transcriptionId as string))
    )[0]!;
    expect(transcriptionRow.status).toBe("ok");
    expect(transcriptionRow.kind).toBe("sheet");

    // The photo is now linked to the draft that was created.
    const photoRow = (await getDb().select().from(photo).where(eq(photo.id, "ph_fresh")))[0]!;
    expect(photoRow.draftId).toBe(result.draftId);

    const draftRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, result.draftId as string))
    )[0]!;
    expect(JSON.parse(draftRow.stateJson).playedOn).toBe("2026-09-11");
  });

  it("reuses the existing draft on retry rather than creating a second one", async () => {
    const state = draftStateFromSheet(SHEET_01, { photoId: "ph_retry" });
    await createSheetPhoto("ph_retry");
    const draftId = await createDraft(state);

    nextAttempt = { ...nextAttempt, status: "error", error: "upstream 500", rawJson: null };
    const { POST } = await import("@/app/api/transcribe/route");
    const first = await POST(post({ photoId: "ph_retry" }));
    const firstEvents = await readNdjson(first);
    expect(firstEvents.some((e) => e.type === "error")).toBe(true);

    nextAttempt = {
      status: "ok",
      columns: [okColumn({ name: "Player A" })],
      rawJson: "{}",
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      error: null,
    };
    const second = await POST(post({ photoId: "ph_retry" }));
    const secondEvents = await readNdjson(second);
    const result = secondEvents.find((e) => e.type === "result")!;
    expect(result.draftId).toBe(draftId);
  });

  it("records status='invalid' and still merges whatever parsed, never a hard failure", async () => {
    await createSheetPhoto("ph_invalid");
    nextAttempt = {
      status: "invalid",
      columns: [okColumn(), { name: null, name_confidence: "low", running_totals: [], least_confident_index: null }],
      rawJson: "{ malformed but partially salvaged }",
      inputTokens: 5,
      outputTokens: 5,
      latencyMs: 500,
      error: "The model's response didn't match the expected shape in every column.",
    };

    const { POST } = await import("@/app/api/transcribe/route");
    const response = await POST(post({ photoId: "ph_invalid" }));
    const events = await readNdjson(response);
    const result = events.find((e) => e.type === "result")!;

    expect(result).toBeDefined();
    expect(result.status).toBe("invalid");
    const state = result.state as { columns: unknown[] };
    expect(state.columns).toHaveLength(2);
  });

  it("streams an error event and records status='error' on an upstream failure, without merging anything", async () => {
    await createSheetPhoto("ph_error");
    nextAttempt = {
      status: "error",
      columns: [],
      rawJson: null,
      inputTokens: null,
      outputTokens: null,
      latencyMs: 200,
      error: "connection reset",
    };

    const { POST } = await import("@/app/api/transcribe/route");
    const response = await POST(post({ photoId: "ph_error" }));
    const events = await readNdjson(response);
    const error = events.find((e) => e.type === "error")!;
    expect(error).toBeDefined();
    expect(error.code).toBe("upstream_error");

    const { getDb } = await import("@/lib/db");
    const { photo } = await import("@/lib/db/schema");
    const photoRow = (await getDb().select().from(photo).where(eq(photo.id, "ph_error")))[0]!;
    const { draft: draftTable } = await import("@/lib/db/schema");
    const draftRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, photoRow.draftId!))
    )[0]!;
    expect(JSON.parse(draftRow.stateJson).columns).toEqual([]);
  });
});
