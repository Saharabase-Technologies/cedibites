'use client';

import { NewOrderProvider } from './context';
import NewOrderFlow from './NewOrderFlow';

export default function NewOrderPage() {
    return (
        <NewOrderProvider>
            <NewOrderFlow />
        </NewOrderProvider>
    );
}
