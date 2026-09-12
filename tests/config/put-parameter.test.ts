/**
 * `putParameter` — the write path `lib/config/README.md` § "Setting the API
 * key, locally" documents. In `env` mode there is no SSM, so a write lands in
 * an in-memory override that `getParameter` must see immediately (the same
 * "explicit invalidation on write" guarantee the real SSM path gives).
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.CONFIG_SOURCE = "env";
});

afterEach(async () => {
  const { invalidateAllParameters, resetLocalParameterOverrides } = await import(
    "@/lib/config"
  );
  invalidateAllParameters();
  resetLocalParameterOverrides();
});

describe("putParameter (env mode)", () => {
  it("a written value is immediately visible to getParameter, ahead of any env var", async () => {
    const { putParameter, getParameter, PARAM } = await import("@/lib/config");

    await putParameter(PARAM.anthropicApiKey, "sk-ant-written-value");
    await expect(getParameter(PARAM.anthropicApiKey)).resolves.toBe("sk-ant-written-value");
  });

  it("a non-secure write behaves identically to a secure one from the read side", async () => {
    const { putParameter, getParameter, PARAM } = await import("@/lib/config");

    await putParameter(PARAM.anthropicApiKeyLast4, "abcd", { secure: false });
    await expect(getParameter(PARAM.anthropicApiKeyLast4)).resolves.toBe("abcd");
  });

  it("overwrites a previous write rather than erroring", async () => {
    const { putParameter, getParameter, PARAM } = await import("@/lib/config");

    await putParameter(PARAM.anthropicApiKey, "sk-ant-first");
    await putParameter(PARAM.anthropicApiKey, "sk-ant-second");
    await expect(getParameter(PARAM.anthropicApiKey)).resolves.toBe("sk-ant-second");
  });

  it("resetLocalParameterOverrides forgets every write, same as a fresh dev process", async () => {
    const { putParameter, getParameter, resetLocalParameterOverrides, MissingParameterError, PARAM } =
      await import("@/lib/config");

    await putParameter(PARAM.anthropicApiKey, "sk-ant-temporary");
    resetLocalParameterOverrides();

    await expect(getParameter(PARAM.anthropicApiKey)).rejects.toBeInstanceOf(
      MissingParameterError,
    );
  });
});
