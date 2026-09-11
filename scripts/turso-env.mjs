#!/usr/bin/env node
/**
 * Turso credentials, from wherever they are — and never printed.
 *
 * Plain `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` in the environment win.
 * Otherwise they come from the `SST_RESOURCE_<name>` variables that `sst shell`
 * sets for linked secrets. ⚠️ SST v4's `sst shell` exports ONLY those
 * (`SST_RESOURCE_TURSO_DATABASE_URL={"value":"…"}`), never the plain names — so
 * without this, `drizzle-kit migrate` and `npm run db:backup` run under
 * `sst shell` would quietly fall back to the local dev file and report success.
 *
 * As a command it runs another command with the two plain variables set:
 *
 *   npx sst shell --stage prod -- \
 *     node scripts/turso-env.mjs --require-remote -- npx drizzle-kit migrate
 *
 * `--require-remote` refuses to run unless the URL is a remote Turso database
 * with a token — that is what `scripts/deploy.sh` uses for migrations.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The `value` of a linked SST secret, or undefined. */
function fromSstLink(env, name) {
  const raw = env[`SST_RESOURCE_${name}`];
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw)?.value;
    return typeof value === "string" && value !== "" ? value : undefined;
  } catch {
    return undefined;
  }
}

/** `{ url, authToken }`, either possibly undefined. */
export function tursoCredentials(env = process.env) {
  return {
    url: env.TURSO_DATABASE_URL || fromSstLink(env, "TURSO_DATABASE_URL") || undefined,
    authToken: env.TURSO_AUTH_TOKEN || fromSstLink(env, "TURSO_AUTH_TOKEN") || undefined,
  };
}

/** Same rule as `isRemoteDatabase` in lib/db/url.ts. */
export function isRemote(url) {
  return typeof url === "string" && (url.startsWith("libsql://") || url.startsWith("https://"));
}

function main(argv) {
  let requireRemote = false;
  let i = 0;
  if (argv[i] === "--require-remote") {
    requireRemote = true;
    i += 1;
  }
  if (argv[i] === "--") i += 1;
  const command = argv.slice(i);

  if (command.length === 0) {
    console.error("usage: node scripts/turso-env.mjs [--require-remote] -- <command> [args…]");
    return 2;
  }

  const { url, authToken } = tursoCredentials();

  if (requireRemote && !isRemote(url)) {
    console.error("❌ No remote Turso database URL (TURSO_DATABASE_URL, or the linked SST secret).");
    console.error("   Refusing to run against a local file. Run this under `npx sst shell --stage <stage>`.");
    return 1;
  }
  if (requireRemote && !authToken) {
    console.error("❌ No Turso auth token (TURSO_AUTH_TOKEN, or the linked SST secret).");
    return 1;
  }

  const env = { ...process.env };
  if (url) env.TURSO_DATABASE_URL = url;
  if (authToken) env.TURSO_AUTH_TOKEN = authToken;

  const result = spawnSync(command[0], command.slice(1), { stdio: "inherit", env });
  if (result.error) {
    console.error(`❌ Could not run ${command[0]}: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
