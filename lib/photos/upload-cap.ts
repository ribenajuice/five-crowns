/**
 * The daily sheet-upload cap (security review MEDIUM 1).
 *
 * A separate abuse surface from the vision-call caps in `docs/ARCHITECTURE.md`
 * § Flow 1: an upload costs nothing against the Anthropic budget, but it still
 * costs S3 storage and a presigned-POST issuance, and an uncapped endpoint
 * behind the one shared password is still an uncapped endpoint. Counted in
 * `usage_day.sheet_uploads`, UTC days, separately from `sheet_transcriptions`
 * and `column_transcriptions` — the same reasoning as those two already being
 * counted apart from each other applies here too.
 */

import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { usageDay } from "@/lib/db/schema";

/** Far beyond 1–2 sheets a week; see docs/ARCHITECTURE.md § Flow 1. */
export const DAILY_SHEET_UPLOAD_CAP = 40;

export interface UploadReservation {
  allowed: boolean;
  /** The count this reservation left the day on — the cap, when refused. */
  count: number;
}

function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Count this upload first, then decide whether it may proceed — the same
 * "count first" shape as the login rate limiter (`lib/auth/rate-limit.ts`),
 * so a burst of concurrent uploads can never push the day past the cap.
 * Releases its own increment immediately when it turns out to be the one
 * that tipped the day over, so a refused request never counts against the
 * day it was refused from.
 *
 * ⚠️ The increment and the read of *its own* result must happen as one
 * database operation, via `RETURNING` — not as an increment followed by a
 * separate `SELECT`. Two statements leave a window where another concurrent
 * request's increment can land in between, so a caller's "read" sees a count
 * that isn't authoritatively its own, and the allow/refuse decision (and the
 * corrective decrement below) gets attributed to the wrong request. `Promise
 * .all` in `tests/photos/upload-cap.test.ts` exercises exactly this. The
 * decrement that follows is still a separate statement, but that's safe: it's
 * a relative `-1` off whatever the row currently holds, and it only ever
 * happens once each caller already has its own authoritative post-increment
 * count in hand — so it always cancels out that specific request's own
 * increment, whatever else has happened to the row in between.
 */
export async function reserveSheetUpload(
  now: Date = new Date(),
): Promise<UploadReservation> {
  const db = getDb();
  const day = todayUtc(now);

  const [row] = await db
    .insert(usageDay)
    .values({ day, sheetUploads: 1 })
    .onConflictDoUpdate({
      target: usageDay.day,
      set: { sheetUploads: sql`${usageDay.sheetUploads} + 1` },
    })
    .returning({ sheetUploads: usageDay.sheetUploads });

  if (row!.sheetUploads > DAILY_SHEET_UPLOAD_CAP) {
    await db
      .update(usageDay)
      .set({ sheetUploads: sql`max(${usageDay.sheetUploads} - 1, 0)` })
      .where(eq(usageDay.day, day));
    return { allowed: false, count: DAILY_SHEET_UPLOAD_CAP };
  }

  return { allowed: true, count: row!.sheetUploads };
}
