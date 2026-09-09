#!/usr/bin/env bash
# One-time AWS setup for this project's GitHub deploys.
# Creates (or reuses) the GitHub OIDC provider and a per-repo deploy role,
# then sets the repo variables the deploy workflow needs.
#
# Prereqs: aws CLI logged in, gh CLI logged in, run from the repo root.
set -euo pipefail

REGION="${AWS_REGION:-$(aws configure get region || true)}"
REGION="${REGION:-us-east-1}"

REPO_FULL=$(gh repo view --json nameWithOwner -q .nameWithOwner)
ORG="${REPO_FULL%%/*}"
REPO="${REPO_FULL##*/}"
STACK="github-oidc-${REPO}"

echo "Repo:   ${REPO_FULL}"
echo "Region: ${REGION}"
echo "Stack:  ${STACK}"

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
  --tags Project="$REPO" ManagedBy=claude-template

ROLE_ARN=$(aws cloudformation describe-stacks \
  --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='DeployRoleArn'].OutputValue" \
  --output text)

gh variable set AWS_DEPLOY_ROLE_ARN --body "$ROLE_ARN"
gh variable set AWS_REGION --body "$REGION"

echo ""
echo "✅ Done. GitHub Actions can now deploy to AWS via OIDC (no stored keys)."
echo "   Role: ${ROLE_ARN}"
echo "   Repo variables AWS_DEPLOY_ROLE_ARN and AWS_REGION are set."
