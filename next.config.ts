import type { NextConfig } from "next";

/**
 * Security headers on every response.
 *
 * ⚠️ The Content-Security-Policy is deliberately narrow. Next's App Router
 * inlines bootstrap scripts, so a `script-src` without per-request nonces would
 * break every page; none of the directives below govern scripts or styles.
 * `frame-ancestors 'none'` (with `X-Frame-Options: DENY` for older browsers)
 * stops the app being framed for clickjacking.
 *
 * ⚠️ `Permissions-Policy` blocks only what the app will never use. It does not
 * mention `camera`: stage 2 photographs the sheet through
 * `<input type="file" capture>`, which needs no camera permission, and leaving
 * `camera` at the browser default keeps any later in-page capture open too.
 */
export const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The app is served from Lambda behind CloudFront (docs/ARCHITECTURE.md § Stack).
  // Poweredby header removed so we advertise nothing about the runtime.
  poweredByHeader: false,
  serverExternalPackages: ["@libsql/client", "libsql"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
