/**
 * ⚠️ PRD criterion 79, exercised the way it can actually fail.
 *
 * `run-backup.test.ts` proves a dump of *hand-inserted* rows is secret-free.
 * That leaves open the case that matters: the app's own code paths writing
 * something secret-shaped while doing its job. So this file logs in through the
 * **real route handlers** for both gates — right and wrong passwords, which is
 * every write the app makes in Stage 1 — then runs the **real nightly dump**
 * and searches it for the actual secrets in play: both password hashes (whole
 * and in pieces), the session secret, both plaintext passwords, the minted
 * session tokens, and anything API-key shaped.
 *
 * It also inspects the live schema column by column, over every table SQLite
 * knows about rather than the hand-kept `ALL_TABLES` list, so a migration that
 * adds a secret-bearing column fails here.
 *
 * No AWS, no network: S3 and `next/headers` are stubbed. A file-backed database
 * because `runBackup` opens its own connection, and a second `:memory:`
 * connection would be a different, empty database.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const puts: { Key?: string; Body?: string }[] = [];

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    async send(command: { input: { Key?: string; Body?: string } }) {
      puts.push(command.input);
      return {};
    }
  },
  PutObjectCommand: class {
    constructor(public input: { Key?: string; Body?: string }) {}
  },
}));

const minted: string[] = [];

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: (_name: string, value: string) => {
      minted.push(value);
    },
  }),
}));

const MIGRATION = fileURLToPath(
  new URL("../../lib/db/migrations/0000_foundations.sql", import.meta.url),
);

const GROUP_PASSWORD = "qa-group-plaintext-7f3a";
const ADMIN_PASSWORD = "qa-admin-plaintext-91c2";
const SESSION_SECRET = "qa-session-secret-d41d8cd98f00b204e980";

let directory: string;
let client: Client;
let groupHash: string;
let adminHash: string;
let dump: string;

function post(path: string, password: string, address: string): Request {
  return new Request(`https://fivecrowns.example.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": address },
    body: JSON.stringify({ password }),
  });
}

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "five-crowns-secret-free-"));
  const url = `file:${join(directory, "test.db")}`;

  process.env.TURSO_DATABASE_URL = url;
  delete process.env.TURSO_AUTH_TOKEN;
  process.env.PHOTOS_BUCKET = "five-crowns-photos";
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = SESSION_SECRET;

  const { hashPassword } = await import("@/lib/auth/password");
  groupHash = await hashPassword(GROUP_PASSWORD);
  adminHash = await hashPassword(ADMIN_PASSWORD);
  process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH = groupHash;
  process.env.FIVE_CROWNS_ADMIN_PASSWORD_HASH = adminHash;

  client = createClient({ url });
  for (const statement of readFileSync(MIGRATION, "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await client.execute(statement);
  }

  const group = (await import("@/app/api/login/route")).POST;
  const admin = (await import("@/app/api/admin/login/route")).POST;

  // Every write Stage 1 makes: failures (rate-limit rows) and successes, on
  // both gates, from more than one address.
  expect((await group(post("/api/login", "wrong", "203.0.113.1"))).status).toBe(401);
  expect((await group(post("/api/login", GROUP_PASSWORD, "203.0.113.1"))).status).toBe(200);
  expect((await admin(post("/api/admin/login", "wrong", "203.0.113.2"))).status).toBe(401);
  expect((await admin(post("/api/admin/login", ADMIN_PASSWORD, "203.0.113.2"))).status).toBe(200);
  expect(minted).toHaveLength(2);

  const { runBackup } = await import("@/lib/backup/handler");
  await runBackup(new Date("2026-09-11T14:15:00Z"));
  expect(puts).toHaveLength(1);
  dump = puts[0]!.Body ?? "";
});

afterAll(async () => {
  const { resetDb } = await import("@/lib/db");
  resetDb();
  client?.close();
  delete process.env.PHOTOS_BUCKET;
  rmSync(directory, { recursive: true, force: true });
});

describe("⚠️ criterion 79 — the dump after both gates have been used", () => {
  it("actually contains the rows the logins wrote, so the search below is not vacuous", () => {
    expect(dump).toMatch(/INSERT INTO "login_attempt"/);
  });

  it("contains neither password hash, whole or in pieces", () => {
    for (const hash of [groupHash, adminHash]) {
      expect(dump).not.toContain(hash);
      // salt and derived key separately, in case anything ever stores a part
      for (const part of hash.split(":").filter((p) => p.length >= 16)) {
        expect(dump).not.toContain(part);
      }
    }
    expect(dump).not.toContain("scrypt:");
  });

  it("contains neither plaintext password", () => {
    expect(dump).not.toContain(GROUP_PASSWORD);
    expect(dump).not.toContain(ADMIN_PASSWORD);
  });

  it("contains no session secret and no minted session token", () => {
    expect(dump).not.toContain(SESSION_SECRET);
    for (const token of minted) {
      expect(dump).not.toContain(token);
      expect(dump).not.toContain(token.split(".")[1]!); // the signature alone
    }
  });

  it("contains nothing API-key shaped", () => {
    expect(dump).not.toMatch(/sk-ant-[A-Za-z0-9_-]{8,}/);
    expect(dump).not.toMatch(/\bAKIA[0-9A-Z]{16}\b/); // AWS access key id
  });
});

describe("⚠️ criterion 79 — no table or column that could hold a secret", () => {
  it("no column in any table SQLite knows about is named like a secret", async () => {
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
    );
    expect(tables.rows.length).toBeGreaterThan(0);

    // Named exceptions, each argued: ip_hash is an HMAC of an address, not a
    // secret; input/output_tokens are counts of model tokens, not credentials.
    // Anything new that matches has to be added here by a reviewer, on purpose.
    const allowed = new Set([
      "login_attempt.ip_hash",
      "transcription.input_tokens",
      "transcription.output_tokens",
    ]);
    const secretShaped =
      /(password|passwd|secret|api_?key|credential|token|hash|salt|private)/i;

    for (const row of tables.rows) {
      const table = String(row.name);
      expect(table).not.toMatch(secretShaped);

      const columns = await client.execute(`PRAGMA table_info("${table}")`);
      for (const column of columns.rows) {
        const qualified = `${table}.${String(column.name)}`;
        if (allowed.has(qualified)) continue;
        expect(qualified).not.toMatch(secretShaped);
      }
    }
  });

  it("the hand-kept ALL_TABLES list matches the real schema exactly", async () => {
    const { ALL_TABLES } = await import("@/lib/db/schema");
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name",
    );
    expect(tables.rows.map((r) => String(r.name)).sort()).toEqual(
      [...ALL_TABLES].sort(),
    );
  });
});
