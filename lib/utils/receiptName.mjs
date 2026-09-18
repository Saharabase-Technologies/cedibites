/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE RECEIPT NAME RULE. Decided by the owner, 2026-09-18. Do not change it.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * One line of an order is named by the OPTION that was bought, on its own.
 * Only a dish with no real option is named by the menu item.
 *
 *   item "Fried Rice / Jollof Rice / Noodles + 3 pieces of Chicken"
 *   option "Jollof Rice + 3 pieces of Chicken"
 *     → "Jollof Rice + 3 pieces of Chicken"      (never both joined)
 *
 *   item "Coca Cola", option "Standard"  → "Coca Cola"
 *   item "Banku", no option              → "Banku"
 *
 * The option's name is its receipt name, `display_name`, and `option_label`
 * only when an option has none. Every place that names a line uses this: the
 * printed receipt and its reprints, the Order Manager tickets, the till, order
 * history, the customer's order and tracking pages, the analytics lists.
 *
 * Why it is its own plain file: the deploy gate (`npm run lint:hooks`, which
 * runs scripts/check-receipt-names.mjs) imports THIS file and fails the deploy
 * if the rule stops holding. It is .mjs, not TypeScript, because the server
 * builds with Node 20, which cannot load TypeScript directly.
 *
 * History, so nobody "fixes" it back. On 2026-09-07 this was changed to join
 * the item name onto any option that did not already contain it, because
 * options with no `display_name` fell back to a bare menu pill ("Assorted")
 * and a customer could not tell what they had bought. The join printed
 * "Fried Rice / Jollof Rice / Noodles + 3 pieces of Chicken, Jollof Rice + 3
 * pieces of Chicken" at Ashaiman on 2026-09-18, and the owner ruled: the
 * option name, alone, always. A bare pill is fixed by giving the option a
 * receipt name (admin menu screen, or `php artisan menu:stamp-receipt-names`
 * in the API), never by joining the menu item name back on.
 */

/**
 * Options that stand for "no choice was made": a dish with one way of being
 * sold. The dish is named by its menu item instead.
 */
const NO_REAL_OPTION = new Set(['standard', 'regular', 'default', 'normal', 'single']);

/**
 * @param {string | null | undefined} itemName   the menu item's name
 * @param {string | null | undefined} optionName the option's receipt name (display_name, else option_label)
 * @returns {string}
 */
export function receiptName(itemName, optionName) {
    const name = (itemName ?? '').trim();
    const option = (optionName ?? '').trim();

    if (!option || NO_REAL_OPTION.has(option.toLowerCase())) return name || option;

    return option;
}
