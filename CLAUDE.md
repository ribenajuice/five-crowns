# <!-- KICKOFF: project name -->Project Name

<!-- KICKOFF: one-line description of what this product does and for whom -->

> Run `/kickoff` if the KICKOFF placeholders in this file are still unfilled — this project hasn't been initialized yet.

## Who you're working with

The founder is a **product manager, not a developer**. They decide *what* to build and how it should feel; you and the agent team decide *how*. Practically:

- Explain things in product terms, not implementation terms. "Users can now reset passwords" beats "added POST /auth/reset".
- Never ask them technical questions the team can answer (library choice, schema design, AWS service). Decide, record it in `docs/DECISIONS.md`, and mention it.
- Do ask them product questions (who is this for? what happens after the user clicks X?) — and ask early, never mid-build.
- Show, don't describe: UI decisions go through mockup Artifacts they can look at.

## The team

Specialist agents live in `.claude/agents/`. Delegate to them by role — don't do a specialist's job ad-hoc when a workflow calls for that specialist:

| Agent | Owns |
|---|---|
| product-manager | PRD, user stories, scope cuts |
| architect | Stack choices, `docs/ARCHITECTURE.md`, ADRs |
| ui-designer | `docs/DESIGN-SYSTEM.md`, mockups |
| frontend-developer / backend-developer | Implementation |
| qa-engineer | Testing against acceptance criteria |
| devops-engineer | CI/CD, AWS, deploys |
| security-reviewer | Pre-ship security audits |
| tech-writer | README, CHANGELOG, user-facing copy |

## The workflows

| Command | When |
|---|---|
| `/kickoff` | Once, at project start |
| `/feature <description>` | Day-to-day building |
| `/ship` | Merge an approved PR and deploy it |
| `/deploy` | Deploy main / first-time AWS setup |
| `/status` | Catch up after time away |

Requests that arrive without a slash command still follow the same discipline: a build request follows the `/feature` shape (spec → branch → build → QA → PR), even informally.

## Ground rules

- **Branches**: never commit directly to `main`; all work via feature branches and PRs.
- **Docs are the memory**: `docs/PRD.md` (what & why), `docs/ARCHITECTURE.md` (how), `docs/DECISIONS.md` (ADR log), `docs/DESIGN-SYSTEM.md` (look & feel), `docs/STATUS.md` (current state). Keep them current — they're how future sessions get context.
- **Checkpoints, not check-ins**: the founder approves specs and reviews PRs. Between those two points, work autonomously.
- **Secrets**: environment variables only, never in code. AWS auth from CI is OIDC-only (no stored keys).
- **Definition of done**: acceptance criteria verified by QA, CI green, docs updated. Not before.

## Stack & commands

<!-- KICKOFF: filled in during /kickoff -->
- Stack:
- Install: `<!-- e.g. npm install -->`
- Dev server: `<!-- e.g. npm run dev -->`
- Test: `<!-- e.g. npm test -->`
- Lint/typecheck: `<!-- e.g. npm run lint && npm run typecheck -->`
- Build: `<!-- e.g. npm run build -->`
- Deploy: `scripts/deploy.sh` (CI runs it via `.github/workflows/deploy.yml`)
