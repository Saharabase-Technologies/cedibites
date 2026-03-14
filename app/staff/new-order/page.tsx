'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

export default function NewOrderRedirect() {
    const router = useRouter();
    const { staffUser, isLoading } = useStaffAuth();

    useEffect(() => {
        if (isLoading) return;
        router.replace(staffUser?.role === 'manager'
            ? '/staff/manager/new-order'
            : '/staff/sales/new-order');
    }, [staffUser, isLoading, router]);

    return null;
}
