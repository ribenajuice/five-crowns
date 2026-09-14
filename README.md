# Five Crowns Ledger

Five Crowns Ledger is a private, permanent record of our group's Five Crowns nights. You photograph
the finished paper scoresheet, and the app turns it into a searchable history of every game.

**Where it's at:** **Milestone 1 is complete and live** at https://fivecrowns.ribenajuice.xyz — every
acceptance criterion re-verified, including a real, paid reading key proven on real scoresheets in
production. **Milestone 2, Stage 2 is merged and live** — you can edit or delete a saved game, and
a broken or made-up link shows this app's own "not found" or error screen instead of a generic one.
**Milestone 2, Stage 1 is also merged and live** — from the admin panel you can now change the group
password or the admin password, download every game's scores as one CSV, and see this month's
automatic-reading usage and estimated cost. There's also a written, tested runbook for recovering a
forgotten admin password without a developer. Next up after this stage is player identity matching
and roster renaming. See `docs/STATUS.md`.

**Adding a game:** tap **Add a game**, photograph the paper scoresheet (or pick one from your
photos), turn it upright, then choose how to fill in the numbers: **Read the sheet** has the app
read them off your photo, or **Type it in by hand** lets you enter them yourself — either way you
check every number on the review screen before saving. An automatic read shows a progress screen
while it works; if it fails, **Try again** retries the same photo without asking you to
re-photograph it. There's a daily limit on automatic reads as a safety net, but typing the numbers
in by hand always works, however many reads have been used that day. Pick the date, venue and
players from lists, or add new ones. Your work saves as you go, so it survives closing the page.

**Fixing a read that's gone wrong:** from "Fix something" on the review screen you can add a
missing column, remove a spurious one, reassign a column to a different player, reorder columns to
match the photo, or insert/delete a single value inside a column. If just one column's read looks
doubtful, you can re-photograph that column on its own — much faster than redoing the whole sheet
— and the new reading is shown against the old one so you can see what changed and reject it in one
tap if needed. A saved game's page also shows any close-up photos taken while reviewing it.

## Run it on your computer

You need Node 22 or newer. You don't need an AWS account.

1. Install the dependencies:

   ```bash
   npm ci
   ```

2. Create a `.env.local` file. [`lib/config/README.md`](lib/config/README.md) lists what goes in
   it — including the local photo store, which stands in for S3 so you don't need an AWS account
   ([`lib/config/README.md`](lib/config/README.md) § Photos, locally). For each of the two
   passwords (group and admin), run this and type the password:

   ```bash
   node scripts/hash-password.js
   ```

   It prints one line that starts with `scrypt:`. Paste that line straight into `.env.local`
   exactly as printed. Don't add quotes or escape anything. The script works offline.

3. Set up the local database and start the app:

   ```bash
   mkdir -p .data
   npm run db:migrate
   npm run dev
   ```

4. Open <http://localhost:3000> and sign in with the group password.

**Right password refused?** Check the server log. If it shows `login.malformed_password_hash`, the
hash was mistyped or is in the old format from before 11 September 2026 (it contains `$`). Run
`node scripts/hash-password.js` again and paste the new value.

## Check your changes

```bash
npm test                              # the test suite
npm run lint && npm run typecheck     # code style and type errors
```

CI runs all three on every pull request.

## Editing a game

A game's page has an **Edit this game** button. It reopens the same review screen you used when you
first entered the game — the same photo beside the numbers, the same checks — and saving updates
that game in place; it never creates a second one. You can change the date, venue, players and any
number. The one thing you can't change is the sheet photo itself — to swap that, delete the game and
add it again. Saving doesn't mark the game as edited in any way: an edited game looks exactly like
one that was never touched.

## Deleting a game

A game's page has a **Delete game** button. It leads to a confirmation naming the game's date and
roster before anything happens — deleting is permanent, there's no undo, and it takes the game's
photos out of the record with it.

**The photo files themselves are not destroyed.** The app is deliberately never given permission to
delete from S3, so a deleted game's photo objects stay in the bucket — just no longer linked to
anything in the record, and the app won't hand out a link to them again. If you ever want to remove
one by hand, that's a founder action, not something the app does for you:

```bash
aws s3 rm s3://five-crowns-photos/photos/<photoId>/original.jpg
aws s3 rm s3://five-crowns-photos/photos/<photoId>/model.jpg
```

You can find a deleted game's photo id in a database backup (`npm run db:backup`) taken before the
deletion, or in the S3 console under `photos/`.

