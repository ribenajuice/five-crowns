/**
 * `lib/vision/api-key.ts` — set/verify/status, with `verifyAnthropicApiKey`
 * mocked (its own contract is tested in `tests/vision/verify-key.test.ts`)
 * and against the real `env`-mode config write path (`lib/config/index.ts`),
 * so this also proves `putParameter` actually round-trips.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";

let verifyResult = true;
vi.mock("@/lib/vision/verify-key", () => ({
  verifyAnthropicApiKey: async () => verifyResult,
}));

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

afterEach(async () => {
  const { invalidateAllParameters, resetLocalParameterOverrides } = await import(
    "@/lib/config"
  );
  invalidateAllParameters();
  resetLocalParameterOverrides();
  verifyResult = true;
});

describe("anthropicApiKeyStatus", () => {
  it("reports 'unknown' when no key has ever been set", async () => {
    const { anthropicApiKeyStatus } = await import("@/lib/vision/api-key");
    const status = await anthropicApiKeyStatus();
    expect(status).toEqual({ configured: false, last4: null, setAt: null, works: "unknown" });
  });

  it("reports 'untried' once a key is configured but no sheet transcription has run", async () => {
    const { setAnthropicApiKey, anthropicApiKeyStatus } = await import("@/lib/vision/api-key");
    await setAnthropicApiKey("sk-ant-abcdefghijklmnop-1234");

    const status = await anthropicApiKeyStatus();
    expect(status.configured).toBe(true);
    expect(status.last4).toBe("1234");
    expect(status.setAt).not.toBeNull();
    expect(status.works).toBe("untried");
  });

  it("⚠️ never includes the key itself, in any field", async () => {
    const { setAnthropicApiKey, anthropicApiKeyStatus } = await import("@/lib/vision/api-key");
    await setAnthropicApiKey("sk-ant-super-secret-value-999");

    const status = await anthropicApiKeyStatus();
    expect(JSON.stringify(status)).not.toContain("sk-ant-super-secret-value-999");
  });

  it("derives 'yes' from the most recent sheet transcription's status", async () => {
    const { setAnthropicApiKey, anthropicApiKeyStatus } = await import("@/lib/vision/api-key");
    await setAnthropicApiKey("sk-ant-abcdefghijklmnop-1111");

    const { getDb } = await import("@/lib/db");
    const { transcription, photo } = await import("@/lib/db/schema");
    await getDb().insert(photo).values({
      id: "ph_apikey_1",
      kind: "sheet",
      s3KeyOriginal: "x",
      s3KeyModel: "y",
    });
    // ⚠️ Must postdate this test's setAt (captured at call time, "now") — see
    // "only counts a transcription from since the current key was saved" below
    // for the case where it doesn't.
    await getDb().insert(transcription).values({
      id: "tr_apikey_1",
      photoId: "ph_apikey_1",
      kind: "sheet",
      model: "claude-opus-5",
      status: "ok",
      createdAt: new Date(Date.now() + 1000).toISOString(),
    });

    expect((await anthropicApiKeyStatus()).works).toBe("yes");
  });

  it("derives 'no' when the most recent sheet transcription failed with an upstream error", async () => {
    const { setAnthropicApiKey, anthropicApiKeyStatus } = await import("@/lib/vision/api-key");
    await setAnthropicApiKey("sk-ant-abcdefghijklmnop-2222");

    const { getDb } = await import("@/lib/db");
    const { transcription, photo } = await import("@/lib/db/schema");
    await getDb().insert(photo).values({
      id: "ph_apikey_2",
      kind: "sheet",
      s3KeyOriginal: "x",
      s3KeyModel: "y",
    });
    await getDb().insert(transcription).values({
      id: "tr_apikey_2",
      photoId: "ph_apikey_2",
      kind: "sheet",
      model: "claude-opus-5",
      status: "error",
      error: "timeout",
      createdAt: new Date(Date.now() + 1000).toISOString(),
    });

    expect((await anthropicApiKeyStatus()).works).toBe("no");
  });

  it("'invalid' (schema parse failure, not a key problem) still reads as working", async () => {
    const { setAnthropicApiKey, anthropicApiKeyStatus } = await import("@/lib/vision/api-key");
    await setAnthropicApiKey("sk-ant-abcdefghijklmnop-3333");

    const { getDb } = await import("@/lib/db");
    const { transcription, photo } = await import("@/lib/db/schema");
    await getDb().insert(photo).values({
      id: "ph_apikey_3",
      kind: "sheet",
      s3KeyOriginal: "x",
      s3KeyModel: "y",
    });
    await getDb().insert(transcription).values({
      id: "tr_apikey_3",
      photoId: "ph_apikey_3",
      kind: "sheet",
      model: "claude-opus-5",
      status: "invalid",
      createdAt: new Date(Date.now() + 1000).toISOString(),
    });

    expect((await anthropicApiKeyStatus()).works).toBe("yes");
  });

  it("⚠️ code review: only counts a transcription from since the current key was saved", async () => {
    // Fake time, far beyond any other test in this file's real-time-based
    // fixtures, and fully under this test's control — so "the old
    // transcription predates the new key's setAt" is exact, not a race
    // against wall-clock timing or other tests' rows sharing this DB.
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
      const { setAnthropicApiKey, anthropicApiKeyStatus } = await import("@/lib/vision/api-key");
      const { getDb } = await import("@/lib/db");
      const { transcription, photo } = await import("@/lib/db/schema");

      // An old key's last attempt failed...
      await setAnthropicApiKey("sk-ant-old-failing-key-0000");
      await getDb().insert(photo).values({
        id: "ph_apikey_4",
        kind: "sheet",
        s3KeyOriginal: "x",
        s3KeyModel: "y",
      });
      await getDb().insert(transcription).values({
        id: "tr_apikey_4",
        photoId: "ph_apikey_4",
        kind: "sheet",
        model: "claude-opus-5",
        status: "error",
        error: "auth failed",
        createdAt: new Date().toISOString(),
      });
      expect((await anthropicApiKeyStatus()).works).toBe("no");

      // ...but a full minute later, a brand-new key is saved. It must not
      // inherit the old key's failure just because that's the most recent
      // row in the table — it's never been tried.
      vi.setSystemTime(new Date("2030-01-01T00:01:00.000Z"));
      await setAnthropicApiKey("sk-ant-brand-new-key-1111");
      expect((await anthropicApiKeyStatus()).works).toBe("untried");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("setAnthropicApiKey", () => {
  it("rejects a candidate that fails verification, and writes nothing", async () => {
    verifyResult = false;
    const { setAnthropicApiKey, anthropicApiKeyStatus } = await import("@/lib/vision/api-key");

    const outcome = await setAnthropicApiKey("sk-ant-will-fail-000000");
    expect(outcome.status).toBe("invalid_key");
    expect((await anthropicApiKeyStatus()).configured).toBe(false);
  });

  it("leaves a previously-working key in place when a new candidate fails verification", async () => {
    const { setAnthropicApiKey, anthropicApiKeyStatus } = await import("@/lib/vision/api-key");

    verifyResult = true;
    await setAnthropicApiKey("sk-ant-good-key-0000-4444");
    const before = await anthropicApiKeyStatus();
    expect(before.last4).toBe("4444");

    verifyResult = false;
    const rejected = await setAnthropicApiKey("sk-ant-bad-key-0000-9999");
    expect(rejected.status).toBe("invalid_key");

    const after = await anthropicApiKeyStatus();
    expect(after.last4).toBe("4444");
  });
});
