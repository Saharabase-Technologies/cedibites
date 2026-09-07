'use client';

import OrderCodeField from '@/app/components/order/OrderCodeField';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Track one order, without an account.
 *
 * The whole page is one field. It used to carry a duotone icon in a red circle,
 * a hero, a bordered card headed "How to Find Your Order Code" explaining three
 * places to look, and a link to the order list. Somebody arrives here holding a
 * five character code and wanting to know where their food is.
 *
 * The validation and the navigation live in OrderCodeField, shared with the
 * orders page, so there is one idea of what an order code looks like rather
 * than two that can drift apart.
 */
export default function TrackPage() {
    return (
        <div className="page-x mx-auto flex min-h-[70svh] max-w-md flex-col items-center justify-center py-16 text-center">
            <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-16 opacity-15" />

            <h1 className="mt-6 font-brand text-4xl uppercase leading-none tracking-[0.01em] text-fg">
                Where is my order
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">
                The code is in the SMS we sent when you ordered. A letter or two, then three numbers.
            </p>

            <div className="mt-7 flex w-full justify-center">
                <OrderCodeField autoFocus />
            </div>

            <Link
                href="/orders"
                className="mt-6 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
            >
                See all your orders
            </Link>
        </div>
    );
}
