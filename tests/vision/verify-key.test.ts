import { beforeEach, describe, expect, it, vi } from "vitest";

let createImpl: (params: unknown) => Promise<unknown>;
const createCalls: unknown[] = [];

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class FakeAnthropic {
      messages = {
        create: (params: unknown) => {
          createCalls.push(params);
          return createImpl(params);
        },
      };
    },
  };
});

beforeEach(() => {
  createCalls.length = 0;
  createImpl = async () => ({ id: "msg_1" });
});

describe("verifyAnthropicApiKey", () => {
  it("returns true for a call that succeeds", async () => {
    const { verifyAnthropicApiKey } = await import("@/lib/vision/verify-key");
    await expect(verifyAnthropicApiKey("sk-good")).resolves.toBe(true);

    const params = createCalls[0] as { model: string; max_tokens: number };
    expect(params.model).toBe("claude-opus-5");
    expect(params.max_tokens).toBeLessThanOrEqual(16);
  });

  it("returns false rather than throwing when the call fails", async () => {
    createImpl = async () => {
      throw new Error("401 invalid x-api-key");
    };
    const { verifyAnthropicApiKey } = await import("@/lib/vision/verify-key");
    await expect(verifyAnthropicApiKey("sk-bad")).resolves.toBe(false);
  });
});
