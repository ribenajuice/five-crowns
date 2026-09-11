#!/usr/bin/env bash
# One-time AWS + GitHub setup for this project's deploys. Safe to re-run: it
# also applies later changes to infra/github-oidc.yaml.
#
#   1. Creates (or reuses) the account's GitHub OIDC provider and this repo's
#      deploy role (infra/github-oidc.yaml).
#   2. Creates the `production` GitHub environment and lets ONLY `main` deploy
#      to it. ⚠️ Load-bearing: the deploy role trusts exactly
#      repo:<org>/<repo>:environment:production, and for a job that names an
#      environment GitHub puts the environment — not the branch — in that
#      subject. This branch policy is what stops any other branch deploying.
#   3. Sets the repo variables the deploy workflow needs. Done last, because
#      setting AWS_DEPLOY_ROLE_ARN is what switches deploys on.
#
# Prereqs: aws CLI logged in, gh CLI logged in as a repo admin, run from the
# repo root. (Environment branch policies need a public repo or a paid plan;
# this repo is public.)
set -euo pipefail

# Sydney, like the app. IAM itself is global, but this becomes the AWS_REGION
# repo variable that every deploy — and its Parameter Store reads — runs in.
REGION="${AWS_REGION:-ap-southeast-2}"

REPO_FULL=$(gh repo view --json nameWithOwner -q .nameWithOwner)
ORG="${REPO_FULL%%/*}"
REPO="${REPO_FULL##*/}"
STACK="github-oidc-${REPO}"
ENVIRONMENT="production"

# The OIDC subject prefix exactly as GitHub will send it. Repos on GitHub's
# immutable subject format send `repo:<owner>@<owner-id>/<repo>@<repo-id>`,
# not `repo:<owner>/<repo>` — assuming the classic form made the first deploy
# fail with "Not authorized to perform sts:AssumeRoleWithWebIdentity".
# (gh's built-in --jq, so no separate jq install is needed.)
OIDC_API="repos/${REPO_FULL}/actions/oidc/customization/sub"
if [ "$(gh api "$OIDC_API" --jq '.use_default')" != "true" ]; then
  echo "❌ This repo uses a custom OIDC subject template (include_claim_keys)."
  echo "   The deploy role expects '<prefix>:environment:${ENVIRONMENT}'. Reset it with:"
  echo "   gh api --method PUT ${OIDC_API} -F use_default=true"
  exit 1
fi
SUB_PREFIX=$(gh api "$OIDC_API" --jq '.sub_claim_prefix // empty')
SUB_PREFIX="${SUB_PREFIX:-repo:${REPO_FULL}}"

echo "Repo:        ${REPO_FULL}"
echo "Region:      ${REGION}"
echo "Stack:       ${STACK}"
echo "Environment: ${ENVIRONMENT} (deploys from main only)"
echo "OIDC sub:    ${SUB_PREFIX}:environment:${ENVIRONMENT}"

# --- AWS: OIDC provider + deploy role ----------------------------------------

# Reuse the account-wide OIDC provider if it already exists (one per account).
EXISTING_PROVIDER=$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?contains(Arn, 'token.actions.githubusercontent.com')].Arn | [0]" \
  --output text)
[ "$EXISTING_PROVIDER" = "None" ] && EXISTING_PROVIDER=""
if [ -n "$EXISTING_PROVIDER" ]; then
  echo "Reusing existing OIDC provider: ${EXISTING_PROVIDER}"
fi

aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK" \
  --template-file infra/github-oidc.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    GitHubOrg="$ORG" \
    RepositoryName="$REPO" \
    OIDCProviderArn="$EXISTING_PROVIDER" \
    SubjectPrefix="$SUB_PREFIX" \
  --tags Project="$REPO" ManagedBy=claude-template

ROLE_ARN=$(aws cloudformation describe-stacks \
  --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='DeployRoleArn'].OutputValue" \
  --output text)

# --- GitHub: the production environment, main only ---------------------------

# Creates the environment, or updates it in place, with custom branch policies.
gh api --method PUT "repos/${REPO_FULL}/environments/${ENVIRONMENT}" --input - >/dev/null <<'JSON'
{"deployment_branch_policy": {"protected_branches": false, "custom_branch_policies": true}}
JSON

POLICIES=$(gh api "repos/${REPO_FULL}/environments/${ENVIRONMENT}/deployment-branch-policies" \
  --jq '.branch_policies[] | "\(.type // "branch"):\(.name)"')

if ! printf '%s\n' "$POLICIES" | grep -qx 'branch:main'; then
  gh api --method POST "repos/${REPO_FULL}/environments/${ENVIRONMENT}/deployment-branch-policies" \
    -f name=main -f type=branch >/dev/null
fi

# Any other rule is another branch (or tag) that could deploy to production.
# Not removed automatically — that is a change someone made on purpose, so it
# gets a human decision — but the setup refuses to finish around it.
OTHERS=$(printf '%s\n' "$POLICIES" | grep -vx 'branch:main' | grep -v '^$' || true)
if [ -n "$OTHERS" ]; then
  echo "❌ The ${ENVIRONMENT} environment also allows deploys from:"
  printf '     %s\n' $OTHERS
  echo "   Remove them in GitHub → Settings → Environments → ${ENVIRONMENT}, then re-run."
  exit 1
fi

# --- GitHub: repo variables (switches deploys on) ----------------------------

gh variable set AWS_DEPLOY_ROLE_ARN --body "$ROLE_ARN"
gh variable set AWS_REGION --body "$REGION"

echo ""
echo "✅ Done. GitHub Actions can now deploy to AWS via OIDC (no stored keys)."
echo "   Role: ${ROLE_ARN}"
echo "   Trusts only: repo:${REPO_FULL}:environment:${ENVIRONMENT}"
echo "   Environment '${ENVIRONMENT}' accepts deploys from main only."
echo "   Repo variables AWS_DEPLOY_ROLE_ARN and AWS_REGION are set."
echo ""
echo "   Check: gh api repos/${REPO_FULL}/environments/${ENVIRONMENT}/deployment-branch-policies"
