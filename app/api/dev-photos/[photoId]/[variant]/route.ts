/**
 * GET/POST /api/dev-photos/{photoId}/{original.jpg|model.jpg} — the local
 * photo driver's storage, standing in for presigned S3 URLs in development
 * and QA.
 *
 * ⚠️ **Impossible in production.** Refuses unless the local driver is actually
 * selected *and* this process is not a deployed Lambda
 * (`localDevPhotosAllowed`) — tested in `tests/photos/local-storage.test.ts`.
 *
 * ⚠️ **No session check, on purpose.** A real presigned S3 URL/POST policy
 * carries its own credential and needs no cookie; this mirrors that exactly —
 * GET via the HMAC signature and expiry in the query string (`?exp=...&sig=...`),
 * POST via the same pair carried as form fields (`x-fc-exp`, `x-fc-sig`) — both
 * checked against `SESSION_SECRET`. The path ends in `.jpg`, so `middleware.ts`
 * skips it entirely — the same reason a real photo route would (see its ⚠️
 * Stage 2 hazard comment).
 *
 * ⚠️ **Emulates the presigned POST's policy** (security review MEDIUM 1): the
 * uploaded `file` field must be `image/jpeg` and 1–{@link MAX_UPLOAD_BYTES}
 * bytes, the same bounds `presignPost`'s S3 policy conditions would enforce.
 */

import "server-only";

import { NextResponse } from "next/server";

import { apiError, serverError } from "@/lib/http/errors";
import { parseUuidParam } from "@/lib/http/params";
import { log } from "@/lib/log";
import { readLocalPhoto, writeLocalPhoto } from "@/lib/photos/local";
import { verifyLocalPhotoUrl } from "@/lib/photos/local-url";
import { localDevPhotosAllowed } from "@/lib/photos/storage";
import { MAX_UPLOAD_BYTES, type PhotoVariant } from "@/lib/photos/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ photoId: string; variant: string }> };

function parseVariant(raw: string): PhotoVariant | null {
  if (raw === "original.jpg") return "original";
  if (raw === "model.jpg") return "model";
  return null;
}

async function checkGetAccess(
  request: Request,
  photoId: string,
  variant: PhotoVariant,
) {
  if (!localDevPhotosAllowed()) {
    // ⚠️ Indistinguishable from a route that doesn't exist. Never a clue that
    // this path is real but gated — see the module doc.
    return apiError("not_found", "Not found.");
  }

  const url = new URL(request.url);
  const expRaw = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");
  const exp = expRaw ? Number.parseInt(expRaw, 10) : NaN;

  if (!sig || !Number.isFinite(exp)) {
    return apiError("forbidden", "That link is missing its signature.");
  }

  const ok = await verifyLocalPhotoUrl({ photoId, variant, method: "GET", exp }, sig);
  if (!ok) {
    return apiError("forbidden", "That link has expired or is invalid.");
  }

  return null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { photoId: rawPhotoId, variant: rawVariant } = await params;
  const variant = parseVariant(rawVariant);
  if (!variant) return apiError("not_found", "Not found.");

  // ⚠️ Security review LOW 5. Still 404, not 400: this route stays
  // indistinguishable from one that doesn't exist in every failure case —
  // see the module doc.
  const photoId = parseUuidParam(rawPhotoId);
  if (!photoId) return apiError("not_found", "Not found.");

  const denied = await checkGetAccess(request, photoId, variant);
  if (denied) return denied;

  try {
    const data = await readLocalPhoto(photoId, variant);
    if (!data) return apiError("not_found", "Not found.");

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "private, max-age=0, no-store",
      },
    });
  } catch (error) {
    return serverError("dev_photos.get_failed", error, { photoId, variant });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { photoId: rawPhotoId, variant: rawVariant } = await params;
  const variant = parseVariant(rawVariant);
  if (!variant) return apiError("not_found", "Not found.");

  // ⚠️ Security review LOW 5. Still 404, not 400 — see GET, above.
  const photoId = parseUuidParam(rawPhotoId);
  if (!photoId) return apiError("not_found", "Not found.");

  if (!localDevPhotosAllowed()) {
    return apiError("not_found", "Not found.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("bad_request", "That upload didn't make sense.");
  }

  // The policy's content-type condition.
  const contentType = form.get("Content-Type");
  if (contentType !== "image/jpeg") {
    return apiError("unsupported_media_type", "Expected an image/jpeg upload.");
  }

  // The policy's signature and expiry — the credential a real S3 POST
  // policy's `Policy`/`X-Amz-Signature` fields carry.
  const expRaw = form.get("x-fc-exp");
  const sig = form.get("x-fc-sig");
  const exp = typeof expRaw === "string" ? Number.parseInt(expRaw, 10) : NaN;
  if (typeof sig !== "string" || !Number.isFinite(exp)) {
    return apiError("forbidden", "That link is missing its signature.");
  }
  const ok = await verifyLocalPhotoUrl({ photoId, variant, method: "POST", exp }, sig);
  if (!ok) {
    return apiError("forbidden", "That link has expired or is invalid.");
  }

  // The policy's content-length-range condition.
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return apiError("bad_request", "No file in the upload.");
  }
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    return apiError(
      "bad_request",
      `The file must be between 1 and ${MAX_UPLOAD_BYTES} bytes.`,
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeLocalPhoto(photoId, variant, Buffer.from(bytes));
    log.info("dev_photos.post_ok", { photoId, variant, bytes: bytes.byteLength });
    // S3 itself answers a successful POST upload with 204 No Content.
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError("dev_photos.post_failed", error, { photoId, variant });
  }
}
