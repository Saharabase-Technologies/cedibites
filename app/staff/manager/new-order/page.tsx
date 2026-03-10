'use client';

import { NewOrderProvider } from '@/app/staff/new-order/context';
import NewOrderFlow from '@/app/staff/new-order/NewOrderFlow';

export default function ManagerNewOrderPage() {
    return (
        <NewOrderProvider>
            <NewOrderFlow />
        </NewOrderProvider>
    );
}
