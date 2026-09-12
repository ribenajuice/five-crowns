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

import { and, desc, eq, gte } from "drizzle-orm";

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

  // The key itself is the one write that matters functionally — it's already
  // verified, and every transcription call reads it directly from Parameter
  // Store. The two metadata writes below are display-only (last4, setAt).
  await putParameter(PARAM.anthropicApiKey, candidate);

  // ⚠️ Code review: if a metadata write below fails, the key is already
  // saved and working — throwing from here would have the route 500 and
  // tell the admin nothing was saved, when the one write that actually
  // matters already succeeded. Caught and logged instead, so the response
  // still reports success; the display briefly shows the previous last4/setAt
  // until the next successful save, which is the display inconsistency the
  // architecture doc already accepts, not a functional failure.
  try {
    const setAt = new Date().toISOString();
    await putParameter(PARAM.anthropicApiKeyLast4, candidate.slice(-4), {
      secure: false,
    });
    await putParameter(PARAM.anthropicApiKeySetAt, setAt, { secure: false });
  } catch (error) {
    log.warn("admin.api_key.metadata_write_failed", {
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

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

  // ⚠️ Code review: scoped to transcriptions since this key was saved. Without
  // this, saving a brand-new key right after an old one's last attempt failed
  // would still read that old failure as the new key's status — directly
  // contradicting the "Saved." banner with a "Not working" the founder never
  // actually tried.
  const [mostRecent] = await getDb()
    .select({ status: transcription.status })
    .from(transcription)
    .where(
      setAt
        ? and(eq(transcription.kind, "sheet"), gte(transcription.createdAt, setAt))
        : eq(transcription.kind, "sheet"),
    )
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
