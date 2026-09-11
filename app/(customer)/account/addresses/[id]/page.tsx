'use client';

import { Group } from '@/app/(customer)/checkout/_components/Field';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import AccountShell from '../../_components/AccountShell';
import AddressEditor from '../../_components/AddressEditor';

export default function EditAddressPage() {
    const { id } = useParams<{ id: string }>();
    const { addresses, isLoading } = useAddresses();
    const address = addresses.find(a => String(a.id) === id);

    /**
     * Set while the address is being removed.
     *
     * The removal waits for the list to refetch before it resolves, so for a
     * moment the address is gone from the list while this screen is still up.
     * Without this it said "not saved any more" on the way out.
     */
    const [leaving, setLeaving] = useState(false);

    if (address) return <AddressEditor key={address.id} address={address} onLeaving={setLeaving} />;

    return (
        <AccountShell title="Change address" parent="/account/addresses">
            {isLoading || leaving ? (
                <div aria-hidden className="flex flex-col gap-5 rounded-2xl bg-surface p-4 motion-safe:animate-pulse lg:p-6">
                    <div className="h-3.5 w-20 rounded-lg bg-surface-sunken" />
                    <div className="h-12 w-full rounded-xl bg-surface-sunken" />
                    <div className="h-12 w-full rounded-xl bg-surface-sunken" />
                </div>
            ) : (
                <Group className="lg:p-6">
                    <p className="text-[15px] leading-relaxed text-fg">That address is not saved any more.</p>
                </Group>
            )}
        </AccountShell>
    );
}
