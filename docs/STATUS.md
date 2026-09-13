# Status

*Updated at the end of /kickoff, /feature, /ship, /deploy, and /status runs. This is the first file to read when resuming work.*

- **Last updated**: 2026-09-13
- **Phase**: **Milestone 1 is complete.** Stage 5 — "go live and prove it" — shipped via
  [PR #19](https://github.com/ribenajuice/five-crowns/pull/19) (merged 2026-09-13T15:28Z; CI and Deploy both green
  on `main`, deploy completed in 3m0s). All 86 acceptance criteria pass. Two small independent PRs merged alongside
  it: [PR #17](https://github.com/ribenajuice/five-crowns/pull/17) (a code-duplication cleanup) and
  [PR #18](https://github.com/ribenajuice/five-crowns/pull/18) (deploy-role IAM tightening — **template merged, not
  yet applied in AWS**, see below). **Next is Milestone 2** — identity, rosters, and the rest of the admin panel.
  Run `/feature Milestone 2` or a specific slice of it to start.
- **Production URL**: https://fivecrowns.ribenajuice.xyz. Confirmed live post-deploy today (200, valid cert, all
  unauthenticated routes `/`, `/games`, `/admin` still correctly 307 to `/login` with no data or error leakage).
  Valid Amazon certificate, runs to 27 Mar 2027 and renews itself through the kept `_628746…fivecrowns` validation
  CNAME. The CloudFront URL (`darn4m0ss1uf4.cloudfront.net`) **deliberately answers 403** now that the domain is
  attached (SST blocks it by design; founder decision to keep one address, see DECISIONS.md). **If the domain ever
  breaks:** delete `/five-crowns/prod/app-domain` and `app-cert-arn` (ap-southeast-2) and deploy once, and the
  CloudFront URL answers again.
- **Currently in flight**: nothing. Every PR through #19 is merged and deployed. One founder action remains
  outstanding (not blocking, not urgent): re-run `scripts/aws-bootstrap.sh` to actually apply PR #18's IAM
  tightening in AWS — merging its template alone changed nothing live.
