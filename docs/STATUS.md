# Status

*Updated at the end of /kickoff, /feature, /ship, /deploy, and /status runs. This is the first file to read when resuming work.*

- **Last updated**: 2026-09-11
- **Phase**: Milestone 1, **Stage 1 (Foundations) — built, QA-verified, security-reviewed; PR #7 awaiting founder review.**
  Not yet deployed.
- **Production URL**: — (nothing for five-crowns exists in AWS yet; first deploy follows the merge)
- **Currently in flight**: [PR #7](https://github.com/ribenajuice/five-crowns/pull/7), branch `feat/m1-foundations`.
  - QA: criteria 1–5, 72, 79, 81, 83 **PASS** against a production build (twice — before and after fixes).
    82, 86 and the bucket half of 83 are config-verified; live checks happen at `/deploy`.
  - Security: initial audit SHIP WITH FIXES → re-check **SHIP**. 345 tests, lint, typecheck, build green.
- **Decisions made today** (all in `docs/DECISIONS.md`):
  - **Password hashes are `$`-free** (`scrypt:N:r:p:salt:hash`) — the old format was silently mangled by `.env.local`.
    Any local hash made before 2026-09-11 must be regenerated with `node scripts/hash-password.js`.
  - **Backups are manual** (founder decision): `npm run db:backup`. No nightly job. PRD criterion 83 reworded, Risk 7 added.
  - **Least-privilege infra**: the app can't delete photos; only `main` (via the `production` GitHub environment)
    can deploy; the server function is callable only through CloudFront (OAC + edge signing).
  - **Login trust rules**: the rate limiter trusts only CloudFront's viewer address on Lambda; attempts are counted
    before checking; login posts must be JSON from this site.
  - **SST is v4 (4.17)**, not v3 — three v3 habits that would have broken the first deploy are fixed.
  - **Fraunces** is loaded via `next/font/google`, self-hosted at build.
  - **Execution-role agents run on Sonnet** (backend, frontend, QA, tech-writer, designer) to save usage; architect,
    PM, security-reviewer and devops stay on the session model.
- **Custom domain**: ACM certificate for `fivecrowns.ribenajuice.xyz` (us-east-1) is **ISSUED** (validated 2026-09-11).
  Remaining: runbook steps 6–8 in `docs/ARCHITECTURE.md` — after the first deploy succeeds on the CloudFront URL.
- **Blocked on founder**: review and merge PR #7.
- **Next up**: `/ship` (or merge + `/deploy`) — first-time AWS setup: `scripts/aws-bootstrap.sh`, Turso secrets,
  session secret, both password hashes, budget email, then the post-deploy checks (incl. forged-header and direct
  function-URL checks for criterion 5). Then domain steps 6–8. Then Stage 2 — the Column Sweep review screen with
  typed entry, on the founder's phone.
- **Known follow-ups (non-blocking)**:
  - Deploy role still has broad SSM/KMS read and an unconditioned `iam:PassRole` on `five-crowns-*`.
  - **Stage 2 hazard**: middleware skips image-extension paths — photo and `/review` routes must call
    `requireGroupSession()` themselves.
  - Server timeout 120 s vs CloudFront's 60 s default origin timeout — revisit at Stage 3.
- **Milestone 0 verdict** (full findings in `docs/SPIKE-M0-READING.md`):
  - Reading works: **97% of cells**, **100% of final scores and winners** correct across six cold reads.
  - ⚠️ **Monotonicity caught 0 of 9 misreads.** The human review screen is the entire quality control.
  - ⚠️ **Errors repeat deterministically** — do not build "transcribe twice and compare".
- **Development cost posture**: founder's Claude subscription; an API key arrives at Stage 3. Re-run the M0 spike
  through the real API (~A$0.30) at Stage 5.
