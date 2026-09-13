/**
 * The full admin gate shared by every route behind `/admin`.
 *
 * Both checks, in order — group session **first**, then admin — exactly like
 * `app/admin/page.tsx`'s own server-side gate. A group session alone is
 * refused here (401), not just redirected: this used to be five identical
 * copies of the same function body (`app/api/admin/key/route.ts`,
 * `app/api/admin/export/route.ts`, `app/api/admin/usage/route.ts`,
 * `app/api/admin/password/group/route.ts`, `app/api/admin/password/admin/route.ts`),
 * now one.
 */

import "server-only";

import { apiError } from "@/lib/http/errors";
import type { ApiErrorBody } from "@/lib/http/errors";
import type { NextResponse } from "next/server";

import { hasSession } from "./session";

export async function requireAdminSession(): Promise<NextResponse<ApiErrorBody> | null> {
  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }
  if (!(await hasSession("admin"))) {
    return apiError("unauthorised", "You need the admin password for this.");
  }
  return null;
}
