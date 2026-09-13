/**
 * POST /api/admin/password/group and POST /api/admin/password/admin.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_COOKIE, GROUP_COOKIE } from "@/lib/auth/cookies";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

import { setupTestDb, teardownTestDb } from "../helpers/db";

const requestCookies = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      requestCookies.has(name) ? { name, value: requestCookies.get(name)! } : undefined,
    set: () => undefined,
  }),
}));

/**
 * Lets a test simulate the *second* write in the epoch-then-hash sequence
 * failing (a transient SSM error, throttling) without touching the first.
 * `bumpSessionEpoch`'s own internal call to `putParameter` is untouched —
 * ESM module scoping means it always resolves to the real implementation
 * defined alongside it, never this mocked export — so only the route's own
 * explicit `putParameter(...hash...)` call is affected.
 */
let failParameterWrite: string | null = null;
vi.mock("@/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/config")>();
  return {
    ...actual,
    putParameter: async (
      name: Parameters<typeof actual.putParameter>[0],
      value: string,
      options?: { secure?: boolean },
    ) => {
      if (failParameterWrite && name === failParameterWrite) {
        throw new Error("simulated SSM failure");
      }
      return actual.putParameter(name, value, options);
    },
  };
});

const ORIGIN = "https://five-crowns.test";
const ADMIN_PASSWORD = "the-current-admin-password";
const GROUP_PASSWORD = "the-current-group-password";

let addressCounter = 0;
/** A unique address per test, so one test's rate-limit failures never bleed into another's. */
function nextAddress(): string {
  addressCounter += 1;
  return `203.0.113.${addressCounter}`;
}

function post(path: string, body: unknown, address: string = nextAddress()): Request {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      host: "five-crowns.test",
      "x-forwarded-for": address,
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "admin-password-test-secret";
  process.env.FIVE_CROWNS_ADMIN_PASSWORD_HASH = await hashPassword(ADMIN_PASSWORD);
  process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH = await hashPassword(GROUP_PASSWORD);
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  requestCookies.clear();
  failParameterWrite = null;
  const { invalidateAllParameters, resetLocalParameterOverrides } = await import(
    "@/lib/config"
  );
  invalidateAllParameters();
  resetLocalParameterOverrides();

  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(
    GROUP_COOKIE,
    await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!),
  );
  requestCookies.set(
    ADMIN_COOKIE,
    await signSession({ s: "admin", v: 0 }, process.env.SESSION_SECRET!),
  );
});

