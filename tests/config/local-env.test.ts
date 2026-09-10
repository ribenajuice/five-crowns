/**
 * ⚠️ **The documented local setup must actually work.**
 *
 * `lib/config/README.md` § Local development is the only instruction anyone
 * has for running this app off AWS. It says to generate a hash with
 * `node scripts/hash-password.js` and paste it into `.env.local` like so:
 *
 * ```dotenv
 * FIVE_CROWNS_GROUP_PASSWORD_HASH=
 * ```
 *
 * Next.js loads `.env.local` through dotenv **with variable expansion on**. A
 * scrypt hash is `scrypt$N$r$p$salt$hash` — five `$` signs — so expansion eats
 * every `$`-prefixed run that looks like a variable name and the app is left
 * with a corrupt hash.
 *
 * The symptom is the worst possible one: **the app starts fine and quietly
 * refuses the correct password with "That password is wrong."** Nothing in the
 * logs says the hash was mangled. Found by QA on 2026-09-10 while following
 * the README verbatim.
 *
 * These tests fail until the setup documented in the README produces a usable
 * hash — whether that is fixed in the README, in the hash format, or by having
 * `lib/config` repair what it reads.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

/** Load a `.env.local` exactly the way `next dev` and `next start` do. */
async function loadAsNextWould(
  envFileContents: string,
): Promise<Record<string, string | undefined>> {
  const nextEnv = await import("@next/env");
  const loadEnvConfig =
    // The package is CJS; the named export arrives differently under ESM.
    (nextEnv as unknown as { loadEnvConfig?: typeof import("@next/env").loadEnvConfig })
      .loadEnvConfig ??
    (nextEnv as unknown as { default: typeof import("@next/env") }).default
      .loadEnvConfig;

  const directory = mkdtempSync(join(tmpdir(), "five-crowns-env-"));
  writeFileSync(join(directory, ".env.local"), envFileContents);

  // Two things this has to get right to be testing reality at all:
  //   * `forceReload` — @next/env memoises the first load, so without it every
  //     case after the first silently reuses the first one's answer.
  //   * `NODE_ENV` — @next/env deliberately ignores `.env.local` when it is
  //     "test", which is exactly what Vitest sets. Left alone, this helper
  //     would load nothing and every assertion here would be vacuous.
  const snapshot = { ...process.env };
  vi.stubEnv("NODE_ENV", "production");
  try {
    const { combinedEnv, loadedEnvFiles } = loadEnvConfig(
      directory,
      false,
      { info() {}, error() {} },
      true,
    );
    if (loadedEnvFiles.length === 0) {
      throw new Error("No env file was loaded — this test would prove nothing.");
    }
    return { ...combinedEnv } as Record<string, string | undefined>;
  } finally {
    vi.unstubAllEnvs();
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    Object.assign(process.env, snapshot);
  }
}

const VARIABLE = "FIVE_CROWNS_GROUP_PASSWORD_HASH";

describe("the local setup documented in lib/config/README.md", () => {
  it("⚠️ carries a scrypt hash into the app intact", async () => {
    const hash = await hashPassword("a-password-a-founder-would-type");

    // Exactly the line the README tells you to write. No quoting, no escaping.
    const loaded = await loadAsNextWould(`${VARIABLE}=${hash}\n`);

    expect(loaded[VARIABLE]).toBe(hash);
  });

  it("⚠️ leaves the correct password verifiable after that round trip", async () => {
    const plaintext = "a-password-a-founder-would-type";
    const hash = await hashPassword(plaintext);

    const loaded = await loadAsNextWould(`${VARIABLE}=${hash}\n`);

    // This is the assertion that matters: if it fails, the founder types the
    // right password and is told it is wrong.
    expect(await verifyPassword(plaintext, loaded[VARIABLE] ?? "")).toBe(true);
  });

  it("carries the session secret intact — base64 has no $, so it was never at risk", async () => {
    const secret = "kEXAMPLEbase64Secret+with/slashes+and=padding=";
    const loaded = await loadAsNextWould(`SESSION_SECRET=${secret}\n`);

    expect(loaded.SESSION_SECRET).toBe(secret);
  });
});

describe("why it breaks, pinned down so the fix is obvious", () => {
  it("dotenv expansion is what destroys it", async () => {
    const loaded = await loadAsNextWould(
      `${VARIABLE}=scrypt$16384$8$1$SaltSaltSalt==$HashHashHash=\n`,
    );

    // Every `$` followed by something name-shaped is treated as a variable
    // reference and expanded to nothing.
    expect(loaded[VARIABLE]).not.toContain("SaltSaltSalt");
    expect(loaded[VARIABLE]).not.toContain("HashHashHash");
  });

  it("escaping every $ as \\$ is what makes it survive — one available fix", async () => {
    const hash = await hashPassword("another-password");
    const escaped = hash.replaceAll("$", "\\$");

    const loaded = await loadAsNextWould(`${VARIABLE}=${escaped}\n`);

    expect(loaded[VARIABLE]).toBe(hash);
    expect(await verifyPassword("another-password", loaded[VARIABLE] ?? "")).toBe(
      true,
    );
  });

  it("⚠️ single quotes do NOT save it, so 'just quote it' is not the fix", async () => {
    const hash = await hashPassword("yet-another-password");

    const loaded = await loadAsNextWould(`${VARIABLE}='${hash}'\n`);

    expect(loaded[VARIABLE]).not.toBe(hash);
  });
});
