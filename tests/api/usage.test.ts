/**
 * GET /api/admin/usage — PRD criteria 110-114.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

import { ADMIN_COOKIE, GROUP_COOKIE } from "@/lib/auth/cookies";
import {
  DAILY_COLUMN_TRANSCRIPTION_CAP,
  DAILY_SHEET_TRANSCRIPTION_CAP,
} from "@/lib/vision/usage-cap";
import {
  INPUT_USD_PER_MILLION_TOKENS,
  OUTPUT_USD_PER_MILLION_TOKENS,
  PRICED_MODEL,
  PRICES_CHECKED_ON,
  USD_TO_AUD_RATE,
} from "@/lib/vision/pricing";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createSheetPhoto } from "../helpers/draft";

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
  process.env.SESSION_SECRET = "usage-test-secret";
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  requestCookies.clear();
  const { invalidateAllParameters, resetLocalParameterOverrides } = await import("@/lib/config");
  invalidateAllParameters();
  resetLocalParameterOverrides();

  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(GROUP_COOKIE, await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  requestCookies.set(ADMIN_COOKIE, await signSession({ s: "admin", v: 0 }, process.env.SESSION_SECRET!));
});

afterEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

async function insertTranscription(options: {
  kind: "sheet" | "column";
  status: "ok" | "invalid" | "error";
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
}): Promise<void> {
  const { getDb } = await import("@/lib/db");
  const { transcription } = await import("@/lib/db/schema");
  const db = getDb();

  const photoId = randomUUID();
  await createSheetPhoto(photoId, { withObjects: false });

  await db.insert(transcription).values({
    id: randomUUID(),
    photoId,
    kind: options.kind,
    model: PRICED_MODEL,
    status: options.status,
    inputTokens: options.inputTokens,
    outputTokens: options.outputTokens,
    createdAt: options.createdAt,
  });
}

describe("GET /api/admin/usage — admin gating (criterion 109's rule, reused)", () => {
  it("401s with no session at all", async () => {
    requestCookies.clear();
    const { GET } = await import("@/app/api/admin/usage/route");
    expect((await GET()).status).toBe(401);
  });

  it("401s a group session with no admin session", async () => {
    requestCookies.delete(ADMIN_COOKIE);
    const { GET } = await import("@/app/api/admin/usage/route");
    expect((await GET()).status).toBe(401);
  });
});

describe("GET /api/admin/usage — criterion 114, a quiet month", () => {
  it("returns real zeroes and A$0.00, not a blank, a dash or an error", async () => {
    const { GET } = await import("@/app/api/admin/usage/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.month.sheetReads).toBe(0);
    expect(body.month.columnRereads).toBe(0);
    expect(body.month.total).toBe(0);
    expect(body.spend.estimatedAud).toBe(0);
    expect(body.today.sheetReads).toBe(0);
    expect(body.today.columnRereads).toBe(0);
    expect(body.today.sheetCap).toBe(DAILY_SHEET_TRANSCRIPTION_CAP);
    expect(body.today.columnCap).toBe(DAILY_COLUMN_TRANSCRIPTION_CAP);
  });
});

describe("GET /api/admin/usage — criteria 110-113, real usage", () => {
  it("counts sheet reads and column re-reads separately, totals them, and estimates A$ spend", async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15)).toISOString();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15)).toISOString();

    await insertTranscription({
      kind: "sheet",
      status: "ok",
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      createdAt: thisMonth,
    });
    await insertTranscription({
      kind: "column",
      status: "ok",
      inputTokens: 200_000,
      outputTokens: 20_000,
      createdAt: thisMonth,
    });
    // Counted as an attempt despite failing, contributing zero tokens.
    await insertTranscription({
      kind: "column",
      status: "error",
      inputTokens: null,
      outputTokens: null,
      createdAt: thisMonth,
    });
    // Outside the current UTC month — must not be counted.
    await insertTranscription({
      kind: "sheet",
      status: "ok",
      inputTokens: 999_999,
      outputTokens: 999_999,
      createdAt: lastMonth,
    });

    const { GET } = await import("@/app/api/admin/usage/route");
    const body = await (await GET()).json();

    expect(body.month.sheetReads).toBe(1);
    expect(body.month.columnRereads).toBe(2);
    expect(body.month.total).toBe(3);

    const expectedUsd =
      (1_000_000 / 1_000_000) * INPUT_USD_PER_MILLION_TOKENS +
      (100_000 / 1_000_000) * OUTPUT_USD_PER_MILLION_TOKENS +
      (200_000 / 1_000_000) * INPUT_USD_PER_MILLION_TOKENS +
      (20_000 / 1_000_000) * OUTPUT_USD_PER_MILLION_TOKENS;
    const expectedAud = Math.round(expectedUsd * USD_TO_AUD_RATE * 100) / 100;
    expect(body.spend.estimatedAud).toBe(expectedAud);
    expect(body.spend.conversionRate).toBe(USD_TO_AUD_RATE);
    expect(body.spend.model).toBe(PRICED_MODEL);
    expect(body.spend.pricesCheckedOn).toBe(PRICES_CHECKED_ON);
  });

  it("today's usage reflects usage_day's own counters against the real cap constants", async () => {
    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const today = new Date().toISOString().slice(0, 10);
    await getDb().insert(usageDay).values({
      day: today,
      sheetTranscriptions: 3,
      columnTranscriptions: 0,
    });

    const { GET } = await import("@/app/api/admin/usage/route");
    const body = await (await GET()).json();

    expect(body.today.sheetReads).toBe(3);
    expect(body.today.sheetCap).toBe(DAILY_SHEET_TRANSCRIPTION_CAP);
    expect(body.today.columnRereads).toBe(0);
    expect(body.today.columnCap).toBe(DAILY_COLUMN_TRANSCRIPTION_CAP);
  });
});
