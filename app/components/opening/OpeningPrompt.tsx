'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranchOpening } from '@/lib/api/hooks/useOpening';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { clock } from './openingFormat';

const OPENING_PAGE = '/staff/manager/opening';

/**
 * The line above every staff page until today's opening is done.
 *
 * The manager is told what is waiting on them, on every page, until they have
 * done it, and then again while any problem admitted at opening is unfixed.
 * Everyone else at the branch is told why the till is locked.
 */
export function OpeningPrompt() {
    const { staffUser, can } = useStaffAuth();
    const pathname = usePathname();
    const branch = staffUser?.branches[0];
    const branchId = branch ? Number(branch.id) : null;
    const isManager = can('branch.operate');

    const { data: opening } = useBranchOpening(branchId, 'staff', { enabled: branchId !== null });

    if (!opening || !opening.required || !opening.schedule.trading_day) return null;

    const onOpeningPage = pathname === OPENING_PAGE;
    const name = opening.branch.name;
    let message: string | null = null;
    let action: string | null = null;
    let urgent = false;

    switch (opening.status) {
        case 'not_started':
        case 'in_progress':
            urgent = true;
            message = isManager
                ? `${name} is not open. Nothing sells until you finish the opening checklist.`
                : `${name} is not open yet. The till unlocks when the manager opens it.`;
            action = isManager ? (opening.status === 'in_progress' ? 'Carry on with the checklist' : 'Start the checklist') : null;
            break;
        case 'opened_by_head_office':
            message = isManager
                ? `Head office opened ${name}. The opening checklist still has to be finished.`
                : null;
            action = isManager ? 'Finish the checklist' : null;
            break;
        case 'open_with_problems':
            if (!isManager) break;
            message = `${opening.problems.outstanding} opening ${opening.problems.outstanding === 1 ? 'problem' : 'problems'} to fix by ${clock(opening.grace_ends_at)}.`;
            action = 'See them';
            break;
    }

    if (!message || (onOpeningPage && isManager)) return null;

    const tone = urgent ? TONE.problem : TONE.waiting;

    return (
        <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 md:px-8 ${tone.bg}`} role="status">
            <p className={`text-sm font-semibold font-body ${tone.text}`}>{message}</p>
            {action && (
                <Link href={OPENING_PAGE}
                    className="min-h-11 inline-flex items-center rounded-xl bg-primary px-4 text-sm font-semibold font-body text-white hover:bg-primary/90">
                    {action}
                </Link>
            )}
        </div>
    );
}
