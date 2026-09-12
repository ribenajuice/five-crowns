/**
 * Signed URLs for the local photo driver's dev-only routes.
 *
 * ⚠️ Mirrors what a real S3 presigned URL gives us: the URL itself is the
 * credential, valid for five minutes, checked with no session lookup. Keyed by
 * `SESSION_SECRET` so it needs no parameter store and no extra secret in local
 * development — the same value already signs the session cookie.
 */

import "server-only";

import { SESSION_SECRET_ENV } from "@/lib/config/parameters";

import type { PhotoVariant } from "./types";

export interface LocalPhotoUrlPayload {
  photoId: string;
  variant: PhotoVariant;
  method: "GET" | "POST";
  /** Unix seconds. */
  exp: number;
}

export class MissingLocalSigningSecretError extends Error {
  override name = "MissingLocalSigningSecretError";
  constructor() {
    super(
      `${SESSION_SECRET_ENV} is not set. The local photo driver signs its dev URLs with it — see lib/config/README.md § Local development.`,
    );
  }
}

function secret(): string {
  const value = process.env[SESSION_SECRET_ENV];
  if (!value) throw new MissingLocalSigningSecretError();
  return value;
}

function message(payload: LocalPhotoUrlPayload): string {
  return `${payload.photoId}:${payload.variant}:${payload.method}:${payload.exp}`;
}

async function hmacHex(text: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signLocalPhotoUrl(
  payload: LocalPhotoUrlPayload,
): Promise<string> {
  return hmacHex(message(payload), secret());
}

/** False for a bad signature *or* an expired one. Never throws on either. */
export async function verifyLocalPhotoUrl(
  payload: LocalPhotoUrlPayload,
  signature: string,
): Promise<boolean> {
  if (!Number.isFinite(payload.exp) || payload.exp * 1000 < Date.now()) {
    return false;
  }
  const expected = await hmacHex(message(payload), secret());
  return timingSafeEqualHex(expected, signature);
}
