// ─── Shared currency formatter ────────────────────────────────────────────────
// Single source of truth for GHS formatting across all staff modules.

export function formatGHS(n: number): string {
    return `GHS ${n.toFixed(2)}`;
}
