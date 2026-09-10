/**
 * The front door, tested as a front door.
 *
 * ⚠️ **PRD criterion 1** — "Requesting `/`, `/games`, any game URL, any
 * `/review/{id}` or `/admin` with no session redirects to `/login`, and no
 * fragment of the record appears in the returned HTML" — was, before this file,
 * covered by nothing but a manual smoke test. It is the single criterion that
 * makes the archive private, so it gets an automated test.
 *
 * These drive the real exported `middleware()` and the real exported `config`,
 * through `NextRequest`, so they survive a refactor of anything inside.
 */

import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

import { middleware, config } from "@/middleware";
import { GROUP_COOKIE, ADMIN_COOKIE } from "@/lib/auth/cookies";
import { signSession } from "@/lib/auth/token";

const SECRET = "middleware-test-secret-not-a-real-one";
const ORIGIN = "https://fivecrowns.example.test";

let groupToken: string;
let adminToken: string;
let expiredToken: string;

beforeAll(async () => {
  process.env.SESSION_SECRET = SECRET;
  groupToken = await signSession({ s: "group", v: 0 }, SECRET);
  adminToken = await signSession({ s: "admin", v: 0 }, SECRET);
  expiredToken = await signSession({ s: "group", v: 0 }, SECRET, -60);
});

function request(
  path: string,
  options: { method?: string; cookie?: [string, string] } = {},
): NextRequest {
  const req = new NextRequest(new URL(path, ORIGIN), {
    method: options.method ?? "GET",
  });
  if (options.cookie) req.cookies.set(options.cookie[0], options.cookie[1]);
  return req;
}

/** Every path the criterion names, plus a route that does not exist yet. */
const PROTECTED_PATHS = [
  "/",
  "/games",
  "/games/2026-09-10-abc123",
  "/review/draft-01H",
  "/admin",
  "/records",
  "/a-route-nobody-has-written-yet",
];

