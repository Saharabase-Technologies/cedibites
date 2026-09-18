'use client';

import { useRouter } from 'next/navigation';
import AccountShell from './_components/AccountShell';
import AddressList from './_components/AddressList';

/**
 * The account.
 *
 * On a phone, a hub: your name, where your food goes on one dark card, and rows
 * for Your details, Order history, Notifications and Contact us, each opening a
 * screen of its own. Sign out at the foot.
 *
 * The version before put every value on this page with a grey Change beside
 * each, five down the right edge of a phone, and the client said the side
 * buttons did not work and sent two account screens to learn from. The shape
 * here is theirs. The look is still the brand's.
 *
 * On a desk the hub is the column on the left and the addresses sit beside it.
 * The whole layout lives in `AccountShell`, and the reasoning in
 * `docs/CUSTOMER_DESIGN_SYSTEM.md`, section 11.
 */
export default function AccountPage() {
    const router = useRouter();

    return (
        <AccountShell
            hub
            title="Your addresses"
            foot={{ label: 'Add an address', onPress: () => router.push('/account/addresses/new') }}
        >
            <AddressList />
        </AccountShell>
    );
}
