/**
 * The migrations journal (`lib/db/migrations/meta/_journal.json`) is
 * drizzle-kit's own bookkeeping, not something the app or the test suite
 * reads — `tests/helpers/db.ts` applies every `*.sql` file in filename order
 * and never looks at the journal at all. That is exactly why a corrupt
 * journal can sit in the repo, green across all 500-odd other tests, CI
 * included, while `npm run db:migrate` (and therefore `scripts/deploy.sh`,
 * which runs the same command against production Turso) is silently broken.
 *
 * ⚠️ QA regression: found 2026-09-12 on `feat/m1-stage2`. The journal carried
 * two entries at `idx: 1` — the real `0001_player_name_key_and_upload_cap`
 * and an orphan `0001_last_jetstream` with no matching `.sql` file (a
 * `drizzle-kit generate` name that was evidently discarded without cleaning
 * up the journal). `drizzle-kit migrate` exits 1 in well under a second with
 * no visible error message under its spinner UI, and writes a 0-byte
 * database file. Confirmed against a real `file:` database: removing the
 * orphan entry made `npm run db:migrate` succeed immediately. This test pins
 * the two invariants that failure violated, so the same mistake fails CI
 * next time instead of surfacing as a broken local setup or a broken deploy.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../lib/db/migrations/", import.meta.url));
const JOURNAL_PATH = fileURLToPath(
  new URL("../../lib/db/migrations/meta/_journal.json", import.meta.url),
);

interface JournalEntry {
  idx: number;
  tag: string;
}

function readJournal(): { entries: JournalEntry[] } {
  return JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as { entries: JournalEntry[] };
}

function sqlFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

describe("lib/db/migrations/meta/_journal.json is internally consistent", () => {
  it("has no duplicate idx — drizzle-kit migrate silently fails against a real database when it does", () => {
    const { entries } = readJournal();
    const idxs = entries.map((e) => e.idx);
    expect(new Set(idxs).size).toBe(idxs.length);
  });

  it("every entry's tag has a matching committed .sql file", () => {
    const { entries } = readJournal();
    const files = sqlFiles();
    for (const entry of entries) {
      expect(files).toContain(`${entry.tag}.sql`);
    }
  });

  it("every committed .sql file has a journal entry — nothing silently unapplied", () => {
    const { entries } = readJournal();
    const tags = new Set(entries.map((e) => e.tag));
    for (const file of sqlFiles()) {
      expect(tags.has(file.replace(/\.sql$/, ""))).toBe(true);
    }
  });

  it("idx values are contiguous from 0 — drizzle-kit's apply order depends on it", () => {
    const { entries } = readJournal();
    const idxs = [...entries.map((e) => e.idx)].sort((a, b) => a - b);
    expect(idxs).toEqual(entries.map((_, i) => i));
  });
});
