'use client';

import { SegmentedTabsLink, type SegmentedTabItem } from '@/app/inventory/_components';

/**
 * The staff comms section header, on the same segmented tabs as marketing,
 * inventory, menu and staff.
 *
 * Deliberately a separate section from Marketing rather than a fifth tab on it.
 * Marketing reaches customers and costs money per send; this reaches our own
 * people and is free. Putting them on one strip would invite sending the wrong
 * thing to the wrong audience, which is the one mistake here that cannot be
 * taken back.
 *
 * Messages is the parent route of both its own detail pages and the rules tab,
 * which is exactly the case neither default covers: a prefix match lights
 * Messages while you are on Rules, and `exact` unlights it on a message's own
 * detail page. Hence `activeWhen`.
 */
const TABS: SegmentedTabItem[] = [
    {
        href: '/admin/messages',
        label: 'Messages',
        activeWhen: (pathname) =>
            pathname === '/admin/messages' ||
            (pathname.startsWith('/admin/messages/') && !pathname.startsWith('/admin/messages/rules')),
    },
    { href: '/admin/messages/rules', label: 'Automatic rules' },
];

export function StaffCommsTabNav() {
    return <SegmentedTabsLink items={TABS} />;
}
