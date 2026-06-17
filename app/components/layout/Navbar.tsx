'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    ShoppingBagIcon, UserIcon, StorefrontIcon,
    SignOutIcon, PathIcon, CaretDownIcon,
} from '@phosphor-icons/react';
import { useBranch } from '../providers/BranchProvider';
import { useModal } from '../providers/ModalProvider';
import { useCart } from '../providers/CartProvider';
import { useAuth } from '../providers/AuthProvider';
import { CUSTOMER_NAV } from '@/lib/constants/nav';
import { isNavActive } from '@/lib/utils/nav';
import ThemeToggle from '../base/ThemeToggle';

/**
 * Focused / transactional flows render their own header and hide the global
 * pill: checkout and the order-detail + payment screens (`/orders/<code>...`).
 * The browse `/orders` list and `/order-history` keep the navbar.
 */
function shouldHideNav(pathname: string): boolean {
    return pathname.startsWith('/checkout') || /^\/orders\/.+/.test(pathname);
}

/**
 * Floating glass-pill navbar for the customer site. Detached from the top
 * edge, centered, backdrop-blurred. Transparent over the hero, fading to a
 * solid tint + shadow on scroll (background/opacity/shadow only — no
 * transforms). Mobile is a slim bar (logo · branch · theme · account); the
 * BottomNav owns primary navigation, so there is no hamburger here.
 */
export default function Navbar() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const { selectedBranch } = useBranch();
    const { openBranchSelector, openCart, openAuth } = useModal();
    const { totalItems } = useCart();
    const { user, isLoggedIn, logout } = useAuth();

    const initials = user?.name ? user.name.charAt(0).toUpperCase() : null;

    // Scroll → solidify (passive listener, no layout reads beyond scrollY).
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close the account dropdown on route change, outside-click and Escape.
    useEffect(() => { setIsUserMenuOpen(false); }, [pathname]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsUserMenuOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        if (isUserMenuOpen) document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [isUserMenuOpen]);

    if (shouldHideNav(pathname)) return null;

    return (
        <>
            <header className="fixed top-3 inset-x-0 z-30 px-3 md:px-6">
                <nav
                    aria-label="Primary"
                    className={`mx-auto max-w-5xl h-14 flex items-center justify-between gap-2 rounded-full border border-border px-3 md:px-5
                        backdrop-blur-2xl backdrop-saturate-150 transition-[background-color,box-shadow] duration-300
                        ${scrolled
                            ? 'bg-surface/65 shadow-lg shadow-black/5'
                            : 'bg-surface/35 shadow-sm shadow-black/5'}`}
                >
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 shrink-0 cb-press rounded-full">
                        <Image src="/cblogo.webp" alt="CediBites" width={36} height={36} className="object-contain" priority />
                        <span className="block text-xl sm:text-2xl font-family-brand text-tertiary leading-none">CediBites</span>
                    </Link>

                    {/* Desktop center links */}
                    <ul className="hidden md:flex items-center gap-1">
                        {CUSTOMER_NAV.map((item) => {
                            const active = isNavActive(pathname, item);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        aria-current={active ? 'page' : undefined}
                                        className={`px-4 py-2 rounded-full text-sm font-extrabold transition-colors duration-200
                                            ${active
                                                ? 'bg-primary/12 text-primary'
                                                : 'text-fg-muted hover:text-fg hover:bg-fg/5'}`}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Right cluster */}
                    <div className="flex items-center gap-1.5 shrink-0">

                        {/* Branch chip — mobile only (desktop shows it in the hero greeting) */}
                        {selectedBranch && (
                            <button
                                onClick={openBranchSelector}
                                className="md:hidden cb-press flex items-center gap-1.5 max-w-[40vw] h-9 pl-2.5 pr-3 rounded-full border border-border bg-surface-sunken text-fg"
                                aria-label="Change branch"
                            >
                                <StorefrontIcon weight="fill" size={15} className="text-primary shrink-0" />
                                <span className="text-xs font-semibold truncate">{selectedBranch.name}</span>
                            </button>
                        )}

                        {/* Cart — desktop (mobile uses BottomNav) */}
                        <button
                            onClick={openCart}
                            className="hidden md:flex cb-press relative w-10 h-10 items-center justify-center rounded-full bg-surface-sunken hover:bg-fg/5 border border-border text-fg"
                            aria-label="Open cart"
                        >
                            <ShoppingBagIcon weight="bold" size={19} className="text-tertiary dark:text-fg" />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full px-1 leading-none">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            )}
                        </button>

                        <ThemeToggle />

                        {/* Account — desktop dropdown */}
                        <div ref={userMenuRef} className="hidden md:block relative">
                            {isLoggedIn ? (
                                <>
                                    <button
                                        onClick={() => setIsUserMenuOpen((p) => !p)}
                                        aria-label="My account"
                                        aria-expanded={isUserMenuOpen}
                                        className="cb-press flex items-center gap-1.5 h-10 pl-1 pr-2.5 rounded-full bg-primary/10 hover:bg-primary/15 border border-primary/20"
                                    >
                                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm">{initials}</span>
                                        <CaretDownIcon size={13} weight="bold" className={`text-primary transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <div className={`absolute right-0 top-full mt-2 w-56 bg-surface rounded-2xl shadow-xl border border-border py-2 origin-top-right z-40 transition-all duration-150
                                        ${isUserMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                                        <div className="px-4 py-2.5 border-b border-divider">
                                            <p className="text-sm font-bold text-fg truncate">{user?.name}</p>
                                            <p className="text-xs text-fg-subtle truncate">{user?.phone}</p>
                                        </div>
                                        <Link href="/account" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-fg hover:text-primary hover:bg-primary/5 transition-colors">
                                            <UserIcon weight="fill" size={15} className="text-fg-subtle" /> My Account
                                        </Link>
                                        <Link href="/order-history" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-fg hover:text-primary hover:bg-primary/5 transition-colors">
                                            <PathIcon weight="fill" size={15} className="text-fg-subtle" /> My Orders
                                        </Link>
                                        <button onClick={() => { logout(); setIsUserMenuOpen(false); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors">
                                            <SignOutIcon weight="fill" size={15} /> Sign Out
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button
                                    onClick={openAuth}
                                    className="cb-press flex items-center h-10 px-5 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-bold"
                                >
                                    Sign In
                                </button>
                            )}
                        </div>

                        {/* Account — mobile (no dropdown) */}
                        {isLoggedIn ? (
                            <Link
                                href="/account"
                                aria-label="My account"
                                className="md:hidden cb-press w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm"
                            >
                                {initials}
                            </Link>
                        ) : (
                            <button
                                onClick={openAuth}
                                aria-label="Sign in"
                                className="md:hidden cb-press w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white"
                            >
                                <UserIcon weight="bold" size={18} />
                            </button>
                        )}
                    </div>
                </nav>
            </header>
        </>
    );
}
