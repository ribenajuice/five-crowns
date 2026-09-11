# Status

*Updated at the end of /kickoff, /feature, /ship, /deploy, and /status runs. This is the first file to read when resuming work.*

- **Last updated**: 2026-09-11
- **Phase**: Milestone 1, **Stage 1 (Foundations) is live and verified** at **https://fivecrowns.ribenajuice.xyz**.
  Next is Stage 2.
- **Production URL**: https://fivecrowns.ribenajuice.xyz. Valid Amazon certificate, runs to 27 Mar 2027 and renews
  itself through the kept `_628746…fivecrowns` validation CNAME.
  The CloudFront URL (`darn4m0ss1uf4.cloudfront.net`) **deliberately answers 403** now that the domain is attached
  (SST blocks it by design; founder decision to keep one address, see DECISIONS.md). **If the domain ever breaks:**
  delete `/five-crowns/prod/app-domain` and `app-cert-arn` (ap-southeast-2) and deploy once, and the CloudFront URL
  answers again.
- **Currently in flight**: this docs-only PR (branch `docs/first-deploy-results`): the measured Tokyo latency, the
  one-address ADR, criterion 84 reworded, the runbook corrected, and this status.
- **Stage 1 acceptance criteria**: **all pass.**
  - 1–5, 72, 79 and 81: QA against production builds. **Criterion 5 is also proven live:** 10 wrong passwords gave
    401, the 11th gave 429 "Too many tries. Try again later.", and a forged `CloudFront-Viewer-Address` (with or
    without a forged `X-Forwarded-For`) still got 429.
  - 82, 83 and 86: confirmed live. No stored AWS keys; deploys from `main` only via OIDC; photo bucket versioned
    with no expiry rule and all public access blocked; zero-spend budget emailing darren@ribenajuice.xyz.
  - 84 (a Stage 5 criterion, done early, as reworded): the domain answers with a valid certificate, and the
    CloudFront URL is closed by design.
- **Post-deploy security checks**: **both pass.** The server function URL is `AWS_IAM` (a direct call gets 403), and
  the forged-header lockout check holds.
- **Measured**: a warm login takes 0.45–0.58 s; a page with no database work takes 0.13–0.21 s. Each Sydney↔Tokyo
  query costs about 110–130 ms, as the Tokyo ADR estimated. The first request after a deploy (cold start) took 3.9 s.
- **Blocked on founder**: review and merge this docs PR. Then log in on your own phone and share the group password.
- **Next up**: **Stage 2**, the Column Sweep review screen with typed entry, on the founder's phone
  (criteria 6–28, 46–49, 58–70, 73). Run `/feature Milestone 1 Stage 2`.
- **Decisions made 2026-09-11** (all in `docs/DECISIONS.md`):
  - **Password hashes are `$`-free** (`scrypt:N:r:p:salt:hash`). Any local hash made before 2026-09-11 must be
    regenerated with `node scripts/hash-password.js`.
  - **Backups are manual** (founder decision): `npm run db:backup`. No nightly job.
  - **Least-privilege infra**: the app can't delete photos; only `main` (via the `production` GitHub environment) can
    deploy; the server function is callable only through CloudFront (OAC + edge signing).
  - **Login trust rules**: on Lambda the rate limiter trusts only CloudFront's viewer address; attempts are counted
    before checking; login posts must be JSON from this site.
  - **SST is v4 (4.17)**. **Fraunces** is self-hosted via `next/font/google`.
  - **The OIDC subject is GitHub's immutable form**, read from the API, never typed. **The database is in Tokyo.**
    **Shortened SST role names are allowed only by tag**, and handed to Lambda only. **Production uses libSQL's HTTP
    driver.** **One address** (founder decision).
  - **Execution-role agents run on Sonnet** (backend, frontend, QA, tech-writer, designer). Architect, PM,
    security-reviewer and devops stay on the session model.
- **Setup facts worth knowing**:
  - Secrets live in SSM (`session-secret`, both password hashes) and SST (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`).
    Nothing secret is in the repo or the database.
  - The server Lambda's log group isn't at AWS's default path. Look it up with
    `aws lambda get-function-configuration --query LoggingConfig.LogGroup`.
  - The founder's machine runs Node 24 / npm 11. Keep `package-lock.json` npm-10-compatible (`npx npm@10 ci --dry-run`).
    `.nvmrc` pins 22.
  - The Turso CLI is at `~/.turso/turso` (not on PATH). Local `main` tracks `origin/main`.
- **Known follow-ups (non-blocking)**:
  - Nothing in CI builds or runs the app on arm64. PR #8's regression test pins the libSQL crash only.
  - The deploy role still has broad SSM/KMS read and an unconditioned `iam:PassRole` on `five-crowns-*`.
  - **Stage 2 hazard**: middleware skips image-extension paths, so photo and `/review` routes must call
    `requireGroupSession()` themselves.
  - Server timeout 120 s vs CloudFront's 60 s default origin timeout. Revisit at Stage 3.
- **Milestone 0 verdict** (full findings in `docs/SPIKE-M0-READING.md`): reading gets **97% of cells** and **100% of
  final scores and winners** right. ⚠️ Monotonicity caught 0 of 9 misreads, so the human review screen is the entire
  quality control. Errors repeat deterministically, so don't build "transcribe twice and compare".
- **Development cost posture**: founder's Claude subscription. An API key arrives at Stage 3. Re-run the M0 spike
  through the real API (~A$0.30) at Stage 5. Running cost is expected at about A$0.65/month.
