/**
 * scripts/check-receipt-names.mjs
 *
 * Fails the deploy if the receipt name rule stops holding.
 *
 * The rule, decided by the owner on 2026-09-18: a line on an order is named by
 * the option bought, on its own, and by the menu item only when there is no
 * real option. It had already been broken once by a well-meant change that
 * joined the two, and a receipt at Ashaiman printed a sixty-character line
 * nobody could read. This runs inside `npm run lint:hooks`, the step every
 * deploy already runs, so a change that breaks the rule never reaches a till.
 *
 * See lib/utils/receiptName.mjs for the rule and its history.
 *
 *   node scripts/check-receipt-names.mjs
 */
import { receiptName } from '../lib/utils/receiptName.mjs';

const cases = [
    // The receipt that started it: the option alone, never joined to the item.
    ['Fried Rice / Jollof Rice / Noodles + 3 pieces of Chicken', 'Jollof Rice + 3 pieces of Chicken', 'Jollof Rice + 3 pieces of Chicken'],
    ['Drumsticks', 'Juicy Fried Drumsticks (10 pcs)', 'Juicy Fried Drumsticks (10 pcs)'],
    ['Fried Rice', 'Assorted Fried Rice', 'Assorted Fried Rice'],
    // An option with no receipt name still shows the option, not the item.
    ['Fried Rice', 'Assorted', 'Assorted'],
    // No real option: the menu item's name.
    ['Coca Cola', 'Standard', 'Coca Cola'],
    ['Coca Cola', 'standard', 'Coca Cola'],
    ['Banku', '', 'Banku'],
    ['Banku', null, 'Banku'],
    ['Banku', undefined, 'Banku'],
    ['Cedi Wraps', 'Regular', 'Cedi Wraps'],
    // Spacing is not part of a name.
    ['  Jollof  ', '  Plain Jollof  ', 'Plain Jollof'],
];

const failures = [];
for (const [item, option, expected] of cases) {
    const got = receiptName(item, option);
    if (got !== expected) failures.push({ item, option, expected, got });
}

if (failures.length) {
    console.error('\nThe receipt name rule is broken (lib/utils/receiptName.mjs).\n');
    for (const f of failures) {
        console.error(`  item "${f.item}" + option "${f.option}"`);
        console.error(`    expected "${f.expected}"`);
        console.error(`    got      "${f.got}"\n`);
    }
    console.error('A line is named by the option bought, on its own. Read the comment at the top of lib/utils/receiptName.mjs.\n');
    process.exit(1);
}

console.log(`Receipt names: ${cases.length} cases hold.`);
