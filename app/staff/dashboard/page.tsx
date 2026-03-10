'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

export default function DashboardRedirect() {
    const router = useRouter();
    const { staffUser, isLoading } = useStaffAuth();

    useEffect(() => {
        if (isLoading) return;
        router.replace(staffUser?.role === 'manager'
            ? '/staff/manager/dashboard'
            : '/staff/sales/dashboard');
    }, [staffUser, isLoading, router]);

    return null;
}
