# Five Crowns Ledger

A permanent, searchable record of a group of friends' Five Crowns nights, built from photographs of the paper scoresheet.

## Who you're working with

The founder is a **product manager, not a developer**. They decide *what* to build and how it should feel; you and the agent team decide *how*. Practically:

- Explain things in product terms, not implementation terms. "Users can now reset passwords" beats "added POST /auth/reset".
- Never ask them technical questions the team can answer (library choice, schema design, AWS service). Decide, record it in `docs/DECISIONS.md`, and mention it.
- Do ask them product questions (who is this for? what happens after the user clicks X?) — and ask early, never mid-build.
- Show, don't describe: UI decisions go through mockup Artifacts they can look at.

## The team

Specialist agents live in `.claude/agents/`. Delegate to them by role — don't do a specialist's job ad-hoc when a workflow calls for that specialist:

| Agent | Owns |
|---|---|
| product-manager | PRD, user stories, scope cuts |
| architect | Stack choices, `docs/ARCHITECTURE.md`, ADRs |
| ui-designer | `docs/DESIGN-SYSTEM.md`, mockups |
| frontend-developer / backend-developer | Implementation |
| qa-engineer | Testing against acceptance criteria |
| devops-engineer | CI/CD, AWS, deploys |
| security-reviewer | Pre-ship security audits |
| tech-writer | README, CHANGELOG, user-facing copy |

## The workflows

| Command | When |
|---|---|
| `/kickoff` | Once, at project start |
| `/feature <description>` | Day-to-day building |
| `/ship` | Merge an approved PR and deploy it |
| `/deploy` | Deploy main / first-time AWS setup |
| `/status` | Catch up after time away |

Requests that arrive without a slash command still follow the same discipline: a build request follows the `/feature` shape (spec → branch → build → QA → PR), even informally.

## Ground rules

- **Branches**: never commit directly to `main`; all work via feature branches and PRs.
- **Docs are the memory**: `docs/PRD.md` (what & why), `docs/ARCHITECTURE.md` (how), `docs/DECISIONS.md` (ADR log), `docs/DESIGN-SYSTEM.md` (look & feel), `docs/STATUS.md` (current state). Keep them current — they're how future sessions get context.
- **Checkpoints, not check-ins**: the founder approves specs and reviews PRs. Between those two points, work autonomously.
- **Secrets**: environment variables only, never in code. AWS auth from CI is OIDC-only (no stored keys).
- **Definition of done**: acceptance criteria verified by QA, CI green, docs updated. Not before.

## Stack & commands

- Stack: **Next.js 15 (App Router) + TypeScript on Node 22**, Tailwind CSS, Drizzle ORM over
  **Turso (libSQL/SQLite)**, deployed to **AWS Lambda + CloudFront + S3 by SST v4** (4.17). Vitest for
  tests. Full reasoning in `docs/ARCHITECTURE.md`.
- Install: `npm ci` (first time: `npm install`)
- Dev server: `npm run dev` — needs a `.env.local`; see `lib/config/README.md`
- Test: `npm test` (`npm run test:watch` while working)
- Lint/typecheck: `npm run lint && npm run typecheck`
- Build: `npm run build`
- Migrations: `npm run db:generate` then `npm run db:migrate` — never edit a live schema by hand,
  and write the reversing file in `lib/db/migrations/down/` in the same commit
- Password hash: `node scripts/hash-password.js` — no AWS, no network. First-time setup *and* the
  admin lockout recovery path
- Deploy: `scripts/deploy.sh` (CI runs it via `.github/workflows/deploy.yml`). It refuses to deploy
  while either password hash or the session secret is missing from Parameter Store

⚠️ **Secrets**: environment variables and SSM Parameter Store only. **No secret is ever stored in
the database** — there is no table one could be in, which is what makes every export secret-free by
construction. `sst.config.ts` and `lib/db/migrations/` are excluded from lint and typecheck (SST's
globals are generated into the gitignored `.sst/`); review them by hand.
