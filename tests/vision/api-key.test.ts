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
    await getDb().insert(transcription).values({
      id: "tr_apikey_1",
      photoId: "ph_apikey_1",
      kind: "sheet",
      model: "claude-opus-5",
      status: "ok",
      createdAt: "2026-09-11T00:00:00.000Z",
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
      createdAt: "2026-09-11T00:01:00.000Z",
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
      createdAt: "2026-09-11T00:02:00.000Z",
    });

    expect((await anthropicApiKeyStatus()).works).toBe("yes");
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
