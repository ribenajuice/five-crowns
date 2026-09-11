/**
 * GET /api/photos/{id}/url?variant=original|model — a fresh presigned GET.
 *
 * ⚠️ The path has no image extension on purpose, so `middleware.ts` sees it
 * and gates it on a session — this route checks anyway, per the contract's
 * "every route: hasSession('group') or 401" rule, so it stays correct even if
 * the middleware matcher ever changes.
 */

import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { photo } from "@/lib/db/schema";
import { apiError, serverError } from "@/lib/http/errors";
import { parseUuidParam } from "@/lib/http/params";
import { getPhotoStorage } from "@/lib/photos/storage";
import type { PhotoVariant } from "@/lib/photos/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

function parseVariant(raw: string | null): PhotoVariant | null {
  return raw === "original" || raw === "model" ? raw : null;
}

export async function GET(request: Request, { params }: RouteParams) {
  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  const { id: rawId } = await params;
  const id = parseUuidParam(rawId);
  if (!id) return apiError("bad_request", "That id isn't valid.");

  const variant = parseVariant(new URL(request.url).searchParams.get("variant"));
  if (!variant) {
    return apiError("bad_request", "variant must be 'original' or 'model'.");
  }

  try {
    const row = (await getDb().select().from(photo).where(eq(photo.id, id)))[0];
    if (!row) return apiError("not_found", "That photo doesn't exist.");

    const presigned = await getPhotoStorage().presignGet(id, variant);
    return NextResponse.json({ url: presigned.url, expiresAt: presigned.expiresAt });
  } catch (error) {
    return serverError("photos.url_failed", error, { photoId: id, variant });
  }
}
