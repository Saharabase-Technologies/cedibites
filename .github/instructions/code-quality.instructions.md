---
description: "Use when: writing or reviewing any code, creating new files, refactoring, modularizing logic, splitting large files, building services or engines, designing components or hooks. Always-on code-quality and modularity rules for the entire CediBites platform."
applyTo: "**"
---

# Code Quality & Modularity — Always-On Rules (Frontend Mirror)

This is the frontend mirror of the canonical code-quality rules. Source of truth: `cedibites_api/.github/instructions/code-quality.instructions.md`. Read it for the full ruleset.

---

## Frontend-Specific Caps & Rules

| Type | Soft cap | Hard cap |
|---|---|---|
| Page Component | 120 lines | 200 lines |
| UI Component | 100 lines | 180 lines |
| Hook | 60 lines | 120 lines |
| Service file | 150 lines | 250 lines |
| Type file | 150 lines | 300 lines |

### Required patterns
- **Pages are thin orchestrators** — compose components, consume hooks. Zero business logic. Zero `fetch`.
- **Hooks are single-concern** — split data fetching, mutations, derived state into separate hooks.
- **Components accept `className`** — for composition flexibility.
- **No `any`** — use `unknown` + type guards, or explicit types. `// @ts-ignore` requires a written `// reason: ...` comment.
- **No inline styles** — Tailwind utility classes only.
- **No direct localStorage / cookies for auth** — use auth hooks/providers.
- **No hard-coded URLs** — env vars via `next.config.ts`.

### Folder structure (IMS example)
```
app/inventory/
  layout.tsx
  page.tsx
  _components/                  # shared atomic primitives
    StockBadge.tsx
    MovementRow.tsx
    LocationSelector.tsx
  movements/
    page.tsx
    _components/
  transfers/
    page.tsx
    _components/
  recipes/
  wastage/
  counts/
  reports/
lib/api/
  hooks/inventory/
    useStockBalances.ts
    useCreateTransfer.ts
    ...
  services/inventory/
    movements.service.ts
    transfers.service.ts
    ...
types/inventory.ts
```

### Pre-Commit Checklist (Per File)
- [ ] File under hard cap
- [ ] Every component / hook does one thing
- [ ] No `any`, no business logic in components
- [ ] Stable `key` on lists, `alt` on images, keyboard handlers on interactive elements
- [ ] `npm run lint` + `tsc --noEmit` clean for touched files
- [ ] At least one test or visual verification for new UI

### Cross-Agent
- Disagreement with a rule → surface to developer with rationale; do not silently bypass.
- New shared primitives → loop in **UX Architect** before creating.
