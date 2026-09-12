/**
 * GET/POST /api/admin/key.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_COOKIE, GROUP_COOKIE } from "@/lib/auth/cookies";

import { setupTestDb, teardownTestDb } from "../helpers/db";

let verifyResult = true;
vi.mock("@/lib/vision/verify-key", () => ({
  verifyAnthropicApiKey: async () => verifyResult,
}));

const requestCookies = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      requestCookies.has(name) ? { name, value: requestCookies.get(name)! } : undefined,
    set: () => undefined,
  }),
}));

const ORIGIN = "https://five-crowns.test";

function post(body: unknown): Request {
  return new Request(`${ORIGIN}/api/admin/key`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, host: "five-crowns.test" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "admin-key-test-secret";
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  verifyResult = true;
  requestCookies.clear();
  const { invalidateAllParameters, resetLocalParameterOverrides } = await import(
    "@/lib/config"
  );
  invalidateAllParameters();
  resetLocalParameterOverrides();

  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(GROUP_COOKIE, await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  requestCookies.set(ADMIN_COOKIE, await signSession({ s: "admin", v: 0 }, process.env.SESSION_SECRET!));
});

describe("GET /api/admin/key", () => {
  it("401s with no group session", async () => {
    requestCookies.clear();
    const { GET } = await import("@/app/api/admin/key/route");
    expect((await GET()).status).toBe(401);
  });

  it("401s a group session with no admin session — group access grants nothing here", async () => {
    requestCookies.delete(ADMIN_COOKIE);
    const { GET } = await import("@/app/api/admin/key/route");
    expect((await GET()).status).toBe(401);
  });

  it("reports not configured when no key has ever been set", async () => {
    const { GET } = await import("@/app/api/admin/key/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.configured).toBe(false);
    expect(body.works).toBe("unknown");
  });
});

describe("POST /api/admin/key", () => {
  it("401s with no admin session", async () => {
    requestCookies.delete(ADMIN_COOKIE);
    const { POST } = await import("@/app/api/admin/key/route");
    const response = await POST(post({ apiKey: "sk-ant-abcdefghijklmnop-0001" }));
    expect(response.status).toBe(401);
  });

  it("403s a cross-site Origin", async () => {
    const { POST } = await import("@/app/api/admin/key/route");
    const response = await POST(
      new Request(`${ORIGIN}/api/admin/key`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          host: "five-crowns.test",
        },
        body: JSON.stringify({ apiKey: "sk-ant-abcdefghijklmnop-0001" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("400s a key that's too short to be real", async () => {
    const { POST } = await import("@/app/api/admin/key/route");
    const response = await POST(post({ apiKey: "short" }));
    expect(response.status).toBe(400);
  });

  it("⚠️ rejects a key that fails real verification, and never returns the key anywhere", async () => {
    verifyResult = false;
    const { POST } = await import("@/app/api/admin/key/route");
    const response = await POST(post({ apiKey: "sk-ant-a-bad-key-value-0001" }));

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).not.toContain("sk-ant-a-bad-key-value-0001");

    const { GET } = await import("@/app/api/admin/key/route");
    expect((await (await GET()).json()).configured).toBe(false);
  });

  it("saves a key that verifies, and returns status without ever including the key itself", async () => {
    const { POST } = await import("@/app/api/admin/key/route");
    const response = await POST(post({ apiKey: "sk-ant-abcdefghijklmnop-9876" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ configured: true, last4: "9876", setAt: expect.any(String), works: "untried" });

    const raw = JSON.stringify(body);
    expect(raw).not.toContain("sk-ant-abcdefghijklmnop-9876");
  });

  it("leaves the previous working key in place when a new candidate is rejected", async () => {
    const { POST, GET } = await import("@/app/api/admin/key/route");
    await POST(post({ apiKey: "sk-ant-abcdefghijklmnop-1111" }));

    verifyResult = false;
    const rejected = await POST(post({ apiKey: "sk-ant-abcdefghijklmnop-2222" }));
    expect(rejected.status).toBe(400);

    const status = await (await GET()).json();
    expect(status.last4).toBe("1111");
  });
});
