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
 * Next.js loads `.env.local` through dotenv **with variable expansion on**. The
 * original hash format was `scrypt$N$r$p$salt$hash` — five `$` signs — so
 * expansion ate every `$`-prefixed run that looked like a variable name and the
 * app was left with a corrupt hash.
 *
 * The symptom was the worst possible one: **the app started fine and quietly
 * refused the correct password with "That password is wrong."** Nothing in the
 * logs said the hash was mangled. Found by QA on 2026-09-10 while following
 * the README verbatim.
 *
 * Fixed in the format (docs/DECISIONS.md, "$-free password hash format"): a
 * hash is now `scrypt:N:r:p:salt:hash` in base64url, using only
 * `[A-Za-z0-9:_-]`, so there is nothing for expansion to touch. The first block
 * below proves the README path works as written; the second pins down why `$`
 * was fatal, with **fixed strings only**, so no outcome depends on a random salt.
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

  it("carries every character a hash can contain — so no salt is ever unlucky", async () => {
    // The two tests above use a random salt, so on their own they only prove
    // the salts they happened to draw. This fixed value contains every
    // character the format can produce (lib/auth/password.ts: `[A-Za-z0-9:_-]`),
    // including a segment starting with `-` and one starting with `_`, which
    // makes the guarantee hold for all of them.
    const everyCharacter =
      "scrypt:16384:8:1:-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_:_-0123456789";

    const loaded = await loadAsNextWould(`${VARIABLE}=${everyCharacter}\n`);

    expect(loaded[VARIABLE]).toBe(everyCharacter);
  });

  it("carries the session secret intact — base64 has no $, so it was never at risk", async () => {
    const secret = "kEXAMPLEbase64Secret+with/slashes+and=padding=";
    const loaded = await loadAsNextWould(`SESSION_SECRET=${secret}\n`);

    expect(loaded.SESSION_SECRET).toBe(secret);
  });
});

describe("why the old `$` format broke — fixed strings, so nothing here is random", () => {
  /** Shaped exactly like a hash in the retired format. */
  const DOLLAR_HASH = "scrypt$16384$8$1$SaltSaltSalt==$HashHashHash=";

  it("dotenv expansion deletes every $-prefixed name, taking the salt and hash with it", async () => {
    const loaded = await loadAsNextWould(`${VARIABLE}=${DOLLAR_HASH}\n`);

    // `$HashHashHash`, `$SaltSaltSalt`, `$8`, `$1`… are all read as references
    // to unset variables and replaced with nothing.
    expect(loaded[VARIABLE]).not.toBe(DOLLAR_HASH);
    expect(loaded[VARIABLE]).not.toContain("SaltSaltSalt");
    expect(loaded[VARIABLE]).not.toContain("HashHashHash");
  });

  it("⚠️ single quotes do NOT save it — dotenv strips them before expansion runs", async () => {
    const loaded = await loadAsNextWould(
      `QUOTED='${DOLLAR_HASH}'\nBARE=${DOLLAR_HASH}\n`,
    );

    expect(loaded.QUOTED).not.toBe(DOLLAR_HASH);
    expect(loaded.QUOTED).not.toContain("SaltSaltSalt");
    // Quoting changes nothing at all: the same mangled value either way.
    expect(loaded.QUOTED).toBe(loaded.BARE);
  });

  it("escaping every $ as \\$ does — but only if a human remembers to, every time", async () => {
    const escaped = DOLLAR_HASH.replaceAll("$", "\\$");

    const loaded = await loadAsNextWould(`${VARIABLE}=${escaped}\n`);

    expect(loaded[VARIABLE]).toBe(DOLLAR_HASH);
  });

  it("whether a random $-hash survived was luck — which is why it looked intermittent", async () => {
    // The expander works backwards from the last `$` and gives up entirely if
    // that `$` is not followed by a name character. Standard base64 can start
    // with `+` or `/`, so roughly one hash in 32 came through whole by chance.
    // Pinned here with fixed strings so the explanation cannot itself be flaky.
    const lucky = "scrypt$16384$8$1$SaltSaltSalt==$+HashHashHash=";
    const unlucky = "scrypt$16384$8$1$SaltSaltSalt==$HashHashHash=";

    const loaded = await loadAsNextWould(
      `LUCKY=${lucky}\nUNLUCKY=${unlucky}\n`,
    );

    expect(loaded.LUCKY).toBe(lucky);
    expect(loaded.UNLUCKY).not.toBe(unlucky);
  });
});
