'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserIcon } from '@phosphor-icons/react';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import AddressesBlock from './_components/AddressesBlock';
import DetailsBlock from './_components/DetailsBlock';
import DeviceBlock, { useDevicePush } from './_components/DeviceBlock';

/**
 * The account.
 *
 * Built from the checkout's parts: white blocks on the grey, a grey caption over
 * a bold value on every row, one grey Change on each, and a red button only
 * while something is being saved. Somebody who has paid for an order has
 * already learned to read it.
 *
 * On a phone it is one column: who you are, your details, where the food goes,
 * then this device.
 *
 * On a desk it splits in two, and the split carries meaning. The left column is
 * you and the device in hand. The notification switch and Sign out both act on
 * this browser alone, and the column stays in view as the page scrolls. The
 * right column is what follows you to any phone you sign in on: your details and
 * your addresses. The version before was the phone column stretched across a
 * laptop.
 *
 * Gone since that version: 11px uppercase section labels, a hairline under every
 * row, three underlined links on every address, and the link to your orders,
 * which the tab bar and the header already carry on every screen.
 */

/**
 * The customer's name, as the page's one display moment.
 *
 * The initials sit in a hard red square, the header's account button at full
 * size, because a round tinted avatar is every other app. White on #f40002 is
 * 4.33:1, which clears AA as large text at these sizes and would not at a label
 * size, so the square never shrinks to a chip.
 */
function Identity({ name, createdAt }: { name: string; createdAt: number }) {
    const initials = name.trim()
        ? name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : '';

    const since = createdAt
        ? new Date(createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : '';

    return (
        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-6">
            <span
                aria-hidden
                className="grid h-16 w-16 shrink-0 place-items-center bg-primary font-brand text-[28px] leading-none text-white lg:h-28 lg:w-28 lg:text-5xl"
            >
                {initials || <UserIcon size={30} weight="fill" />}
            </span>
            <div className="min-w-0">
                <h1 className="font-brand text-4xl uppercase leading-[0.95] tracking-[0.01em] text-balance break-words text-fg lg:text-5xl">
                    {name || 'Your account'}
                </h1>
                {since && (
                    <p className="mt-1.5 text-[13px] text-fg-muted lg:mt-3 lg:text-sm">
                        Ordering with us since {since}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function AccountPage() {
    const { user, isLoggedIn, isRestoring, logout } = useAuth();
    const { openAuth } = useModal();
    const router = useRouter();
    const push = useDevicePush();

    /** Set on the way out, so signing out lands on home without the sign-in sheet over it. */
    const signingOut = useRef(false);

    /**
     * Guests go home. Signed-in customers do not.
     *
     * Nothing is decided until the restore is finished: `isLoggedIn` is false
     * for everybody on the first render, and acting on that threw a signed-in
     * customer to the home screen on every visit.
     */
    useEffect(() => {
        if (isRestoring || isLoggedIn) return;
        if (!signingOut.current) openAuth();
        router.replace('/');
    }, [isRestoring, isLoggedIn, openAuth, router]);

    const signOut = useCallback(() => {
        signingOut.current = true;
        logout();
    }, [logout]);

    // The grey is down before anything else, so reading the session back does
    // not flash the lighter ground first.
    if (isRestoring || !isLoggedIn || !user) {
        return <div data-ground="sunken" aria-hidden className="min-h-[60svh]" />;
    }

    return (
        <div data-ground="sunken" className="page-x">
            {/* The width caps sit on this inner div. `.page-x` carries a
                max-width of its own that beats any max-w-* beside it. */}
            <div className="mx-auto max-w-xl pb-10 pt-6 lg:grid lg:max-w-6xl lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-12 lg:pb-20 lg:pt-12 xl:grid-cols-[21rem_minmax(0,1fr)] xl:gap-20">

                <div className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)]">
                    <Identity name={user.name} createdAt={user.createdAt} />
                    <DeviceBlock push={push} onSignOut={signOut} className="mt-10 hidden lg:block" />
                </div>

                <div className="mt-6 flex min-w-0 flex-col gap-4 lg:mt-0 lg:gap-6">
                    <DetailsBlock className="lg:p-6" />
                    <AddressesBlock className="lg:p-6" />
                    {/* The same block at the foot of the phone column. Drawn
                        twice with one hidden, rather than moved with CSS order,
                        so what a screen reader reads next is what the eye sees
                        next at either width. */}
                    <DeviceBlock push={push} onSignOut={signOut} className="lg:hidden" />
                </div>
            </div>
        </div>
    );
}
