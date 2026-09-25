'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LockSimpleIcon } from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranchOpening } from '@/lib/api/hooks/useOpening';
import { serverNow } from '@/lib/utils/serverClock';
import { OverrideDialog } from './OverrideDialog';
import { clock, isTrading } from './openingFormat';

/**
 * What the till, the kitchen display and the Order Manager show at a branch
 * nobody has opened yet.
 *
 * No orders, no menu, nothing to act on: the branch is not trading. It says
 * who is doing the checklist and how far they have got, and it unlocks by
 * itself the moment the branch opens, because the opening is pushed to every
 * screen at the branch.
 */
export function OpeningWaiting({
    branchId,
    branchName,
    dark = false,
    actions,
}: {
    branchId: number;
    branchName: string;
    /** The kitchen display is dark. */
    dark?: boolean;
    /** Sign out, switch branch. */
    actions?: ReactNode;
}) {
    const { can } = useStaffAuth();
    const { data: opening } = useBranchOpening(branchId, 'staff', { poll: true });
    const [overriding, setOverriding] = useState(false);
    const queryClient = useQueryClient();

    // The screen behind this one decides from the branch list. When the poll
    // sees the branch open before any push arrives, refresh that list so the
    // screen unlocks now rather than at its next refetch.
    const trading = opening ? isTrading(opening.status) : false;
    useEffect(() => {
        if (trading) queryClient.invalidateQueries({ queryKey: ['branches'] });
    }, [trading, queryClient]);

    const from = opening?.schedule.checklist_from ? new Date(opening.schedule.checklist_from) : null;
    const beforeWindow = from !== null && serverNow() < from;

    let line: string;
    if (opening?.status === 'in_progress') {
        line = `${opening.started_by ?? 'The manager'} started the checklist at ${clock(opening.started_at)}. ${opening.progress.answered} of ${opening.progress.total} done.`;
    } else if (beforeWindow) {
        line = `The manager can start the opening checklist from ${clock(opening?.schedule.checklist_from)}.`;
    } else {
        line = 'Nobody has started the opening checklist yet. The manager opens the branch with it.';
    }

    const surface = dark ? 'bg-gray-900 border-white/10 text-white' : 'bg-neutral-card border-[#f0e8d8] text-text-dark';
    const quiet = dark ? 'text-white/60' : 'text-neutral-gray';
    const progress = opening && opening.progress.total > 0 ? opening.progress.answered / opening.progress.total : 0;

    return (
        <div className={`flex min-h-dvh items-center justify-center p-6 ${dark ? 'bg-gray-950' : 'bg-neutral-light'}`}>
            <div className={`w-full max-w-md rounded-3xl border p-8 ${surface}`}>
                <LockSimpleIcon size={28} weight="fill" className={dark ? 'text-white/70' : 'text-primary'} />
                <h1 className="mt-4 font-brand text-2xl font-bold">{branchName} is not open yet</h1>
                <p className={`mt-2 text-sm font-body ${quiet}`}>{line}</p>

                {opening?.status === 'in_progress' && (
                    <div className={`mt-4 h-2 w-full overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-neutral-light'}`}
                        role="progressbar" aria-valuemin={0} aria-valuemax={opening.progress.total} aria-valuenow={opening.progress.answered}>
                        <div className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out" style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                )}

                <p className={`mt-4 text-sm font-body ${quiet}`}>This screen unlocks by itself when {branchName} opens.</p>

                {can('manage_branches') && (
                    <button type="button" onClick={() => setOverriding(true)}
                        className="mt-5 min-h-11 rounded-xl border border-[#e3ddd0] bg-white px-4 text-sm font-semibold font-body text-text-dark hover:border-neutral-gray/50 cursor-pointer">
                        Open without the checklist
                    </button>
                )}

                {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
            </div>

            {can('manage_branches') && (
                <OverrideDialog branchId={branchId} branchName={branchName} isOpen={overriding} onClose={() => setOverriding(false)} />
            )}
        </div>
    );
}
