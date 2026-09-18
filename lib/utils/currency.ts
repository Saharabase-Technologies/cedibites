// ─── Shared currency formatter ────────────────────────────────────────────────
// Single source of truth for ₵ formatting across the staff modules and the
// customer's bill, from the cart sheet onwards. Always two places: a bill with
// a 1% service charge on it has pesewas in it, and a column of figures only
// lines up when every one of them is written the same way. The cart used to say
// ₵120 and checkout ₵120.00 for the same money, a second apart.
// Handles string/number from API (decimals may arrive as strings).

export function formatGHS(n: number | string | null | undefined): string {
    const num = typeof n === 'number' ? n : parseFloat(String(n ?? 0));
    return `₵${(Number.isNaN(num) ? 0 : num).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
