/**
 * GET/PUT /api/dev-photos/{photoId}/{original.jpg|model.jpg} — the local photo
 * driver's storage, standing in for a presigned S3 URL in development and QA.
 *
 * ⚠️ **Impossible in production.** Refuses unless the local driver is actually
 * selected *and* this process is not a deployed Lambda
 * (`localDevPhotosAllowed`) — tested in `tests/photos/dev-photos-route.test.ts`.
 *
 * ⚠️ **No session check, on purpose.** A real presigned S3 URL carries its own
 * credential and needs no cookie; this mirrors that exactly, via the HMAC
 * signature and expiry in the query string (`?exp=...&sig=...`), checked
 * against `SESSION_SECRET`. The path ends in `.jpg`, so `middleware.ts` skips
 * it entirely — the same reason a real photo route would (see its ⚠️ Stage 2
 * hazard comment).
 */

import "server-only";

import { NextResponse } from "next/server";

import { apiError, serverError } from "@/lib/http/errors";
import { log } from "@/lib/log";
import { readLocalPhoto, writeLocalPhoto } from "@/lib/photos/local";
import { verifyLocalPhotoUrl } from "@/lib/photos/local-url";
import { localDevPhotosAllowed } from "@/lib/photos/storage";
import type { PhotoVariant } from "@/lib/photos/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ photoId: string; variant: string }> };

function parseVariant(raw: string): PhotoVariant | null {
  if (raw === "original.jpg") return "original";
  if (raw === "model.jpg") return "model";
  return null;
}

async function checkAccess(
  request: Request,
  photoId: string,
  variant: PhotoVariant,
  method: "GET" | "PUT",
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

  const ok = await verifyLocalPhotoUrl({ photoId, variant, method, exp }, sig);
  if (!ok) {
    return apiError("forbidden", "That link has expired or is invalid.");
  }

  return null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { photoId, variant: rawVariant } = await params;
  const variant = parseVariant(rawVariant);
  if (!variant) return apiError("not_found", "Not found.");

  const denied = await checkAccess(request, photoId, variant, "GET");
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

export async function PUT(request: Request, { params }: RouteParams) {
  const { photoId, variant: rawVariant } = await params;
  const variant = parseVariant(rawVariant);
  if (!variant) return apiError("not_found", "Not found.");

  const denied = await checkAccess(request, photoId, variant, "PUT");
  if (denied) return denied;

  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim();
  if (contentType?.toLowerCase() !== "image/jpeg") {
    return apiError("unsupported_media_type", "Expected an image/jpeg body.");
  }

  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    await writeLocalPhoto(photoId, variant, Buffer.from(bytes));
    log.info("dev_photos.put_ok", { photoId, variant, bytes: bytes.byteLength });
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return serverError("dev_photos.put_failed", error, { photoId, variant });
  }
}
