# Status

*Updated at the end of /kickoff, /feature, /ship, /deploy, and /status runs. This is the first file to read when resuming work.*

- **Last updated**: 2026-09-14
- **Phase**: Milestone 1 is complete and live (Stage 5, [PR #19](https://github.com/ribenajuice/five-crowns/pull/19),
  merged 2026-09-13). **Milestone 2 is now complete and live in production** — all four stages merged and
  deployed. Its full delivery spec (87 criteria, 87–174, across four stages) is written in `docs/PRD.md`.
  **Stage 1** (the admin panel finished — both password changes, the forgotten-password runbook, the score CSV,
  usage and spend) is merged and deployed ([PR #21](https://github.com/ribenajuice/five-crowns/pull/21),
  2026-09-14). PRD open question 5 (the IAM grant blocking in-panel password rotation) is **resolved**: the
  founder chose to widen the grant, re-accepting the risk a 2026-09-11 review had closed, in exchange for
  in-panel rotation actually working — recorded as an ADR, and a security-reviewer pass scoped to the widening
  found it implemented correctly with no blocking issues. **Stage 2** (editing and deleting a saved game, plus
  app-level 404/error screens) is also merged and live
  ([PR #22](https://github.com/ribenajuice/five-crowns/pull/22), 2026-09-14). **Stage 3** (player, roster and
  place pages, plus renaming and in-app navigation to reach them) is also merged and live
  ([PR #25](https://github.com/ribenajuice/five-crowns/pull/25), 2026-09-14). **Stage 4** (suggested player-name
  matching, and permanent player/place merging) — the closing stage of Milestone 2 — is also merged and live
  ([PR #27](https://github.com/ribenajuice/five-crowns/pull/27), 2026-09-14).
- **Production URL**: https://fivecrowns.ribenajuice.xyz. Confirmed live post-deploy today (200, valid cert, all
  unauthenticated routes `/`, `/games`, `/admin` still correctly 307 to `/login` with no data or error leakage).
  Valid Amazon certificate, runs to 27 Mar 2027 and renews itself through the kept `_628746…fivecrowns` validation
  CNAME. The CloudFront URL (`darn4m0ss1uf4.cloudfront.net`) **deliberately answers 403** now that the domain is
  attached (SST blocks it by design; founder decision to keep one address, see DECISIONS.md). **If the domain ever
  breaks:** delete `/five-crowns/prod/app-domain` and `app-cert-arn` (ap-southeast-2) and deploy once, and the
  CloudFront URL answers again.
- **Currently in flight**: nothing — **Milestone 2 is complete**, all four stages merged and live.
  - ✅ [PR #27](https://github.com/ribenajuice/five-crowns/pull/27) — **Milestone 2 Stage 4**, suggested
    player-name matching, and permanent player/place merging (criteria 148–166, 172–173). **Shipped 2026-09-14,
    closing Milestone 2.** The spec was already written 2026-09-10 (with 172–173 added 2026-09-14);
    product-manager found it ready to build as-is with **six team-level consistency fixes** applied before
    build (a contradictory worked example, unstated boundary inclusivity, a missing `photo.playerId` repoint on
    merge, wiring the merge action into Stage 3's location-rename-collision refusal as promised, excluding
    already-assigned columns from re-matching, and a left-to-right tie-break) — no founder input needed. QA
    drove the real running app end-to-end against all 17 criteria, with particular rigor on the two
    irreversible merge paths (roster folding in both directions, the same-game refusal, a forced
    mid-transaction failure) and the matching boundary/ambiguity math using real constructed name pairs — found
    and fixed one real bug (tapping "someone new" didn't pre-fill the handwritten name, contradicting an
    explicit, four-times-stated criterion). A security review scoped to the three new merge/matching endpoints
    found the auth, CSRF, injection-surface and transactional atomicity all correct (verified against the
    actual libSQL driver, not just code comments) — one low-likelihood but permanent-consequence gap was closed
    anyway (the player merge didn't re-check both players still existed inside its own transaction, unlike its
    location-merge sibling). `/code-review high` then found and fixed a real matcher bug (a pending "someone
    new" name wasn't excluded from later suggestions) and a latent error-handling landmine (two same-named but
    incompatible error classes). Three small things deliberately deferred as non-blocking (see "Known
    follow-ups" below). Merged, deployed — including migration 0004 (dropping the unused
    `player.merged_into_id` placeholder), confirmed applied in the deploy log — and verified live: every new
    merge page 307s to `/login` and every new merge API 401s without a session.
  - ✅ [PR #25](https://github.com/ribenajuice/five-crowns/pull/25) — **Milestone 2 Stage 3**, player, roster and
    place pages, renaming, and in-app navigation to reach them (criteria 132–146, 174). **Shipped 2026-09-14.**
    The spec was already written 2026-09-10; product-manager confirmed it unaffected by Stages 1–2 and ready to
    build as-is, with one gap found at the checkpoint — no criterion required the new pages to be *reachable*
    without typing a URL — put to the founder and approved same day as **criterion 174**. QA drove the real app
    end-to-end and passed all 15 criteria plus 174, catching two real bugs along the way (a missing server-side
    length cap on location renaming, and a player-page winner marker with no accessible text) — both fixed and
    re-verified. `/code-review high` then found two more real regressions in the new "stretched link" pattern
    used for in-row navigation: it silently broke tapping most of a game row to open the game (a CSS
    stacking/pointer-events issue, verified with a headless-Chromium hit-test before and after the fix, not just
    reasoned through) and lost information from the row's accessible name. Both fixed, plus two smaller
    consistency gaps (a duplicate-roster-name check that missed doubled internal whitespace; "1 games" instead
    of "1 game"). A security review scoped to the two new API routes (roster/location rename) found no blocking
    issues. Merged, deployed, and verified live: `/players`, `/rosters` and `/places` all correctly 307 to
    `/login`, and both new rename API routes 401 without a session. Three small things deliberately deferred as
    non-blocking, listed under "Known follow-ups" below.
  - ✅ [PR #21](https://github.com/ribenajuice/five-crowns/pull/21) — **Milestone 2 Stage 1**, the admin panel
    finished. **Shipped 2026-09-14**: password rotation, the forgotten-password recovery runbook, the combined
    score CSV download, and usage/spend reporting. PRD open question 5 (the password routes needed an SSM write
    permission the app was deliberately never given) was resolved by the founder widening the grant to all seven
    app-owned parameters, re-accepting the risk a 2026-09-11 review had closed — recorded as an ADR in
    `docs/DECISIONS.md`. A security-reviewer pass scoped specifically to the widening found it implemented
    correctly and minimally (exact seven-parameter resource list, no wildcard, no extra actions, no KMS
    statement added, no parameter-name injection path in the route code) with no blocking issues. Merged,
    deployed, and verified live: root and `/admin` still 307 to `/login`, and all four new admin API routes
    (`/api/admin/export`, `/api/admin/usage`, `/api/admin/password/group`, `/api/admin/password/admin`) return
    401 without a session. ⚠️ **Not yet verified**: actually exercising the password-change forms, the CSV
    download and the usage panel live, since they sit behind the admin password, which only the founder holds.
  - ✅ [PR #22](https://github.com/ribenajuice/five-crowns/pull/22) — **Milestone 2 Stage 2**, editing and deleting
    a saved game, plus app-level 404/error screens. **Shipped 2026-09-14**: QA and security review both passed
    after two rounds of real bugs found and fixed (see below); a subsequent `/code-review high` pass found three
    more real issues (stale edit-draft resume, a TOCTOU misreport, a silently swallowed autosave failure), all
    fixed. Merged, deployed, and verified live: the login gate still correctly redirects every route — including a
    made-up game id and a nonexistent path — to `/login` with no data or error leakage. ⚠️ **Not yet verified**: the
    actual edit/delete screens and the new 404/error pages, since they sit behind the group password, which only the
    founder holds — same pattern as prior stages' on-phone acceptance step.
  - [PR #23](https://github.com/ribenajuice/five-crowns/pull/23) — docs-only wrap-up for Stage 2 (CHANGELOG entry
    moved from Unreleased to a dated, shipped heading; README's status line updated). CI green, **needs the
    founder's merge** — this is a normal review checkpoint, not a blocker on anything else.
  - One separate, non-urgent founder action: re-run `scripts/aws-bootstrap.sh` to actually apply PR #18's IAM
    tightening in AWS — merging its template alone changed nothing live.
- **Stage 2 build notes (2026-09-14, not yet shipped)**: this is the first code in the project that writes over or
  destroys real history, and it was treated accordingly. Security review found and a fix landed for: both "Edit
  this game" and "Delete permanently" being **completely non-functional in a real browser** (neither fetch call set
  `Content-Type`, so the app's own CSRF guard 415'd every real tap — every unit test passed because they built
  requests correctly, only clicking the actual buttons caught it), and a crafted `photoId` mismatch that could
  permanently corrupt an edit draft with no way to recover it. QA independently verified both fixes live and found
  a missing README section (the founder's own `aws s3` cleanup command). A `/code-review high` pass then found
  several more real issues — a stale edit draft reachable after its game was deleted, a rare race that could
  misreport a deleted-game save as a missing-photo one, and an autosave failure the review screen was silently
  swallowing instead of showing — fix in progress.
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
- **Next up**: **Milestone 3 — The records board and the analytics**, not yet specced in detail. The records
  board (the four named records plus the proposed extras) becomes the landing screen past the password gate;
  round winners, rivalry (head-to-head, streaks, nemesis), score distributions, hand-by-hand villains, and
  location/time slices are all derivable from data already captured — no migration needed for any of it. Sample
  sizes and the withholding rules (nothing crowned under 10 games, no player ranked under 5) apply throughout.
  Run `/feature Milestone 3` to start, or name a specific slice of it (the records board alone is a reasonable
  first cut).
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
  - **Milestone 2 Stage 3** (people, sets and places), flagged by `/code-review high` and deliberately deferred as
    non-blocking: `lib/locations/rename.ts`'s check-then-write on a name collision isn't transactional, so two
    simultaneous renames to the same name give the loser a generic 500 instead of a clean 409 — needs two people
    renaming the same place at the same instant, and the unique index means the data itself stays correct either
    way. `getRosterPage` loads every roster's members via `membersByRoster()` just to read one roster's list —
    fine at this project's scale, would want a scoped query if roster counts ever grow large. `RosterRenameControl`
    and `PlaceRow` each hand-roll the same "reveal a rename form in place" state machine instead of sharing one
    component — already drifting (only one of the two calls `router.refresh()`), worth collapsing into a shared
    `RenameControl` next time either needs a real change.
  - **Milestone 2 Stage 4** (identity, repaired), flagged by `/code-review high` and deliberately deferred as
    non-blocking: the review screen's column picker calls its own "closest matches" lookup helper three times
    per render (a length check, a filter, and the list itself), each rebuilding a lookup map from scratch —
    fine at a friend group's scale, worth a `useMemo` if the player list ever grows large. `previewPlayerMerge`
    fetches every one of a player's `game_player` rows just to count them, instead of a SQL `count(*)` the way
    a sibling roster-games-count function already does — same "fine at this scale" reasoning. `PickList`'s
    "someone new" field only seeds its pre-filled name from React state set once on mount, so if a future change
    ever kept one `PickList` instance mounted across a change of which column it's editing (nothing today does
    this — each column's picker fully unmounts the previous one), the field could show a stale name; not live,
    just worth remembering if that assumption ever changes.
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
