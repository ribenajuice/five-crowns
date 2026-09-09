# 🚀 Product Team Template

A project template that gives you a full software team inside Claude Code. You act as the product manager; a roster of specialist agents (PM, architect, UI designer, developers, QA, DevOps, security, tech writer) handles the rest — wired into GitHub for CI/PRs and AWS for keyless deploys.

> **Already scaffolded a project from this?** This README gets rewritten by the tech-writer agent to describe *your product*. The template manual below is for starting fresh.

## Starting a new project

```bash
# 1. Copy the template into a new repo (private by default)
gh repo create my-new-project --template ribenajuice/product-team-template --private --clone
cd my-new-project

# 2. Open Claude Code and kick off
claude
> /kickoff
```

`/kickoff` interviews you (5 product questions, ~2 minutes), then the team writes the PRD, picks the stack, shows you visual directions as clickable mockups, scaffolds the code, and wires up CI. That's the whole setup.

## Day-to-day: the five commands

| Command | What it does |
|---|---|
| `/kickoff` | One-time project start: interview → PRD → architecture → design → scaffold |
| `/feature add CSV export` | Builds a feature end-to-end: spec → branch → build → QA → PR. You approve the spec at the start and review the PR at the end — that's it. |
| `/ship` | Merges the approved PR, deploys to AWS, verifies production |
| `/deploy` | Deploys main directly; also does first-time AWS setup |
| `/status` | 60-second catch-up: what shipped, what's in flight, what needs you |

A typical week: `/status` to catch up → `/feature <idea>` a few times → review the PRs → `/ship`.

## The team

Agents live in `.claude/agents/` — each has a role, standards, and rules:

- **product-manager** — PRDs, user stories, cutting scope
- **architect** — stack choices (boring, cheap, serverless-first), decision log
- **ui-designer** — design system + HTML mockups you can view before code exists
- **frontend-developer / backend-developer** — implementation
- **qa-engineer** — verifies acceptance criteria by actually exercising the app
- **devops-engineer** — CI/CD, AWS infra, cost guardrails
- **security-reviewer** — pre-ship audits on auth/payments/data changes
- **tech-writer** — README, changelog, user-facing copy

The project's shared memory lives in `docs/` (PRD, architecture, decision log, design system, status). Every session reads these, so you never re-explain your project.

## One-time machine setup (prerequisites)

Only needed once per computer — you likely have these already:

```bash
gh auth login        # GitHub CLI
aws configure        # AWS CLI credentials (or aws sso login)
```

## AWS deploys (per project, when ready)

Run `/deploy` in Claude Code, or manually:

```bash
./scripts/aws-bootstrap.sh
```

This creates a **GitHub OIDC deploy role** via CloudFormation — GitHub Actions gets short-lived AWS credentials scoped to this one repo. No AWS keys are ever stored in GitHub. After that, every merge to `main` deploys automatically via `.github/workflows/deploy.yml`, and a budget alarm guards your bill.

## What's in the box

```
.claude/agents/      # the team (9 specialist agents)
.claude/skills/      # the workflows (/kickoff /feature /ship /deploy /status)
.claude/settings.json# pre-approved safe commands (fewer permission prompts)
CLAUDE.md            # how the team operates (filled in by /kickoff)
docs/                # PRD, architecture, decisions, design system, status
.github/workflows/   # CI on every PR; OIDC deploy to AWS on merge to main
.github/             # PR template, issue forms, dependabot
infra/github-oidc.yaml   # CloudFormation for keyless AWS deploys
scripts/aws-bootstrap.sh # one-command AWS wiring
scripts/deploy.sh        # single deploy entrypoint (CI runs exactly this)
```

## Models: one dial, with per-agent overrides

By default every agent **inherits your session's model** — run Claude Code on your strongest model (Fable 5 / Opus) and the whole team uses it. One setting controls everything.

If you hit rate limits or want to stretch usage on a big build, tier the *execution* roles down without touching the *judgment* roles: each agent file in `.claude/agents/` has a commented `# model:` line in its frontmatter — uncomment it to pin that agent.

| Tier | Agents | Suggested pin |
|---|---|---|
| Judgment — decisions and reviews; mistakes are expensive | product-manager, architect, security-reviewer | keep inherited (or `opus`) |
| Execution — builds against clear specs; the QA gate catches slips | frontend-developer, backend-developer, qa-engineer, ui-designer, tech-writer | `sonnet` |
| Infra — touches live AWS; tier down last | devops-engineer | keep inherited |

Rule of thumb: don't tier down preemptively — run fully inherited until cost actually bites.

## Improving the template

When a project teaches you something (a better agent rule, a new workflow), edit it in the **template repo** so every future project gets it. The template is the asset; projects are copies.
