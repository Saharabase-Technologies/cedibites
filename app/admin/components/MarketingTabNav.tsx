'use client';

import { SegmentedTabsLink, type SegmentedTabItem } from '@/app/inventory/_components';

/**
 * The marketing section header, on the same segmented tabs the inventory, menu
 * and staff sections use.
 *
 * The three pages are siblings rather than parent and children — nothing lives
 * under /admin/campaigns except a campaign's own detail page — so the default
 * prefix match is right for all of them.
 */
const TABS: SegmentedTabItem[] = [
    { href: '/admin/campaigns', label: 'Campaigns' },
    // Sits beside Campaigns because it is the same job on a different clock:
    // one is a message you push, the other is a message that waits.
    { href: '/admin/automations', label: 'Automations' },
    { href: '/admin/links', label: 'Short Links' },
    { href: '/admin/customer-feedback', label: 'Customer Feedback' },
];

export function MarketingTabNav() {
    return <SegmentedTabsLink items={TABS} />;
}
