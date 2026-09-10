# Decision log (ADRs)

*Append-only. Newest first. Every significant technical or product decision gets an entry — this is how future sessions avoid relitigating settled questions.*

Format:

## YYYY-MM-DD — Short decision title
- **Context**: what forced a choice
- **Decision**: what we chose
- **Alternatives**: what we didn't, and why not
- **Consequences**: what this makes easier/harder; revisit-if condition

---

<!-- Entries go below this line -->

> **Currency.** The founder is in Australia: **costs are quoted in Australian dollars (A$)**.
> AWS, Anthropic and Turso all bill in **US dollars**, so entries dated before 2026-09-10 quote
> their USD list prices as published. Conversions in this log assume **US$1 ≈ A$1.55**; re-check
> the rate before relying on a figure. The running-cost ceiling is **A$30/month** (originally
> written as US$20).

## 2026-09-11 — $-free password hash format

- **Context**: QA followed `lib/config/README.md` § Local development verbatim and the app refused
  the correct password with nothing in the logs. The stored hash was `scrypt$N$r$p$salt$hash`, and
  Next's `.env.local` loader expands every `$` (quoted or not — the quotes are gone before
  expansion runs), so the salt and hash were silently deleted. Whether a given hash survived
  depended on its random bytes, which also made one test flaky. The same hash is pasted into an
  `aws ssm put-parameter` command in the first-time-setup / lockout runbook, where a `$` in double
  quotes is mangled the same way. Nothing has been deployed and no hash exists anywhere yet.
- **Decision**: the stored format is now **`scrypt:N:r:p:salt:hash`, with salt and hash in unpadded
  base64url** — only `[A-Za-z0-9:_-]`. scrypt and its parameters (N=16384, r=8, p=1, 32-byte key,
  16-byte salt) and the constant-time compare are unchanged. The parser is strict and **the old `$`
  form is not accepted**. The login path now logs `login.malformed_password_hash` (never the value)
  when the stored hash does not parse, so this failure can never again look like a wrong password.
- **Alternatives**: (a) *Document "escape every `$` as `\$`"* — works, but relies on a human doing
  it perfectly at a lockout, and the README's plain paste would still break. (b) *Have `lib/config`
  repair the value* — impossible; expansion destroys the bytes. (c) *Tell people to quote it* — does
  nothing, as `tests/config/local-env.test.ts` shows. (d) *Keep reading the `$` form too* — nothing
  holds one, and a second accepted format is a second thing to get wrong.
