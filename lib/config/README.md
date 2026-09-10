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

# node scripts/hash-password.js — prompts, prints a hash
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

⚠️ `.env.local` holds a signing secret and two password hashes. It is covered by
the `.env.*` rule in `.gitignore` and must stay that way.
