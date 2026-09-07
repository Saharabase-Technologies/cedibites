'use client';

import { ShoppingBagIcon } from '@phosphor-icons/react';
import Link from 'next/link';

// ─── Empty Cart Guard ─────────────────────────────────────────────────────────
export default function EmptyCartGuard() {
    return (
        <div className="min-h-[calc(100svh-var(--nav-h))] flex flex-col items-center justify-center gap-6 px-4">
            <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingBagIcon weight="fill" size={36} className="text-primary/40" />
            </div>
            <div className="text-center">
                <h2 className="text-xl font-bold text-text-dark dark:text-text-light">Your cart is empty</h2>
                <p className="text-neutral-gray mt-1">Add some items before checking out</p>
            </div>
            <Link href="/" className="bg-primary text-white font-bold px-8 py-3 rounded-2xl hover:bg-primary-hover transition-all">Browse Menu</Link>
        </div>
    );
}
