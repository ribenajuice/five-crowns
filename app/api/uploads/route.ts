/**
 * POST /api/uploads — the first step of Flow 2.
 *
 * Creates the `photo` row (kind='sheet', pending — nothing in S3 yet) and
 * returns two presigned PUTs, five minutes, `Content-Type: image/jpeg` signed
 * in. The browser has already rotated and downscaled both images; this route
 * never sees the bytes (`docs/ARCHITECTURE.md` § Flow 2, Step 3).
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { photo } from "@/lib/db/schema";
import { uploadRequestSchema } from "@/lib/draft/state";
import { apiError, serverError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import { photoKey } from "@/lib/photos/keys";
import { getPhotoStorage } from "@/lib/photos/storage";

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
      storage.presignPut(photoId, "original"),
      storage.presignPut(photoId, "model"),
    ]);

    return NextResponse.json(
      {
        photoId,
        original: { url: original.url },
        model: { url: model.url },
      },
      { status: 201 },
    );
  } catch (error) {
    return serverError("uploads.create_failed", error);
  }
}
