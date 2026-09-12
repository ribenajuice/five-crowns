/**
 * POST /api/uploads — the first step of Flow 2 (`kind:'sheet'`) and of Flow
 * 2b, the targeted column re-read (`kind:'column'`).
 *
 * Creates the `photo` row (pending — nothing in S3 yet) and returns two
 * presigned **POSTs**, five minutes, policy-constrained to the exact key,
 * 1–8,000,000 bytes and `Content-Type: image/jpeg`. The browser has already
 * rotated and downscaled both images; this route never sees the bytes
 * (`docs/ARCHITECTURE.md` § Flow 2, Step 3).
 *
 * ⚠️ Security review MEDIUM 1: a presigned POST, not a PUT — S3's policy
 * conditions refuse a wrong-shaped upload itself, rather than this app
 * trusting whatever showed up at the key afterwards. A **sheet** upload is
 * also capped at 40/UTC day (`lib/photos/upload-cap.ts`), refused with 429
 * `rate_limited` beyond that — far more than the real 1–2 sheets a week, and
 * counted separately from the vision-call caps.
 *
 * A **column** upload (`docs/ARCHITECTURE.md` § "Targeted column re-read")
 * has no such cap — the architecture doc is explicit that re-shoots are
 * unlimited on this path — but it does need an existing, unsaved draft with
 * that exact column still on it: `draftId` and `columnId` are stamped onto
 * the new `photo` row (`draft_id`, `draft_column_id`) so the game view can
 * later attach the close-up to the right player, whichever way the
 * transcription itself turns out.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { draft as draftTable, photo } from "@/lib/db/schema";
import { uploadRequestSchema, type DraftState } from "@/lib/draft/state";
import { apiError, serverError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import { photoKey } from "@/lib/photos/keys";
import { getPhotoStorage } from "@/lib/photos/storage";
import { reserveSheetUpload } from "@/lib/photos/upload-cap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "uploads.create");
  if (crossSite) return crossSite;

  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "That request didn't make sense.");
  }

  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "That upload request didn't make sense.");
  }

  try {
    if (parsed.data.kind === "column") {
      return await createColumnUpload(parsed.data);
    }

    const reservation = await reserveSheetUpload();
    if (!reservation.allowed) {
      return apiError(
        "rate_limited",
        "That's the day's upload limit reached. Try again tomorrow.",
      );
    }

    const photoId = randomUUID();

    await getDb()
      .insert(photo)
      .values({
        id: photoId,
        kind: "sheet",
        rotationApplied: parsed.data.rotation,
        width: parsed.data.width,
        height: parsed.data.height,
        s3KeyOriginal: photoKey(photoId, "original"),
        s3KeyModel: photoKey(photoId, "model"),
      });

    const storage = getPhotoStorage();
    const [original, model] = await Promise.all([
      storage.presignPost(photoId, "original"),
      storage.presignPost(photoId, "model"),
    ]);

    return NextResponse.json(
      {
        photoId,
        original: { url: original.url, fields: original.fields },
        model: { url: model.url, fields: model.fields },
      },
      { status: 201 },
    );
  } catch (error) {
    return serverError("uploads.create_failed", error);
  }
}

async function createColumnUpload(data: {
  draftId: string;
  columnId: string;
  rotation: 0 | 90 | 180 | 270;
  width: number;
  height: number;
}) {
  const db = getDb();
  const draftRow = (
    await db.select().from(draftTable).where(eq(draftTable.id, data.draftId))
  )[0];
  if (!draftRow) return apiError("not_found", "That draft doesn't exist.");
  if (draftRow.savedGameId) {
    return apiError("conflict", "This draft has already been saved.");
  }

  const state = JSON.parse(draftRow.stateJson) as DraftState;
  const columnExists = state.columns.some((c) => c.id === data.columnId);
  if (!columnExists) {
    return apiError("bad_request", "That column doesn't exist on this draft.");
  }

  const photoId = randomUUID();
  await db.insert(photo).values({
    id: photoId,
    kind: "column",
    draftId: data.draftId,
    draftColumnId: data.columnId,
    rotationApplied: data.rotation,
    width: data.width,
    height: data.height,
    s3KeyOriginal: photoKey(photoId, "original"),
    s3KeyModel: photoKey(photoId, "model"),
  });

  const storage = getPhotoStorage();
  const [original, model] = await Promise.all([
    storage.presignPost(photoId, "original"),
    storage.presignPost(photoId, "model"),
  ]);

  return NextResponse.json(
    {
      photoId,
      original: { url: original.url, fields: original.fields },
      model: { url: model.url, fields: model.fields },
    },
    { status: 201 },
  );
}
