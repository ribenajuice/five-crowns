# Runtime configuration

Every secret lives in **SSM Parameter Store** as a SecureString. ⚠️ **None is
ever written to the database** — that is what makes the admin panel's download
and the nightly dump secret-free by construction rather than by filtering
(`docs/ARCHITECTURE.md` § The admin panel).

## Two owners

> If the founder can change it from the admin panel, the **app** owns it.
> If it is needed to deploy or migrate, **SST** owns it.

| Parameter | Owner | Purpose |
|---|---|---|
| `/five-crowns/{stage}/group-password-hash` | App | scrypt hash of the shared password |
| `/five-crowns/{stage}/admin-password-hash` | App | scrypt hash of the admin password |
| `/five-crowns/{stage}/group-session-epoch` | App | Bumped to log every device out |
| `/five-crowns/{stage}/admin-session-epoch` | App | Bumped to log every admin session out |
| `/five-crowns/{stage}/anthropic-api-key` | App | The vision call. Write-only from the panel |
| `/five-crowns/{stage}/anthropic-api-key-last4` | App | Not a secret — a plain `String`. The panel's only view of the key |
| `/five-crowns/{stage}/anthropic-api-key-set-at` | App | Not a secret — a plain `String`. ISO timestamp of the last successful *set* |
| `/five-crowns/{stage}/session-secret` | Deploy | HMAC key for both cookies |
| `/five-crowns/{stage}/app-domain`, `app-cert-arn` | App | Optional; the custom domain |
| `/five-crowns/{stage}/budget-alert-email` | App | Optional; where the zero-spend alarm goes |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | SST secret | Needed to deploy and migrate |

Reads are cached for 60 seconds and invalidated explicitly in the container that
handled a write, so the founder can rotate a key without a deploy and see it
take effect within a minute everywhere.

## Local development

There is no AWS account in development, so `CONFIG_SOURCE=env` reads the same
values from the environment. The mapping is mechanical:
`group-password-hash` → `FIVE_CROWNS_GROUP_PASSWORD_HASH`.

Put these in a **`.env.local`** (gitignored — never commit one):

```dotenv
CONFIG_SOURCE=env

# 32 random bytes: openssl rand -base64 32
SESSION_SECRET=

# node scripts/hash-password.js — prompts, prints a hash. Paste it as-is,
# e.g. FIVE_CROWNS_GROUP_PASSWORD_HASH=scrypt:16384:8:1:<salt>:<hash>
FIVE_CROWNS_GROUP_PASSWORD_HASH=
FIVE_CROWNS_ADMIN_PASSWORD_HASH=

# Optional. Absent, the app uses file:./.data/five-crowns.db
# TURSO_DATABASE_URL=
# TURSO_AUTH_TOKEN=
```

Then:

```bash
mkdir -p .data
npm run db:migrate
npm run dev
```

A password hash looks like `scrypt:16384:8:1:<salt>:<hash>` and contains only
letters, digits, `:`, `_` and `-`, so it needs **no quoting or escaping** — here
or in a shell. ⚠️ Next's env loader expands every `$` in `.env.local`, quoted
or not, which is exactly why the format has none. If login refuses the right
password and the server log shows `login.malformed_password_hash`, the value
was mistyped or is from the retired `scrypt$…` format: regenerate it.
(`tests/config/local-env.test.ts` proves this section works as written.)

⚠️ `.env.local` holds a signing secret and two password hashes. It is covered by
the `.env.*` rule in `.gitignore` and must stay that way.

### Setting the API key, locally

The admin panel's "set the Claude API key" write path (`putParameter`) needs
somewhere to write to. In `env` mode there is no SSM, so a write lands in an
**in-memory map for the life of the dev process** — never on disk, never in
`.env.local` — and is forgotten on restart, the same way an uncommitted write
would be if SSM itself were unreachable. This is enough to exercise the whole
verify-then-save flow (`lib/vision/api-key.ts`) with no AWS account.

For a key that should survive `npm run dev` restarts, set it the same way as
the password hashes instead:

```dotenv
FIVE_CROWNS_ANTHROPIC_API_KEY=sk-ant-...
```

`FIVE_CROWNS_ANTHROPIC_API_KEY_LAST4` and `FIVE_CROWNS_ANTHROPIC_API_KEY_SET_AT`
are optional and cosmetic — the admin panel's status read falls back to
"not set" for either one it can't find, and "whether it works" is never read
from here at all; see `docs/DECISIONS.md`, "The API key's status is derived,
not stored".

### Photos, locally

⚠️ **Local development and QA must never touch the real S3 bucket.** `lib/photos/`
picks a driver at runtime (`lib/photos/storage.ts`):

- **`local`** — whenever `PHOTOS_STORAGE=local` is set, or (the normal case)
  `PHOTOS_BUCKET` is simply absent, which it is on every developer's machine.
  Files live under the gitignored `.data/photos/{photoId}/{original,model}.jpg`
  and are served through dev-only routes at
  `/api/dev-photos/{photoId}/{original,model}.jpg`. Those URLs carry an
  HMAC-signed expiry (5 minutes, keyed by `SESSION_SECRET` — the same secret
  that signs the session cookie), so the review screen's photo strip and the
  save flow's `HeadObject`-style existence check both work exactly as they do
  against S3, with no AWS account.
- **`s3`** — whenever `PHOTOS_BUCKET` is set (production, via `sst.config.ts`)
  and `PHOTOS_STORAGE` isn't forced to `local`.

⚠️ **The dev-photos routes are impossible in production**, by construction, not
by convention: they refuse every request unless the local driver is selected
*and* `AWS_LAMBDA_FUNCTION_NAME` is unset (`localDevPhotosAllowed` in
`lib/photos/storage.ts`; refusal is tested in
`tests/photos/local-storage.test.ts`).

Nothing extra needs setting for `npm run dev` to work with photos — the local
driver is the default. Set `PHOTOS_STORAGE=local` explicitly only if
`PHOTOS_BUCKET` happens to be set in your shell for some other reason and you
still want the local driver.
