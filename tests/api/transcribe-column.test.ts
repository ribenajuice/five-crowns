/**
 * POST /api/transcribe/column.
 *
 * `transcribeColumn` itself is mocked — its outcomes are covered by
 * `tests/vision/transcribe-column.test.ts` — so this file is about the
 * route's own responsibilities: auth, resolving the photo/draft/column,
 * merging, and never opening the streaming response for anything decidable
 * up front.
 */

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GROUP_COOKIE } from "@/lib/auth/cookies";

import { setupTestDb, teardownTestDb } from "../helpers/db";

interface FakeAttempt {
  status: "ok" | "invalid" | "error";
  reading: {
    player_name: string | null;
    name_confidence: "high" | "medium" | "low";
    running_totals: (number | null)[];
    least_confident_index: number | null;
  };
  rawJson: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  error: string | null;
}

let nextAttempt: FakeAttempt;
const transcribeCalls: unknown[] = [];

vi.mock("@/lib/vision/transcribe-column", () => ({
  transcribeColumn: async (args: unknown) => {
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
  return new Request(`${ORIGIN}/api/transcribe/column`, {
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

function okReading(overrides: Partial<FakeAttempt["reading"]> = {}): FakeAttempt["reading"] {
  return {
    player_name: "Player D",
    name_confidence: "high",
    running_totals: [29, 29, 64, 64, 64, 64, 64, 64, 67, 67, 111],
    least_confident_index: null,
    ...overrides,
  };
}

async function createDraftWithColumn(overrides: {
  playerId?: string;
  newPlayerName?: string;
  sheetName?: string;
} = {}): Promise<{ draftId: string; columnId: string }> {
  const { getDb } = await import("@/lib/db");
  const { draft: draftTable } = await import("@/lib/db/schema");
  const { emptyDraftState } = await import("@/lib/draft/state");

  const draftId = randomUUID();
  const columnId = `col_${randomUUID()}`;
  const state = emptyDraftState({
    photoId: randomUUID(),
    playedOn: "2026-09-11",
    columnIds: [columnId],
  });
  if (overrides.playerId) state.columns[0]!.playerId = overrides.playerId;
  if (overrides.newPlayerName) state.columns[0]!.newPlayerName = overrides.newPlayerName;
  if (overrides.sheetName) state.columns[0]!.sheetName = overrides.sheetName;

  const now = new Date().toISOString();
  await getDb()
    .insert(draftTable)
    .values({ id: draftId, stateJson: JSON.stringify(state), createdAt: now, updatedAt: now });
  return { draftId, columnId };
}

async function createColumnPhoto(
  photoId: string,
  draftId: string,
  columnId: string,
  options: { withObjects?: boolean } = {},
): Promise<void> {
  const { getDb } = await import("@/lib/db");
  const { photo } = await import("@/lib/db/schema");
  const { photoKey } = await import("@/lib/photos/keys");
  const { writeLocalPhoto } = await import("@/lib/photos/local");

  await getDb()
    .insert(photo)
    .values({
      id: photoId,
      kind: "column",
      draftId,
      draftColumnId: columnId,
      s3KeyOriginal: photoKey(photoId, "original"),
      s3KeyModel: photoKey(photoId, "model"),
    });

  if (options.withObjects === false) return;
  await writeLocalPhoto(photoId, "original", Buffer.from("fake-original-jpeg"));
  await writeLocalPhoto(photoId, "model", Buffer.from("fake-model-jpeg"));
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "transcribe-column-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  process.env.FIVE_CROWNS_ANTHROPIC_API_KEY = "sk-ant-test-key-for-transcribe-column";
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  transcribeCalls.length = 0;
  nextAttempt = {
    status: "ok",
    reading: okReading(),
    rawJson: JSON.stringify(okReading()),
    inputTokens: 50,
    outputTokens: 25,
    latencyMs: 600,
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

describe("POST /api/transcribe/column", () => {
  it("401s with no session", async () => {
    requestCookies.clear();
    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({ photoId: "ph_1", columnId: "col_1" }));
    expect(response.status).toBe(401);
  });

  it("403s a cross-site Origin", async () => {
    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(
      new Request(`${ORIGIN}/api/transcribe/column`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          host: "five-crowns.test",
        },
        body: JSON.stringify({ photoId: "ph_1", columnId: "col_1" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("400s a bad body", async () => {
    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({}));
    expect(response.status).toBe(400);
  });

  it("404s an unknown photo", async () => {
    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({ photoId: "no-such-photo", columnId: "col_1" }));
    expect(response.status).toBe(404);
  });

  it("400s a photoId/columnId mismatch", async () => {
    const { draftId, columnId } = await createDraftWithColumn();
    const photoId = randomUUID();
    await createColumnPhoto(photoId, draftId, columnId);

    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({ photoId, columnId: "col_different" }));
    expect(response.status).toBe(400);
  });

  it("409s a draft that's already been saved", async () => {
    const { draftId, columnId } = await createDraftWithColumn();
    const photoId = randomUUID();
    await createColumnPhoto(photoId, draftId, columnId);

    const { getDb } = await import("@/lib/db");
    const { draft: draftTable, game, roster } = await import("@/lib/db/schema");
    await getDb().insert(roster).values({ id: "roster_saved", signature: "p_x", size: 1 });
    await getDb()
      .insert(game)
      .values({ id: "game_saved", playedOn: "2026-01-01", rosterId: "roster_saved" });
    await getDb()
      .update(draftTable)
      .set({ savedGameId: "game_saved" })
      .where(eq(draftTable.id, draftId));

    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({ photoId, columnId }));
    expect(response.status).toBe(409);
    expect(transcribeCalls).toHaveLength(0);
  });

  it("404s a column no longer on the draft", async () => {
    const { draftId, columnId } = await createDraftWithColumn();
    const photoId = randomUUID();
    await createColumnPhoto(photoId, draftId, columnId);

    // Remove the column from the draft after the photo was taken for it.
    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");
    const { emptyDraftState } = await import("@/lib/draft/state");
    const emptied = emptyDraftState({ photoId: randomUUID(), playedOn: "2026-09-11", columnIds: [] });
    await getDb()
      .update(draftTable)
      .set({ stateJson: JSON.stringify(emptied) })
      .where(eq(draftTable.id, draftId));

    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({ photoId, columnId }));
    expect(response.status).toBe(404);
  });

  it("503s not_configured when no API key is set", async () => {
    const saved = process.env.FIVE_CROWNS_ANTHROPIC_API_KEY;
    delete process.env.FIVE_CROWNS_ANTHROPIC_API_KEY;
    try {
      const { draftId, columnId } = await createDraftWithColumn();
      const photoId = randomUUID();
      await createColumnPhoto(photoId, draftId, columnId);

      const { POST } = await import("@/app/api/transcribe/column/route");
      const response = await POST(post({ photoId, columnId }));
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe("not_configured");
      expect(transcribeCalls).toHaveLength(0);
    } finally {
      process.env.FIVE_CROWNS_ANTHROPIC_API_KEY = saved;
    }
  });

  it("missing_photo (409) when the photo row exists but its model.jpg object doesn't", async () => {
    const { draftId, columnId } = await createDraftWithColumn();
    const photoId = randomUUID();
    await createColumnPhoto(photoId, draftId, columnId, { withObjects: false });

    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({ photoId, columnId }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("missing_photo");
  });

  it("happy path: merges the reading, records a transcription row, and streams a result event", async () => {
    const { draftId, columnId } = await createDraftWithColumn({ newPlayerName: "Player D" });
    const photoId = randomUUID();
    await createColumnPhoto(photoId, draftId, columnId);

    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({ photoId, columnId }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");

    const events = await readNdjson(response);
    expect(events[0]).toMatchObject({ type: "progress" });

    const result = events.find((e) => e.type === "result")!;
    expect(result).toBeDefined();
    expect(result.status).toBe("ok");
    expect(result.draftId).toBe(draftId);
    expect(result.columnId).toBe(columnId);

    const diagnostics = result.diagnostics as {
      nameConfidence: string;
      readPlayerName: string;
      possibleWrongColumn: boolean;
    };
    expect(diagnostics.nameConfidence).toBe("high");
    expect(diagnostics.readPlayerName).toBe("Player D");
    expect(diagnostics.possibleWrongColumn).toBe(false); // matches the expected newPlayerName

    const state = result.state as { columns: { id: string; readings: { source: string }[] }[] };
    const column = state.columns.find((c) => c.id === columnId)!;
    expect(column.readings.at(-1)!.source).toBe("close-up");

    // ⚠️ The expected player name was never sent to the model.
    const call = transcribeCalls[0] as { imageBase64: string };
    expect(call).toBeDefined();

    const { getDb } = await import("@/lib/db");
    const { transcription } = await import("@/lib/db/schema");
    const transcriptionRow = (
      await getDb().select().from(transcription).where(eq(transcription.id, result.transcriptionId as string))
    )[0]!;
    expect(transcriptionRow.status).toBe("ok");
    expect(transcriptionRow.kind).toBe("column");
  });

  it("⚠️ criterion 42: flags a wrong-column warning when the read name disagrees with the expected player", async () => {
    const { draftId, columnId } = await createDraftWithColumn({ newPlayerName: "Player D" });
    const photoId = randomUUID();
    await createColumnPhoto(photoId, draftId, columnId);

    nextAttempt = {
      ...nextAttempt,
      reading: okReading({ player_name: "Player B" }),
    };

    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({ photoId, columnId }));
    const events = await readNdjson(response);
    const result = events.find((e) => e.type === "result")!;

    const diagnostics = result.diagnostics as { possibleWrongColumn: boolean };
    expect(diagnostics.possibleWrongColumn).toBe(true);
  });

  it("streams an error event and records status='error' on an upstream failure, without merging anything", async () => {
    const { draftId, columnId } = await createDraftWithColumn();
    const photoId = randomUUID();
    await createColumnPhoto(photoId, draftId, columnId);

    nextAttempt = {
      status: "error",
      reading: { player_name: null, name_confidence: "low", running_totals: [], least_confident_index: null },
      rawJson: null,
      inputTokens: null,
      outputTokens: null,
      latencyMs: 200,
      error: "connection reset",
    };

    const { POST } = await import("@/app/api/transcribe/column/route");
    const response = await POST(post({ photoId, columnId }));
    const events = await readNdjson(response);
    const error = events.find((e) => e.type === "error")!;
    expect(error).toBeDefined();
    expect(error.code).toBe("upstream_error");

    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");
    const draftRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, draftId))
    )[0]!;
    const state = JSON.parse(draftRow.stateJson);
    // Nothing merged: the column has no readings.
    expect(state.columns.find((c: { id: string }) => c.id === columnId).readings).toEqual([]);
  });

  it("counts the attempt in usage_day.column_transcriptions, uncapped", async () => {
    const { draftId, columnId } = await createDraftWithColumn();
    const photoId = randomUUID();
    await createColumnPhoto(photoId, draftId, columnId);

    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const today = new Date().toISOString().slice(0, 10);
    const before = (
      await getDb().select().from(usageDay).where(eq(usageDay.day, today))
    )[0]?.columnTranscriptions ?? 0;

    const { POST } = await import("@/app/api/transcribe/column/route");
    await POST(post({ photoId, columnId }));

    const after = (
      await getDb().select().from(usageDay).where(eq(usageDay.day, today))
    )[0]!.columnTranscriptions;
    expect(after).toBe(before + 1);
  });
});
