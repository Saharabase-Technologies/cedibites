'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBagIcon } from '@phosphor-icons/react';
import { useCart } from '../providers/CartProvider';
import { useModal } from '../providers/ModalProvider';
import { CUSTOMER_NAV, isNavActive, isFullScreenRoute } from '@/lib/constants/nav';

/**
 * Floating chrome: a dark tab pill with a white lozenge on the live tab, and
 * the cart as a red button beside it.
 *
 * Detached from the edges on purpose. A bar welded to the bottom of the screen
 * reads as a web page footer; one that hovers over the content, with the page
 * visible underneath it, reads as an app.
 *
 * The lozenge is white rather than red because red is the action colour on this
 * side of the product, and the cart is the action. Which tab you are on is not.
 */
export default function BottomNav() {
    const pathname = usePathname();
    const { totalItems } = useCart();
    const { openCart, openSearch } = useModal();

    if (isFullScreenRoute(pathname)) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 select-none pb-safe md:hidden">
            <div className="pointer-events-auto flex items-center gap-2.5 px-3 pb-3">

                <nav
                    className="shadow-float flex flex-1 rounded-2xl bg-chrome p-1.5"
                    aria-label="Main"
                >
                    {CUSTOMER_NAV.map(item => {
                        const active = isNavActive(pathname, item);
                        const Icon = item.icon;

                        const inner = (
                            <>
                                <Icon size={19} weight={active ? 'fill' : 'regular'} />
                                <span className="text-[10px] font-bold uppercase leading-none tracking-[0.06em]">
                                    {item.label}
                                </span>
                            </>
                        );

                        const cls = `flex h-13 w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-150 ease-out ${
                            active
                                ? 'bg-chrome-chip text-chrome-chip-fg'
                                : 'text-chrome-fg/60'
                        }`;

                        return (
                            <div key={item.href ?? item.action} className="min-w-0 flex-1">
                                {item.href ? (
                                    <Link
                                        href={item.href}
                                        className={cls}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        {inner}
                                    </Link>
                                ) : (
                                    <button onClick={openSearch} className={cls}>
                                        {inner}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* The one action that has to be reachable from every screen.
                    Yellow on the badge because it has to survive sitting on red,
                    and black on #ffdd0b is the strongest pairing in the palette. */}
                <button
                    onClick={openCart}
                    aria-label={`Open cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
                    className="shadow-float relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-fill text-white transition-[filter] duration-150 ease-out active:brightness-90"
                >
                    <ShoppingBagIcon size={24} weight={totalItems > 0 ? 'fill' : 'regular'} />
                    {totalItems > 0 && (
                        <span className="absolute right-1 top-1 grid h-6 min-w-6 place-items-center rounded-md bg-accent px-1.5 text-[11px] font-bold leading-none text-on-accent tabular-nums">
                            {totalItems > 99 ? '99+' : totalItems}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}

/**
 * Keeps the last row of the menu out from under the floating chrome.
 * 64px pill + 12px of breathing room + whatever the home indicator needs.
 */
export function BottomNavSpacer() {
    const pathname = usePathname();
    if (isFullScreenRoute(pathname)) return null;
    return <div aria-hidden className="h-19 shrink-0 pb-safe md:hidden" />;
}
