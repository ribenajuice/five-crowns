---
name: ship
description: Merge and release — final checks on the open PR, merge to main, deploy to AWS, verify production. Use when a reviewed feature is ready to go live.
---

# Ship

Take the current branch/PR from "approved" to "live and verified". Stop and report at the first failure — never push past a red step.

## 1. Pre-flight
- Confirm which PR is shipping (`gh pr status`). If more than one is open, ask the founder which.
- CI must be green on the PR. If red, diagnose and fix (or hand back to `/feature` step 4) — do not merge red.
- Working tree clean; branch up to date with main.

## 2. Final review gate
- If anything changed since the last `/code-review`, re-run it on the final diff.
- Security-sensitive changes (auth, payments, user data, new public endpoints) require a security-reviewer pass with no unresolved blockers.

## 3. Merge
- `gh pr merge --squash --delete-branch`. Squash message = plain-language summary of the user-visible change.

## 4. Deploy
- If `deploy.yml` auto-deploys on main: watch the run (`gh run watch`) until it succeeds.
- Otherwise trigger it: `gh workflow run deploy.yml` — or run `scripts/deploy.sh` locally if the founder prefers.

## 5. Verify production
- Hit the live URL / health endpoint; exercise the shipped feature against production the way a user would (qa-engineer agent for anything non-trivial).
- If production is broken: roll back first (revert the merge and redeploy, or redeploy the previous version), diagnose second. Tell the founder immediately.

## 6. Wrap up
- tech-writer agent updates `CHANGELOG.md`.
- Final message: what's live, the production URL, verification evidence, and rollback status if anything went wrong. Update `docs/STATUS.md`.
