import { describe, expect, it } from "vitest";

import {
  SESSION_MAX_AGE_SECONDS,
  signSession,
  verifySession,
} from "@/lib/auth/token";

const SECRET = "test-secret-not-a-real-one";

describe("signSession / verifySession", () => {
  it("accepts a token it just minted", async () => {
    const token = await signSession({ s: "group", v: 0 }, SECRET);
    const result = await verifySession(token, SECRET, {
      scope: "group",
      epoch: 0,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.s).toBe("group");
      expect(result.payload.v).toBe(0);
    }
  });

  it("keeps the device logged in for 400 days — the browser cap", async () => {
    const token = await signSession({ s: "group", v: 0 }, SECRET);
    const result = await verifySession(token, SECRET, { scope: "group" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.exp - result.payload.iat).toBe(
        SESSION_MAX_AGE_SECONDS,
      );
      expect(SESSION_MAX_AGE_SECONDS).toBe(400 * 24 * 60 * 60);
    }
  });

  it("is stateless: nothing but the secret is needed to verify it", async () => {
    const token = await signSession({ s: "group", v: 3 }, SECRET);
    // No session table, no lookup, no database.
    expect(token.split(".")).toHaveLength(2);
  });
});

describe("verifySession — what it rejects", () => {
  it("rejects a token signed with a different secret", async () => {
    const token = await signSession({ s: "group", v: 0 }, SECRET);
    const result = await verifySession(token, "someone-elses-secret", {
      scope: "group",
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a tampered payload", async () => {
    const token = await signSession({ s: "group", v: 0 }, SECRET);
    const [body, signature] = token.split(".") as [string, string];

    // Re-encode the payload with admin scope, keeping the old signature.
    const forged = btoa(JSON.stringify({ s: "admin", v: 0, iat: 1, exp: 2 ** 31 }))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");

    const result = await verifySession(`${forged}.${signature}`, SECRET, {
      scope: "admin",
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
    expect(body).not.toBe(forged);
  });

  it("rejects an expired token", async () => {
    const token = await signSession({ s: "group", v: 0 }, SECRET, -1);
    const result = await verifySession(token, SECRET, { scope: "group" });
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("⚠️ refuses a group cookie at the admin gate", async () => {
    // PRD criterion 4: holding a valid group session grants nothing at /admin.
    const groupToken = await signSession({ s: "group", v: 0 }, SECRET);
    const result = await verifySession(groupToken, SECRET, { scope: "admin" });
    expect(result).toEqual({ ok: false, reason: "wrong_scope" });
  });

  it("refuses an admin cookie at the group gate", async () => {
    const adminToken = await signSession({ s: "admin", v: 0 }, SECRET);
    const result = await verifySession(adminToken, SECRET, { scope: "group" });
    expect(result).toEqual({ ok: false, reason: "wrong_scope" });
  });

  it("refuses a cookie whose epoch is stale — that is the whole revocation story", async () => {
    const token = await signSession({ s: "group", v: 4 }, SECRET);

    // Password rotated: the epoch is bumped, every device is logged out.
    const result = await verifySession(token, SECRET, {
      scope: "group",
      epoch: 5,
    });
    expect(result).toEqual({ ok: false, reason: "stale_epoch" });

    // The admin epoch is independent and unaffected.
    const admin = await signSession({ s: "admin", v: 2 }, SECRET);
    await expect(
      verifySession(admin, SECRET, { scope: "admin", epoch: 2 }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("rejects rubbish without throwing", async () => {
    for (const token of ["", "no-dot", ".", "a.", ".b", "!!!.???"]) {
      const result = await verifySession(token, SECRET, { scope: "group" });
      expect(result.ok).toBe(false);
    }
  });

  it("rejects everything when no secret is configured", async () => {
    const token = await signSession({ s: "group", v: 0 }, SECRET);
    const result = await verifySession(token, "", { scope: "group" });
    expect(result.ok).toBe(false);
  });
});
