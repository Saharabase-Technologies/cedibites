'use client';

import { useCallback, useMemo, useState } from 'react';
import type { StaffMember } from '@/types/staff';
import { useEmployees } from '@/lib/api/hooks/useEmployees';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { employeeService, staffRoleToBackendRole } from '@/lib/api/services/employee.service';
import { toast } from '@/lib/utils/toast';
import { buildStaffGroups, type StaffGroup } from './groups';
import type { RevealedCredentials } from './CredentialsModal';

function isNewStaffId(id: string): boolean {
    return id.startsWith('u');
}

/**
 * The roster, the groups built from it, and every action that can be taken on a
 * person.
 *
 * One hook rather than two copies, because the overview and each group page
 * both need to suspend, terminate and edit. The old page held all of this
 * inline; splitting the screen into routes without lifting it out would have
 * meant duplicating nine handlers and letting them drift.
 *
 * The query is the only copy of the roster. The old page mirrored it into
 * `useState` behind a `hasInitialized` ref and then patched that copy in place,
 * which meant a roster arriving empty and filling in a moment later never
 * reached the screen, and a background refetch never did either. Every action
 * here re-reads from the server instead — one extra round trip on a deliberate
 * click, in exchange for the list never disagreeing with the database.
 */
export function useStaffDirectory() {
    const { employees: staff, isLoading, refetch } = useEmployees();
    const { branches, isLoading: branchesLoading } = useBranchesApi();

    const [revealCreds, setRevealCreds] = useState<RevealedCredentials | null>(null);

    const groups: StaffGroup[] = useMemo(
        () => buildStaffGroups(staff, branches),
        [staff, branches],
    );

    const saveStaff = useCallback(async (s: StaffMember) => {
        const branchIds = s.branchIds ?? [];
        const isNew = isNewStaffId(s.id);
        let generatedPassword: string | null = null;

        try {
            if (isNew) {
                const created = await employeeService.createEmployee({
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone,
                    ...(s.passwordMode === 'custom' && s.password ? { password: s.password } : {}),
                    password_mode: s.passwordMode || 'auto',
                    branch_ids: branchIds.map(id => Number(id)),
                    role: staffRoleToBackendRole(s.role),
                    hire_date: s.joinedAt || undefined,
                    ssnit_number: s.ssnit || undefined,
                    ghana_card_id: s.ghanaCard || undefined,
                    tin_number: s.tinNumber || undefined,
                    date_of_birth: s.dateOfBirth || undefined,
                    nationality: s.nationality || undefined,
                    emergency_contact_name: s.emergencyContact?.name || undefined,
                    emergency_contact_phone: s.emergencyContact?.phone || undefined,
                    emergency_contact_relationship: s.emergencyContact?.relationship || undefined,
                });
                generatedPassword = created.generatedPassword;
            } else {
                await employeeService.updateEmployee(s.id, {
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone,
                    // Always sent, including empty: switching a branch manager
                    // to a company-wide role has to clear the branch, and
                    // omitting the key would silently leave it attached.
                    branch_ids: branchIds.map(id => Number(id)),
                    role: staffRoleToBackendRole(s.role),
                    // Employment status is saved from the form. It used to be
                    // collected in the Access tab and then never sent, so
                    // suspending someone from the editor did nothing at all.
                    status: s.employmentStatus,
                    hire_date: s.joinedAt || undefined,
                    ssnit_number: s.ssnit || undefined,
                    ghana_card_id: s.ghanaCard || undefined,
                    tin_number: s.tinNumber || undefined,
                    date_of_birth: s.dateOfBirth || undefined,
                    nationality: s.nationality || undefined,
                    emergency_contact_name: s.emergencyContact?.name || undefined,
                    emergency_contact_phone: s.emergencyContact?.phone || undefined,
                    emergency_contact_relationship: s.emergencyContact?.relationship || undefined,
                });
            }

            await refetch();
            toast.success(isNew ? `${s.name} has been added successfully` : `${s.name} has been updated successfully`);

            if (isNew && generatedPassword) {
                setRevealCreds({ name: s.name, identifier: s.email || s.phone, password: generatedPassword });
            }
        } catch (err: unknown) {
            let msg = 'Failed to save. Please try again.';
            if (err && typeof err === 'object' && 'response' in err) {
                const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
                if (res?.message) msg = res.message;
                else if (res?.errors && typeof res.errors === 'object') {
                    const first = Object.values(res.errors).flat()[0];
                    if (first) msg = first;
                }
            } else if (err instanceof Error) msg = err.message;
            throw new Error(msg);
        }
    }, [refetch]);

    const deleteStaff = useCallback(async (s: StaffMember) => {
        try {
            await employeeService.deleteEmployee(s.id);
            await refetch();
            toast.success(`${s.name} has been deleted successfully`);
        } catch (error) {
            console.error('Failed to delete employee:', error);
            toast.error('Failed to delete employee. Please try again.');
        }
    }, [refetch]);

    /** Suspend, reinstate and terminate are the same call with a different status. */
    const setStatus = useCallback(async (
        s: StaffMember,
        status: 'active' | 'suspended' | 'terminated',
        done: string,
        failed: string,
    ) => {
        try {
            await employeeService.updateEmployee(s.id, { status });
            await refetch();
            toast.success(`${s.name} ${done}`);
        } catch (error) {
            console.error(`Failed to ${failed} employee:`, error);
            toast.error(`Failed to ${failed} employee. Please try again.`);
        }
    }, [refetch]);

    const suspend = useCallback(
        (s: StaffMember) => setStatus(s, 'suspended', 'has been suspended', 'suspend'),
        [setStatus],
    );

    const reinstate = useCallback(
        (s: StaffMember) => setStatus(s, 'active', 'has been reinstated', 'reinstate'),
        [setStatus],
    );

    const terminate = useCallback(
        (s: StaffMember) => setStatus(s, 'terminated', 'has been terminated', 'terminate'),
        [setStatus],
    );

    const forceLogout = useCallback(async (s: StaffMember) => {
        try {
            await employeeService.forceLogout(s.id);
            toast.success(`${s.name} has been logged out from all devices`);
        } catch (error) {
            console.error('Failed to force logout employee:', error);
            toast.error('Failed to force logout. Please try again.');
        }
    }, []);

    const requirePasswordReset = useCallback(async (s: StaffMember) => {
        try {
            await employeeService.requirePasswordReset(s.id);
            toast.success(`Password reset required for ${s.name}. Notification sent.`);
        } catch (error) {
            console.error('Failed to require password reset:', error);
            toast.error('Failed to require password reset. Please try again.');
        }
    }, []);

    return {
        staff,
        groups,
        branches,
        isLoading: isLoading || branchesLoading,
        revealCreds,
        setRevealCreds,
        actions: {
            saveStaff, deleteStaff, suspend, reinstate, terminate,
            forceLogout, requirePasswordReset,
        },
    };
}