- **Consequences**: the hash pastes safely into `.env.local`, a shell command or the AWS console
  with no quoting rules to remember. Any `$`-format hash generated before this change (e.g. in a
  developer's `.env.local`) must be regenerated with `node scripts/hash-password.js`; the log line
  says so. Revisit if the hash algorithm changes — the new format must keep to the same alphabet.

## 2026-09-10 — Region correction: ap-southeast-2 (Sydney), not eu-west-2 (London)

- **Context**: the hosting ADR below ("Stack and hosting", same date) placed the app in
  **`eu-west-2` (London)** and justified it as *"founder and players are UK-based"*. ⚠️ **That
  justification rested on a factual error: the founder is in Australia, not the UK.** It was never
  a weighing of options that went the wrong way — the input was simply wrong, which is also why
  this log now carries a currency note quoting costs in Australian dollars. The error was caught
  **before anything was provisioned**: no stack has been deployed, and no AWS resource — bucket,
  distribution, Lambda, parameter, schedule — exists in any region. The founder's AWS CLI is
  already configured for `ap-southeast-2`, and the Stage 1 infrastructure code (`sst.config.ts`,
  `scripts/deploy.sh`) was written against `ap-southeast-2`. **The code was right; the docs were
  behind.** Fixing this today costs an editing session. Fixing it after a deploy means recreating
  every resource, re-issuing DNS, and moving photos between buckets.
- **Decision**: **the app region is `ap-southeast-2` (Sydney)**, one region, prod only. Everything
  that has a region follows it:
  - **Lambda, CloudFront's origin, SSM Parameter Store, CloudWatch Logs, EventBridge Scheduler** —
    `ap-southeast-2`.
  - **The S3 photo bucket `five-crowns-photos`** — `ap-southeast-2`, so browser uploads go to the
    near bucket and the Lambda reads it in-region.
  - **The Turso database** — its primary location is Sydney (`syd`), not London (`lhr`). The photo
    upload and the vision call dominate the latency budget, but there is no reason to put the
    database on the other side of the planet from the only thing that queries it.
  - **The nightly backup Lambda and its S3 destination** — same region, same bucket.
  - ⚠️ **The one thing that does *not* follow the app region: the ACM certificate for the custom
    domain must still be issued in `us-east-1`.** CloudFront accepts certificates from `us-east-1`
    only, whatever region the app runs in. This constraint is **unchanged by this ADR** and is the
    single most common way a first deploy fails, because the error message never says so. The
    runbook in `docs/ARCHITECTURE.md` is correct as written and was deliberately left alone.
  - **The "Stack and hosting" ADR below is not rewritten.** This log is append-only; its region
    line is marked superseded and points here, so the history of the mistake survives.
- **Alternatives**: (a) *Stay in `eu-west-2`* — the only argument for it was a false premise, and
  it carries a real cost (below). (b) *`us-east-1`* — cheapest headline prices and no certificate
  special-casing, but ~200 ms away from every user of this app to save a fraction of a cent a
  month. (c) *Multi-region or CloudFront-with-a-distant-origin-plus-caching* — the pages that
  matter are authenticated and dynamic, so they do not cache; this would be complexity bought to
  paper over a wrong region. (d) *Defer the change until the first deploy* — rejected; that is
  precisely the moment it stops being free.
- **Consequences**:
  - **The consequence that actually matters is round-trip latency.** Sydney↔London is roughly
    **250–300 ms of round trip**, and every uncached request in this app is a round trip to the
    origin: the login POST, the presigned-URL request, the save, and every page of the archive.
    Serving Australian users from London would have added that to all of them, and the photo
    upload — several MB from a phone on domestic broadband — would have crossed the planet as
    well. From Sydney the same requests are ~10–30 ms away. Nothing about the app's design changes;
    it simply stops being needlessly slow for the only people who use it.
  - **Cost is unchanged: still about A$0.65/month all in.** Checked rather than assumed, at this
    volume (8 uploads/month, ~0.6 GB stored after a year, a few hundred page views):
    - **Lambda** — the *always-free* 1 M requests + 400 k GB-s tier applies in `ap-southeast-2`
      exactly as in `eu-west-2`, and this app uses a rounding error of it. **No difference.**
    - **CloudFront** — priced by the **viewer's edge location, not the origin region**, so moving
      the origin does not move the bill at all; and the always-free 1 TB/10 M-request tier covers
      this app either way. **No difference.**
    - **S3** — Sydney's per-GB Standard rate is within a fraction of a cent of London's. On ~0.6 GB
      that is **well under one cent a month**, and it stays under a cent even at the decade-scale
      ~6 GB projection.
    - **Verdict: the difference is negligible — it does not move the A$0.65/month figure and is not
      an open question.** No cost table anywhere needs a new number because of this change.
  - ⚠️ **Anything already written down with `eu-west-2` in it is wrong.** `docs/ARCHITECTURE.md`
    has been corrected throughout — the stack table, the system diagram, and every runbook command
    carrying a `--region` flag, including the lockout-recovery and custom-domain procedures. If a
    stray `eu-west-2` turns up later, it is a typo to fix, not a second opinion to reconcile.
  - ⚠️ **Deploying with the CLI pointed at the wrong region is a silent way to create a second,
    empty copy of the app.** `scripts/deploy.sh` pins the region; nobody should override it with
    `AWS_REGION` or an `aws configure` profile that disagrees.
  - **The same wrong assumption was swept for elsewhere, and it had left two other marks.**
    ⚠️ **The date default is now specified as the browser's local calendar day, not the server's.**
    Lambda runs on UTC; at UTC+0/+1 a UTC "today" is right nearly always, but at UTC+10/+11 it names
    *yesterday* for the first ten-to-eleven hours of every local day — so a game entered the morning
    after would have been filed a day early. This was latent under the UK assumption and is now
    written down in `docs/ARCHITECTURE.md`. Separately, the PRD described a re-read as costing "a few
    pence" (now "a few cents"), and the cost section of `docs/ARCHITECTURE.md` carries a note that
    its bare `$` figures are USD list prices, ≈ A$0.65/month all in.
  - **Revisit if**: the founder moves, or players outside Australia become a meaningful share of
    use — neither of which is true of a game played around one kitchen table.

## 2026-09-10 — Monotonicity is a floor, not an error detector (Milestone 0 verdict)

- **Context**: the PRD, corrected on 2026-09-10, replaced the lost summation proof with three
  weaker checks and named monotonicity the main one. Milestone 0 existed to measure how much
  work it actually does. Full workings in `docs/SPIKE-M0-READING.md`.
- **Decision**: **treat monotonicity as a save-gate against impossible data and as nothing else.**
  The spike measured **0 misreads caught out of 9; 9 of 9 slipped through.** ⚠️ **No product
  wording, anywhere, may describe a transcription as checked, validated or verified.** The
  strongest honest claim is *not obviously wrong*, which is already the PRD's wording.
  ⚠️ **Do not build "transcribe twice and compare"** — the spike found errors repeat
  deterministically on the same ambiguous digits (two cells were misread identically in 3 of 3
  independent reads), so a second read returns the same wrong answer and manufactures false
  confidence. Targeted per-column re-photograph survives, because it supplies new pixels rather
  than a second opinion on the same ones, and must never be worded as "reading it again to check".
  **Derived per-hand scores stay on the review screen as a reading aid, not as a validator** —
  a wrong interior cell perturbs two adjacent hand scores in opposite directions and both remain
  plausible.
- **Alternatives**: (a) drop monotonicity entirely — no; it is free and it does stop genuinely
  impossible states being saved. (b) Add a plausibility band on per-hand deltas — the spike's
  slipped errors produced hands of 15, 12, 16 and 3, all ordinary; any band tight enough to catch
  them would fire constantly on real play. (c) Second-model cross-read — unevaluated, and the
  deterministic-error finding makes it likely to agree with the first.
- **Consequences**:
  - **The human review step is the entire quality control**, not most of it. Every argument for
    the Column Sweep and against a "looks fine, save" shortcut is now evidence-backed.
  - Exposure is **bounded**: a wrong interior cell is self-cancelling in a running total, so
    final scores, winners and total-derived records are safe (**0 errors in row 11 across all six
    reads; winner correct 6/6**). ⚠️ **Hand-by-hand analytics are the exposed ones** and will be
    confidently wrong when a cell is wrong.
  - Row 11 gets its own treatment on the review screen (`FinalRow`) — already in the design
    system, now justified by evidence.
  - The **name pick-list in M1 is load-bearing**: a player's name was misread in 2 of 6 reads.
  - **Revisit if**: a re-run through the production API path with structured outputs shows a
    materially different error profile, or a later model changes the numbers.

## 2026-09-10 — Development runs on the founder's Claude subscription until an API key is needed

- **Context**: the reading spike needed transcriptions, and no `ANTHROPIC_API_KEY` exists on the
  machine. The founder asked to keep development costs inside the existing subscription for now.
- **Decision**: **development and experiments run through the Claude Code session on the
  subscription. The founder supplies an API key when the product itself needs to call the API** —
  which is Milestone 1's admin panel, where the key is set and verified with a real call.
- **Alternatives**: provision a key immediately — rejected by the founder for now; nothing before
  M1 requires one.
- **Consequences**:
  - ⚠️ Spike results carry a **fidelity caveat**: same model and images, but through the harness
    rather than the API with `output_config.format`. Error rates are indicative, not a benchmark.
  - **Re-run the spike through the real API once a key exists** (~A$0.30, and the sheets are kept),
    before relying on its numbers for anything load-bearing.
  - No AWS or API spend is incurred before the founder decides to start it.

## 2026-09-10 — Custom domain on external (Lightsail) DNS; no Route 53 hosted zone

- **Context**: the founder owns `ribenajuice.xyz` and wants the app at
  **`fivecrowns.ribenajuice.xyz`**. ⚠️ A `dig NS` lookup returns AWS nameservers, which we initially
  read as "the zone is in Route 53" — **it is not**. DNS is managed in **AWS Lightsail**, which also
  serves from `awsdns` nameservers, so the lookup is ambiguous and cannot settle the question.
  Recorded because it is a plausible wrong turn for anyone re-deriving this later. The founder is
  happy to administer DNS records themselves.
- **Decision**: **no Route 53 hosted zone is created**, by SST or CloudFormation. The domain is
  configured with SST's external-DNS idiom — **`dns: false` plus an explicitly supplied certificate
  ARN** — and the founder adds two CNAMEs in Lightsail by hand, following a step-by-step runbook in
  `docs/ARCHITECTURE.md` written for a product manager rather than an engineer.
  - The **ACM certificate is issued in `us-east-1`**, even though the app runs in ~~`eu-west-2`~~
    *(region superseded 2026-09-10 → `ap-southeast-2`)*, because CloudFront accepts certificates
    from us-east-1 only. ⚠️ **The us-east-1 requirement is unaffected by the region correction.**
  - ⚠️ **`fivecrowns` is a subdomain, so a plain CNAME to the CloudFront distribution works** — no
    apex/ALIAS complication, which is the whole reason this stays a two-record job.
  - ⚠️ **The custom domain is not part of the first deploy.** `sst.config.ts` attaches it only when
    both `APP_DOMAIN` and `APP_CERT_ARN` exist as optional SSM parameters, read by
    `scripts/deploy.sh`. Absent them, the app deploys and works on its CloudFront URL.
- **Alternatives**: (a) *Create a Route 53 hosted zone for the subdomain and delegate to it* —
  rejected; **$0.50/month forever**, and it would have been the only line in the entire design that
  bills while nobody is using the app, bought to replace two records the founder can add in a
  minute. (b) *Let SST do automatic DNS validation and record creation* — rejected outright; ⚠️ SST
  cannot write to Lightsail DNS, so it would sit waiting on a validation record that never appears,
  producing a hung first deploy with no useful error. (c) *Move DNS to Route 53* — a migration of a
  domain used for other things, to save the founder two manual records once.
- **Consequences**: AWS running cost returns to **~$0.01/month**, and **the entire running cost of
  the product is now the Anthropic usage**. The cost of that is one manual, ordered procedure the
  founder performs alone — hence the runbook, which spells out the record shapes, the 5–30 minute
  ACM wait, and ⚠️ the one real ordering constraint (**the certificate must reach *Issued* before
  CloudFront will serve the domain**). Milestone 1 can be finished, demonstrated and used before the
  domain exists, and the CloudFront URL keeps working permanently alongside it, so a mistyped record
  can never take the app down. **Revisit if** DNS ever moves into Route 53 for other reasons, at
  which point automatic validation becomes free to switch on.

## 2026-09-10 — Location is a table, captured from Milestone 1

- **Context**: the founder asked for it directly — *"I need the ability to log the date of the game,
  as well as the location, as this just provides more data for later analytics."* Date was already
  handled; location is new.
- **Decision**: a **`location` table** with a nullable, indexed FK from `game` — ⚠️ **not a text
  column**. Pick from existing or create new, exactly as players work, with a unique normalised
  `name_key` as a backstop behind the pick-list. **Capture ships in Milestone 1; location analytics
  land in Milestone 3.**
  - **Nullable, and a save is never blocked for want of a location** — old sheets may have no
    recoverable venue, and refusing the game would lose real scores to protect a nice-to-have.
  - **But designed to be dense**: the field defaults to the most recently used location, one tap to
    change. Most games happen in the same few places, so the common case is zero interaction.
- **Alternatives**: (a) *A free-text column on `game`* — rejected for the same reason `player` is a
  table: ⚠️ "Player C's place" / "player cs" / "Player C's House" become three rows, and every location
  stat is then quietly wrong in a way nothing on screen would reveal. It is the fractured-player
  failure mode with the same silence. (b) *Defer the whole thing to Milestone 3 with the analytics*
  — rejected, and the reason is the general principle below. (c) *Make location required* —
  rejected; it would block saving a game over a detail nobody may remember.
- **Consequences**: `game` is now `id`, `played_on`, `location_id`, `roster_id`, `note`,
  `created_at`, indexed on all three dimensions. ⚠️ **Nothing about the roster signature changes** —
  a roster is the set of people, not the room, and keeping them independent is exactly what makes
  "how do these four do at Player C's place?" a cross-tab that already works rather than a fourth
  entity. Win rate by location, per-player performance by venue, and location as a games-list filter
  are all one `GROUP BY` away, and **day-of-week and seasonal slices come free** from `played_on`
  with no extra capture at all.

## 2026-09-10 — Reports are cheap forever; dimensions are only cheap today

- **Context**: the founder asked directly how hard it will be to add reporting features later. The
  honest answer is "it depends entirely on which kind of thing you mean", and that distinction
  deserves to be a written rule rather than something each future session re-derives.
- **Decision**: state it in `docs/ARCHITECTURE.md` as a **property the design is required to keep**,
  and use it to govern sequencing decisions:
  > **Capture dimensions early, build reports whenever.**
  - **A new report is a query plus a screen.** No migration, no backfill, nothing precomputed to
    invalidate — and ✅ **it applies retroactively to the entire history the moment it ships.** A stat
    invented in 2032 covers every game back to the first one.
  - ⚠️ **A new dimension is a five-minute migration and an unfixable hole.** Every game recorded
    before it existed lacks it permanently. Nobody remembers where a game three years ago was
    played, and no model can read it off a photo that never showed it. The data is not recoverable
    at any price.
- **Alternatives**: (a) *Leave it implicit* — it is already true of the design, but an unwritten
  property is one refactor away from being lost, and the founder would keep having to ask.
  (b) *Precompute stats into summary tables for speed* — would trade the retroactivity that makes
  this property valuable for performance we do not need at ~15,000 rows.
- **Consequences**: this is why **location ships in Milestone 1** though its analytics are Milestone
  3 — the field costs an afternoon now, and waiting would cost every game played in between,
  forever. The dimension set is **closed for now** at the founder's word (*"I think we have
  everything covered but we will cross that bridge should we need to"*), which is the right call;
  the rule is what to apply when that bridge arrives. ⚠️ It also sets the standing answer to every
  future *"can we add X later?"*: **a report, yes, whenever — a dimension, only from the day we
  start capturing it.**


## 2026-09-10 — Admin panel behind a second password; no secret ever stored in the database

- **Context**: the founder needs to set the Claude API key, rotate the group password, and take a
  copy of their scores, without a developer and without a deploy — *"I'd also need an admin panel
  to configure things such as the Claude API key, as well as downloading the database too. This can
  be behind an additional password... this admin panel should also be able to set the main password
  as well as the admin password."* ⚠️ The two requests **combine into a hazard**: if the API key is
  in the database and the panel offers a database download, the download is a working API key, and
  the founder hands out a file that can spend their money.
- **Decision**: an admin panel at `/admin`, gated by a **second password independent of the group
  password** — a valid group session grants nothing there. It does exactly five things: set/rotate
  the API key, download the score data, set/rotate the group password, set/rotate the admin
  password, and show this month's usage and estimated spend. Not a settings screen; no toggles, no
  theming, no user management.
  - **No secret is ever written to the database.** The API key, both password hashes and the cookie
    signing secret live in **SSM Parameter Store as SecureStrings**, read *and written* by the
    Lambda role. The hazard becomes structurally impossible rather than something to remember: there
    is no table a secret could be in, so neither the download nor the nightly backup can leak one
    however the export is written.
  - **API key is write-only** — never rendered back; last four characters, when set, and whether it
    works. ⚠️ **Verified with a real API call before it is accepted**, because otherwise a bad key is
    discovered by the founder standing at a table with a sheet to photograph.
  - **Changing the admin password requires the current admin password**, even inside an
    authenticated session, so an unattended unlocked screen cannot be used to take ownership.
  - **Session revocation via epochs.** The cookies are stateless and HMAC-signed, so a signed
    `epoch` claim is checked against `group-session-epoch` / `admin-session-epoch` in SSM. Rotating
    the group password bumps the group epoch and logs out every device — that is the whole point of
    rotating it. Rotating the admin password bumps the admin epoch and logs out **every admin
    session including the one doing the rotating**: if the reason to rotate is a leak, leaving other
    sessions alive defeats it. The two epochs are independent.
  - **Staleness is handled with both mechanisms**: explicit cache invalidation on write (so the
    admin's next request is immediately correct in that container) **plus a 60-second TTL** (so
    every other container converges without any cross-container messaging). ⚠️ A Lambda holding a
    stale key after rotation is a real failure mode with a baffling symptom, and 60 seconds of
    bounded staleness is cheaper than a cache-invalidation fan-out to operate.
  - **Lockout recovery is documented, not folklore**: `scripts/hash-password.js` plus two
    `aws ssm put-parameter` calls, written out in `docs/ARCHITECTURE.md`. **The same path is used
    for first-time setup**, so the recovery procedure is exercised on day one instead of being a
    theory. There is deliberately **no first-run setup screen** — that would leave a window in which
    whoever loads the URL first takes ownership; instead `scripts/deploy.sh` refuses to deploy until
    both password hashes exist.
  - **Setting the API key ships in Milestone 1.** The app cannot transcribe without a key, and a
    walking skeleton that needs a developer awake to fix one is not a walking skeleton.
- **Reconciling with `CLAUDE.md`'s "environment variables only, never in code"**: this reads like a
  departure and is not. The house rule exists to keep secrets out of the repository, and it is fully
  honoured — nothing secret is in git, in the bundle, or in the browser. The only change is *where
  the environment gets its values*: SSM at runtime rather than baked in at deploy, which is what
  makes rotation-without-a-deploy possible. SST secrets already live in SSM; this extends the same
  store to values the app writes as well as reads.
- **Alternatives**:
  (a) *Secrets in the database, filtered out of the export* — rejected outright; it makes a
  money-spending leak one forgotten `WHERE` clause away, and the export code will be edited again.
  (b) *API key only settable by redeploy* — rejected; it makes the founder dependent on a developer
  for the one failure they are most likely to hit alone.
  (c) *AWS Secrets Manager instead of Parameter Store* — rotation features we do not need, at
  **$0.40 per secret per month** — six secrets would cost more than the entire rest of the stack.
  (d) *One password for both group and admin* — rejected; the whole point is that the group password
  gets texted around, and it must not reach the key that spends money.
  (e) *A server-side session table for revocation* — a table and a cleanup job to buy what an
  integer in SSM buys.
- **Consequences**: rotation without a deploy; a download that cannot contain a secret by
  construction; up to 60 seconds of staleness after a rotation, stated on screen. The Lambda
  execution role gains `ssm:GetParameter*`/`ssm:PutParameter` on `/five-crowns/prod/*` plus KMS on
  the `aws/ssm` key, and the OIDC deploy role in `infra/github-oidc.yaml` gains the matching
  actions — ⚠️ **`scripts/aws-bootstrap.sh` must be re-run.** Cost impact is **zero**: standard
  parameters and their reads are free, and the AWS-managed `aws/ssm` key carries no monthly charge
  (⚠️ a customer-managed key would be $1/month, so we do not create one).
  **Revisit if**: more than one person ever needs admin access, at which point this is real auth and
  a managed provider.

## 2026-09-10 — Score-data download: a ZIP of CSVs, and it is explicitly not a backup

- **Context**: the admin panel offers a download. The founder clarified what they mean by it —
  *"the database I'm talking about is just the player scores"* — so this is the numbers, not an
  archive restore. It also doubles as their escape hatch from Turso, the one dependency in this
  design that AWS does not host and that we do not own.
- **Decision**: **a ZIP of CSVs**, generated on demand — `players.csv`, `games.csv`, `rosters.csv`,
  `roster_members.csv`, `round_scores.csv`, a denormalised `games-wide.csv` (one row per player per
  game, the eleven running totals and eleven derived hands as columns) that a human can actually
  read, plus `schema.sql` and a `README.txt`. **Generated in the Lambda and streamed straight back**,
  with no S3 round trip and no presigned URL to expire.
  ⚠️ **It is stated plainly — in this ADR, in `docs/ARCHITECTURE.md`, on screen in the panel, and in
  the download's own README — that the photos are not in it.** A full archive is this file *plus*
  `aws s3 sync s3://five-crowns-photos ./photos`.
- **Alternatives**: (a) *The raw SQLite/libSQL file* — one file and a perfect restore, but it needs
  software the founder does not have, which would make the escape hatch depend on finding a
  developer. (b) *A SQL dump* — restores beautifully, opens in nothing. (c) *Include the photos in
  the ZIP* — gigabytes over a decade, past every Lambda response limit, and it would need S3 and a
  presigned URL and a lifecycle rule to clean up. (d) *Say nothing about the photos* — the failure
  mode is that the omission is discovered at the exact moment it matters most.
- **Consequences**: the founder can open years of games in a spreadsheet on their phone with no
  tools, and can rebuild the record in any database if Turso disappears. Delivery stays trivial
  because the data is tiny — ~15,000 round rows over a decade is well under 1 MB zipped, against a
  6 MB buffered Lambda response limit; **revisit at around 4 MB**, which on this trajectory arrives
  some time after 2100. Photos remain covered separately by bucket versioning with no delete
  lifecycle, and the database by the nightly S3 dump — both of which are now the things to point at
  when someone asks "so what *is* the backup?".

## 2026-09-10 — Targeted per-column re-photograph as a second transcription path

- **Context**: with the summation proof gone, the review screen carries the correctness of the
  record, and the error class monotonicity cannot catch — a misread that preserves ordering — has no
  automated defence at all. The founder asked for a fourth override rung: *"The tool asks for an
  additional photo of a specific column for clarification."*
- **Decision**: build it, as a **second, distinct transcription path** with its own prompt and its
  own structured-output schema (one column: player name, eleven running totals, least-confident
  index) — ⚠️ **not the full-sheet schema with most of it discarded.** Same `claude-opus-5`, same
  adaptive thinking, same structured outputs.
  - **Scoped merge**: only the target column changes; every other column, including cells corrected
    by hand, is untouched.
  - **Non-destructive and repeatable**: each column keeps **every reading it has ever had** as a
    version stack, so restoring the previous values is one tap with no re-upload, and a column can
    be re-shot as often as the founder likes. ⚠️ **A re-read is never automatically authoritative** —
    a close-up can come back worse.
  - **Offered and invokable**: offered on a column that breaks monotonicity or reads as uncertain,
    and invokable by the founder on **any** column at any time. The app cannot tell a plausible
    wrong number from a right one, so it must never gatekeep what may be re-checked.
  - ⚠️ **The expected player name is not given to the model** — that would bias it into reading that
    name and destroy the only cheap check on whether the right column was photographed. The model
    reports what it sees; the server compares afterwards and warns without blocking.
  - **Close-ups are stored permanently with the game**, even when their reading was rejected. They
    are further evidence of what the paper said, which is the same reason the sheet photo is kept.
- **Why it earns its place**: two compounding effects. **Resolution** — the full sheet is downscaled
  to a 1568px long edge, leaving each digit a couple of dozen pixels tall, which is the direct cause
  of the 3-vs-8 error class; a close-up spends the same token budget on a tenth of the page.
  **A narrower task** — eleven numbers in a line for a known player that must climb, versus locating
  a hand-drawn grid and segmenting twenty-plus cells. Same camera, same model, better data and an
  easier question.
- **Alternatives**: (a) *Lean on manual typing* — always available as rung 4, but it makes the
  founder the OCR, and it discards a mechanism that attacks the error at source. (b) *A cheaper
  model for re-reads* — explicitly rejected; a re-read happens precisely when accuracy already
  failed. (c) *Automatically re-reading every uncertain column* — spends money and time on the
  founder's behalf and takes the decision away from the person holding the paper.
- **Consequences**:
  - ⚠️ **The data model changes from one photo per game to many**: `photo` gains `kind`
    (`'sheet'`|`'column'`), a nullable `player_id`, and a partial unique index enforcing exactly one
    sheet photo per game.
  - ⚠️ **Review state can no longer be client-side only.** On iOS, opening the camera can evict the
    web page from memory, and this feature *is* "go and open the camera". A server-persisted `draft`
    row (one JSON blob, autosaved) is required so corrections are not silently lost on the exact
    interaction the founder reaches for when things have already gone wrong. That draft also becomes
    the single object all four override rungs operate on, including the structural edits.
  - **Cost is not a constraint and no cheap-out is designed in**: a narrow column crop is ~1,100
    image tokens rather than ~2,500, so a re-read costs **about 1.5¢ — less than half a full-sheet
    read**. No re-read cap, no cheaper model, no discarding close-ups to save space. Estimated
    Anthropic spend rises from ~$0.28 to ~$0.40/month.
  - The daily abuse cap is now **counted separately for sheets and columns** (20 and 60/day), so a
    legitimate session re-shooting several columns cannot trip a limit aimed at a leaked password.
  - `transcription.kind` records which path produced a reading, which will answer **"how often does
    a close-up beat the full-sheet read?"** — the evidence that justifies or retires this path.
  - **Revisit if**: close-ups turn out to be no more accurate than the full-sheet read, in which case
    the rung collapses back into manual typing.


## 2026-09-10 — The pad records running totals; monotonicity replaces the summation check

- **Context**: the PRD rests on a stated property of the sheet — "eleven round scores and a total,
  and the rounds must sum to the total... every column carries its own proof". Two real
  scoresheets then arrived (`fixtures/sheets/`, transcribed and founder-verified in
  `fixtures/sheets/GROUND-TRUTH.md`) and **the pad does not work that way**. Columns are **running
  totals**, monotonically non-decreasing, and there is **no totals row** — the eleventh number *is*
  the final score. Sheet 1 even has a totals box ruled underneath, left blank. The founder has
  since confirmed the pad is *never* kept as per-hand scores. The self-proving property the whole
  product was designed around does not exist.
- **Decision**: assume the running-total format **unconditionally** — no detection, no toggle, no
  branch. Validation becomes:
  - **Hard, blocks the save**: exactly 11 values per column; non-negative integers; **monotonic
    non-decreasing** (`v[i] >= v[i-1]`); at least two named columns.
  - **Per-hand scores are derived** as first differences (`d[1] = v[1]`,
    `d[i] = v[i] − v[i−1]`). The PRD's "store every round separately" requirement survives — we
    compute the rounds instead of reading them. Both the running total and the derived score are
    stored, because the running total is the artifact a human actually verified against the paper.
  - **Soft, never blocks**: implausibly large deltas, digit-count anomalies. The app stays
    ignorant of the rules of Five Crowns, so every plausibility bound is a heuristic about
    handwriting, not a rule about the game.
  - ⚠️ **Repeats are never flagged.** Player D's six consecutive 64s on sheet 1 (five zero-point hands)
    are verified correct. Any validator treating consecutive repeats as a duplicate-read is
    provably wrong on a real sheet. Likewise Player B's genuine **51-point single hand** would trip
    any large-delta threshold worth having — which is exactly why that check can only ever warn.
- **Alternatives**:
  (a) *Keep the summation check by asking players to also write per-hand scores* — rejected;
  changing how people keep score at the table to suit the software inverts the PRD's core ethic
  that the paper is the game and the app adapts to it.
  (b) *Support both formats with detection* — rejected after the founder confirmed there is only
  one. A detection branch is a permanent source of subtle bugs bought for a case that never occurs.
  (c) *Have the model output per-hand scores directly* — rejected; it would be inventing arithmetic
  we can do deterministically, and it discards the running totals, which are the numbers actually
  written on the paper and therefore the only thing a human can verify against the photo.
- **Consequences**:
  - ⚠️ **The check is strictly weaker.** Monotonicity catches order-breaking misreads only. Any
    error preserving the ordering — 123 read as 128 between 118 and 137 — passes cleanly.
  - ⚠️ **One misread value now corrupts two derived hands**, the delta into it and the delta out of
    it. Under the assumed format a bad cell damaged one round. The error surface is larger.
  - ⚠️ **A misread of the last value is the worst case**: wrong final score, wrong winner, wrong
    entry in every stat mentioning that player.
  - **The human review step is now the primary correctness mechanism, not a backstop.** The PRD's
    "show the transcription beside the photo every time" is upgraded from a courtesy to the main
    guarantee. Concretely this forces three UI requirements: a pinch-zoomable photo, the derived
    per-hand scores displayed live beside the running totals on every keystroke (a misread that
    hides in the totals often looks obviously wrong as a hand score — the only partial defence
    against the error class monotonicity cannot catch), and the final row called out separately so
    a wrong winner is spotted in one glance.
  - **Cross-column row alignment stops mattering**, which is a genuine simplification: each column
    is read and validated independently, and the fixtures show the rows visibly do not line up.
  - `fixtures/sheets/GROUND-TRUTH.md` is the reading spike's reference corpus **and** the Milestone
    1 acceptance test. It is founder-verified — do not edit it.
  - **Revisit if**: the spike shows monotonicity catches too small a share of real errors to be
    worth the review burden, in which case the honest answer is a second independent read of each
    column and a disagreement flag, not a cleverer rule.

## 2026-09-10 — Vision model: `claude-opus-5`, adaptive thinking, structured outputs

- **Context**: reading a hand-ruled grid photographed at an angle in kitchen light is the entire
  product risk. The founder chose an image-interpreting model over traditional OCR and is happy to
  pay per use. The remaining question was which model.
- **Decision**: **`claude-opus-5`** (exact string, no date suffix), with `thinking: {type:
  "adaptive"}` and **structured outputs** via `output_config: {format: {...}}` so the transcription
  arrives as a validated object rather than prose to be parsed. The arithmetic, at the founder's
  volume of ~8 sheets/month:

  | | tokens | rate | cost |
  |---|---|---|---|
  | Image (1568px long edge ≈ 1568×1176; ÷750) | ~2,500 | $5/MTok | $0.0125 |
  | Prompt | ~500 | $5/MTok | $0.0025 |
  | Output incl. adaptive thinking | ~800 | $25/MTok | $0.0200 |
  | **Per sheet** | | | **$0.035 (3.5¢)** |
  | **Per month at 8 sheets** | | | **~$0.28** |

  Sonnet 5 at $3/$15 would be ~$0.021/sheet, about **$0.17/month** — a saving of roughly **$0.11 a
  month, well under 20p**. Transcription accuracy *is* the product risk; trading it for a tenth of
  a dollar is not a trade worth making.
- **Alternatives**: (a) Tesseract or AWS Textract — settled against by the founder, not
  relitigated; both are built for printed or form-shaped documents and this pad is neither.
  (b) Sonnet 5 — the arithmetic above. (c) A cheap model with an Opus fallback on failure — extra
  code paths and a second prompt to maintain to save pennies.
- **Consequences**:
  - ⚠️ **`budget_tokens` must not be passed** — Opus 5 returns 400. Use adaptive thinking only.
  - ⚠️ **No assistant prefill** — it 400s on Opus 5.
  - ⚠️ **Never `output_format`** (deprecated) — it is `output_config.format`. Use `strict: true` on
    any tool definition.
  - ⚠️ Implementers must read the bundled **`claude-api` skill** for exact SDK signatures rather
    than reconstructing them from memory.
  - The prompt is written from the fixtures and must state: variable column count, exactly 11
    non-decreasing running totals per column, no totals row, repeats are normal, read the surviving
    value where something is struck through, rows do not align across columns, the page may be
    rotated/shadowed/have a finger in frame, blank ruled lines are not rows, and **an unreadable
    cell must return `null` rather than a guess**.
  - Every attempt is stored in a `transcription` table with its raw JSON and token counts —
    the only way to ever answer "is the new model better than the old one on *our* sheets?"
  - Cost scales only with uploads, so a leaked password is the one runaway risk; capped in the app
    (25 transcriptions/day) and on the API key (console spend limit).
  - **Revisit if**: the spike shows Opus 5 is not materially better than Sonnet 5 on these sheets,
    or a later model reads the fixtures more accurately. Re-transcription is cheap because the
    original photo is kept forever.

## 2026-09-10 — Photos: browser-side rotate and downscale, direct to a private versioned S3 bucket

- **Context**: the photo is the permanent evidence and must be re-checkable against the paper for
  years, and re-transcribable by a better model later without re-photographing. It is also 3–4 MB
  coming off a phone on a domestic connection. Sheet 2 in the fixtures is written along the long
  edge and photographed sideways, so orientation is not fixed.
- **Decision**:
  - The browser applies EXIF orientation, offers a **one-tap rotate control** (four states), then
    produces **two** JPEGs: `original.jpg` (long edge 3000px, q0.9 — the permanent record) and
    `model.jpg` (long edge 1568px, q0.85 — what the model sees). The chosen rotation is baked into
    both and recorded on the `photo` row.
  - Both are uploaded **directly to S3 via presigned PUTs**. Nothing large ever transits Lambda.
  - The bucket is **private and versioned**, with no delete lifecycle. Reads are 5-minute presigned
    GETs.
- **Alternatives**: (a) *Upload through the API* — rejected; needless Lambda payload limits, cost
  and latency for zero benefit. (b) *Resize server-side with `sharp`* — rejected; a native binary
  in the Lambda bundle is a whole category of deploy pain, bought to do something a canvas does for
  free. (c) *Store only the original and let the API downscale* — rejected; 1568px is the point
  above which the API downscales anyway, so sending more costs upload time on a phone and makes the
  image-token count, and therefore the cost, unpredictable. (d) *Model-detected orientation* —
  rejected; one tap from a human who is holding the sheet beats a round trip to a model.
- **Consequences**: no image processing in Lambda at all; predictable per-sheet cost; photo storage
  is fractions of a cent a month and roughly $0.09/month after a decade. Versioning means an
  accidental or malicious delete is recoverable, which matters when everyone shares one password.
  Abandoned reviews leave orphan photos and `photo` rows; harmless at a few megabytes, and they are
  the evidence for why a sheet failed. **Revisit if**: 3000px turns out to be too coarse to settle
  an argument about a smudged digit.

## 2026-09-10 — Access control: one shared password, scrypt hash, stateless signed cookie

- **Context**: the PRD is explicit — one shared password on the front page, no accounts, no signup,
  no per-user identity, and everything past the gate is the same for everyone. A password gate is
  the one thing here that is genuinely easy to build badly.
- **Decision**:
  - Store **only a scrypt hash** of the password, in SSM as a SecureString. The plaintext exists
    nowhere in the repo, the database, or the pipeline. ⚠️ Never in code.
  - On success, set an **HMAC-signed, `HttpOnly`, `Secure`, `SameSite=Lax` cookie** carrying
    `{v, iat, exp}`, `Max-Age` 400 days. **Stateless — no session table.**
  - Next.js middleware **denies by default**; only `/login` and `POST /api/login` are allowlisted.
  - Rate-limit login attempts per IP in the database (~10 per 10 minutes), on top of scrypt's cost.
  - Revocation is an **epoch bump** — the signed cookie carries an `epoch` claim checked against
    `/five-crowns/prod/group-session-epoch`. Rotating the group password from the admin panel bumps
    it and logs out every device at once. That is the entire revocation story. *(Superseded detail:
    an earlier version of this ADR said `SESSION_VERSION`; the admin-panel ADR above makes it a
    runtime-mutable SSM parameter so rotation needs no deploy.)*
  - Photo URLs are 5-minute presigned GETs, so a copied image link is not a permanent hole.
  - A **daily transcription cap** plus a spend limit on the Anthropic API key. *(Revised by the
    per-column re-read ADR above: counted separately as 20 sheet reads and 60 column reads per day,
    so a legitimate session re-shooting several columns cannot trip it.)*
- **Alternatives**: (a) *Clerk / Auth.js / Cognito* — the house default is managed auth, and it is
  the right default, but all three model **user identity**, which the PRD explicitly does not want.
  Adopting one would mean either creating fake accounts or using ~5% of a service and maintaining
  an integration for it. This is the deviation-with-an-ADR case. (b) *HTTP Basic auth at
  CloudFront* — no logout, ugly browser prompt, awkward on mobile, and the password ends up in a
  CloudFront Function. (c) *A server-side session table* — a table and a cleanup job to buy
  revocation we already get by bumping a version number. (d) *Plaintext password in an env var* —
  rejected outright.
- **Consequences**: honestly stated, this protects against search engines and passers-by, and
  nothing else.
  - ⚠️ Anyone the password is texted to can read, edit and delete everything, and **nothing records
    who did it**. The PRD accepts this.
  - ⚠️ It will be forwarded, and it cannot be un-shared except by changing it and re-texting
    everyone.
  - The only exposure that costs real money — someone spending the founder's Anthropic budget — is
    the one that *is* mitigated, twice, because it is the only one with a bill attached.
  - **Revisit if**: the group grows past friends, the record is ever shared outside it, or an audit
    trail is wanted — any of which means real accounts and a managed provider.

## 2026-09-10 — Roster identity: a sorted-player-id signature

- **Context**: the founder's "roster" is the *exact, order-independent set* of players in a game,
  used to ask "how do we do when it's exactly these four?" separately from per-player stats. It
  needs a stable identity so the same set of people always resolves to the same roster. The two
  fixture sheets are a four-player and a five-player night among the same friends, so this is not
  hypothetical.
- **Decision**: `roster.signature` = **the roster's player IDs, sorted ascending, joined with
  `:`** — e.g. `p_3f2a:p_9ab1:p_c410` — with a `UNIQUE` index on it. The save handler upserts on
  the signature; that index *is* the "created the first time its exact set appears, reused silently
  after" behaviour. `size` is denormalised alongside it. `name` is `NULL` until someone renames the
  roster, and the UI renders an auto-name from the members when it is null.
- **Alternatives**: (a) *A signature built from names* — rejected; renaming "Jo" to "Joanne" would
  silently fork the roster, which is the exact failure mode the PRD warns about. (b) *A hash of the
  sorted IDs* — same properties but unreadable in the database, and at ten players there is nothing
  to save. (c) *Lookup by joining `roster_member` and counting* — a correct-but-fiddly query
  repeated everywhere, versus one unique index. (d) *Subset grouping* — explicitly a non-goal.
- **Consequences**: order-independent and rename-proof by construction. Exact matching falls out
  for free: a 3-player and a 4-player signature are different strings and cannot collide. Leaving
  `name` null means the auto-name follows a player rename automatically while a custom "Thursday
  crew" sticks — no stale-name bug.
  ⚠️ **The Milestone 2 player-merge feature must recompute signatures**: merging two people changes
  the signature of every roster containing either, and two rosters can collide onto the same
  signature. Merge therefore has to fold the colliding rosters together, moving games onto the
  survivor and preferring the human-named one. Recorded here so it is not discovered mid-merge.

## 2026-09-10 — Database: Turso (libSQL/SQLite), with a nightly SQL dump to S3

- **Context**: the analytics catalogue is a headline v1 feature and is a dozen relational
  aggregates — head-to-head, nemesis, streaks, per-hand villains, comebacks. The data is tiny:
  ~300 games × 4–5 players × 11 hands ≈ **15,000 round rows over a decade**. Fixed cost must be
  near zero, which rules out anything always-on.
- **Decision**: **Turso** (hosted libSQL/SQLite) over its HTTP driver, with **Drizzle ORM** for
  schema and migrations. Every stat is computed on demand as a full-table SQL aggregate — **no
  materialised views, no summary tables, no caching, no precomputation.** A nightly scheduled
  Lambda dumps the whole database to `s3://five-crowns-photos/backups/`.
- **Alternatives**: (a) *DynamoDB* — the AWS-native, genuinely-free, zero-account option, and
  defensible on volume, but every stat in the catalogue would become a table scan plus hand-rolled
  aggregation in application code. The founder will keep asking for new stats; SQL answers those in
  a query, DynamoDB answers them in a pull request. (b) *RDS Postgres* — ~$15/month minimum,
  always-on, for 15,000 rows. (c) *Aurora Serverless v2* — floors at ~$43/month at 0.5 ACU.
  (d) *Neon Postgres* — genuinely comparable (free tier, scales to zero); SQLite wins on being the
  more boring of the two for a dataset this size. (e) *A SQLite file on EFS or in S3* — write
  concurrency and durability problems in exchange for nothing.
- **Consequences**: SQL for the analytics, no connection-pool problem in Lambda (the driver is
  HTTP), and the local dev database is a plain file. ⚠️ **It is a third-party dependency outside
  AWS and outside the OIDC deploy path** — its free tier is a company's commercial decision, not a
  contract. The nightly dump is the mitigation: losing Turso entirely costs at most one day of
  games and an afternoon restoring into a fresh libSQL database, and the paid tier is $5/month if
  it ever came to that. **Revisit if**: Turso's terms change, or a stats page ever takes more than
  300 ms — which, at 15,000 rows, it will not.

## 2026-09-10 — Stack and hosting: Next.js on AWS Lambda via SST, one region, prod only

- **Context**: the Anthropic API key must never reach the browser, so a pure static SPA is out —
  there has to be a server. The house deploy path is AWS via GitHub Actions with OIDC and
  `scripts/deploy.sh` as the single entrypoint. Traffic is 1–2 uploads a week and a handful of page
  views, so anything always-on is a fixed bill for an idle machine.
- **Decision**: **Next.js 15 (App Router, TypeScript) + Tailwind**, deployed by **SST v3** to
  **Lambda + CloudFront + S3** in **~~eu-west-2 (London)~~ → `ap-southeast-2` (Sydney)**
  *(⚠️ **region superseded 2026-09-10** — see “Region correction: ap-southeast-2 (Sydney), not
  eu-west-2 (London)” at the top of this log. The London choice rested on a factual error about
  where the founder is; it was corrected before anything was provisioned. The original wording is
  left struck through rather than edited, because this log is append-only.)*, one stage (`prod`).
  Secrets are SST
  Secrets in SSM Parameter Store. `scripts/deploy.sh` runs `sst deploy --stage prod` then applies
  migrations through `sst shell`, and CI runs exactly that script under OIDC.
- **Alternatives**: (a) *Vite SPA on S3+CloudFront plus a separate Hono Lambda* — simpler infra but
  two deployables, CORS, and duplicated auth wiring; Next.js Server Components also let the browse
  and stats pages render straight from SQL with no client data-fetching layer at all. (b) *AWS
  Amplify Hosting* — the lowest-ops way to run Next.js on AWS, but it is git-connected with its own
  build system, which bypasses `scripts/deploy.sh` and the OIDC wiring the repo already has.
  (c) *App Runner or Fargate* — always-on, ~$5–25/month, for an app used twice a week.
  (d) *Leaving AWS for Vercel or Fly* — genuinely cheaper in effort, but the CI/CD, the OIDC role
  and the photo bucket are all already AWS, and splitting the footprint across two providers costs
  more in operational surface than it saves.
- **Consequences**:
  - **Estimated cost: ~US$0.01/month on AWS**, plus ~US$0.40 of Anthropic and US$0 of Turso —
    **about US$0.42/month all in (≈ A$0.65), custom domain included.** Well inside the ceiling
    (US$20 ≈ A$30).
  - ✅ **Nothing bills while nobody is using the app.** *(Superseded detail: this ADR originally
    flagged a Route 53 hosted zone at $0.50/month as the one line that would. The custom-domain ADR
    above removes it — DNS lives in Lightsail, so no zone is created and the AWS bill is
    ~$0.01/month.)*
  - Lambda's and CloudFront's free tiers are perpetual; the S3 5 GB tier is 12-month only, after
    which photos cost cents.
  - ⚠️ **Cold starts** of roughly a second are the normal case at this traffic, not the exception.
    Acceptable for an archive nobody opens mid-game; it would not be for a live scoreboard, which
    the PRD explicitly says this is not.
  - ⚠️ **CloudFront's default 30 s origin read timeout would cut off a vision call.**
    `/api/transcribe` is therefore a **streaming route handler** that emits a progress event
    immediately, so time-to-first-byte is milliseconds; the origin timeout is raised to 60 s and
    the Lambda timeout to 120 s as belt-and-braces. **Revisit if** the spike shows transcription
    regularly exceeding ~45 s, in which case switch to an async Lambda invoke plus client polling —
    but not before, because that is a moving part we do not yet need.
  - ⚠️ **The SST app name must be `five-crowns`**, because `infra/github-oidc.yaml` scopes IAM to
    `role/five-crowns-*`. Any other name fails with an IAM denial that reads like something else.
    A handful of extra IAM read/tag actions SST needs have been added to that template.
  - One region, one environment, no staging, no containers, no queues, no Kubernetes. A second
    environment would double the operational surface to protect a group of friends from a bad
    Thursday.


## 2026-09-10 — Reading spike stays a spike; walking skeleton is Milestone 1

- **Context**: the 2026-09-09 draft said "first thing to build: the reading step, alone, tested
  against real sheets" — because if a photo of the pad can't be read, that is worth knowing in an
  afternoon rather than after a website is built around it. The founder has since confirmed the
  sheet is **hand-ruled and drawn fresh each game**, not a printed grid, which makes reading
  harder and the argument stronger.
- **Decision**: keep the de-risking, but as a time-boxed throwaway **Milestone 0** (half a day,
  3–5 real sheets including a deliberately bad photo). **Milestone 1** remains an end-to-end
  slice a real user can touch: password → photo → review beside photo → arithmetic gate → saved
  game → games list.
- **Alternatives**: (a) make the reading spike Milestone 1 — rejected, it produces nothing a user
  can use and the arithmetic check can't be evaluated outside the review screen anyway;
  (b) skip the spike and build the skeleton straight through — rejected, it risks discovering the
  core assumption is wrong after the product is built around it.
- **Consequences**: half a day before anything shippable, and a set of real sheet photos kept as
  test fixtures. If reading proves hopeless, the fallback is manual grid entry and the rest of the
  product is unaffected. Revisit if the spike shows reading is reliable enough to be uninteresting.

## 2026-09-10 — Superseded assumptions from the 2026-09-09 draft plan

Recorded so they are not relitigated. All four were overturned by the founder at kickoff.

- **Analytics deferred to a later version** → **superseded**: analytics are a headline feature of
  v1. The draft's supporting decision — *store every round separately, never just a final score* —
  survives unchanged and is now load-bearing rather than speculative.
- **"One keeper of the record", no other players logging in** → **superseded**: a single shared
  password on the front page; anyone in the group can upload and browse. Still no accounts, no
  per-user login, no signup. Consequence: no audit trail of who did what. Accepted.
- **Open question "is there a backlog of old sheets?"** → **answered**: a handful. No bulk-import
  mode; the normal flow used a few times in a row is enough.
- **Open question "does the same group play, or does it vary?"** → **answered**: it varies, which
  is why **Player** (a person, persisting across games) and **Roster** (the exact, order-independent
  set of players in a game, auto-named and renameable) are both first-class concepts, and why
  name-matching sits inside the review step.
- **Open question "phone only or PC as well?"** → **answered**: mobile-first web app, phone primary.
- **Open question "what does the sheet look like?"** → **answered**: hand-ruled on a notepad, drawn
  fresh each game, names across the top, rounds down the side.

**Unchanged and still central**: the paper stays; this is an archive, not a scoreboard; the
arithmetic self-check is the whole idea; nothing saves until the columns agree; the transcription
is shown beside the photo every time; the app does not know the rules of Five Crowns.
