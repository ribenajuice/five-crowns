---
name: kickoff
description: Start a brand-new project from the template — interviews the founder, produces PRD + architecture + design direction, scaffolds the code, and sets up GitHub and AWS. Run once per project.
---

# Project Kickoff

You are running the founder's project kickoff. They are a product manager: gather product intent from them, then let the team handle everything technical. Use AskUserQuestion for the interview steps; make sensible autonomous decisions everywhere else.

## Step 1 — Interview (the only heavy input step)
Ask, in at most two rounds of questions:
1. What is the product, in a sentence, and who is it for?
2. What's the ONE thing a user must be able to do in v1?
3. Web app, API/service, CLI, or something else?
4. Any hard constraints? (must integrate with X, must be private, budget, deadline)
5. Visual vibe, if it has a UI (clean SaaS / warm & friendly / dense pro-tool / founder's own words)

## Step 2 — Product & technical foundation
- Launch the **product-manager** agent with the interview answers → it writes `docs/PRD.md` with Milestone 1 as a walking skeleton.
- Launch the **architect** agent → it writes `docs/ARCHITECTURE.md`, records ADRs in `docs/DECISIONS.md`, and picks the stack per its defaults.
- Present both summaries to the founder in one message. Get a go/no-go before writing code.

## Step 3 — Design direction (skip for headless projects)
- Launch the **ui-designer** agent → 2–3 visual directions as an Artifact + `docs/DESIGN-SYSTEM.md`.
- Founder picks a direction; designer commits it to the design system doc.

## Step 4 — Scaffold
- Scaffold the chosen stack (use official generators where they exist, e.g. `npm create vite@latest`).
- Fill in the `<!-- KICKOFF -->` placeholders in `CLAUDE.md`: project name, one-line description, stack, dev commands (install/dev/test/lint/build).
- Make sure `scripts/deploy.sh` matches the chosen deploy path (architect's design).
- Verify the dev server starts and tests pass before declaring done.

## Step 5 — GitHub & AWS wiring
- Confirm the repo exists on GitHub with CI green (`.github/workflows/ci.yml` runs on push). If the repo isn't created yet: `gh repo create <name> --private --source=. --push`.
- Ask whether to set up AWS deploys now or later. If now: run `scripts/aws-bootstrap.sh` (creates the GitHub OIDC role) and set the repo variables it prints (`gh variable set AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`).

## Step 6 — Handover
Final message: what was built, links (repo, CI run, design artifact), how to run it locally, and the suggested first `/feature` to build next. Update `docs/STATUS.md` with the current state.
