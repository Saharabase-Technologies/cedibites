'use client';

import Link from 'next/link';
import { WarningCircleIcon } from '@phosphor-icons/react';
import type { AdminOpeningRow } from '@/types/opening';
import { who } from './describe';

/**
 * Said when the settings switch "Branches must be opened before they sell" is
 * off. Without it, a branch switched onto the checklist still reads "No
 * checklist" everywhere, and nobody can tell why.
 */
export function KillSwitchNotice({ rows }: { rows: AdminOpeningRow[] }) {
    const held = rows.filter((r) => r.requires_opening_checklist && !r.required);
    if (held.length === 0) return null;

    return (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#e3ddd0] bg-neutral-card px-4 py-3">
            <WarningCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0">
                <p className="font-body text-sm font-semibold text-text-dark">Openings are switched off for every branch.</p>
                <p className="mt-0.5 font-body text-sm text-neutral-gray">
                    {who(held)} {held.length === 1 ? 'is' : 'are'} switched on here but selling without being opened.
                    The switch is in{' '}
                    <Link href="/admin/platform/settings" className="font-semibold text-primary hover:underline">
                        Settings
                    </Link>
                    , under Opening the branch.
                </p>
            </div>
        </div>
    );
}
