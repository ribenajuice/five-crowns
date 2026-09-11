/**
 * The cross-site guard for the password posts.
 *
 * ⚠️ Why it exists: without it, any web page a household member visits could
 * submit a `text/plain` form to `/api/login` ten times and lock the whole
 * household out for ten minutes — no JavaScript permission needed, because a
 * plain HTML form is exempt from CORS. Two checks close it:
 *
 *  1. **`Content-Type: application/json` only** (415 otherwise). A cross-site
 *     page cannot send that without a CORS preflight, and the preflight is
 *     refused, so the post never happens.
 *  2. **`Origin`, when present, must be this site** (403 otherwise). Defence in
 *     depth for browsers and edge cases the first check does not cover.
 *
 * "This site" is whatever host the app actually sees: behind CloudFront the
 * `Host` header is the Lambda's own address and the public domain arrives as
 * `X-Forwarded-Host`, which SST's viewer-request function sets. A cross-site
 * browser cannot forge either, so matching any of them is safe.
 *
 * Our own `PasswordGate` posts JSON with fetch from the same origin, so it
 * passes both.
 */

import { log } from "@/lib/log";

import { apiError, type ApiErrorBody } from "./errors";
import type { NextResponse } from "next/server";

function isJson(contentType: string | null): boolean {
  if (!contentType) return false;
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

function hostsWeAnswerTo(request: Request): Set<string> {
  const hosts = new Set<string>();
  const forwarded = request.headers.get("x-forwarded-host");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  if (firstForwarded) hosts.add(firstForwarded.toLowerCase());

  const host = request.headers.get("host")?.trim();
  if (host) hosts.add(host.toLowerCase());

  try {
    hosts.add(new URL(request.url).host.toLowerCase());
  } catch {
    // A relative or malformed URL adds nothing.
  }
  return hosts;
}

function originHost(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.host.toLowerCase();
  } catch {
    // Includes the literal "null" a sandboxed or privacy-stripped page sends.
    return null;
  }
}

/**
 * Returns an error response to send back, or null when the request may
 * proceed. Call it before reading the body and before anything is counted.
 */
export function rejectCrossSitePost(
  request: Request,
  event: string,
): NextResponse<ApiErrorBody> | null {
  if (!isJson(request.headers.get("content-type"))) {
    log.warn(`${event}.unsupported_media_type`, {
      contentType: request.headers.get("content-type")?.slice(0, 100) ?? null,
    });
    return apiError("unsupported_media_type", "That request didn't make sense.");
  }

  const origin = request.headers.get("origin");
  if (origin !== null) {
    const fromHost = originHost(origin);
    if (fromHost === null || !hostsWeAnswerTo(request).has(fromHost)) {
      log.warn(`${event}.cross_origin`, { origin: origin.slice(0, 200) });
      return apiError("forbidden", "That request didn't come from this site.");
    }
  }

  return null;
}