describe("middleware — criterion 1: nothing is reachable without a session", () => {
  it.each(PROTECTED_PATHS)("redirects %s to /login", async (path) => {
    const response = await middleware(request(path));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/login`);
  });

  it.each(PROTECTED_PATHS)(
    "returns no body at all for %s, so no fragment of the record can be in it",
    async (path) => {
      const response = await middleware(request(path));
      // A redirect is issued before any page is rendered. Proving the body is
      // empty is how "no fragment of the record appears" is made true rather
      // than merely believed.
      expect(await response.text()).toBe("");
    },
  );

  it("sends an API caller a 401 it can act on rather than a redirect", async () => {
    const response = await middleware(request("/api/anything"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthorised", message: "You need the password for this." },
    });
  });

  it("⚠️ never puts a ?next= parameter on the redirect — that is an open-redirect hole", async () => {
    const response = await middleware(request("/games?next=https://evil.test"));
    const location = new URL(response.headers.get("location") ?? "");

    expect(location.pathname).toBe("/login");
    expect(location.search).toBe("");
  });
});

describe("middleware — the allowlist, and only the allowlist", () => {
  it("lets /login through with no session", async () => {
    const response = await middleware(request("/login"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets POST /api/login through with no session", async () => {
    const response = await middleware(
      request("/api/login", { method: "POST" }),
    );
    expect(response.status).toBe(200);
  });

  it("⚠️ does NOT let GET /api/login through — the allowlist is method-specific", async () => {
    const response = await middleware(request("/api/login", { method: "GET" }));
    expect(response.status).toBe(401);
  });

  it.each(["PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])(
    "does not let %s /api/login through",
    async (method) => {
      const response = await middleware(request("/api/login", { method }));
      expect(response.status).toBe(401);
    },
  );

  it("⚠️ does not allowlist POST /api/admin/login — the second gate is behind the first", async () => {
    const response = await middleware(
      request("/api/admin/login", { method: "POST" }),
    );
    expect(response.status).toBe(401);
  });

  it("does not treat a path that merely starts with /login as public", async () => {
    for (const path of ["/login-as-admin", "/login/extra", "/loginx"]) {
      const response = await middleware(request(path));
      expect(response.status, path).toBe(307);
    }
  });
});

describe("middleware — what it accepts and what it refuses", () => {
  it("admits a valid group session", async () => {
    const response = await middleware(
      request("/games", { cookie: [GROUP_COOKIE, groupToken] }),
    );
    expect(response.status).toBe(200);
  });

  it("admits a returning device — the cookie is all that is needed (criterion 3)", async () => {
    // Signed 399 days ago, still inside the 400-day window: "quit the browser,
    // come back tomorrow" reduced to what is actually checked on the wire.
    const old = await signSession({ s: "group", v: 0 }, SECRET, 400 * 86_400);
    const response = await middleware(
      request("/games", { cookie: [GROUP_COOKIE, old] }),
    );
    expect(response.status).toBe(200);
  });

  it("⚠️ refuses an ADMIN cookie replayed as a group cookie", async () => {
    const response = await middleware(
      request("/games", { cookie: [GROUP_COOKIE, adminToken] }),
    );
    expect(response.status).toBe(307);
  });

  it("refuses an expired token", async () => {
    const response = await middleware(
      request("/games", { cookie: [GROUP_COOKIE, expiredToken] }),
    );
    expect(response.status).toBe(307);
  });

  it("refuses a token signed with somebody else's secret", async () => {
    const forged = await signSession({ s: "group", v: 0 }, "attacker-secret");
    const response = await middleware(
      request("/games", { cookie: [GROUP_COOKIE, forged] }),
    );
    expect(response.status).toBe(307);
  });

  it.each([
    ["a tampered signature", (t: string) => `${t.split(".")[0]}.AAAA`],
    ["a missing signature", (t: string) => t.split(".")[0]!],
    ["an empty signature", (t: string) => `${t.split(".")[0]}.`],
    ["a tampered body", (t: string) => `X${t.slice(1)}`],
    ["rubbish", () => "not-a-token"],
    ["an empty string", () => ""],
    ["a bare dot", () => "."],
    ["something enormous", () => "a".repeat(100_000)],
  ])("refuses %s without throwing", async (_name, mangle) => {
    const response = await middleware(
      request("/games", { cookie: [GROUP_COOKIE, mangle(groupToken)] }),
    );
    expect(response.status).toBe(307);
  });

  it("⚠️ a valid group session does not open /admin by itself — it only reaches the prompt", async () => {
    // Middleware admits it; `/admin` then asks for the second password. The
    // point of this test is that holding a group cookie AND an admin-shaped
    // cookie signed for the wrong scope still gets nothing.
    const response = await middleware(
      request("/admin", { cookie: [GROUP_COOKIE, groupToken] }),
    );
    expect(response.status).toBe(200);

    const replay = request("/admin", { cookie: [GROUP_COOKIE, groupToken] });
    replay.cookies.set(ADMIN_COOKIE, groupToken);
    expect((await middleware(replay)).status).toBe(200);
  });

  it("refuses everything when no session secret is configured", async () => {
    const saved = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    try {
      const response = await middleware(
        request("/games", { cookie: [GROUP_COOKIE, groupToken] }),
      );
      expect(response.status).toBe(307);
    } finally {
      process.env.SESSION_SECRET = saved;
    }
  });
});

describe("middleware — the matcher decides what is even seen", () => {
  const matcher = new RegExp(
    `^${(config.matcher as string[])[0]!.replace(/^\/\(/, "(")}$`,
  );

  const matches = (path: string) =>
    (config.matcher as string[]).some((pattern) =>
      new RegExp(`^${pattern}$`).test(path),
    );

  it("covers a route nobody has written yet — private the moment it exists", () => {
    expect(matches("/games")).toBe(true);
    expect(matches("/some/future/route")).toBe(true);
    expect(matches("/api/whatever")).toBe(true);
    expect(matcher).toBeInstanceOf(RegExp);
  });

  it("excludes Next's own static output", () => {
    expect(matches("/_next/static/chunks/main.js")).toBe(false);
    expect(matches("/favicon.ico")).toBe(false);
  });

  it("⚠️ excludes ANY path ending in an image extension, session or not", () => {
    // Documented here because it is a live hazard for stage 2: photos are
    // served by presigned S3 URL precisely because a route ending `.jpg` would
    // never reach this middleware. If a `.jpg` route is ever added to the app,
    // it is public.
    expect(matches("/games/anything.jpg")).toBe(false);
    expect(matches("/review/draft.png")).toBe(false);
    expect(matches("/admin/panel.svg")).toBe(false);
  });
});