describe("POST /api/admin/password/group", () => {
  it("401s with no admin session — a group-only session is refused, not redirected (criterion 87)", async () => {
    requestCookies.delete(ADMIN_COOKIE);
    const { POST } = await import("@/app/api/admin/password/group/route");
    const response = await POST(
      post("/api/admin/password/group", { password: "a-brand-new-password-1" }),
    );
    expect(response.status).toBe(401);
  });

  it("401s with no group session at all", async () => {
    requestCookies.clear();
    const { POST } = await import("@/app/api/admin/password/group/route");
    const response = await POST(
      post("/api/admin/password/group", { password: "a-brand-new-password-1" }),
    );
    expect(response.status).toBe(401);
  });

  it("400s a password shorter than 12 characters", async () => {
    const { POST } = await import("@/app/api/admin/password/group/route");
    const response = await POST(post("/api/admin/password/group", { password: "short11chr" }));
    expect(response.status).toBe(400);
  });

  it("403s a cross-site Origin", async () => {
    const { POST } = await import("@/app/api/admin/password/group/route");
    const response = await POST(
      new Request(`${ORIGIN}/api/admin/password/group`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          host: "five-crowns.test",
        },
        body: JSON.stringify({ password: "a-brand-new-password-1" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("⚠️ replaces the hash and bumps only the group epoch — no current password required", async () => {
    const { POST } = await import("@/app/api/admin/password/group/route");
    const newPassword = "a-brand-new-group-password";
    const response = await POST(post("/api/admin/password/group", { password: newPassword }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
    expect(JSON.stringify(body)).not.toContain(newPassword);

    const { sessionEpoch, passwordHash } = await import("@/lib/config");
    expect(await sessionEpoch("group")).toBe(1);
    expect(await sessionEpoch("admin")).toBe(0); // unaffected — the asymmetry note

    expect(await verifyPassword(newPassword, await passwordHash("group"))).toBe(true);
    expect(await verifyPassword(GROUP_PASSWORD, await passwordHash("group"))).toBe(false);
  });

  it("⚠️ the epoch is bumped before the hash is written — if the hash write then fails, every session is already revoked and the old password still works", async () => {
    const { PARAM } = await import("@/lib/config/parameters");
    failParameterWrite = PARAM.groupPasswordHash;

    const { POST } = await import("@/app/api/admin/password/group/route");
    const newPassword = "a-brand-new-group-password";
    const response = await POST(post("/api/admin/password/group", { password: newPassword }));

    expect(response.status).toBe(500);

    const { sessionEpoch, passwordHash } = await import("@/lib/config");
    // The epoch bump — the first write in the new order — went through.
    expect(await sessionEpoch("group")).toBe(1);
    // But the hash write failed, so the *old* password still works, and the
    // attempted new one does not — recoverable by simply retrying.
    expect(await verifyPassword(GROUP_PASSWORD, await passwordHash("group"))).toBe(true);
    expect(await verifyPassword(newPassword, await passwordHash("group"))).toBe(false);
  });
});

describe("POST /api/admin/password/admin", () => {
  const body = (overrides: Partial<Record<string, string>> = {}) => ({
    currentPassword: ADMIN_PASSWORD,
    newPassword: "a-brand-new-admin-password",
    confirmPassword: "a-brand-new-admin-password",
    ...overrides,
  });

  it("401s with no admin session", async () => {
    requestCookies.delete(ADMIN_COOKIE);
    const { POST } = await import("@/app/api/admin/password/admin/route");
    const response = await POST(post("/api/admin/password/admin", body()));
    expect(response.status).toBe(401);
  });

  it("400s a mismatched confirmation, server-side", async () => {
    const { POST } = await import("@/app/api/admin/password/admin/route");
    const response = await POST(
      post(
        "/api/admin/password/admin",
        body({ confirmPassword: "a-completely-different-password" }),
      ),
    );
    expect(response.status).toBe(400);
  });

  it("400s a new password shorter than 12 characters, even though it's typed twice identically", async () => {
    const { POST } = await import("@/app/api/admin/password/admin/route");
    const response = await POST(
      post(
        "/api/admin/password/admin",
        body({ newPassword: "short11chr", confirmPassword: "short11chr" }),
      ),
    );
    expect(response.status).toBe(400);
  });

  it("⚠️ a wrong current password is refused, changes nothing, and the old password still works", async () => {
    const { POST } = await import("@/app/api/admin/password/admin/route");
    const response = await POST(
      post("/api/admin/password/admin", body({ currentPassword: "not-the-current-one" })),
    );

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("invalid_credentials");

    const { passwordHash, sessionEpoch } = await import("@/lib/config");
    expect(await verifyPassword(ADMIN_PASSWORD, await passwordHash("admin"))).toBe(true);
    expect(await sessionEpoch("admin")).toBe(0);
  });

  it("⚠️ the correct current password succeeds, replaces the hash and bumps only the admin epoch", async () => {
    const { POST } = await import("@/app/api/admin/password/admin/route");
    const newPassword = "a-brand-new-admin-password";
    const response = await POST(post("/api/admin/password/admin", body()));

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ ok: true });
    const raw = JSON.stringify(responseBody);
    expect(raw).not.toContain(newPassword);
    expect(raw).not.toContain(ADMIN_PASSWORD);

    const { passwordHash, sessionEpoch } = await import("@/lib/config");
    expect(await verifyPassword(newPassword, await passwordHash("admin"))).toBe(true);
    expect(await sessionEpoch("admin")).toBe(1);
    expect(await sessionEpoch("group")).toBe(0); // unaffected
  });

  it("⚠️ ten wrong current passwords then even a correct one are refused — same limiter and scope as admin login (criterion 95)", async () => {
    const { POST: changePassword } = await import("@/app/api/admin/password/admin/route");
    const { POST: adminLogin } = await import("@/app/api/admin/login/route");
    const address = nextAddress();

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await changePassword(
        post(
          "/api/admin/password/admin",
          body({ currentPassword: `wrong-${attempt}` }),
          address,
        ),
      );
      expect(response.status, `attempt ${attempt}`).toBe(401);
    }

    const blockedChange = await changePassword(
      post("/api/admin/password/admin", body(), address),
    );
    expect(blockedChange.status).toBe(429);

    // ⚠️ The SAME bucket: a correct admin *login* from this address is blocked too.
    const blockedLogin = await adminLogin(
      post("/api/admin/login", { password: ADMIN_PASSWORD }, address),
    );
    expect(blockedLogin.status).toBe(429);

    const { passwordHash } = await import("@/lib/config");
    expect(await verifyPassword(ADMIN_PASSWORD, await passwordHash("admin"))).toBe(true);
  });

  it("⚠️ the epoch is bumped before the hash is written — if the hash write then fails, every admin session is already revoked and the old password still works", async () => {
    const { PARAM } = await import("@/lib/config/parameters");
    failParameterWrite = PARAM.adminPasswordHash;

    const { POST } = await import("@/app/api/admin/password/admin/route");
    const newPassword = "a-brand-new-admin-password";
    const response = await POST(
      post(
        "/api/admin/password/admin",
        body({ newPassword, confirmPassword: newPassword }),
      ),
    );

    expect(response.status).toBe(500);

    const { sessionEpoch, passwordHash } = await import("@/lib/config");
    // The epoch bump — the first write in the new order — went through.
    expect(await sessionEpoch("admin")).toBe(1);
    // But the hash write failed, so the *old* password still works, and the
    // attempted new one does not — recoverable by simply retrying.
    expect(await verifyPassword(ADMIN_PASSWORD, await passwordHash("admin"))).toBe(true);
    expect(await verifyPassword(newPassword, await passwordHash("admin"))).toBe(false);
  });

  it("doesn't spend a rate-limit attempt on a malformed body — only wrong current-password guesses count", async () => {
    const { POST } = await import("@/app/api/admin/password/admin/route");
    const address = nextAddress();

    for (let i = 0; i < 15; i += 1) {
      const response = await POST(
        post(
          "/api/admin/password/admin",
          body({ newPassword: "short", confirmPassword: "short" }),
          address,
        ),
      );
      expect(response.status).toBe(400);
    }

    const { checkRateLimit } = await import("@/lib/auth/rate-limit");
    expect((await checkRateLimit(address, "admin")).failures).toBe(0);
  });
});
