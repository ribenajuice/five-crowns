/**
 * `lib/photos/upload-cap.ts` — the daily sheet-upload cap (security review
 * MEDIUM 1).
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

describe("reserveSheetUpload", () => {
  it("allows the first 40 uploads of a UTC day and refuses the 41st", async () => {
    const { reserveSheetUpload, DAILY_SHEET_UPLOAD_CAP } = await import(
      "@/lib/photos/upload-cap"
    );
    const day = new Date("2026-01-01T12:00:00Z");

    for (let i = 1; i <= DAILY_SHEET_UPLOAD_CAP; i += 1) {
      const reservation = await reserveSheetUpload(day);
      expect(reservation.allowed, `upload ${i}`).toBe(true);
      expect(reservation.count).toBe(i);
    }

    const refused = await reserveSheetUpload(day);
    expect(refused.allowed).toBe(false);
  });

  it("⚠️ a refused reservation releases its own increment — the day's count stays at the cap", async () => {
    const { reserveSheetUpload, DAILY_SHEET_UPLOAD_CAP } = await import(
      "@/lib/photos/upload-cap"
    );
    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const day = new Date("2026-02-01T00:00:00Z");

    for (let i = 0; i < DAILY_SHEET_UPLOAD_CAP; i += 1) await reserveSheetUpload(day);
    await reserveSheetUpload(day); // refused
    await reserveSheetUpload(day); // refused again

    const row = (
      await getDb().select().from(usageDay).where(eq(usageDay.day, "2026-02-01"))
    )[0]!;
    expect(row.sheetUploads).toBe(DAILY_SHEET_UPLOAD_CAP);
  });

  it("⚠️ a burst of concurrent uploads right at the cap never over- or under-counts the day", async () => {
    const { reserveSheetUpload, DAILY_SHEET_UPLOAD_CAP } = await import(
      "@/lib/photos/upload-cap"
    );
    const { getDb } = await import("@/lib/db");
    const { usageDay } = await import("@/lib/db/schema");
    const day = new Date("2026-04-01T12:00:00Z");

    // Five more attempts than the cap allows, all fired at once — the
    // increment, the read and the corrective decrement must serialize as one
    // unit (`db.transaction()`) or concurrent requests can interleave and
    // either let more than the cap through or leave the stored count wrong.
    const results = await Promise.all(
      Array.from({ length: DAILY_SHEET_UPLOAD_CAP + 5 }, () => reserveSheetUpload(day)),
    );

    const allowed = results.filter((r) => r.allowed);
    expect(allowed).toHaveLength(DAILY_SHEET_UPLOAD_CAP);

    const row = (
      await getDb().select().from(usageDay).where(eq(usageDay.day, "2026-04-01"))
    )[0]!;
    expect(row.sheetUploads).toBe(DAILY_SHEET_UPLOAD_CAP);
  });

  it("counts a different UTC day separately", async () => {
    const { reserveSheetUpload, DAILY_SHEET_UPLOAD_CAP } = await import(
      "@/lib/photos/upload-cap"
    );
    const dayOne = new Date("2026-03-01T23:00:00Z");
    const dayTwo = new Date("2026-03-02T01:00:00Z");

    for (let i = 0; i < DAILY_SHEET_UPLOAD_CAP; i += 1) await reserveSheetUpload(dayOne);
    expect((await reserveSheetUpload(dayOne)).allowed).toBe(false);
    expect((await reserveSheetUpload(dayTwo)).allowed).toBe(true);
  });
});
