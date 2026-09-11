/**
 * Security headers on every route (security review, LOW).
 */

import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

async function headersForEveryRoute(): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const everything = rules.find((rule) => rule.source === "/:path*");
  expect(everything, "a rule covering every path").toBeDefined();
  return Object.fromEntries(
    everything!.headers.map((header) => [header.key.toLowerCase(), header.value]),
  );
}

describe("next.config headers()", () => {
  it("sets HSTS, nosniff, Referrer-Policy and anti-framing on every route", async () => {
    const headers = await headersForEveryRoute();

    expect(headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("same-origin");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  it("⚠️ ships no CSP directive that would block Next's inline scripts or styles", async () => {
    const csp = (await headersForEveryRoute())["content-security-policy"]!;
    for (const directive of ["default-src", "script-src", "style-src", "connect-src", "img-src"]) {
      expect(csp, directive).not.toContain(directive);
    }
  });

  it("⚠️ Permissions-Policy does not block the camera stage 2 photographs with", async () => {
    const policy = (await headersForEveryRoute())["permissions-policy"]!;
    expect(policy).toBeTruthy();
    expect(policy).not.toContain("camera");
  });
});
