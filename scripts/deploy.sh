#!/usr/bin/env bash
# Single deploy entrypoint — CI runs exactly this, and so can you.
# The /kickoff (or /deploy) workflow replaces the placeholder below with the
# real deploy commands for the stack chosen in docs/ARCHITECTURE.md.
set -euo pipefail

echo "❌ deploy.sh has not been configured yet."
echo "   Run /deploy in Claude Code — it will wire this up for your stack."
exit 1

# --- Examples the devops-engineer agent may adapt ---
# SST:        npx sst deploy --stage prod
# CDK:        npx cdk deploy --all --require-approval never
# Static S3:  npm run build && aws s3 sync dist/ "s3://$BUCKET" --delete \
#             && aws cloudfront create-invalidation --distribution-id "$CF_DIST" --paths '/*'
