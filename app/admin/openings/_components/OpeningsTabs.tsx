'use client';

import { SegmentedTabsLink } from '@/app/inventory/_components/SegmentedTabs';

export function OpeningsTabs() {
    return (
        <div className="mb-5">
            <SegmentedTabsLink
                items={[
                    {
                        href: '/admin/openings',
                        label: 'Branches',
                        activeWhen: (p) => p === '/admin/openings' || /^\/admin\/openings\/\d+/.test(p),
                    },
                    { href: '/admin/openings/checklist', label: 'The checklist' },
                ]}
            />
        </div>
    );
}
