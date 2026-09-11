/**
 * Runtime configuration, read from SSM Parameter Store with a 60-second TTL.
 *
 * ⚠️ Config is read at cold start, so a Lambda container holding a stale value
 * after the founder rotates something produces a baffling symptom: they changed
 * it, the app still fails, and nothing on screen explains why. Two mechanisms,
 * because each covers what the other cannot
 * (docs/ARCHITECTURE.md § Staleness after rotation):
 *
 *   - **Explicit invalidation on write** clears the cache in the container that
 *     handled the write, so the admin's very next request sees the new value.
 *     It cannot reach other containers.
 *   - **A 60-second TTL** bounds staleness everywhere else with no
 *     cross-container messaging at all. The panel says so on screen:
 *     "Saved. In use everywhere within a minute."
 *
 * ⚠️ This module must never import the database layer. No secret is ever stored
 * there, and the ESLint config enforces it.
 */

import "server-only";

import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
} from "@aws-sdk/client-ssm";

import {
  PARAM,
  parameterEnvVar,
  parameterPath,
  STAGE,
  type ParameterName,
} from "./parameters";

export * from "./parameters";

/** Sixty seconds is imperceptible to a human rotating a key. */
export const CONFIG_TTL_MS = 60_000;

export class MissingParameterError extends Error {
  override name = "MissingParameterError";
  constructor(public readonly parameter: string) {
    super(`Parameter ${parameter} is not set.`);
  }
}

/**
 * Where config comes from.
 *
 * `env` is local development: there is no AWS account and no SSM to read, so
 * values come from `.env.local`. `ssm` is everything deployed.
 */
export type ConfigSource = "ssm" | "env";

export function configSource(env: NodeJS.ProcessEnv = process.env): ConfigSource {
  const explicit = env.CONFIG_SOURCE;
  if (explicit === "ssm" || explicit === "env") return explicit;
  return env.NODE_ENV === "production" ? "ssm" : "env";
}

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

let ssm: SSMClient | undefined;
function client(): SSMClient {
  if (!ssm) ssm = new SSMClient({});
  return ssm;
}

/**
 * Read a parameter, cached for {@link CONFIG_TTL_MS}.
 *
 * @throws {MissingParameterError} when it has never been set. The caller
 * decides whether that is fatal — a missing password hash is; a missing API key
 * is a message telling the founder to set one.
 */
export async function getParameter(name: ParameterName): Promise<string> {
  const path = parameterPath(name);
  const now = Date.now();

  const hit = cache.get(path);
  if (hit && hit.expiresAt > now) return hit.value;

  const value = await readParameter(name, path);
  cache.set(path, { value, expiresAt: now + CONFIG_TTL_MS });
  return value;
}

/** Same as {@link getParameter} but returns null instead of throwing. */
export async function getOptionalParameter(
  name: ParameterName,
): Promise<string | null> {
  try {
    return await getParameter(name);
  } catch (error) {
    if (error instanceof MissingParameterError) return null;
    throw error;
  }
}

async function readParameter(
  name: ParameterName,
  path: string,
): Promise<string> {
  if (configSource() === "env") {
    const envVar = parameterEnvVar(name);
    const value = process.env[envVar];
    if (!value) throw new MissingParameterError(envVar);
    return value;
  }

  try {
    const result = await client().send(
      new GetParameterCommand({ Name: path, WithDecryption: true }),
    );
    const value = result.Parameter?.Value;
    if (!value) throw new MissingParameterError(path);
    return value;
  } catch (error) {
    if (error instanceof ParameterNotFound) {
      throw new MissingParameterError(path);
    }
    throw error;
  }
}

/**
 * Drop a cached value in *this* container. Called immediately after the admin
 * panel writes a parameter, so the next request already sees the new value.
 * Other containers catch up within the TTL.
 */
export function invalidateParameter(name: ParameterName): void {
  cache.delete(parameterPath(name));
}

/** Drop everything. Used by tests and by a full rotation. */
export function invalidateAllParameters(): void {
  cache.clear();
}

/**
 * The session epoch for a scope.
 *
 * The epoch is inside the signed cookie payload, and verification rejects any
 * cookie whose epoch is not current — bumping it logs every device out at once.
 * That is the entire revocation story for a stateless cookie.
 *
 * A never-set epoch reads as 0 rather than failing: the first deploy has no
 * revocations to honour, and refusing every login because a counter is missing
 * would be a worse failure than starting at zero.
 */
export async function sessionEpoch(scope: "group" | "admin"): Promise<number> {
  const name =
    scope === "group" ? PARAM.groupSessionEpoch : PARAM.adminSessionEpoch;
  const raw = await getOptionalParameter(name);
  if (raw === null) return 0;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The scrypt hash to check a login against. */
export async function passwordHash(scope: "group" | "admin"): Promise<string> {
  return getParameter(
    scope === "group" ? PARAM.groupPasswordHash : PARAM.adminPasswordHash,
  );
}

export { STAGE };
