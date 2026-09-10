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

/** `scrypt$N$r$p$salt$hash`, all base64. Self-describing, so it can be upgraded. */
const PREFIX = "scrypt";

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
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
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

/** Exported for tests. Returns null rather than throwing on anything malformed. */
export function parseHash(stored: string): ParsedHash | null {
  if (typeof stored !== "string") return null;

  const parts = stored.split("$");
  if (parts.length !== 6) return null;
  const [prefix, rawN, rawR, rawP, rawSalt, rawHash] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (prefix !== PREFIX) return null;

  const N = Number.parseInt(rawN, 10);
  const r = Number.parseInt(rawR, 10);
  const p = Number.parseInt(rawP, 10);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return null;
  }
  if (N < 2 || r < 1 || p < 1) return null;

  const salt = Buffer.from(rawSalt, "base64");
  const hash = Buffer.from(rawHash, "base64");
  if (salt.length === 0 || hash.length === 0) return null;

  return { N, r, p, salt, hash };
}
