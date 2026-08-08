'use client';

import { SegmentedTabsLink, type SegmentedTabItem } from '@/app/inventory/_components';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

/**
 * Customers, and the imported contacts that are not customers.
 *
 * Two tabs rather than one list, because the difference between them is the
 * whole reason the second one exists. A contact has bought nothing; putting
 * them in the same table under a status column would have somebody read the row
 * count as the size of the customer base within a week.
 *
 * The second tab is hidden without `manage_campaigns`. It is not decoration —
 * the API refuses the same people — but a tab that 403s is worse than no tab.
 */
const CUSTOMERS_TAB: SegmentedTabItem = { href: '/admin/customers', label: 'Customers', exact: true };
const CONTACTS_TAB: SegmentedTabItem = { href: '/admin/customers/contacts', label: 'Imported Contacts' };

export function CustomersTabNav() {
    const { staffUser } = useStaffAuth();

    const canSeeContacts = staffUser?.permissions?.includes('manage_campaigns') ?? false;

    if (!canSeeContacts) {
        return null;
    }

    return <SegmentedTabsLink items={[CUSTOMERS_TAB, CONTACTS_TAB]} />;
}
