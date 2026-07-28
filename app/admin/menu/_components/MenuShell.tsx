'use client';

import { SegmentedTabsLink } from '@/app/inventory/_components';

/**
 * The one menu header, rendered by the layout.
 *
 * It lives in `layout.tsx`, which App Router keeps mounted while you move
 * between its children — so the title and tabs do not unmount and remount on
 * every tab click, only the page slot below swaps. State-based tabs would look
 * the same and cost the URL, the back button and refresh position.
 *
 * The four hand-rolled copies of this bar that used to sit at the top of each
 * page are gone, along with the sidebar's hardcoded special case for keeping
 * "Menu" lit on the two routes that were siblings pretending to be children.
 */
const MENU_TABS = [
    { href: '/admin/menu', label: 'Items', exact: true },
    { href: '/admin/menu/availability', label: 'Availability' },
    { href: '/admin/menu/tags', label: 'Tags' },
    { href: '/admin/menu/configure', label: 'Configure' },
];

export function MenuShell({ children }: { children: React.ReactNode }) {
    return (
        // max-w-6xl matches the inventory pages. One width for the whole
        // section, set here and nowhere else, so the content stops jumping as
        // you move across tabs.
        <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
            <div className="mb-5">
                <h1 className="text-2xl font-bold font-brand text-text-dark">Menu</h1>
                <p className="text-neutral-gray text-sm font-body mt-1">
                    One menu for every branch. Dishes, where they are served, tags and categories.
                </p>
            </div>
            <div className="mb-5">
                <SegmentedTabsLink items={MENU_TABS} />
            </div>
            {children}
        </div>
    );
}
