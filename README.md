# Five Crowns Ledger

Five Crowns Ledger is a private, permanent record of our group's Five Crowns nights. You photograph
the finished paper scoresheet, and the app turns it into a searchable history of every game.

**Where it's at:** live at https://fivecrowns.ribenajuice.xyz. Reading a sheet automatically works,
and the admin panel is where you paste in the API key that powers it. See `docs/STATUS.md`.

**Adding a game:** tap **Add a game**, photograph the paper scoresheet (or pick one from your
photos), turn it upright, then choose how to fill in the numbers: **Read the sheet** has the app
read them off your photo, or **Type it in by hand** lets you enter them yourself — either way you
check every number on the review screen before saving. An automatic read shows a progress screen
while it works; if it fails, **Try again** retries the same photo without asking you to
re-photograph it. There's a daily limit on automatic reads as a safety net, but typing the numbers
in by hand always works, however many reads have been used that day. Pick the date, venue and
players from lists, or add new ones. Your work saves as you go, so it survives closing the page.

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
- **Forgot the admin password:** see § Lockout recovery in the same file. You don't need a
  developer.

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
