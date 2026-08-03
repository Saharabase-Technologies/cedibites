'use client';

import { useMemo } from 'react';
import { roleNeedsBranch, type StaffRole } from '@/types/staff';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';

export interface OperableBranch {
    id: string;
    name: string;
    address?: string;
}

/**
 * The branches this person may work a screen against.
 *
 * The Order Manager and the Kitchen Display both used to read
 * `staffUser.branches` directly — the rows in `employee_branch` — and treat
 * that as the list to choose from. For a cashier or a branch manager that is
 * right. For anybody company-wide it is exactly wrong, because a role with
 * `branchRule: 'none'` is deliberately assigned no branches at all: the staff
 * editor will not give an admin, a warehouse manager or a call-centre agent
 * one, since they serve the whole business.
 *
 * So the list came back empty, `BranchSelectPage` mapped over nothing, and both
 * screens rendered a "Select Branch" page with no buttons on it. On production
 * that was the call-centre agent and the warehouse manager locked out of both
 * screens entirely, while the two admins only worked by accident — they happen
 * to carry one stale Ashaiman row each from before the role rules existed, so
 * they silently auto-opened Ashaiman and could not reach the other branches.
 * Tidying that stale data to match the rules would have locked them out too.
 *
 * The rule is the one the POS already uses: company-wide means every active
 * branch is yours to pick from, branch-bound means your own.
 */
export function useOperableBranches(): {
    branches: OperableBranch[];
    isCompanyWide: boolean;
    /**
     * True while the answer is still unknown. Callers must hold their gate shut
     * on this: a company-wide user's list comes from the branches API, so for a
     * moment it is legitimately empty, and a gate that reads that as "you have
     * no branches" flashes the same empty picker this hook exists to remove.
     */
    isLoading: boolean;
} {
    const { staffUser } = useStaffAuth();
    const { branches: allBranches, isLoading: isBranchesLoading } = useBranch();

    // The role decides, not the branch list: somebody with no branches assigned
    // and somebody whose assignment has not loaded yet look identical otherwise.
    const isCompanyWide = useMemo(
        () => (staffUser ? !roleNeedsBranch(staffUser.role as StaffRole) : false),
        [staffUser],
    );

    const branches = useMemo<OperableBranch[]>(() => {
        if (!isCompanyWide) {
            return staffUser?.branches ?? [];
        }

        // Inactive branches are not somewhere anybody is working today, and a
        // retired branch sitting in the picker is how you end up staring at an
        // empty order list wondering what broke.
        return allBranches
            .filter(b => b.isActive)
            .map(b => ({ id: b.id, name: b.name, address: b.address }));
    }, [isCompanyWide, staffUser, allBranches]);

    // Only company-wide callers wait on the branches API — a branch-bound user's
    // list came down with their login and is already in hand.
    return { branches, isCompanyWide, isLoading: isCompanyWide && isBranchesLoading };
}
