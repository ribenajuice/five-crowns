/**
 * GET /api/locations — the pick-list, alphabetical, plus the most recently
 * used location (the location of the newest *saved* game that has one, or
 * null — criterion 59).
 */

import "server-only";

import { asc, desc, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { game, location } from "@/lib/db/schema";
import { apiError, serverError } from "@/lib/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  try {
    const db = getDb();

    const locations = await db
      .select({ id: location.id, name: location.name })
      .from(location)
      .orderBy(asc(location.name));

    const mostRecent = await db
      .select({ locationId: game.locationId })
      .from(game)
      .where(isNotNull(game.locationId))
      .orderBy(desc(game.playedOn), desc(game.createdAt))
      .limit(1);

    return NextResponse.json({
      locations,
      mostRecentLocationId: mostRecent[0]?.locationId ?? null,
    });
  } catch (error) {
    return serverError("locations.list_failed", error);
  }
}
