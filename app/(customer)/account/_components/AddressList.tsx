'use client';

import { AttentionBadge, SmallAction } from '@/app/components/ui/QuietControls';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import { MapPinIcon } from '@phosphor-icons/react';
import LinkRow from './LinkRow';
import { placeLines } from './parts';

/**
 * Every saved place, each a row that opens it on its own screen.
 *
 * The default first, as the server sends it, with the yellow badge beside its
 * name. A name only when the customer gave one: an address saved on its own at
 * the end of an order has none, and its street is its title.
 */
export default function AddressList() {
    const { addresses, isLoading, error, refetch } = useAddresses();

    if (isLoading) {
        return (
            <div aria-hidden className="flex flex-col gap-2 rounded-2xl bg-surface p-2">
                {[0, 1].map(i => (
                    <div key={i} className="flex min-h-15 items-center gap-3.5 px-3 py-2.5 motion-safe:animate-pulse">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-sunken" />
                        <div className="min-w-0 flex-1">
                            <div className="h-4 w-28 rounded-lg bg-surface-sunken" />
                            <div className="mt-2 h-3 w-full max-w-64 rounded-lg bg-surface-sunken" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        // Said plainly. Falling through to the empty line would tell somebody
        // with three saved places that they have none.
        return (
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-4">
                <p className="min-w-0 flex-1 text-[15px] leading-snug text-fg">Your addresses did not load.</p>
                <SmallAction onClick={() => { void refetch(); }}>Try again</SmallAction>
            </div>
        );
    }

    if (addresses.length === 0) {
        return (
            <p className="max-w-md text-[15px] leading-relaxed text-fg-muted">
                Save a place once and checkout fills it in for you, on any phone you sign in on.
            </p>
        );
    }

    return (
        <div className="flex flex-col rounded-2xl bg-surface p-2">
            {addresses.map(address => (
                <LinkRow
                    key={address.id}
                    href={`/account/addresses/${address.id}`}
                    icon={<MapPinIcon size={18} weight="fill" />}
                    title={address.label || address.full_address}
                    badge={address.is_default ? <AttentionBadge>Default</AttentionBadge> : undefined}
                    sub={placeLines(address)}
                />
            ))}
        </div>
    );
}
