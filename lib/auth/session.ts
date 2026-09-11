/**
 * Server-side session reading.
 *
 * Full verification lives here — signature, expiry, scope **and** the epoch
 * check against Parameter Store, which middleware cannot do because it has no
 * AWS client. Anything that renders a fragment of the record calls
 * {@link requireGroupSession} first.
 */

import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sessionEpoch } from "@/lib/config";

import { cookieName } from "./cookies";
import { sessionSecret } from "./secret";
import { verifySession, type SessionPayload, type SessionScope } from "./token";

export { MissingSessionSecretError, sessionSecret } from "./secret";

/** The verified payload for a scope, or null. Never throws on a bad cookie. */
export async function readSession(
  scope: SessionScope,
): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(cookieName(scope))?.value;
  if (!token) return null;

  const [secret, epoch] = await Promise.all([
    Promise.resolve(sessionSecret()),
    sessionEpoch(scope),
  ]);

  const result = await verifySession(token, secret, { scope, epoch });
  return result.ok ? result.payload : null;
}

export async function hasSession(scope: SessionScope): Promise<boolean> {
  return (await readSession(scope)) !== null;
}

/**
 * Gate anything that shows a fragment of the record.
 *
 * ⚠️ PRD criterion 1: with no session, **no fragment of the record appears in
 * the returned HTML**. Redirecting before the page body is built is what makes
 * that true rather than merely hidden.
 */
export async function requireGroupSession(): Promise<SessionPayload> {
  const session = await readSession("group");
  if (!session) redirect("/login");
  return session;
}
