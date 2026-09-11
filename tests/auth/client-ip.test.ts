/**
 * Which address a login is counted against.
 *
 * ⚠️ The security review's HIGH finding: the left-most `X-Forwarded-For` entry
 * is typed by the client, so keying the limiter on it let QA rotate it and get
 * fifteen guesses with no lockout. These pin that only proxy-written values
 * are trusted.
 */

import { describe, expect, it, vi } from "vitest";

import { clientIp, parseViewerAddress } from "@/lib/auth/client-ip";

const OFF_LAMBDA = {} as NodeJS.ProcessEnv;
const ON_LAMBDA = {
  AWS_LAMBDA_FUNCTION_NAME: "web-server",
} as unknown as NodeJS.ProcessEnv;

const h = (entries: Record<string, string>) => new Headers(entries);

describe("parseViewerAddress — AWS's documented `ip:port` format", () => {
  it.each([
    ["198.51.100.10:46532", "198.51.100.10"],
    ["203.0.113.7:443", "203.0.113.7"],
    ["2001:db8::1:443", "2001:db8::1"],
    ["2001:DB8:0:0:8:800:200C:417A:51234", "2001:db8:0:0:8:800:200c:417a"],
    ["[::1]:443", "::1"],
    ["[2001:db8::1]:46532", "2001:db8::1"],
    ["::ffff:192.0.2.1:8080", "::ffff:192.0.2.1"],
    ["192.0.2.44", "192.0.2.44"],
    ["  198.51.100.10:46532  ", "198.51.100.10"],
  ])("%s → %s", (input, expected) => {
    expect(parseViewerAddress(input)).toBe(expected);
  });

  it.each(["", "   ", "not-an-address", "evil.test:443", "1.2.3.4:port", "<script>:1"])(
    "rejects %j rather than bucketing on rubbish",
    (input) => {
      expect(parseViewerAddress(input)).toBeNull();
    },
  );
});

describe("clientIp — only trust what our own proxy wrote", () => {
  it("prefers CloudFront-Viewer-Address over any X-Forwarded-For", () => {
    const headers = h({
      "cloudfront-viewer-address": "198.51.100.10:46532",
      "x-forwarded-for": "6.6.6.6, 203.0.113.1",
    });
    expect(clientIp(headers, OFF_LAMBDA)).toBe("198.51.100.10");
    expect(clientIp(headers, ON_LAMBDA)).toBe("198.51.100.10");
  });

  it("⚠️ a rotating left-most X-Forwarded-For entry always lands in the same bucket", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 15; i += 1) {
      seen.add(
        clientIp(h({ "x-forwarded-for": `10.0.0.${i}, 198.51.100.99` }), OFF_LAMBDA),
      );
    }
    expect([...seen]).toEqual(["198.51.100.99"]);
  });

  it("⚠️ a prepended fake entry does not change the bucket", () => {
    const real = clientIp(h({ "x-forwarded-for": "198.51.100.5" }), OFF_LAMBDA);
    const spoofed = clientIp(
      h({ "x-forwarded-for": "1.1.1.1, 198.51.100.5" }),
      OFF_LAMBDA,
    );
    expect(spoofed).toBe(real);
  });

  it("ignores empty entries at the end of the list", () => {
    expect(clientIp(h({ "x-forwarded-for": "198.51.100.5, , " }), OFF_LAMBDA)).toBe(
      "198.51.100.5",
    );
  });

  it("⚠️ on Lambda, never trusts X-Forwarded-For — the function URL keeps only the client's entry", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const a = clientIp(h({ "x-forwarded-for": "10.0.0.1" }), ON_LAMBDA);
      const b = clientIp(h({ "x-forwarded-for": "10.0.0.2" }), ON_LAMBDA);
      expect(a).toBe("unknown");
      expect(b).toBe("unknown");
    } finally {
      warn.mockRestore();
    }
  });

  it("does not consult X-Real-IP, which nothing in front of the app sets", () => {
    expect(clientIp(h({ "x-real-ip": "10.9.9.9" }), OFF_LAMBDA)).toBe("unknown");
  });

  it("falls back to one shared bucket with no address at all", () => {
    expect(clientIp(h({}), OFF_LAMBDA)).toBe("unknown");
  });

  it("falls through a malformed viewer address to the next source", () => {
    expect(
      clientIp(
        h({ "cloudfront-viewer-address": "garbage", "x-forwarded-for": "198.51.100.8" }),
        OFF_LAMBDA,
      ),
    ).toBe("198.51.100.8");
  });
});