- **Stage 5 shipped 2026-09-13** ([PR #19](https://github.com/ribenajuice/five-crowns/pull/19), closing Milestone
  1). An audit-and-prove stage, not new features: every one of the 86 acceptance criteria was re-verified — most on
  a disposable scratch build of the exact deployed code (driving the real HTTP API end-to-end, including the
  founder's real Anthropic key against both fixture sheets and a real targeted column re-photograph), a small set
  credential-free directly against production, and the rest requiring the founder's own phone (already satisfied
  by 2026-09-13's real transcriptions, confirmed cell-by-cell). The Milestone 0 reading-accuracy spike was re-run
  through the real, paid API for the first time — confirmed the original verdict, and found one new, real risk:
  **the final score row can be misread just as often as any other cell** (3 of 6 real-API reads got it wrong,
  identically each time), and unlike interior cells nothing catches it automatically. Documented honestly in
  `docs/PRD.md`'s risk section and `docs/SPIKE-M0-READING.md`, correcting the original spike's overstated "final
  scores are safe" claim — no new build work follows, the existing final-row call-out and the founder's own read
  of it remain the correct mitigation. A milestone-closing security audit found and fixed one real gap (column
  close-up photo uploads had no daily cap — now 200/day); `/code-review high` then found and fixed a same-bug
  regression (a touch-target fix applied to one component but missed an identical sibling) plus eight robustness
  bugs in the new Playwright accessibility harness this stage built. The founder separately flagged the sheet
  rotate icon as looking "funky" — turned out to be a real, already-shipping bug (the icon's arc geometry extended
  outside its own frame and got clipped to a stub, not merely pointing the wrong direction) — fixed everywhere
  `RotateControl` is used. 838 tests passing, lint and typecheck clean.
- **Two more merged alongside Stage 5**: [PR #17](https://github.com/ribenajuice/five-crowns/pull/17) (a
  non-blocking code-duplication cleanup flagged by an earlier review) and
  [PR #18](https://github.com/ribenajuice/five-crowns/pull/18) (the deploy role's Parameter Store grant scoped down
  to this project's own paths — see "Known follow-ups" below for what's still open on that role, and the
  outstanding `aws-bootstrap.sh` re-run needed to actually apply it).
- ✅ **The real API key is live and proven, 2026-09-13**: the founder pasted a real Anthropic key into the
  production admin panel and ran "Read the sheet" on two real scoresheets. Both worked cleanly end-to-end — read,
  reviewed, saved — and **both games are now saved for real in the production record**: the archive is no longer
  empty. This resolves the last standing blocker from Stage 3 and, in effect, Stage 2's on-phone acceptance check
  (capture → review → save on a real device with real credentials). It also gives a first real-world data point
  against the ⚠️ 60s CloudFront-timeout risk noted below: two full transcriptions completed without hitting it.
- **Stage 4 shipped 2026-09-13** ([PR #15](https://github.com/ribenajuice/five-crowns/pull/15)). QA drove the real
  HTTP API end-to-end against both fixture sheets on a disposable scratch environment and passed all in-scope
  acceptance criteria (29–45, 71). A `/code-review high` pass then found and fixed five real bugs before the PR
  opened: a close-up photo could be silently lost if its column was removed by a structural repair before save
  (now kept with the game, unattributed rather than dropped); a column re-read finishing after a 30–60s vision call
  could overwrite an edit made while it was in flight (now uses optimistic concurrency on the draft's `updated_at`,
  retrying rather than clobbering); the close-up upload "try again" button could get permanently stuck after a
  failed presign; inserting/deleting a row could leave the model's uncertainty flag on the wrong row; and
  reading-history timestamps didn't match the app's `en-AU` format used elsewhere. 834 tests passing, lint and
  typecheck clean. ⚠️ **Not yet verified live**: the actual review-screen features (structural repairs, targeted
  re-photograph) require the group password, which only the founder holds. The founder's two real transcriptions
  (below) didn't happen to need any of Stage 4's repair/re-photograph tools, so those specific screens are still
  unverified against a live, real key.
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
  redirects intact, no server errors. ✅ **Verified live 2026-09-13**: the founder pasted a real Anthropic API key
  into production and ran two real transcriptions successfully — see above.
- **Stage 2 shipped 2026-09-12** ([PR #10](https://github.com/ribenajuice/five-crowns/pull/10)). QA passed all its
  acceptance criteria (6–28 except 11, 46–49, 58–70, 73) against both fixture sheets, driving the real HTTP API
  end-to-end. QA and `/code-review high` together found and fixed three real bugs before the PR opened: a
  corrupted migration journal entry that made `npm run db:migrate` (and every deploy) fail silently, a race in the
  daily upload cap that could let more than 40/day through under concurrent requests, and EXIF orientations 5/7
  swapped in the rotation table (a mirrored, sideways photo would land 180° off). ✅ **Verified live 2026-09-13**:
  the founder's two real transcriptions (see above) each ran the full capture → review → save loop end to end on
  real credentials, satisfying the PRD's reserved founder acceptance step. Not yet separately confirmed: criterion
  11's live side-by-side of a manual vs. imported game — both real games so far went through "Read the sheet",
  not full manual entry.
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
- **Blocked on founder**: nothing right now. One optional, non-blocking action outstanding: re-run
  `scripts/aws-bootstrap.sh` (needs founder AWS credentials) to actually apply PR #18's IAM tightening — the
  template merged, but a merge alone changes nothing in AWS, and the first deploy after that re-run should be
  watched.
- **Next up**: **Milestone 2** — identity, rosters, and the rest of the admin panel. Two founder decisions are
  already recorded (`docs/DECISIONS.md`, 2026-09-14): player/location merges are permanent, like a game delete; the
  score download is one combined CSV. Run `/feature Milestone 2` to start, or name a specific slice of it.
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
  - The deploy role's SSM grant was wider than "read": it held `ssm:GetParameter*`, `ssm:PutParameter` **and**
    `ssm:DeleteParameter` on `*` — every parameter in this shared account, including other projects' secrets and
    this project's own `/five-crowns/prod/admin-password-hash`, which the web Lambda is deliberately not allowed to
    write. ✅ **Fixed and merged to `main`** (PR #18, 2026-09-13): those three actions are now scoped to
    `/five-crowns/*` plus the `/sst/*` paths SST itself needs (passphrase, bootstrap). ⚠️ **Not yet applied in AWS**
    — `scripts/aws-bootstrap.sh` needs a founder-credentialed re-run to push the template change live; merging the
    template alone changes nothing. Watch the next deploy once that's done. Still open on that role:
    `kms:Encrypt`/`kms:Decrypt` on `*`, `ssm:DescribeParameters` on `*` (SSM supports no resource scope for it), and
    the unconditioned `iam:PassRole` on `five-crowns-*`.
  - **Stage 2 hazard**: middleware skips image-extension paths, so photo and `/review` routes must call
    `requireGroupSession()` themselves.
  - The Lambda/CloudFront origin timeout is set to 120s (`sst.config.ts`), but CloudFront's *default* per-origin
    response-timeout quota is 60s. ✅ **Partially eased 2026-09-13**: the founder's two real transcriptions both
    completed without hitting it, so it isn't the common case — but with only two data points this isn't proof the
    quota was raised or that a slow call can't still clip at 60s. If "Read the sheet" ever errors out mysteriously
    right around the 60s mark, this is why — the fix is a free AWS support quota-increase request (or lower the SST
    timeout to "60 seconds" and accept a tighter budget for the vision call).
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
- **Milestone 0 verdict** (full findings in `docs/SPIKE-M0-READING.md`): reading gets **97% of cells** right, and
  monotonicity caught **0 of 9** misreads, so the human review screen is the entire quality control. Errors repeat
  deterministically, so don't build "transcribe twice and compare". ⚠️ **Corrected 2026-09-14**: the original
  spike's "100% of final scores" claim was an unsampled zero, not a structural guarantee — a Stage 5 re-run through
  the real API found the final row misread in 3 of 6 reads (see below). Winners stayed correct 6/6, but by margin,
  not because the final row is protected the way interior cells are.
- **Development cost posture**: founder's Claude subscription. The real key is now live and has run two real
  transcriptions (2026-09-13). The M0 spike itself (against the fixture sheets with known ground truth, ~A$0.30)
  is still worth re-running at Stage 5 — the two real games don't substitute for that, since there's no
  independently verified ground truth to score them against. Running cost is expected at about A$0.65/month.
