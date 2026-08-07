/**
 * A dish as a branch sees it: the company's menu row, plus this branch's word
 * on whether it has it today.
 *
 * Deliberately not the admin's `AdminMenuItem`. A manager cannot rename,
 * reprice, retag or delete anything — the menu is one menu across every branch
 * — so the only mutable field here is `availableHere`, and the type says so.
 */
export interface BranchMenuOption {
    label: string;
    displayName: string;
    price: number;
}

export interface BranchMenuRow {
    /** String id, for React keys. */
    id: string;
    /** Numeric id, for the availability endpoint. */
    numericId: number;
    name: string;
    description: string;
    category: string;
    image?: string;
    price?: number;
    options: BranchMenuOption[];
    tags: string[];
    /** On sale company-wide. The admin's flag; a branch cannot overrule it. */
    availableEverywhere: boolean;
    /** This branch has it today. The manager's flag, and the only one they set. */
    availableHere: boolean;
}

/** What the branch is actually selling right now — both flags have to say yes. */
export function isOnSale(row: BranchMenuRow): boolean {
    return row.availableEverywhere && row.availableHere;
}

export type AvailabilityFilter = '' | 'on-sale' | 'sold-out' | 'withdrawn';

export const AVAILABILITY_FILTERS: { value: AvailabilityFilter; label: string }[] = [
    { value: 'on-sale', label: 'On sale here' },
    { value: 'sold-out', label: 'Sold out here' },
    { value: 'withdrawn', label: 'Withdrawn by admin' },
];

export function matchesAvailability(row: BranchMenuRow, filter: AvailabilityFilter): boolean {
    switch (filter) {
        case 'on-sale': return isOnSale(row);
        case 'sold-out': return row.availableEverywhere && !row.availableHere;
        case 'withdrawn': return !row.availableEverywhere;
        default: return true;
    }
}
