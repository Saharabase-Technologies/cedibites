'use client';

import { OrdersProvider } from './context';
import OrdersView from './OrdersView';

export default function StaffOrdersPage() {
    return (
        <OrdersProvider>
            <OrdersView />
        </OrdersProvider>
    );
}
