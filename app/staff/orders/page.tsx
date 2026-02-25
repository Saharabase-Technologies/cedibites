'use client';

import { Suspense } from 'react';
import { OrdersProvider } from './context';
import OrdersView from './OrdersView';

function OrdersPageInner() {
    return (
        <OrdersProvider>
            <OrdersView />
        </OrdersProvider>
    );
}

export default function StaffOrdersPage() {
    return (
        <Suspense>
            <OrdersPageInner />
        </Suspense>
    );
}
