// ─── Shared currency formatter ────────────────────────────────────────────────
// Single source of truth for ₵formatting across all staff modules.

export function formatGHS(n: number): string {
    return `₵${n.toFixed(2)}`;
}
