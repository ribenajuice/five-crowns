/**
 * The parameter layout.
 *
 * ⚠️ **Every secret in this product lives in SSM Parameter Store as a
 * SecureString, and none is ever written to the database.** There is no table a
 * secret could be in, so no dump — the admin panel's download or the nightly
 * backup — can contain one, however the export is written
 * (docs/ARCHITECTURE.md § The admin panel).
 *
 * This honours `CLAUDE.md`'s "environment variables only, never in code": what
 * changes is *where the environment gets its values* — SSM at runtime rather
 * than baked in at deploy — which is required because the founder must be able
 * to rotate a key without a deploy and without a developer.
 *
 * The ownership split is a rule, not a judgement call:
 *   if the founder can change it from the admin panel, the **app** owns it;
 *   if it is needed to deploy or migrate, **SST** owns it.
 */

export const PARAMETER_PREFIX = "/five-crowns";

export const STAGE = process.env.SST_STAGE ?? process.env.STAGE ?? "prod";

/** Parameter short names, under `/five-crowns/{stage}/`. */
export const PARAM = {
  /** scrypt hash of the shared group password. Written by the app. */
  groupPasswordHash: "group-password-hash",
  /** scrypt hash of the admin password. Written by the app. */
  adminPasswordHash: "admin-password-hash",
  /** Integer, bumped to log every group device out at once. Written by the app. */
  groupSessionEpoch: "group-session-epoch",
  /** Integer, bumped to log every admin session out. Written by the app. */
  adminSessionEpoch: "admin-session-epoch",
  /** The vision call's credential. Write-only from the panel. Never rendered back. */
  anthropicApiKey: "anthropic-api-key",
  /**
   * The key's last four characters — not a secret, so a plain `String`
   * parameter, never a SecureString. Written alongside the key itself so the
   * panel has something to show without ever reading the key back
   * (docs/DECISIONS.md, "The API key's status is derived, not stored").
   */
  anthropicApiKeyLast4: "anthropic-api-key-last4",
  /** ISO timestamp of the last successful *set*, not the last successful *use*. */
  anthropicApiKeySetAt: "anthropic-api-key-set-at",
} as const;

export type ParameterName = (typeof PARAM)[keyof typeof PARAM];

/** Fully qualified SSM path for a parameter in the current stage. */
export function parameterPath(name: ParameterName, stage: string = STAGE): string {
  return `${PARAMETER_PREFIX}/${stage}/${name}`;
}

/**
 * The environment variable a parameter falls back to in local development,
 * where there is no AWS account: `group-password-hash` →
 * `FIVE_CROWNS_GROUP_PASSWORD_HASH`.
 */
export function parameterEnvVar(name: ParameterName): string {
  return `FIVE_CROWNS_${name.replaceAll("-", "_").toUpperCase()}`;
}

/**
 * The HMAC key for both cookies. Owned by the deploy, not the panel, so it
 * arrives as an ordinary environment variable rather than through the SSM
 * client — see `sst.config.ts`.
 */
export const SESSION_SECRET_ENV = "SESSION_SECRET";
