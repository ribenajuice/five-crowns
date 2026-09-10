/**
 * The stateless session cookie.
 *
 * An HMAC-SHA256-signed token carrying `{s, v, iat, exp}` — scope, session
 * epoch, issued-at, expiry. **There is no session table.** Revocation is an
 * epoch bump: the epoch is inside the signed payload and verification rejects
 * any cookie whose epoch is not current, so rotating a password logs every
 * device out at once (docs/DECISIONS.md, "Access control").
 *
 * Written against **Web Crypto**, not `node:crypto`, so the identical code runs
 * in Next.js middleware (Edge runtime) and in route handlers (Node). Nothing
 * here reads a database or calls AWS, which is what makes it usable in
 * middleware at all.
 */

/** 400 days — the browser cap. Nobody retypes the password every night. */
export const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export type SessionScope = "group" | "admin";

export interface SessionPayload {
  /** Which gate this cookie opens. A group cookie grants nothing at /admin. */
  s: SessionScope;
  /** Session epoch. Checked against Parameter Store on every request. */
  v: number;
  /** Issued at, seconds since epoch. */
  iat: number;
  /** Expires at, seconds since epoch. */
  exp: number;
}

export type VerifyFailure =
  | "malformed"
  | "bad_signature"
  | "expired"
  | "wrong_scope"
  | "stale_epoch";

export type VerifyResult =
  | { ok: true; payload: SessionPayload }
  | { ok: false; reason: VerifyFailure };

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Mint a signed token.
 *
 * @param secret the HMAC key, from `SESSION_SECRET`. Never in code, never in
 * the database, never in the browser bundle.
 */
export async function signSession(
  payload: Omit<SessionPayload, "iat" | "exp">,
  secret: string,
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): Promise<string> {
  if (!secret) throw new Error("A session secret is required to sign a token.");

  const now = Math.floor(Date.now() / 1000);
  const full: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + maxAgeSeconds,
  };

  const body = encodeBase64Url(new TextEncoder().encode(JSON.stringify(full)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importKey(secret),
    new TextEncoder().encode(body),
  );

  return `${body}.${encodeBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verify a token's signature, expiry and scope.
 *
 * ⚠️ The epoch check is **not** done here, because it needs Parameter Store and
 * this function has to stay callable from Edge middleware. Pass `epoch` when
 * you have it — server components and route handlers always do — and the check
 * happens. Middleware omits it and gets signature-and-expiry only; the
 * authenticated layout does the full check before rendering anything.
 */
export async function verifySession(
  token: string | undefined,
  secret: string,
  expected: { scope: SessionScope; epoch?: number },
): Promise<VerifyResult> {
  if (!token || !secret) return { ok: false, reason: "malformed" };

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) {
    return { ok: false, reason: "malformed" };
  }

  const body = token.slice(0, dot);
  const signature = decodeBase64Url(token.slice(dot + 1));
  if (!signature) return { ok: false, reason: "malformed" };

  // Web Crypto's verify is constant-time.
  const valid = await crypto.subtle.verify(
    "HMAC",
    await importKey(secret),
    signature,
    new TextEncoder().encode(body),
  );
  if (!valid) return { ok: false, reason: "bad_signature" };

  const decoded = decodeBase64Url(body);
  if (!decoded) return { ok: false, reason: "malformed" };

  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(decoded)) as SessionPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (
    payload === null ||
    typeof payload !== "object" ||
    (payload.s !== "group" && payload.s !== "admin") ||
    typeof payload.v !== "number" ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }

  if (payload.s !== expected.scope) return { ok: false, reason: "wrong_scope" };

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }

  if (expected.epoch !== undefined && payload.v !== expected.epoch) {
    return { ok: false, reason: "stale_epoch" };
  }

  return { ok: true, payload };
}
