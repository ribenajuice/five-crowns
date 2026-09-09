---
name: deploy
description: Deploy the current main branch to AWS and verify it — without the full ship ceremony. Also handles first-time AWS setup for the project.
---

# Deploy

## First-time setup (if AWS isn't wired up yet)
Signs: no `AWS_DEPLOY_ROLE_ARN` repo variable (`gh variable list`), or `scripts/deploy.sh` still contains the scaffold placeholder.
1. Run `scripts/aws-bootstrap.sh` — creates the GitHub OIDC provider + a least-privilege deploy role for this repo via CloudFormation (`infra/github-oidc.yaml`).
2. Set repo variables it prints: `gh variable set AWS_DEPLOY_ROLE_ARN --body <arn>` and `gh variable set AWS_REGION --body <region>`.
3. Have the devops-engineer agent make `scripts/deploy.sh` actually deploy the stack per `docs/ARCHITECTURE.md`, including a budget alarm on first deploy.

## Normal deploy
1. Confirm main is green in CI. Never deploy a red main.
2. Trigger the pipeline: `gh workflow run deploy.yml && gh run watch` (preferred — same path every time). Local `scripts/deploy.sh` only when the founder asks or Actions is down.
3. Verify: health endpoint / live URL responds and the newest change is actually visible. A deploy isn't done until verified.
4. Report: what version is live, the URL, and the verification you did. Any cost-relevant infra change gets a monthly estimate.

## Rules
- Deploys are idempotent; if a deploy half-fails, re-running must be safe.
- Destructive infra changes (stack deletion, bucket emptying) always need explicit founder confirmation first.
