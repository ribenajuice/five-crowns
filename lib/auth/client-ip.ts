/**
 * The caller's address, for rate limiting only.
 *
 * ⚠️ The raw address is never stored. It is HMACed before it goes near the
 * database — there is no reason to keep a list of people's IPs in a file the
 * founder can download from the admin panel.
 */

/**
 * Behind CloudFront, `x-forwarded-for` is a list and the **left-most** entry is
 * the viewer. CloudFront appends the real viewer address itself, so the value
 * cannot be spoofed past it — but a client can still prepend junk, which is why
 * an unroutable-looking first entry is not treated as special: it only ever
 * buckets *that* caller's own attempts.
 */
export function clientIp(headers: Headers): string {
  const cloudfront = headers.get("cloudfront-viewer-address");
  if (cloudfront) {
    // "1.2.3.4:53412" or "[2001:db8::1]:53412"
    const bracketed = cloudfront.match(/^\[(.+)\]:\d+$/);
    if (bracketed?.[1]) return bracketed[1];
    const lastColon = cloudfront.lastIndexOf(":");
    if (lastColon > 0) return cloudfront.slice(0, lastColon);
    return cloudfront;
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = headers.get("x-real-ip");
  if (real) return real.trim();

  // No address at all: bucket every such caller together rather than letting
  // them all bypass the limiter with a unique key each.
  return "unknown";
}
