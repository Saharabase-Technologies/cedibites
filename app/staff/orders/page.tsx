'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

function OrdersRedirectInner() {
    const router = useRouter();
    const { staffUser, isLoading } = useStaffAuth();
    const params = useSearchParams();
    const qs = params.get('select') ? `?select=${params.get('select')}` : '';

    useEffect(() => {
        if (isLoading) return;
        const base = staffUser?.role === 'manager'
            ? '/staff/manager/orders'
            : '/staff/sales/orders';
        router.replace(`${base}${qs}`);
    }, [staffUser, isLoading, router, qs]);

    return null;
}

export default function OrdersRedirect() {
    return (
        <Suspense>
            <OrdersRedirectInner />
        </Suspense>
    );
}
