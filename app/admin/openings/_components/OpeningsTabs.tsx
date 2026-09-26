'use client';

import { SegmentedTabsLink } from '@/app/inventory/_components/SegmentedTabs';

/**
 * Watching the mornings, choosing which branches use the checklist, and what
 * the checklist asks. The daily watch is kept apart from the two settings so
 * a switch is never one stray tap away from the list head office reads daily.
 */
export function OpeningsTabs() {
    return (
        <div className="mb-5">
            <SegmentedTabsLink
                items={[
                    { href: '/admin/openings', label: 'Mornings', exact: true },
                    { href: '/admin/openings/branches', label: 'Branches' },
                    { href: '/admin/openings/checklist', label: 'The checklist' },
                ]}
            />
        </div>
    );
}
