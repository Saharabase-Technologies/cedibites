'use client';

import { Suspense } from 'react';
import { MorningsPage } from './_components/MorningsPage';

/** The day comes from the address, which needs a boundary to read on the server. */
export default function AdminOpeningsPage() {
    return (
        <Suspense>
            <MorningsPage />
        </Suspense>
    );
}
