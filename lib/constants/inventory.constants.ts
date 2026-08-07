/**
 * lib/constants/inventory.constants.ts
 *
 * IMS-wide configuration constants. Locked decisions live in
 * cedibites_api/docs/JOURNAL.md.
 */

/**
 * POs with an estimated total at or above this amount require Admin approval
 * before they can transition from `draft → sent`. Below this, POs auto-approve
 * on submit. Mirrors backend `config('inventory.po_approval_threshold')` once
 * the backend module ships.
 *
 * Decision: 2026-05-05 — default GH₵10,000.
 */
export const PO_APPROVAL_THRESHOLD = 10_000;

/**
 * Default wastage approval threshold (per event). Configurable per location
 * via `inventory_settings.wastage_threshold_amount`.
 *
 * Decision: 2026-05-05 — default GH₵500.
 */
export const WASTAGE_THRESHOLD_DEFAULT = 500;
