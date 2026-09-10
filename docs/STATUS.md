# Status

*Updated at the end of /kickoff, /feature, /ship, /deploy, and /status runs. This is the first file to read when resuming work.*

- **Last updated**: 2026-09-11
- **Phase**: Milestone 1, **Stage 1 (Foundations) — built locally, not committed, not pushed, not deployed.**
- **Production URL**: — (nothing deployed; no five-crowns stack or Parameter Store entries exist in `ap-southeast-2`)
- **Currently in flight**: branch `feat/m1-foundations`, local only. Last committed work is the M1 delivery spec
  (`f4538d3`); everything since is uncommitted (23 changed/new paths):
  - Scaffold (Next.js, Tailwind, Drizzle, Vitest, SST config), schema + first migration with its down file.
  - Scoring library (monotonicity, hand derivation, winners/ties, roster signature) tested against both fixture sheets.
  - Password gate (group + admin login routes, sessions, rate limiting), `scripts/hash-password.js`, nightly backup handler.
  - Login, empty games list, admin page stubs.
  - Docs: **region corrected to `ap-southeast-2` (Sydney)** in ARCHITECTURE and a new ADR; date default now the browser's
    local day; PRD criterion 66 (ties) reworded because the original edit was unbuildable.
- **Health**: lint ✅ typecheck ✅ tests **248/250** — the failures are all in `tests/config/local-env.test.ts`.
  - ⚠️ **Known bug, pinned by QA on 2026-09-10, not yet fixed**: following the local-setup README verbatim mangles the
    password hash (`.env.local` expands every `$`), so the app starts fine and rejects the correct password. Fix is in
    the README, the hash format, or `lib/config` — the test file names the options.
  - ⚠️ **That test file is also flaky**: the "single quotes do not save it" case passes on some runs and fails on others,
    so its premise depends on the random salt. Settle it when fixing the bug above, or CI will flicker.
  - CI will go red on this branch until both are resolved.
- **Stage 1 still to do**: fix the above; commit + open the Stage 1 PR; QA against criteria 1–5, 72, 79, 81–83, 86;
  first `/deploy` (first-ever AWS provisioning, and the first run of the v6 `configure-aws-credentials` action).
- **Blocked on founder**: nothing blocking. Due soon: the DNS/certificate runbook in `docs/ARCHITECTURE.md`
  (~15 min work, up to an hour waiting) is meant to start at Stage 1 so the domain is ready by Stage 5.
- **Recently landed**:
  - PR #6 — Milestone 0 spike findings. PR #1 — PRD, architecture, decisions, design system. PRs #2–#5 — Action bumps.
- **Milestone 0 verdict** (full findings in `docs/SPIKE-M0-READING.md`):
  - Reading works: **97% of cells**, **100% of final scores and winners** correct across six cold reads.
  - ⚠️ **Monotonicity caught 0 of 9 misreads.** The human review screen is the entire quality control.
  - ⚠️ **Errors repeat deterministically** — do not build "transcribe twice and compare".
  - Hand-by-hand analytics are the exposed data; totals, winners and records are safe.
- **Development cost posture**: founder's Claude subscription. An API key arrives at Stage 3 (admin panel). Re-run the
  spike through the real API (~A$0.30) at Stage 5.
- **Next up**: finish and ship Stage 1 (above), then Stage 2 — the Column Sweep review screen with typed entry, on the
  founder's phone.
