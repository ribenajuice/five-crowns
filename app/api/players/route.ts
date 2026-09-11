/**
 * GET /api/players — the pick-list, alphabetical.
 */

import "server-only";

import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { player } from "@/lib/db/schema";
import { apiError, serverError } from "@/lib/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  try {
    const rows = await getDb()
      .select({ id: player.id, displayName: player.displayName })
      .from(player)
      .orderBy(asc(player.displayName));

    return NextResponse.json({ players: rows });
  } catch (error) {
    return serverError("players.list_failed", error);
  }
}
