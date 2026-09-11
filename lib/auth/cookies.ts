/**
 * Cookie names and attributes for both gates.
 *
 * ⚠️ The two are independent. Holding a valid **group** session grants nothing
 * at `/admin` — that is a separate cookie behind a separate password, and the
 * two epochs are bumped independently (PRD criterion 4, criterion 74).
 */

import { SESSION_MAX_AGE_SECONDS, type SessionScope } from "./token";

export const GROUP_COOKIE = "fc_session";
export const ADMIN_COOKIE = "fc_admin";

export function cookieName(scope: SessionScope): string {
  return scope === "group" ? GROUP_COOKIE : ADMIN_COOKIE;
}

export interface CookieAttributes {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
}

/**
 * `HttpOnly` so no script can read it, `Secure` everywhere the app is actually
 * served (CloudFront is TLS-only), `SameSite=Lax`, and a 400-day `Max-Age` —
 * the browser cap — so the device stays logged in and nobody retypes the
 * password every night (PRD criterion 3).
 *
 * `Secure` is dropped on plain-HTTP localhost only, because a browser will
 * silently refuse to store a Secure cookie there and the gate would look broken
 * in development for no reason.
 */
export function cookieAttributes(
  scope: SessionScope,
  options: { secure?: boolean; maxAge?: number } = {},
): CookieAttributes {
  return {
    httpOnly: true,
    secure: options.secure ?? process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: scope === "admin" ? "/admin" : "/",
    maxAge: options.maxAge ?? SESSION_MAX_AGE_SECONDS,
  };
}

/** Attributes that clear a cookie. */
export function clearedCookieAttributes(
  scope: SessionScope,
): CookieAttributes {
  return cookieAttributes(scope, { maxAge: 0 });
}
