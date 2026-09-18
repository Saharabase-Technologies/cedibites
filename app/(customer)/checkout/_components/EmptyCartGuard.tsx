'use client';

import Image from 'next/image';
import Link from 'next/link';

/**
 * Checkout with nothing to check out.
 *
 * Reached two ways. Somebody opens the URL with an empty cart, or the cart
 * request has come back empty. It is deliberately not what you see while that
 * request is still in the air: the page used to read `items.length === 0` with
 * no loading state, so a refresh on checkout told a customer with four things
 * in their cart that it was empty, then swapped it out from under them.
 */
export default function EmptyCartGuard() {
    return (
        <div className="flex min-h-[60svh] flex-col items-center justify-center px-5 text-center">
            <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-16 opacity-15" />
            <p className="mt-5 text-base font-bold text-fg">Nothing to pay for yet</p>
            <p className="mt-1 max-w-64 text-sm leading-relaxed text-fg-muted">
                Jollof, wraps, drumsticks and the rest are one tap away.
            </p>
            <Link
                href="/menu"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary-fill px-5 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
            >
                Open the menu
            </Link>
        </div>
    );
}
