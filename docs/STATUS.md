# Status

*Updated at the end of /kickoff, /feature, /ship, /deploy, and /status runs. This is the first file to read when resuming work.*

- **Last updated**: 2026-09-11
- **Phase**: Milestone 1, **Stage 1 merged (PR #7) and deployed**, but **login returns 500 on the live site until
  [PR #8](https://github.com/ribenajuice/five-crowns/pull/8) merges.** Pages, redirects and security headers all work.
  The failure is the database driver on arm64 Lambda, and PR #8 fixes it.
- **Production URL**: https://darn4m0ss1uf4.cloudfront.net (live since 2026-09-11).
  **Custom domain `fivecrowns.ribenajuice.xyz` is staged, not yet attached.** The ACM cert (us-east-1) is ISSUED,
  the Lightsail CNAME `fivecrowns → darn4m0ss1uf4.cloudfront.net` is in place, and `/five-crowns/prod/app-domain`
  and `app-cert-arn` are saved. The next deploy (the one triggered by merging #8) attaches it.
- **Currently in flight**: [PR #8](https://github.com/ribenajuice/five-crowns/pull/8), branch `fix/first-deploy`,
  covering everything the first deploy needed (it took six attempts):
  - **AWS sign-in:** this repo uses GitHub's **immutable OIDC subject** (`repo:ribenajuice@75055493/five-crowns@1362884474`).
    The deploy role trusted the classic form. `aws-bootstrap.sh` now reads the prefix from GitHub's API.
  - **The deploy role gains:** SQS for `five-crowns-*` queues; `prod-*` roles **only when tagged `sst:app=five-crowns`**
    (SST drops the app name from long role names); `iam:PassRole` on those roles **to Lambda only**, because PassRole
    ignores tags; and the six CloudFront KeyValueStore operations.
  - **Login 500 fix:** production uses `@libsql/client/http` (pure JS). The native `libsql` driver had no arm64 binary
    in the x86-built bundle. It has a regression test.
  - **Turso database lives in Tokyo** (`aws-ap-northeast-1`). Turso has no Australian location. New ADR.
  - ⚠️ **The deploy-role changes are already live in AWS** (applied from the branch). **Don't re-run
    `scripts/aws-bootstrap.sh` from `main` until #8 merges**, or it will restore the broken role.
- **Live and verified so far**: security check 1 (the function URL is `AWS_IAM` and a direct call gets 403); all 13
  tables migrated in Turso; zero-spend budget `five-crowns-prod-zero-spend` emailing darren@ribenajuice.xyz directly
  (no confirmation step).
- **Blocked on founder**: review and merge PR #8.
- **Next up, after the merge deploy**:
  1. Login works (wrong password gives 401).
  2. **Security check 2:** 10 wrong passwords, then 429, and a forged `CloudFront-Viewer-Address` still gets 429.
     The founder has agreed to it running from their home connection (a 10-minute lockout of new logins there).
  3. Time the Sydney↔Tokyo round trip and record it in the Tokyo ADR.
  4. `https://fivecrowns.ribenajuice.xyz` loads with a valid certificate (criterion 84).
  5. Confirm criteria 82, 83 and 86 live.
  6. Founder sets the group up and plays with it. Then **Stage 2**: the Column Sweep review screen with typed entry.
- **Decisions made 2026-09-11** (all in `docs/DECISIONS.md`):
  - **Password hashes are `$`-free** (`scrypt:N:r:p:salt:hash`). Any local hash made before 2026-09-11 must be
    regenerated with `node scripts/hash-password.js`.
  - **Backups are manual** (founder decision): `npm run db:backup`. No nightly job.
  - **Least-privilege infra**: the app can't delete photos; only `main` (via the `production` GitHub environment) can
    deploy; the server function is callable only through CloudFront (OAC + edge signing).
  - **Login trust rules**: on Lambda the rate limiter trusts only CloudFront's viewer address; attempts are counted
    before checking; login posts must be JSON from this site.
  - **SST is v4 (4.17)**, not v3. **Fraunces** is self-hosted via `next/font/google`.
  - **The OIDC subject is GitHub's immutable form**, read from the API, never typed. **The database is in Tokyo.**
    **Shortened SST role names are allowed only by tag**, and handed to Lambda only.
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
  - Nothing in CI builds or runs the app on arm64. The PR #8 regression test pins this crash only.
  - The deploy role still has broad SSM/KMS read and an unconditioned `iam:PassRole` on `five-crowns-*`.
  - **Stage 2 hazard**: middleware skips image-extension paths, so photo and `/review` routes must call
    `requireGroupSession()` themselves.
  - Server timeout 120 s vs CloudFront's 60 s default origin timeout. Revisit at Stage 3.
- **Milestone 0 verdict** (full findings in `docs/SPIKE-M0-READING.md`): reading gets **97% of cells** and **100% of
  final scores and winners** right. ⚠️ Monotonicity caught 0 of 9 misreads, so the human review screen is the entire
  quality control. Errors repeat deterministically, so don't build "transcribe twice and compare".
- **Development cost posture**: founder's Claude subscription. An API key arrives at Stage 3. Re-run the M0 spike
  through the real API (~A$0.30) at Stage 5. Running cost is expected at about A$0.65/month.
