#!/usr/bin/env bash
# Single deploy entrypoint — CI runs exactly this, and so can you.
#
#   ./scripts/deploy.sh
#
# Deploys the whole thing: CloudFront + Lambda + S3 (from sst.config.ts), then
# applies database migrations. See docs/ARCHITECTURE.md for the footprint.
#
# In CI, AWS credentials arrive via GitHub OIDC (.github/workflows/deploy.yml).
# Locally, whatever `aws sts get-caller-identity` already works with.
set -euo pipefail

STAGE="${STAGE:-prod}"
# REGION: ap-southeast-2 (Sydney) — the founder and players are in Australia.
# See the region-correction ADR in docs/DECISIONS.md (2026-09-10). The ACM
# certificate for CloudFront is still issued in us-east-1; that is not a mistake.
export AWS_REGION="${AWS_REGION:-ap-southeast-2}"

cd "$(dirname "$0")/.."

# --- Preflight ---------------------------------------------------------------

for cmd in node npm npx aws; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "❌ '$cmd' not found on PATH."; exit 1; }
done

if [ ! -f sst.config.ts ]; then
  echo "❌ No sst.config.ts. The project hasn't been scaffolded yet — run /feature to build"
  echo "   Milestone 1, or /kickoff if this is a fresh repo."
  exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "❌ No usable AWS credentials."
  echo "   CI: check the AWS_DEPLOY_ROLE_ARN repo variable (scripts/aws-bootstrap.sh sets it)."
  echo "   Local: log in with the AWS CLI first."
  exit 1
fi

echo "▶ Deploying Five Crowns Ledger"
echo "  stage:   $STAGE"
echo "  region:  $AWS_REGION"
echo "  account: $(aws sts get-caller-identity --query Account --output text)"
echo ""

# Installed before the secrets check: `sst secret list` runs from node_modules.
echo "▶ Installing dependencies"
if [ -f package-lock.json ]; then npm ci; else npm install; fi

# --- Secrets check -----------------------------------------------------------
# Every secret lives in SSM Parameter Store, never in code and never in the
# database (see docs/ARCHITECTURE.md "The admin panel"). Two owners:
#   * SST secrets      - needed to deploy and migrate
#   * app parameters   - rotatable by the founder from the admin panel
# Missing ones only fail at runtime, so catch them here instead.

# SST v4 keeps its secrets encrypted in its own state (not as one SSM parameter
# each), so ask SST. `sst secret list` prints KEY=value: only the names survive
# this pipeline — no value reaches this script's output or the CI log.
SST_SECRET_NAMES=$(npx sst secret list --stage "$STAGE" 2>/dev/null \
  | grep -E '^[A-Za-z_][A-Za-z0-9_]*=' | cut -d= -f1 || true)

MISSING_SST=""
for secret in TURSO_DATABASE_URL TURSO_AUTH_TOKEN; do
  printf '%s\n' "$SST_SECRET_NAMES" | grep -qx "$secret" || MISSING_SST="$MISSING_SST $secret"
done

MISSING_APP=""
for param in session-secret group-password-hash admin-password-hash; do
  aws ssm get-parameter \
      --name "/five-crowns/$STAGE/$param" \
      --with-decryption >/dev/null 2>&1 || MISSING_APP="$MISSING_APP $param"
done

if [ -n "$MISSING_SST" ]; then
  echo "⚠️  SST secrets not set for stage '$STAGE':$MISSING_SST"
  echo ""
  for secret in $MISSING_SST; do
    echo "     npx sst secret set $secret '<value>' --stage $STAGE"
  done
  echo ""
fi

if [ -n "$MISSING_APP" ]; then
  echo "⚠️  App parameters not set for stage '$STAGE':$MISSING_APP"
  echo ""
  echo "   Passwords are never set by a deploy — generate a scrypt hash locally,"
  echo "   then write it straight to Parameter Store. This is the same path used"
  echo "   for admin lockout recovery, so it is worth doing by hand once:"
  echo ""
  echo "     node scripts/hash-password.js        # prompts, prints a hash"
  echo "     aws ssm put-parameter --region \"$AWS_REGION\" --overwrite \\"
  echo "       --type SecureString --name /five-crowns/$STAGE/<param> --value '<hash>'"
  echo ""
  echo "   session-secret is 32 random bytes, not a password hash:"
  echo "     openssl rand -base64 32"
  echo ""
fi

if [ -n "$MISSING_SST" ] || [ -n "$MISSING_APP" ]; then
  echo "❌ Refusing to deploy with secrets missing. See docs/ARCHITECTURE.md"
  echo "   § Environments and configuration."
  exit 1
fi

# --- Build & deploy ----------------------------------------------------------

# Optional custom domain. Absent until the founder has completed the DNS
# runbook in docs/ARCHITECTURE.md; the app deploys fine on its CloudFront URL
# without them, so a DNS mistake can never block a deploy.
APP_DOMAIN=$(aws ssm get-parameter --name "/five-crowns/$STAGE/app-domain" \
  --query Parameter.Value --output text 2>/dev/null || true)
APP_CERT_ARN=$(aws ssm get-parameter --name "/five-crowns/$STAGE/app-cert-arn" \
  --query Parameter.Value --output text 2>/dev/null || true)

if [ -n "$APP_DOMAIN" ] && [ -n "$APP_CERT_ARN" ]; then
  export APP_DOMAIN APP_CERT_ARN
  echo "▶ Custom domain: $APP_DOMAIN"
else
  echo "▶ Custom domain: not configured — deploying to the CloudFront URL only."
  echo "  (See docs/ARCHITECTURE.md, 'Runbook: putting the app on fivecrowns.ribenajuice.xyz')"
fi

# The zero-spend budget alarm needs somewhere to send the alert. Optional, and
# absent it the budget is skipped with a loud warning rather than created with
# no subscriber, which would be an alarm nobody hears.
# ⚠️ The address itself is never printed: Actions logs on a public repo are public.
BUDGET_ALERT_EMAIL=$(aws ssm get-parameter --name "/five-crowns/$STAGE/budget-alert-email" \
  --query Parameter.Value --output text 2>/dev/null || true)

if [ -n "$BUDGET_ALERT_EMAIL" ]; then
  export BUDGET_ALERT_EMAIL
  echo "▶ Zero-spend budget alerts: configured"
else
  echo "⚠️  No budget alert address — the zero-spend alarm will not be created."
  echo "     aws ssm put-parameter --region \"$AWS_REGION\" --overwrite --type String \\"
  echo "       --name /five-crowns/$STAGE/budget-alert-email --value 'you@example.com'"
fi

echo "▶ sst deploy (CloudFront, Lambda, S3, secrets)"
npx sst deploy --stage "$STAGE"

# Migrations run through `sst shell` so they get the same Turso credentials the
# app does without ever printing them. ⚠️ SST v4's shell exposes linked secrets
# only as SST_RESOURCE_* JSON — not as TURSO_DATABASE_URL — and drizzle.config.ts
# falls back to the local dev file without it, which would "succeed" against a
# throwaway file. turso-env.mjs maps the names and refuses anything but the
# remote database.
echo "▶ Applying database migrations"
npx sst shell --stage "$STAGE" -- \
  node scripts/turso-env.mjs --require-remote -- npx drizzle-kit migrate

echo ""
echo "✅ Deployed. The app URL is in the sst output above."
echo ""
echo "   The Claude API key is set from the admin panel at /admin, not by this"
echo "   script — the founder rotates it without a deploy. If this is a first"
echo "   deploy, set it there before trying to transcribe a sheet."
