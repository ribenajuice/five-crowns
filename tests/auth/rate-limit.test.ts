import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";

const { hashPassword } = await import("@/lib/auth/password");

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "test-secret-not-a-real-one";
  process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH =
    await hashPassword("the-right-one");
  process.env.FIVE_CROWNS_ADMIN_PASSWORD_HASH =
    await hashPassword("the-admin-one");

  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("checkRateLimit", () => {
  it("counts failures per address and blocks after ten in ten minutes", async () => {
    const { checkRateLimit, recordFailedAttempt, MAX_ATTEMPTS } = await import(
      "@/lib/auth/rate-limit"
    );

    const ip = "203.0.113.10";
    expect((await checkRateLimit(ip, "group")).blocked).toBe(false);

    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      await recordFailedAttempt(ip, "group");
    }

    const state = await checkRateLimit(ip, "group");
    expect(state.failures).toBe(MAX_ATTEMPTS);
    expect(state.blocked).toBe(true);
  });

  it("blocks one address without touching another", async () => {
    const { checkRateLimit, recordFailedAttempt } = await import(
      "@/lib/auth/rate-limit"
    );

    for (let i = 0; i < 10; i += 1) {
      await recordFailedAttempt("203.0.113.20", "group");
    }

    expect((await checkRateLimit("203.0.113.20", "group")).blocked).toBe(true);
    expect((await checkRateLimit("203.0.113.21", "group")).blocked).toBe(false);
  });

  it("keeps group and admin scopes separate, so one cannot lock out the other", async () => {
    const { checkRateLimit, recordFailedAttempt } = await import(
      "@/lib/auth/rate-limit"
    );

    for (let i = 0; i < 10; i += 1) {
      await recordFailedAttempt("203.0.113.30", "admin");
    }

    expect((await checkRateLimit("203.0.113.30", "admin")).blocked).toBe(true);
    expect((await checkRateLimit("203.0.113.30", "group")).blocked).toBe(false);
  });

  it("forgets failures once they fall out of the ten-minute window", async () => {
    const { checkRateLimit, recordFailedAttempt, WINDOW_MINUTES } =
      await import("@/lib/auth/rate-limit");

    const ip = "203.0.113.40";
    const longAgo = Date.now() - (WINDOW_MINUTES + 5) * 60_000;

    for (let i = 0; i < 10; i += 1) {
      await recordFailedAttempt(ip, "group", longAgo);
    }

    expect((await checkRateLimit(ip, "group")).blocked).toBe(false);
    // ...but they are still blocked as at the time they happened.
    expect((await checkRateLimit(ip, "group", longAgo)).blocked).toBe(true);
  });

  it("never stores the raw address", async () => {
    const { recordFailedAttempt } = await import("@/lib/auth/rate-limit");
    const { getDb } = await import("@/lib/db");
    const { loginAttempt } = await import("@/lib/db/schema");

    await recordFailedAttempt("198.51.100.77", "group");

    const rows = await getDb().select().from(loginAttempt);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.ipHash).not.toContain("198.51.100.77");
      expect(row.ipHash).toMatch(/^[0-9a-f]{32}$/);
    }
  });
});

describe("attemptLogin — the happy path", () => {
  it("mints a session for the right password", async () => {
    const { attemptLogin } = await import("@/lib/auth/login");

    const outcome = await attemptLogin("group", "the-right-one", "192.0.2.1");
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.token.split(".")).toHaveLength(2);
    }
  });

  it("checks the group and admin passwords against different hashes", async () => {
    const { attemptLogin } = await import("@/lib/auth/login");

    expect((await attemptLogin("admin", "the-admin-one", "192.0.2.2")).status).toBe(
      "ok",
    );
    // ⚠️ The group password opens nothing at /admin.
    expect((await attemptLogin("admin", "the-right-one", "192.0.2.3")).status).toBe(
      "invalid",
    );
  });
});

describe("attemptLogin — the failure path", () => {
  it("refuses the wrong password without minting anything", async () => {
    const { attemptLogin } = await import("@/lib/auth/login");

    const outcome = await attemptLogin("group", "not-it", "192.0.2.10");
    expect(outcome).toEqual({ status: "invalid" });
  });

  it("⚠️ refuses even the CORRECT password once an address is blocked", async () => {
    // PRD criterion 5. A limiter that lets the right password through is not a
    // limiter, it is a hint.
    const { attemptLogin } = await import("@/lib/auth/login");
    const ip = "192.0.2.50";

    for (let i = 0; i < 10; i += 1) {
      const outcome = await attemptLogin("group", `wrong-${i}`, ip);
      expect(outcome.status).toBe("invalid");
    }

    const blocked = await attemptLogin("group", "the-right-one", ip);
    expect(blocked).toEqual({ status: "rate_limited" });
  });

  it("says the same thing whether the password was right or wrong when blocked", async () => {
    const { attemptLogin } = await import("@/lib/auth/login");
    const ip = "192.0.2.60";

    for (let i = 0; i < 10; i += 1) {
      await attemptLogin("group", "wrong", ip);
    }

    const right = await attemptLogin("group", "the-right-one", ip);
    const wrong = await attemptLogin("group", "still-wrong", ip);
    expect(right).toEqual(wrong);
  });

  it("reports a missing password hash as not-configured, not as a wrong password", async () => {
    const { attemptLogin } = await import("@/lib/auth/login");
    const { invalidateAllParameters } = await import("@/lib/config");

    const saved = process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH;
    delete process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH;
    invalidateAllParameters();

    try {
      expect((await attemptLogin("group", "anything", "192.0.2.70")).status).toBe(
        "not_configured",
      );
    } finally {
      process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH = saved;
      invalidateAllParameters();
    }
  });

  it("logs a malformed password hash instead of passing it off as a wrong password", async () => {
    // The QA finding behind tests/config/local-env.test.ts: a mangled hash
    // refused the right password and nothing in the logs said why.
    const { attemptLogin } = await import("@/lib/auth/login");
    const { invalidateAllParameters } = await import("@/lib/config");

    const saved = process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH;
    // What the retired `scrypt$…` format became after dotenv expansion.
    process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH = "scrypt==";
    invalidateAllParameters();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const outcome = await attemptLogin("group", "the-right-one", "192.0.2.71");
      // Still locked out — a broken hash must never let anybody in.
      expect(outcome.status).toBe("invalid");

      const lines = errors.mock.calls.map((call) => String(call[0]));
      const line = lines.find((l) => l.includes("login.malformed_password_hash"));
      expect(line).toBeDefined();
      expect(line).toContain('"scope":"group"');
      expect(line).not.toContain("scrypt==");
    } finally {
      errors.mockRestore();
      process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH = saved;
      invalidateAllParameters();
    }
  });

  it("does not log a well-formed hash as malformed", async () => {
    const { attemptLogin } = await import("@/lib/auth/login");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await attemptLogin("group", "a-wrong-one", "192.0.2.72");
      const lines = errors.mock.calls.map((call) => String(call[0]));
      expect(lines.some((l) => l.includes("malformed_password_hash"))).toBe(false);
    } finally {
      errors.mockRestore();
    }
  });
});
