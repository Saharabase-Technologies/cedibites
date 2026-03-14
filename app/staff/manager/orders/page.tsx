'use client';

import { Suspense } from 'react';
import { OrdersProvider } from '@/app/staff/orders/context';
import OrdersView from '@/app/staff/orders/OrdersView';

export default function ManagerOrdersPage() {
    return (
        <Suspense>
            <OrdersProvider role="manager">
                <OrdersView />
            </OrdersProvider>
        </Suspense>
    );
}
