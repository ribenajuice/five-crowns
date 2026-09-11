/**
 * The caller's address, for rate limiting only.
 *
 * ⚠️ The raw address is never stored. It is HMACed before it goes near the
 * database — there is no reason to keep a list of people's IPs in a file the
 * founder can download from the admin panel.
 */

import { log } from "@/lib/log";

/**
 * ⚠️ **Only trust what our own proxy wrote.** Everything else in a request is
 * typed by the caller, and a rate limiter keyed on caller-typed data is a
 * rate limiter the caller can reset at will (a security review finding: rotating
 * the left-most `X-Forwarded-For` entry gave a fresh bucket per guess).
 *
 * In order:
 *  1. `CloudFront-Viewer-Address` — set by CloudFront itself from the TCP
 *     connection, `ip:port`. ⚠️ Only trustworthy when the distribution's origin
 *     request policy adds it, because then CloudFront overwrites any value a
 *     client sent; see `sst.config.ts`.
 *  2. The **right-most** `X-Forwarded-For` entry — the one appended by the last
 *     proxy in front of us. Everything to its left arrived from the client and
 *     may be invented. Never the left-most. ⚠️ **Not on Lambda**: a Lambda
 *     function URL truncates `X-Forwarded-For` to its *left-most* entry, which
 *     strips the one CloudFront appended and leaves only what the client typed.
 *     So on Lambda this step is skipped outright; it exists for local
 *     development and any non-Lambda host.
 *  3. `"unknown"` — one shared bucket. That fails safe: a caller who strips every
 *     header shares a limit with every other such caller rather than getting a
 *     unique key each.
 *
 * `X-Real-IP` is deliberately not consulted: nothing in front of the app sets
 * it, so behind CloudFront it could only ever be client-supplied.
 */
export function clientIp(
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const viewer = headers.get("cloudfront-viewer-address");
  if (viewer) {
    const parsed = parseViewerAddress(viewer);
    if (parsed) return parsed;
  }

  if (env.AWS_LAMBDA_FUNCTION_NAME) {
    // Behind CloudFront this header is always added, so its absence on Lambda
    // is a distribution misconfiguration. Everyone shares one bucket until it
    // is fixed — a nuisance, never a bypass.
    log.warn("client_ip.no_viewer_address", {
      hint: "Add CloudFront-Viewer-Address to the origin request policy.",
    });
    return "unknown";
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const last = entries.at(-1);
    if (last) return last;
  }

  return "unknown";
}

/**
 * Strip the port from a `CloudFront-Viewer-Address` value.
 *
 * AWS documents the value as the viewer's address, a colon, then the source
 * port: `198.51.100.10:46532`. For IPv6 that means an unbracketed
 * `2001:db8::1:46532`, where the **last** colon is the port separator. The
 * bracketed `[2001:db8::1]:46532` form is accepted too in case it ever appears.
 *
 * Returns null for a value that is not recognisably an address, so the caller
 * falls through to the next source rather than bucketing on rubbish.
 */
export function parseViewerAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const bracketed = trimmed.match(/^\[([0-9a-fA-F:.]+)\](?::\d{1,5})?$/);
  if (bracketed?.[1]) return bracketed[1].toLowerCase();

  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon === -1) {
    // No port at all: a bare IPv4 address.
    return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(trimmed) ? trimmed : null;
  }

  const address = trimmed.slice(0, lastColon);
  const port = trimmed.slice(lastColon + 1);
  if (!/^\d{1,5}$/.test(port) || !address) return null;

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return address;
  // IPv6 (hex groups, with an optional embedded IPv4 tail).
  if (address.includes(":") && /^[0-9a-fA-F:.]+$/.test(address)) {
    return address.toLowerCase();
  }
  return null;
}
