# Database

Turso (libSQL/SQLite) in production, a plain file locally. Same schema, same
migrations — SQLite is SQLite.

## Rules

1. **Schema changes go through a generated migration, never a manual edit.**
   Change `schema.ts`, then `npm run db:generate`. Never `ALTER TABLE` against a
   live database by hand.
2. **Every migration gets a reversible companion** in `migrations/down/`.
   Drizzle Kit only writes the forward direction, so the down file is written by
   hand at the same time, in the same commit.
3. ⚠️ **No secret is ever stored in the database.** No API key, no password
   hash, no signing secret. They live in SSM Parameter Store as SecureStrings.
   This is what makes the admin panel's download and the nightly dump
   secret-free *by construction* rather than by filtering — see
   `docs/ARCHITECTURE.md` § The admin panel.

## Commands

```bash
npm run db:generate      # write a migration from schema.ts
npm run db:migrate       # apply pending migrations to $TURSO_DATABASE_URL
```

With no `TURSO_DATABASE_URL` set, both work against `.data/five-crowns.db`,
which is gitignored. In production `scripts/deploy.sh` runs the migrate step
through `sst shell`, so it gets the same credentials the app does without ever
printing them.
