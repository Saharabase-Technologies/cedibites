'use client';

import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { OpeningChecklist } from '@/app/components/opening/OpeningChecklist';

/**
 * The opening checklist, for the manager who is away from the till.
 *
 * The till is where it is usually done, because that is where the manager
 * signs in first. This is the same checklist, and after opening it is where
 * the problems still to fix are marked fixed.
 */
export default function ManagerOpeningPage() {
    const { staffUser } = useStaffAuth();
    const branch = staffUser?.branches[0];

    if (!branch) {
        return (
            <p className="mx-auto max-w-3xl px-4 py-6 text-sm font-body text-text-dark">
                You are not assigned to a branch, so there is nothing to open. Head office assigns managers to branches.
            </p>
        );
    }

    return <OpeningChecklist branchId={Number(branch.id)} via="portal" />;
}
