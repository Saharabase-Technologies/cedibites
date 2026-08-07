// ─── Shared currency formatter ────────────────────────────────────────────────
// Single source of truth for ₵formatting across all staff modules.
// Handles string/number from API (decimals may arrive as strings).

export function formatGHS(n: number | string | null | undefined): string {
    const num = typeof n === 'number' ? n : parseFloat(String(n ?? 0));
    return `₵${(Number.isNaN(num) ? 0 : num).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
