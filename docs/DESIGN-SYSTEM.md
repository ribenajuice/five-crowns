# Design system

*Owned by the ui-designer agent; law for the frontend-developer. Created during `/kickoff` step 3.*

## Direction
<!-- The chosen visual direction in a sentence, e.g. "Clean SaaS: generous whitespace, one confident accent color, no decoration that isn't information." -->

## Tokens

### Color
| Token | Light | Dark | Use |
|---|---|---|---|
| `--brand` | | | Primary actions, links |
| `--accent` | | | Highlights, focus |
| `--bg` / `--surface` | | | Page / card backgrounds |
| `--text` / `--text-muted` | | | Copy |
| `--success` / `--warn` / `--error` | | | Semantic states |

All pairs must pass WCAG AA (4.5:1 body text, 3:1 large text/UI).

### Type
| Token | Size / weight | Use |
|---|---|---|
| `--text-xl` | | Page titles |
| `--text-lg` | | Section headings |
| `--text-base` | 16px min | Body |
| `--text-sm` | | Captions, meta |

Font stack: <!-- system stack or one self-hosted font -->

### Spacing & shape
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
- Radius: <!-- one value, used everywhere -->
- Max content width: <!-- e.g. 72rem -->

## Component inventory
<!-- Grows as components are built. Name, where it lives, when to use it. -->

| Component | Location | Notes |
|---|---|---|
| | | |

## Voice & tone
<!-- How the product talks: e.g. "Direct and warm. Contractions yes, exclamation marks no. Errors say what to do next." -->

## Hard rules
- Mobile-first; every screen works at 375px and 1280px.
- Visible focus states on everything interactive; touch targets ≥ 44px.
- Loading, empty, and error states are part of every screen's design, not afterthoughts.
