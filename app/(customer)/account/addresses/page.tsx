'use client';

import { useRouter } from 'next/navigation';
import AccountShell from '../_components/AccountShell';
import AddressList from '../_components/AddressList';

export default function AddressesPage() {
    const router = useRouter();

    return (
        <AccountShell
            title="Your addresses"
            parent="/account"
            foot={{ label: 'Add an address', onPress: () => router.push('/account/addresses/new') }}
        >
            <AddressList />
        </AccountShell>
    );
}
