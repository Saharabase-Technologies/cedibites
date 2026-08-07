'use client';

import { POSProvider } from '@/app/pos/context';
import POSTerminal from '@/app/pos/terminal/page';
import '@/app/pos/pos-animations.css';

/**
 * The manager's order entry — the same screen as the tills and the call centre.
 * See app/staff/sales/new-order/page.tsx for why there is only one of these.
 */
export default function ManagerNewOrderPage() {
    return (
        <POSProvider>
            <POSTerminal embedded />
        </POSProvider>
    );
}
