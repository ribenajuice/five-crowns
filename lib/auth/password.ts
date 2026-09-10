/**
 * scrypt password hashing.
 *
 * The product has exactly two passwords — the shared group one and the admin
 * one — and neither plaintext is ever stored anywhere: not in the repository,
 * not in the database, not in the deploy pipeline. Only the hash below, in SSM
 * as a SecureString (docs/DECISIONS.md, "Access control").
 *
 * Node's `crypto` only. Not usable from Edge middleware, and it never needs to
 * be: only `POST /api/login` and `POST /api/admin/login` verify a password.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * `promisify` picks the three-argument overload, which loses the cost
 * parameters. Narrowed here rather than at each call site.
 */
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Cost parameters. N=16384 needs 128 * N * r = 16 MB and takes ~50 ms, which is
 * plenty against an online attack when the rate limiter is already refusing
 * after ten tries in ten minutes. They are stored *in* the hash so raising them
 * later does not invalidate existing hashes.
 */
export const SCRYPT_N = 16_384;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
export const SCRYPT_KEYLEN = 32;
const SALT_BYTES = 16;

/**
 * The stored format: `scrypt:N:r:p:salt:hash`, salt and hash in unpadded
 * base64url. Self-describing, so the cost parameters can be raised later.
 *
 * ⚠️ **Every character is in `[A-Za-z0-9:_-]`, deliberately.** The hash is
 * pasted by hand into two places that rewrite special characters without
 * warning: a `.env.local` (Next's loader expands every `$`) and an
 * `aws ssm put-parameter` shell command (`$` in double quotes, `#` and spaces
 * unquoted). The earlier `scrypt$N$r$p$salt$hash` form was silently mangled by
 * the first, so the correct password was refused with no clue why. With no
 * `$`, `#`, quote, backslash, `+`, `/`, `=` or whitespace there is nothing for
 * either to touch, however it is quoted (docs/DECISIONS.md, "$-free password
 * hash format"; pinned by tests/config/local-env.test.ts).
 */
const PREFIX = "scrypt";
const SEPARATOR = ":";
const HASH_PATTERN =
  /^scrypt:([0-9]{1,10}):([0-9]{1,10}):([0-9]{1,10}):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/;

export class PasswordHashError extends Error {
  override name = "PasswordHashError";
}

/**
 * Hash a password for storage in Parameter Store.
 *
 * Used by `scripts/hash-password.js` — which runs entirely locally, with no
 * AWS, no app and no network — and by the admin panel's rotate forms.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new PasswordHashError("A password cannot be empty.");
  }

  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(
    plaintext.normalize("NFKC"),
    salt,
    SCRYPT_KEYLEN,
    { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 256 * 1024 * 1024 },
  );

  return [
    PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join(SEPARATOR);
}

/**
 * Verify a password against a stored hash, in constant time.
 *
 * Returns false — never throws — for a malformed stored hash, so a corrupted
 * parameter locks people out rather than letting anybody in. The caller logs
 * the detail; the browser is told nothing beyond "that password is wrong".
 */
export async function verifyPassword(
  plaintext: string,
  stored: string,
): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;

  try {
    const derived = await scrypt(
      plaintext.normalize("NFKC"),
      parsed.salt,
      parsed.hash.length,
      { N: parsed.N, r: parsed.r, p: parsed.p, maxmem: 256 * 1024 * 1024 },
    );

    if (derived.length !== parsed.hash.length) return false;
    return timingSafeEqual(derived, parsed.hash);
  } catch {
    return false;
  }
}

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

/**
 * Parse a stored hash. Exported for tests and for the login path's diagnostic.
 * Returns null rather than throwing on anything malformed.
 *
 * Strict on purpose: Node's base64 decoder silently skips characters it does
 * not recognise, so a lenient parse would turn a mangled value into a
 * *different* valid-looking salt and fail later as a plain "wrong password".
 * Anything outside the exact format — including the retired `$` form — is
 * rejected here, where it can be logged as what it is.
 */
export function parseHash(stored: string): ParsedHash | null {
  if (typeof stored !== "string") return null;

  const match = HASH_PATTERN.exec(stored);
  if (!match) return null;
  const [, rawN, rawR, rawP, rawSalt, rawHash] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  const N = Number.parseInt(rawN, 10);
  const r = Number.parseInt(rawR, 10);
  const p = Number.parseInt(rawP, 10);
  if (N < 2 || r < 1 || p < 1) return null;

  const salt = Buffer.from(rawSalt, "base64url");
  const hash = Buffer.from(rawHash, "base64url");
  if (salt.length === 0 || hash.length === 0) return null;

  return { N, r, p, salt, hash };
}
