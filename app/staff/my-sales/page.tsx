'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MySalesRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/staff/sales/my-sales');
    }, [router]);

    return null;
}
