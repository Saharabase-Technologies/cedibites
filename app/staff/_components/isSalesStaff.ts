import type { StaffUser } from '@/app/components/providers/StaffAuthProvider';

/**
 * Sales staff get the white frame and the new sales screens. Everyone else on
 * the same routes, the call centre included, keeps today's (staff portal D1,
 * D28). The look follows the person, not the address.
 */
export function isSalesStaff(user: Pick<StaffUser, 'role'> | null | undefined): boolean {
    return user?.role === 'sales_staff';
}
