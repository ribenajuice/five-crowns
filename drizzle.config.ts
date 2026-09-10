/**
 * Drizzle Kit configuration.
 *
 * Local development runs against a plain libSQL file; production is Turso.
 * SQLite is SQLite, so the same generated migrations apply to both
 * (docs/ARCHITECTURE.md § Environments and configuration).
 *
 *   npm run db:generate   # write a new migration from schema.ts
 *   npm run db:migrate    # apply pending migrations
 *
 * In production `scripts/deploy.sh` runs the migrate step through `sst shell`,
 * so it gets the same Turso credentials the app does without printing them.
 * ⚠️ Schema changes always go through a generated migration — never a manual
 * edit against a live database.
 */
import { defineConfig } from "drizzle-kit";

import { LOCAL_DATABASE_URL } from "./lib/db/url";

const url = process.env.TURSO_DATABASE_URL ?? LOCAL_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

export default defineConfig(
  isRemote
    ? {
        dialect: "turso",
        schema: "./lib/db/schema.ts",
        out: "./lib/db/migrations",
        dbCredentials: { url, authToken },
      }
    : {
        dialect: "sqlite",
        schema: "./lib/db/schema.ts",
        out: "./lib/db/migrations",
        dbCredentials: { url },
      },
);
