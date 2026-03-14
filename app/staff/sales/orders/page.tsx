'use client';

import { Suspense } from 'react';
import { OrdersProvider } from '@/app/staff/orders/context';
import OrdersView from '@/app/staff/orders/OrdersView';

export default function SalesOrdersPage() {
    return (
        <Suspense>
            <OrdersProvider role="call_center">
                <OrdersView />
            </OrdersProvider>
        </Suspense>
    );
}
