/**
 * The daily sheet-transcription cap — the abuse mitigation that actually
 * costs real money if the shared password leaks (docs/ARCHITECTURE.md § Flow
 * 1: "20 sheet reads and 60 column reads per day"). Counted in
 * `usage_day.sheet_transcriptions`, UTC days, **separately** from
 * `sheet_uploads` (an upload costs nothing against the Anthropic budget) and
 * from `column_transcriptions` (Stage 4), so a legitimate session re-shooting
 * several columns can never trip the cap this file enforces.
 *
 * Same atomic increment-and-return shape as `lib/photos/upload-cap.ts` — read
 * that file's comment for the full "why", including the concurrency test it
 * describes. The short version: the increment and the read of *this
 * request's own* resulting count must be one `RETURNING` statement, never an
 * increment followed by a separate `SELECT`, or a burst of concurrent calls
 * can let more than the cap through.
 */

import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { usageDay } from "@/lib/db/schema";

/** Far beyond 1–2 sheets a week; see docs/ARCHITECTURE.md § Flow 1. */
export const DAILY_SHEET_TRANSCRIPTION_CAP = 20;

export interface TranscriptionReservation {
  allowed: boolean;
  /** The count this reservation left the day on — the cap, when refused. */
  count: number;
}

function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export async function reserveSheetTranscription(
  now: Date = new Date(),
): Promise<TranscriptionReservation> {
  const db = getDb();
  const day = todayUtc(now);

  const [row] = await db
    .insert(usageDay)
    .values({ day, sheetTranscriptions: 1 })
    .onConflictDoUpdate({
      target: usageDay.day,
      set: { sheetTranscriptions: sql`${usageDay.sheetTranscriptions} + 1` },
    })
    .returning({ sheetTranscriptions: usageDay.sheetTranscriptions });

  if (row!.sheetTranscriptions > DAILY_SHEET_TRANSCRIPTION_CAP) {
    await db
      .update(usageDay)
      .set({ sheetTranscriptions: sql`max(${usageDay.sheetTranscriptions} - 1, 0)` })
      .where(eq(usageDay.day, day));
    return { allowed: false, count: DAILY_SHEET_TRANSCRIPTION_CAP };
  }

  return { allowed: true, count: row!.sheetTranscriptions };
}

/**
 * Far beyond a legitimate re-shoot session; see docs/ARCHITECTURE.md § Flow 1
 * ("20 sheet reads and 60 column reads per day").
 *
 * ⚠️ **Security review, Stage 4**: this used to be uncounted-but-uncapped —
 * `docs/ARCHITECTURE.md` § "Targeted column re-read" says "no re-read cap, no
 * cheaper model on this path", which is true of the *quality* tradeoffs (same
 * model, same thinking budget, unlimited re-shots of a column you're actually
 * working on) but was never meant to leave the endpoint that spends real
 * money with no ceiling at all. A leaked shared password could otherwise loop
 * this endpoint with no limit. 60/day is ~8× a heavy legitimate night (the
 * threat model's own number) and the founder chose to enforce it once this
 * gap was found.
 */
export const DAILY_COLUMN_TRANSCRIPTION_CAP = 60;

export async function reserveColumnTranscription(
  now: Date = new Date(),
): Promise<TranscriptionReservation> {
  const db = getDb();
  const day = todayUtc(now);

  const [row] = await db
    .insert(usageDay)
    .values({ day, columnTranscriptions: 1 })
    .onConflictDoUpdate({
      target: usageDay.day,
      set: { columnTranscriptions: sql`${usageDay.columnTranscriptions} + 1` },
    })
    .returning({ columnTranscriptions: usageDay.columnTranscriptions });

  if (row!.columnTranscriptions > DAILY_COLUMN_TRANSCRIPTION_CAP) {
    await db
      .update(usageDay)
      .set({ columnTranscriptions: sql`max(${usageDay.columnTranscriptions} - 1, 0)` })
      .where(eq(usageDay.day, day));
    return { allowed: false, count: DAILY_COLUMN_TRANSCRIPTION_CAP };
  }

  return { allowed: true, count: row!.columnTranscriptions };
}
