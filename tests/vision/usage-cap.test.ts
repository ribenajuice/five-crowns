/**
 * `lib/vision/usage-cap.ts` — the daily sheet-transcription cap. Same shape,
 * and the same tests, as `tests/photos/upload-cap.test.ts`.
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("reserveSheetTranscription", () => {
  it("allows the first 20 transcriptions of a UTC day and refuses the 21st", async () => {
    const { reserveSheetTranscription, DAILY_SHEET_TRANSCRIPTION_CAP } = await import(
      "@/lib/vision/usage-cap"
    );
    const day = new Date("2026-01-01T12:00:00Z");

    for (let i = 1; i <= DAILY_SHEET_TRANSCRIPTION_CAP; i += 1) {
      const reservation = await reserveSheetTranscription(day);
      expect(reservation.allowed, `attempt ${i}`).toBe(true);
      expect(reservation.count).toBe(i);
    }

    const refused = await reserveSheetTranscription(day);
    expect(refused.allowed).toBe(false);
  });

  it("⚠️ a refused reservation releases its own increment — the day's count stays at the cap", async () => {
    const { reserveSheetTranscription, DAILY_SHEET_TRANSCRIPTION_CAP } = await import(
      "@/lib/vision/usage-cap"
    );
    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const day = new Date("2026-02-01T00:00:00Z");

    for (let i = 0; i < DAILY_SHEET_TRANSCRIPTION_CAP; i += 1) {
      await reserveSheetTranscription(day);
    }
    await reserveSheetTranscription(day); // refused
    await reserveSheetTranscription(day); // refused again

    const row = (
      await getDb().select().from(usageDay).where(eq(usageDay.day, "2026-02-01"))
    )[0]!;
    expect(row.sheetTranscriptions).toBe(DAILY_SHEET_TRANSCRIPTION_CAP);
  });

  it("⚠️ a burst of concurrent calls right at the cap never over- or under-counts the day", async () => {
    const { reserveSheetTranscription, DAILY_SHEET_TRANSCRIPTION_CAP } = await import(
      "@/lib/vision/usage-cap"
    );
    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const day = new Date("2026-04-01T12:00:00Z");

    const results = await Promise.all(
      Array.from({ length: DAILY_SHEET_TRANSCRIPTION_CAP + 5 }, () =>
        reserveSheetTranscription(day),
      ),
    );

    const allowed = results.filter((r) => r.allowed);
    expect(allowed).toHaveLength(DAILY_SHEET_TRANSCRIPTION_CAP);

    const row = (
      await getDb().select().from(usageDay).where(eq(usageDay.day, "2026-04-01"))
    )[0]!;
    expect(row.sheetTranscriptions).toBe(DAILY_SHEET_TRANSCRIPTION_CAP);
  });

  it("counts sheet transcriptions separately from sheet uploads", async () => {
    const { reserveSheetTranscription } = await import("@/lib/vision/usage-cap");
    const { reserveSheetUpload } = await import("@/lib/photos/upload-cap");
    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const day = new Date("2026-05-01T12:00:00Z");

    await reserveSheetUpload(day);
    await reserveSheetUpload(day);
    await reserveSheetTranscription(day);

    const row = (
      await getDb().select().from(usageDay).where(eq(usageDay.day, "2026-05-01"))
    )[0]!;
    expect(row.sheetUploads).toBe(2);
    expect(row.sheetTranscriptions).toBe(1);
  });
});

describe("⚠️ security review, Stage 4: reserveColumnTranscription (previously uncapped)", () => {
  it("allows the first 60 column re-reads of a UTC day and refuses the 61st", async () => {
    const { reserveColumnTranscription, DAILY_COLUMN_TRANSCRIPTION_CAP } = await import(
      "@/lib/vision/usage-cap"
    );
    const day = new Date("2026-06-01T12:00:00Z");

    for (let i = 1; i <= DAILY_COLUMN_TRANSCRIPTION_CAP; i += 1) {
      const reservation = await reserveColumnTranscription(day);
      expect(reservation.allowed, `attempt ${i}`).toBe(true);
      expect(reservation.count).toBe(i);
    }

    const refused = await reserveColumnTranscription(day);
    expect(refused.allowed).toBe(false);
  });

  it("a refused reservation releases its own increment — the day's count stays at the cap", async () => {
    const { reserveColumnTranscription, DAILY_COLUMN_TRANSCRIPTION_CAP } = await import(
      "@/lib/vision/usage-cap"
    );
    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const day = new Date("2026-07-01T00:00:00Z");

    for (let i = 0; i < DAILY_COLUMN_TRANSCRIPTION_CAP; i += 1) {
      await reserveColumnTranscription(day);
    }
    await reserveColumnTranscription(day); // refused
    await reserveColumnTranscription(day); // refused again

    const row = (
      await getDb().select().from(usageDay).where(eq(usageDay.day, "2026-07-01"))
    )[0]!;
    expect(row.columnTranscriptions).toBe(DAILY_COLUMN_TRANSCRIPTION_CAP);
  });

  it("counts column re-reads separately from sheet transcriptions", async () => {
    const { reserveColumnTranscription, reserveSheetTranscription } = await import(
      "@/lib/vision/usage-cap"
    );
    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const day = new Date("2026-08-01T12:00:00Z");

    await reserveSheetTranscription(day);
    await reserveColumnTranscription(day);
    await reserveColumnTranscription(day);

    const row = (
      await getDb().select().from(usageDay).where(eq(usageDay.day, "2026-08-01"))
    )[0]!;
    expect(row.sheetTranscriptions).toBe(1);
    expect(row.columnTranscriptions).toBe(2);
  });
});