## When something goes wrong

A link to a game that's been deleted, a mistyped address, or a made-up player, roster or place all
show this app's own "not found" page, with a way back to the games list — never a generic
developer error page. If something breaks unexpectedly, you see a plain error screen instead of a
crash page. Neither screen ever shows a stack trace, a file path or any other technical detail.

## Taking a backup

There's no automatic backup. Run this whenever you want a copy of the scores:

```bash
npm run db:backup
```

It writes a dated `.sql` file into `backups/` (or `$BACKUP_DIR`, if you set one) and prints the
path. It works against your local database or, via `npx sst shell --stage prod -- npm run
db:backup`, production. Photos aren't included — they live in S3 and are kept forever separately.

## How it deploys

Every merge to `main` deploys by itself. GitHub Actions runs `scripts/deploy.sh`, which signs in to
AWS without any stored keys. The app runs in AWS's Sydney region (`ap-southeast-2`).

The deploy refuses to run until the session secret and both password hashes are in AWS Parameter
Store. It prints the exact commands you need.

- **First time:** follow [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § One-time setup.
- **Your own domain:** see the runbook for `fivecrowns.ribenajuice.xyz` in the same file. The app
  works on its CloudFront address without it.
- **Forgot a password:** see "Forgotten the admin password?" below. You don't need a developer.

## Forgotten the admin password?

No developer, no deploy, no code change — and **no game, photo or score is touched.** This only
ever writes two values in AWS Parameter Store. It works from a machine that has never seen this
repository before, using AWS CloudShell.

1. **Open AWS CloudShell** in the Sydney region: sign in to the AWS console, switch the region
   selector (top right) to **Asia Pacific (Sydney) `ap-southeast-2`**, then open CloudShell (the
   `>_` icon in the top nav bar).

2. **Clone the public repo and generate a new hash.** This repo is public, so no credentials are
   needed to clone it:

   ```bash
   git clone https://github.com/ribenajuice/five-crowns.git
   cd five-crowns
   node scripts/hash-password.js
   ```

   Type the new password when it prompts (nothing is shown as you type — that's deliberate). It
   prints one line starting with `scrypt:`. Copy it.

3. **Write the new hash and revoke every existing session that used the old one.** Pick the pair of
   commands for whichever password you're resetting — the parameter name is the only thing that
   differs:

   **Admin password:**

   ```bash
   aws ssm put-parameter --region ap-southeast-2 --overwrite --type SecureString \
     --name /five-crowns/prod/admin-password-hash --value '<the scrypt:... line from step 2>'

   aws ssm put-parameter --region ap-southeast-2 --overwrite --type String \
     --name /five-crowns/prod/admin-session-epoch --value '<current value + 1>'
   ```

   **Group password:**

   ```bash
   aws ssm put-parameter --region ap-southeast-2 --overwrite --type SecureString \
     --name /five-crowns/prod/group-password-hash --value '<the scrypt:... line from step 2>'

   aws ssm put-parameter --region ap-southeast-2 --overwrite --type String \
     --name /five-crowns/prod/group-session-epoch --value '<current value + 1>'
   ```

   The epoch bump is what actually logs everyone out — skipping it changes the password but leaves
   every already-open session working. To find "current value", read it first, then add 1:

   ```bash
   aws ssm get-parameter --region ap-southeast-2 \
     --name /five-crowns/prod/admin-session-epoch --query Parameter.Value --output text
   ```

   (swap in `group-session-epoch` for the group one.)

**Locked out of both?** Run the CloudShell steps above twice — once for the admin password, once
for the group password. (The panel's own "Change group password" and "Change admin password" forms
work now, but they need you to already be signed in — the admin form even asks for your *current*
admin password before it accepts a new one. If you can't get into the admin panel at all, this
CloudShell path is the only way back in.)

Nothing else changes. **No game, photo or score is touched, and nothing is redeployed** — this
procedure is exactly the two `aws ssm put-parameter` calls above, and it's the same path used for
first-time setup, not a separate untested one. Full reasoning:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § Lockout recovery.

## Where the docs live

| Doc | What's in it |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | What we're building and why |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How it works, plus setup and recovery runbooks |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Every decision and the reasoning behind it |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | Look and feel |
| [`docs/STATUS.md`](docs/STATUS.md) | What's done, what's next |
| [`CHANGELOG.md`](CHANGELOG.md) | What changed, in plain language |
| [`CLAUDE.md`](CLAUDE.md) | How the agent team works on this repo |
