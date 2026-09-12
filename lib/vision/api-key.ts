/**
 * The admin panel's Claude API key: set it, and read back everything about
 * it *except itself* (docs/ARCHITECTURE.md § The Claude API key; PRD criteria
 * 75–77).
 *
 * See `docs/DECISIONS.md`, "The API key's status is derived, not stored", for
 * why "whether it currently works" isn't a field anywhere — it's read off the
 * most recent `sheet`-kind row in `transcription`, which already exists,
 * already holds no secret, and is a record of what actually happened rather
 * than a flag someone has to remember to keep in sync.
 */

import "server-only";

import { desc, eq } from "drizzle-orm";

import { getOptionalParameter, PARAM, putParameter } from "@/lib/config";
import { getDb } from "@/lib/db";
import { transcription } from "@/lib/db/schema";
import { log } from "@/lib/log";

import { verifyAnthropicApiKey } from "./verify-key";

export const API_KEY_MIN_LENGTH = 20;
export const API_KEY_MAX_LENGTH = 200;

export type SetApiKeyOutcome = { status: "ok" } | { status: "invalid_key" };

/**
 * ⚠️ **Verified before it is accepted.** A candidate that fails the real
 * call never reaches Parameter Store, so a previously-working key is left
 * completely untouched (PRD criterion 77) — there is no window in which the
 * app has no working key because a typo was pasted in.
 */
export async function setAnthropicApiKey(candidate: string): Promise<SetApiKeyOutcome> {
  const works = await verifyAnthropicApiKey(candidate);
  if (!works) {
    log.warn("admin.api_key.rejected");
    return { status: "invalid_key" };
  }

  const setAt = new Date().toISOString();
  await putParameter(PARAM.anthropicApiKey, candidate);
  await putParameter(PARAM.anthropicApiKeyLast4, candidate.slice(-4), {
    secure: false,
  });
  await putParameter(PARAM.anthropicApiKeySetAt, setAt, { secure: false });

  log.info("admin.api_key.set");
  return { status: "ok" };
}

export interface ApiKeyStatus {
  configured: boolean;
  /** Last four characters only. ⚠️ Never the key itself (PRD criterion 76). */
  last4: string | null;
  /** ISO timestamp of the last successful *set*. */
  setAt: string | null;
  /**
   * `"untried"` — configured, but no sheet transcription has run against it
   * yet. `"unknown"` — nothing configured at all, nothing to ask about.
   */
  works: "yes" | "no" | "untried" | "unknown";
}

/** ⚠️ Never the key itself, anywhere in this return value. */
export async function anthropicApiKeyStatus(): Promise<ApiKeyStatus> {
  const [last4, setAt] = await Promise.all([
    getOptionalParameter(PARAM.anthropicApiKeyLast4),
    getOptionalParameter(PARAM.anthropicApiKeySetAt),
  ]);
  const configured = last4 !== null;

  const [mostRecent] = await getDb()
    .select({ status: transcription.status })
    .from(transcription)
    .where(eq(transcription.kind, "sheet"))
    .orderBy(desc(transcription.createdAt))
    .limit(1);

  // "error" is an upstream-call failure (auth, network, timeout) — a fact
  // about the key. "invalid" means the call succeeded but the model's output
  // didn't parse, which says nothing about whether the key works.
  const works: ApiKeyStatus["works"] = !configured
    ? "unknown"
    : !mostRecent
      ? "untried"
      : mostRecent.status === "error"
        ? "no"
        : "yes";

  return { configured, last4, setAt, works };
}
