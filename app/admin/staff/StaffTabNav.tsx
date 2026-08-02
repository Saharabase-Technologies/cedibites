'use client';

import { SegmentedTabsLink, type SegmentedTabItem } from '@/app/inventory/_components';

/**
 * The staff section header, on the same segmented tabs the inventory and menu
 * sections use. It replaces a hand-rolled underlined bar that was the only one
 * of its kind left in the admin portal.
 */
const TABS: SegmentedTabItem[] = [
    {
        href: '/admin/staff',
        label: 'Directory',
        // Directory's own route is the parent of its siblings, so neither the
        // prefix match nor `exact` fits: it must stay lit across the group
        // pages it owns without lighting on Shifts, Staff Sales or Onboarding.
        activeWhen: p => p === '/admin/staff' || p.startsWith('/admin/staff/group'),
    },
    { href: '/admin/staff/shifts',      label: 'Shifts' },
    { href: '/admin/staff/sales',       label: 'Staff Sales' },
    { href: '/admin/staff/recruitment', label: 'Onboarding' },
];

export function StaffTabNav() {
    return (
        <div className="px-4 md:px-8 pt-6 max-w-5xl mx-auto w-full">
            <SegmentedTabsLink items={TABS} />
        </div>
    );
}
