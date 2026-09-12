/**
 * "Verified before it is accepted" (docs/ARCHITECTURE.md § The Claude API
 * key; PRD criterion 77): a real, minimal call with the *candidate* key,
 * before it is ever written to Parameter Store. No image, no thinking, a
 * handful of tokens — "a fraction of a penny", as the architecture puts it.
 */

import "server-only";

import { anthropicClient, SHEET_MODEL } from "./client";

export async function verifyAnthropicApiKey(apiKey: string): Promise<boolean> {
  try {
    await anthropicClient(apiKey).messages.create({
      model: SHEET_MODEL,
      max_tokens: 16,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Reply with only the word: ok" }],
    });
    return true;
  } catch {
    return false;
  }
}
