import { describe, expect, it, vi } from "vitest";

import { clientIp } from "@/lib/auth/client-ip";
import {
  ADMIN_COOKIE,
  cookieAttributes,
  clearedCookieAttributes,
  cookieName,
  GROUP_COOKIE,
} from "@/lib/auth/cookies";

describe("cookieAttributes", () => {
  it("is HttpOnly, SameSite=Lax and lasts 400 days", () => {
    const attributes = cookieAttributes("group", { secure: true });
    expect(attributes).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 400 * 24 * 60 * 60,
    });
  });

  it("uses Path=/ for both cookies — Path was never the security boundary", () => {
    expect(cookieAttributes("group", { secure: true }).path).toBe("/");
    expect(cookieAttributes("admin", { secure: true }).path).toBe("/");
  });

  /**
   * ⚠️ Regression test for a real, live-reproduced Stage 3 bug: the admin
   * cookie used to be scoped to `Path=/admin`, which — per RFC 6265's
   * path-match algorithm — a request path matches a cookie's `Path` only if
   * it equals it, or the cookie path is a "/"-terminated or "/"-followed
   * prefix of it — meant `/api/admin/key` and `/api/admin/login` (both
   * start with "/api", not "/admin") **never received the cookie in a real
   * browser**. QA confirmed this against the running dev server: `/admin`
   * (the page) saw the session and rendered the panel; the panel's own
   * `fetch("/api/admin/key")` then 401'd because the browser withheld the
   * cookie, making every save or status check unreachable. Fixed by giving
   * both cookies `Path=/`, same as the group cookie always had — this test
   * pins that every admin-gated request path stays reachable.
   */
  it("keeps every admin-gated request path reachable by the admin cookie", () => {
    function rfc6265PathMatches(cookiePath: string, requestPath: string): boolean {
      if (requestPath === cookiePath) return true;
      if (!requestPath.startsWith(cookiePath)) return false;
      if (cookiePath.endsWith("/")) return true;
      return requestPath[cookiePath.length] === "/";
    }

    const adminPath = cookieAttributes("admin").path;
    const adminGatedRequestPaths = ["/admin", "/api/admin/key", "/api/admin/login"];

    const unreachable = adminGatedRequestPaths.filter(
      (requestPath) => !rfc6265PathMatches(adminPath, requestPath),
    );

    expect(unreachable).toEqual([]);
  });

  it("uses two different cookie names — the gates are independent", () => {
    expect(cookieName("group")).toBe(GROUP_COOKIE);
    expect(cookieName("admin")).toBe(ADMIN_COOKIE);
    expect(GROUP_COOKIE).not.toBe(ADMIN_COOKIE);
  });

  // Every assertion above passes `{ secure: true }` explicitly, so none of them
  // tests the default — and the default is the one that ships.
  it("⚠️ is Secure by default in production, without anyone passing a flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(cookieAttributes("group").secure).toBe(true);
      expect(cookieAttributes("admin").secure).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("drops Secure off production only, so plain-HTTP localhost can still hold a session", () => {
    vi.stubEnv("NODE_ENV", "development");
    try {
      expect(cookieAttributes("group").secure).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("clears a cookie by zeroing its lifetime, keeping the same path", () => {
    expect(clearedCookieAttributes("group").maxAge).toBe(0);
    expect(clearedCookieAttributes("group").path).toBe("/");
    expect(clearedCookieAttributes("admin").path).toBe("/");
  });
});

describe("clientIp", () => {
  it("prefers CloudFront's viewer address and strips the port", () => {
    expect(
      clientIp(new Headers({ "cloudfront-viewer-address": "203.0.113.5:41234" })),
    ).toBe("203.0.113.5");
  });

  it("handles an IPv6 viewer address", () => {
    expect(
      clientIp(
        new Headers({ "cloudfront-viewer-address": "[2001:db8::1]:41234" }),
      ),
    ).toBe("2001:db8::1");
  });

  it("⚠️ takes the RIGHT-most x-forwarded-for entry — the left is client-typed", () => {
    // Security review, HIGH: the left-most entry let a caller pick a fresh
    // rate-limit bucket per guess. Full coverage in client-ip.test.ts.
    expect(
      clientIp(
        new Headers({ "x-forwarded-for": "203.0.113.9, 70.41.3.18" }),
        {} as NodeJS.ProcessEnv,
      ),
    ).toBe("70.41.3.18");
  });

  it("buckets callers with no address together rather than letting them all through", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
