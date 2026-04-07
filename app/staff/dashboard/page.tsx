'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

export default function DashboardRedirect() {
    const router = useRouter();
    const { staffUser, isLoading } = useStaffAuth();

    useEffect(() => {
        if (isLoading) return;
        const role = staffUser?.role;
        router.replace(
            role === 'manager' || role === 'admin' || role === 'tech_admin' ? '/staff/manager/dashboard' :
            role === 'branch_partner'                    ? '/staff/partner/dashboard' :
            '/staff/sales/dashboard'
        );
    }, [staffUser, isLoading, router]);

    return null;
}
