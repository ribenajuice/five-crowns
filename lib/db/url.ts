/**
 * Where the database lives.
 *
 * Local development is a plain libSQL file on disk with the same schema as
 * production — SQLite is SQLite. Production is Turso over HTTP, so there is no
 * connection-pool problem in Lambda.
 *
 * ⚠️ `TURSO_AUTH_TOKEN` is a credential and comes from the environment only.
 * It is an SST secret because it is needed to *deploy and migrate*; it is never
 * written into the database and never reaches the browser.
 */

/** The dev database. Gitignored — see `.gitignore`. */
export const LOCAL_DATABASE_URL = "file:./.data/five-crowns.db";

export interface DatabaseCredentials {
  url: string;
  authToken?: string;
}

export function databaseCredentials(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseCredentials {
  const url = env.TURSO_DATABASE_URL ?? LOCAL_DATABASE_URL;
  const authToken = env.TURSO_AUTH_TOKEN;
  return authToken ? { url, authToken } : { url };
}

export function isRemoteDatabase(url: string): boolean {
  return url.startsWith("libsql://") || url.startsWith("https://");
}
