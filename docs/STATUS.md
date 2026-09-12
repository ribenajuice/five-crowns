# Status

*Updated at the end of /kickoff, /feature, /ship, /deploy, and /status runs. This is the first file to read when resuming work.*

- **Last updated**: 2026-09-12
- **Phase**: Milestone 1, **Stage 3 is live** at **https://fivecrowns.ribenajuice.xyz** — reading a sheet
  automatically now works (streamed progress, pre-fills the Stage 2 review screen), and the admin panel's API key
  form is real (tested live before saving, write-only after). Shipped via
  [PR #12](https://github.com/ribenajuice/five-crowns/pull/12) (merged and deployed 2026-09-12; CI and Deploy both
  green on `main`). Next is Stage 4.
- **Production URL**: https://fivecrowns.ribenajuice.xyz. Valid Amazon certificate, runs to 27 Mar 2027 and renews
  itself through the kept `_628746…fivecrowns` validation CNAME.
  The CloudFront URL (`darn4m0ss1uf4.cloudfront.net`) **deliberately answers 403** now that the domain is attached
  (SST blocks it by design; founder decision to keep one address, see DECISIONS.md). **If the domain ever breaks:**
  delete `/five-crowns/prod/app-domain` and `app-cert-arn` (ap-southeast-2) and deploy once, and the CloudFront URL
  answers again.
- **Currently in flight**: nothing. [PR #11](https://github.com/ribenajuice/five-crowns/pull/11) (Stage 2 docs) and
  [PR #12](https://github.com/ribenajuice/five-crowns/pull/12) (Stage 3) are both merged and deployed.
- **Stage 3 shipped 2026-09-12** ([PR #12](https://github.com/ribenajuice/five-crowns/pull/12)). QA, a
  security-reviewer pass, and two independent `/code-review` runs together found and fixed real bugs before and
  after the PR opened, most notably: the admin session cookie was scoped to `Path=/admin`, making `/api/admin/*`
  completely unreachable in a real browser (fixed — both cookies now use `Path=/`); a photo whose transcribe
  attempt hit the daily cap was claimed by an empty draft *before* the cap check ran, so manual entry's guaranteed
  fallback (criterion 56) would 409 for that one photo (fixed — cap and photo-read now happen before any draft is
  claimed); a stream-controller crash reachable by an ordinary disconnected phone mid-call; an over-broad IAM grant
  letting the app `PutParameter` over both password hashes though it only ever writes the API key; a missing
  double-submit guard on "Read the sheet"; and an admin-panel bug where a brand-new key could show the *previous*
  key's failed status. 697 tests passing, lint and typecheck clean. Confirmed live post-deploy: login gate and
  redirects intact, no server errors. ⚠️ **Not yet verified live**: an actual sheet transcription with a real
  Anthropic API key — the founder has one ready and hasn't pasted it into the production admin panel yet.
- **Stage 2 shipped 2026-09-12** ([PR #10](https://github.com/ribenajuice/five-crowns/pull/10)). QA passed all its
  acceptance criteria (6–28 except 11, 46–49, 58–70, 73) against both fixture sheets, driving the real HTTP API
  end-to-end. QA and `/code-review high` together found and fixed three real bugs before the PR opened: a
  corrupted migration journal entry that made `npm run db:migrate` (and every deploy) fail silently, a race in the
  daily upload cap that could let more than 40/day through under concurrent requests, and EXIF orientations 5/7
  swapped in the rotation table (a mirrored, sideways photo would land 180° off). ⚠️ **Not yet verified live**: an
  actual capture → review → save run on the founder's own phone with the group password — the PRD reserves this as
  the founder's own acceptance step, and it needs credentials this session doesn't hold.
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
- **Blocked on founder**: paste the real Anthropic API key into the production admin panel
  (`https://fivecrowns.ribenajuice.xyz/admin`) and try "Read the sheet" on a real photo — the one thing nobody but
  the founder can verify. Also still open: the Stage 2 on-phone acceptance check (capture → review → save,
  criterion 11's live side-by-side of a manual vs. imported game would come for free once a real key exists).
- **Next up**: Stage 4 — the rest of the manual-override ladder: structural repairs (add/remove/reorder a column,
  insert/delete a value) and the targeted per-column re-photograph (criteria 29–45, 71). Run
  `/feature Milestone 1 Stage 4`.
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
  - ⚠️ **Watch this on the founder's first real transcription**: the Lambda/CloudFront origin timeout is set to
    120s (`sst.config.ts`), but CloudFront's *default* per-origin response-timeout quota is 60s and this is
    unverified against a real call. If "Read the sheet" errors out mysteriously right around the 60s mark, this is
    why — the fix is a free AWS support quota-increase request (or lower the SST timeout to "60 seconds" and accept
    a tighter budget for the vision call).
  - No component-rendering test harness (jsdom/Playwright) exists yet. Criterion 73 (375px/1280px, 44px touch
    targets, focus visibility) and other pixel-level review-screen behaviour are verified by reading the code,
    not by rendering it. Worth a Playwright smoke test in a later stage.
  - Small duplications code review flagged as cleanup, not bugs: an HMAC-hex helper duplicated between
    `lib/photos/local-url.ts` and `lib/auth/ip-hash.ts`; `resolvePlayers` in `lib/games/save.ts` doing sequential
    per-column DB lookups instead of one batched query; `lib/vision/usage-cap.ts` duplicating
    `lib/photos/upload-cap.ts`'s atomic-increment pattern rather than sharing it.
  - The admin cookie's `Path` changed from `/admin` to `/` in Stage 3 (fixing a real reachability bug) — a
    browser holding a pre-Stage-3 `Path=/admin` cookie may keep both until it expires. Harmless: revocation is
    checked from the token's own signed epoch, not cookie freshness, so this can't grant stale access.
- **Milestone 0 verdict** (full findings in `docs/SPIKE-M0-READING.md`): reading gets **97% of cells** and **100% of
  final scores and winners** right. ⚠️ Monotonicity caught 0 of 9 misreads, so the human review screen is the entire
  quality control. Errors repeat deterministically, so don't build "transcribe twice and compare".
- **Development cost posture**: founder's Claude subscription. The API key panel exists now (Stage 3) — the founder
  has a real key ready to paste in. Re-run the M0 spike through the real API (~A$0.30) at Stage 5. Running cost is
  expected at about A$0.65/month.
