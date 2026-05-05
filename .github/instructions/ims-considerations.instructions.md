---
description: "Use when: working on Inventory Management System (IMS), inventory features, stock movements, recipes, BOMs, transfers, requisitions, wastage, stock counts, warehouse, satellite kitchens, mother kitchen, purchasing clerk, warehouse manager, branch inventory, stock ledger, variance reports, costing. Always-on guardrails for the IMS module."
applyTo: "**"
---

# IMS Considerations — Always-On Guardrails (Frontend Mirror)

This is the frontend mirror of the canonical IMS rules. The source of truth lives in `cedibites_api/.github/instructions/ims-considerations.instructions.md` and `cedibites_api/docs/inventory/architecture.md`. Read both before any IMS frontend work.

---

## Frontend-Specific Guardrails

### Route group & isolation
- All IMS UI lives under `app/inventory/` — own `layout.tsx`, own sidebar, own providers.
- Lazy-loaded — IMS bundle MUST NOT inflate POS / customer / staff bundles.
- Entry tile on staff/admin dashboard launches the portal (same pattern as POS/KDS/Order Manager).

### Type & hook isolation
- Types: `types/inventory.ts` — do not pollute `types/api.ts` with IMS-only shapes.
- Hooks: `lib/api/hooks/inventory/` — separate query-key namespace (`['inventory', ...]`).
- Services: `lib/api/services/inventory/` — one service file per sub-domain (movements, transfers, recipes, etc.).

### Feature-flag gating
- Read flags from `/api/me/features` (cached query). Hide entry tiles + redirect on direct nav when `inventory.enabled === false`.
- Never hard-code role checks — always combine flag + permission.

### Tablet-first design
- Default breakpoint target: tablet portrait (≥ 768px).
- Touch targets ≥ 44px. Single-column forms on tablet. Large numeric inputs for stock quantities.
- Mobile and desktop must work but are secondary.

### Operator vocabulary (UI copy)
- "Mother kitchen" / "Satellite kitchen" / "Requisition" / "Transfer" / "Received" / "Disputed" / "Closing stock" / "Wastage".
- No accountant or developer jargon in operator-facing screens.

### Locked decisions reference
1. Same domain, dedicated portal — `app/inventory/`
2. Tablet-first
3. Stock Ledger report uses canonical columns: Opening · Received · Transfers In · Transfers Out · Sales (BOM) · Wastage · Expected Closing · Actual Closing · Variance
4. Dashboard shows operational alerts only — full reports live under Reports section
5. Disputed transfers display as immutable history; corrective transfers shown as linked siblings
6. Daily closing entry is mandatory — UI surfaces missed days prominently
7. Wastage threshold default ₵500 — UI shows live total vs threshold while entering

### Cross-Agent
- Touching shared design tokens, layout, navigation → loop in **UX Architect**.
- Adding new IMS hooks that call new endpoints → ensure backend contract exists first (verify with Inventory Auditor).
- Any meaningful change → **Project Chronicle**.

### Out of Scope (Explicit)
Do not modify POS, order numbering, messaging templates, or finance UI under the IMS initiative. See backend mirror for full out-of-scope list.
