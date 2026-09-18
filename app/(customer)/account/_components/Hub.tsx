'use client';

import { useAuth } from '@/app/components/providers/AuthProvider';
import { formatGhanaPhone } from '@/app/lib/phone';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import {
    BellIcon, CaretRightIcon, MapPinIcon, PhoneIcon, ReceiptIcon, SignOutIcon, UserIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { pushLabel, useAccount } from './AccountContext';
import LinkRow from './LinkRow';

/**
 * The account's front page: who you are, where your food goes, and a short list
 * of ways in. Sign out at the foot.
 *
 * Its shape comes from the account screens the client sent: a name at the top,
 * one big card, rows that each open a screen of their own, and signing out
 * last. Their look was left behind. The brand has no round photos, no pills and
 * no gradients, and there is no wallet or loyalty scheme to put on a card. The
 * card carries the one thing on this account that changes the next order.
 *
 * On a desk the same component is the column down the left, with the screen you
 * are on marked in it. The big card is a phone device, so the column carries
 * an Addresses row in its place.
 */

type Screen = 'addresses' | 'details' | 'notifications' | 'contact' | null;

function screenFor(pathname: string): Screen {
    if (pathname === '/account' || pathname.startsWith('/account/addresses')) return 'addresses';
    if (pathname.startsWith('/account/details')) return 'details';
    if (pathname.startsWith('/account/notifications')) return 'notifications';
    if (pathname.startsWith('/account/contact')) return 'contact';
    return null;
}

/** The last four digits and nothing else, the way both references show it. */
function lastFour(phone: string): string {
    return `••• ••• ${formatGhanaPhone(phone).replace(/\D/g, '').slice(-4)}`;
}

function Identity() {
    const { user } = useAuth();
    if (!user) return null;

    const initials = user.name.trim()
        ? user.name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : '';

    return (
        <div className="flex items-center gap-4">
            {/* The header's account button at full size. A hard red square is
                the brand's device, and white on #f40002 at this size is large
                text, where 4.33:1 clears AA. */}
            <span
                aria-hidden
                className="grid h-16 w-16 shrink-0 place-items-center bg-primary font-brand text-[28px] leading-none text-white"
            >
                {initials || <UserIcon size={28} weight="fill" />}
            </span>
            <div className="min-w-0">
                <p className="font-brand text-4xl uppercase leading-[0.95] tracking-[0.01em] text-balance break-words text-fg">
                    {user.name || 'Your account'}
                </p>
                <p className="mt-1.5 text-sm font-semibold tabular-nums tracking-wide text-fg-muted">
                    {lastFour(user.phone)}
                </p>
            </div>
        </div>
    );
}

/**
 * Where the food goes, as the page's one loud block.
 *
 * Ink, not red. Red is the action colour and large red chrome is the one thing
 * the brand rules forbid; near-black with white type is what the tab bar and
 * the flyers already run on. The name is set in the display face because it is
 * short and chosen by the customer. A street is not, so an unnamed place is set
 * in the body face instead.
 */
function AddressCard() {
    const { addresses, defaultAddress, isLoading, error } = useAddresses();
    const count = addresses.length;
    const none = !isLoading && !error && count === 0;

    return (
        <Link
            href={none ? '/account/addresses/new' : '/account/addresses'}
            className="group block rounded-2xl bg-fg p-5 text-white transition-[filter] duration-150 ease-out hover:brightness-125 lg:hidden"
        >
            <span className="block text-[13px] font-semibold text-white/65">Your food goes to</span>

            {isLoading ? (
                <span aria-hidden className="mt-2.5 block motion-safe:animate-pulse">
                    <span className="block h-8 w-32 rounded-lg bg-white/15" />
                    <span className="mt-2.5 block h-3.5 w-56 max-w-full rounded-lg bg-white/15" />
                </span>
            ) : error ? (
                <span className="mt-1.5 block text-lg font-bold leading-snug">Your addresses did not load</span>
            ) : defaultAddress?.label ? (
                <>
                    <span className="mt-1 block font-brand text-[40px] uppercase leading-none tracking-[0.01em] break-words">
                        {defaultAddress.label}
                    </span>
                    <span className="mt-2 block text-sm leading-snug break-words text-white/80">
                        {defaultAddress.full_address}
                    </span>
                </>
            ) : defaultAddress ? (
                <span className="mt-1.5 block text-lg font-bold leading-snug break-words">{defaultAddress.full_address}</span>
            ) : (
                <span className="mt-1.5 block text-lg font-bold leading-snug">Nowhere saved yet</span>
            )}

            <span className="mt-5 flex items-center justify-between gap-3">
                <span className="min-w-0 text-[13px] tabular-nums text-white/65">
                    {count > 1 ? `${count} places saved` : ''}
                </span>
                <span className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[13px] font-bold text-fg">
                    {none ? 'Add an address' : 'Your addresses'}
                    <CaretRightIcon size={12} weight="bold" aria-hidden />
                </span>
            </span>
        </Link>
    );
}

function Rows({ screen }: { screen: Screen }) {
    const { push } = useAccount();
    const { addresses, defaultAddress } = useAddresses();

    const others = addresses.length - 1;
    const addressesLine = defaultAddress
        ? `${defaultAddress.label || defaultAddress.full_address}${others > 0 ? `, and ${others} more` : ''}`
        : 'None saved yet';

    return (
        <nav aria-label="Your account" className="flex flex-col rounded-2xl bg-surface p-2">
            <div className="hidden lg:block">
                <LinkRow
                    href="/account/addresses"
                    icon={<MapPinIcon size={18} weight="fill" />}
                    title="Your addresses"
                    sub={addressesLine}
                    active={screen === 'addresses'}
                />
            </div>
            <LinkRow
                href="/account/details"
                icon={<UserIcon size={18} weight="fill" />}
                title="Your details"
                active={screen === 'details'}
            />
            <LinkRow
                href="/orders"
                icon={<ReceiptIcon size={18} weight="fill" />}
                title="Order history"
            />
            <LinkRow
                href="/account/notifications"
                icon={<BellIcon size={18} weight="fill" />}
                title="Notifications"
                sub={pushLabel(push)}
                active={screen === 'notifications'}
            />
            <LinkRow
                href="/account/contact"
                icon={<PhoneIcon size={18} weight="fill" />}
                title="Contact us"
                active={screen === 'contact'}
            />
        </nav>
    );
}

export default function Hub() {
    const pathname = usePathname();
    const { signOut } = useAccount();

    return (
        <div className="flex flex-col gap-5">
            <Identity />
            <AddressCard />
            <Rows screen={screenFor(pathname)} />

            {/* Last, and apart from the rows, the way both references end.
                Lined up with the icons in the rows above it. */}
            <button
                type="button"
                onClick={signOut}
                className="flex min-h-13 items-center gap-3.5 self-start rounded-xl px-5 text-left"
            >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger-ink">
                    <SignOutIcon size={18} weight="bold" />
                </span>
                <span className="text-[15px] font-bold text-danger-ink">Sign out</span>
            </button>
        </div>
    );
}
