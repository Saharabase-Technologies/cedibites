'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBagIcon } from '@phosphor-icons/react';
import { useCart } from '../providers/CartProvider';
import { useModal } from '../providers/ModalProvider';
import { CUSTOMER_NAV } from '@/lib/constants/nav';
import { isNavActive } from '@/lib/utils/nav';

/**
 * Native-app-style bottom tab bar. Mobile only (md:hidden), fixed to the
 * bottom with safe-area padding so it clears the iOS home indicator.
 * Active state is colour/weight only — no transforms, so it can never
 * shift layout. Primary tabs come from the shared CUSTOMER_NAV source.
 */
export default function BottomNav() {
    const pathname = usePathname();
    const { totalItems } = useCart();
    const { openCart } = useModal();

    return (
        <nav
            aria-label="Primary mobile"
            className="md:hidden fixed bottom-0 inset-x-0 z-30 pb-safe
                bg-surface/70 backdrop-blur-2xl backdrop-saturate-150 border-t border-border
                shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.18)]"
        >
            <ul className="flex items-stretch justify-around h-16">
                {CUSTOMER_NAV.map((tab) => {
                    const active = isNavActive(pathname, tab);
                    const Icon = tab.icon;
                    return (
                        <li key={tab.href} className="flex-1">
                            <Link
                                href={tab.href}
                                aria-current={active ? 'page' : undefined}
                                className="cb-press group relative h-full flex flex-col items-center justify-center gap-1 select-none"
                            >
                                <span
                                    className={`flex items-center justify-center w-11 h-7 rounded-full transition-colors duration-200
                                        ${active ? 'bg-primary/12 ' : 'bg-transparent'}`}
                                >
                                    <Icon
                                        weight={active ? 'fill' : 'bold'}
                                        size={22}
                                        className={`transition-colors duration-200 ${active ? 'text-primary' : 'text-fg-subtle group-hover:text-fg'}`}
                                    />
                                </span>
                                <span className={`text-[11px] font-extrabold transition-colors duration-200 ${active ? 'text-primary' : 'text-fg-subtle group-hover:text-fg'}`}>
                                    {tab.shortLabel}
                                </span>
                            </Link>
                        </li>
                    );
                })}

                {/* Cart — opens the drawer (not a route) */}
                <li className="flex-1">
                    <button
                        type="button"
                        onClick={openCart}
                        aria-label={`Open cart${totalItems > 0 ? `, ${totalItems} item${totalItems === 1 ? '' : 's'}` : ''}`}
                        className="cb-press group relative h-full w-full flex flex-col items-center justify-center gap-1 select-none"
                    >
                        <span className="relative flex items-center justify-center w-11 h-7 rounded-full bg-transparent">
                            <ShoppingBagIcon
                                weight={totalItems > 0 ? 'fill' : 'bold'}
                                size={22}
                                className={`transition-colors duration-200 ${totalItems > 0 ? 'text-primary' : 'text-fg-subtle group-hover:text-fg'}`}
                            />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 right-1 min-w-4 h-4 px-1 flex items-center justify-center bg-error text-white text-[9px] font-bold rounded-full leading-none">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            )}
                        </span>
                        <span className={`text-[11px] font-bold transition-colors duration-200 ${totalItems > 0 ? 'text-primary' : 'text-fg-subtle group-hover:text-fg'}`}>
                            Cart
                        </span>
                    </button>
                </li>
            </ul>
        </nav>
    );
}
