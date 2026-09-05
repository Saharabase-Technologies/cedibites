'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    ShoppingBagIcon, UserIcon, SignOutIcon, MagnifyingGlassIcon,
    StorefrontIcon, CaretDownIcon, ReceiptIcon,
} from '@phosphor-icons/react';
import { useBranch } from '../providers/BranchProvider';
import { useModal } from '../providers/ModalProvider';
import { useCart } from '../providers/CartProvider';
import { useAuth } from '../providers/AuthProvider';
import { CUSTOMER_NAV, isNavActive, isFullScreenRoute } from '@/lib/constants/nav';

/**
 * Which branch you are ordering from is the one thing worth a permanent slot in
 * a 56px header: it decides the menu, the prices and how far the food travels.
 */
function BranchChip({ className = '' }: { className?: string }) {
    const { selectedBranch } = useBranch();
    const { openBranchSelector } = useModal();

    if (!selectedBranch) return null;

    return (
        <button
            onClick={openBranchSelector}
            className={`flex h-9 max-w-[34vw] items-center gap-1.5 rounded-lg border border-hairline bg-surface-sunken pl-2.5 pr-2 transition-colors duration-150 ease-out hover:border-hairline-strong md:max-w-56 ${className}`}
        >
            <StorefrontIcon size={14} weight="fill" className="shrink-0 text-primary-ink" />
            <span className="truncate text-xs font-bold text-fg">{selectedBranch.name}</span>
            <CaretDownIcon size={11} weight="bold" className="shrink-0 text-fg-muted" />
        </button>
    );
}

/**
 * Account moved up here from the tab bar. It is a destination people visit
 * rarely, which is the wrong shape for a tab; search is the one they reach for
 * constantly, and it took the slot.
 */
function AccountButton() {
    const { user, isLoggedIn } = useAuth();
    const { openAuth } = useModal();

    if (!isLoggedIn) {
        return (
            <button
                onClick={openAuth}
                aria-label="Sign in"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-sunken text-fg transition-colors duration-150 ease-out hover:border-hairline-strong"
            >
                <UserIcon size={17} weight="bold" />
            </button>
        );
    }

    return (
        <Link
            href="/account"
            aria-label="My account"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-fill text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
        >
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={17} weight="fill" />}
        </Link>
    );
}

export default function Navbar() {
    const pathname = usePathname();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const { openCart, openAuth, openSearch } = useModal();
    const { totalItems } = useCart();
    const { user, isLoggedIn, logout } = useAuth();

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 4);
        h();
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);

    useEffect(() => { setIsUserMenuOpen(false); }, [pathname]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsUserMenuOpen(false); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        if (isUserMenuOpen) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [isUserMenuOpen]);

    // Checkout carries its own header and its own way back.
    if (isFullScreenRoute(pathname)) return null;

    const initials = user?.name ? user.name.charAt(0).toUpperCase() : null;

    return (
        <header
            className={`fixed inset-x-0 top-0 z-30 select-none border-b bg-surface pt-safe transition-shadow duration-150 ease-out ${
                scrolled
                    ? 'border-transparent shadow-[0_2px_10px_-4px_rgba(0,0,0,0.18)]'
                    : 'border-hairline shadow-none'
            }`}
        >
            {/* ── Mobile: 56px. Brand on the left, branch on the right. ─────── */}
            <div className="flex h-14 items-center gap-2 px-4 md:hidden">
                <Link href="/" className="flex shrink-0 items-center gap-2">
                    <Image src="/cblogo.webp" alt="" width={28} height={28} className="object-contain" priority />
                    <span className="font-brand text-2xl leading-none tracking-wide text-fg">CediBites</span>
                </Link>
                <div className="ml-auto flex min-w-0 items-center gap-2">
                    <BranchChip />
                    <AccountButton />
                </div>
            </div>

            {/* ── Desktop: 72px. ─────────────────────────────────────────────── */}
            <div className="hidden h-18 items-center gap-6 px-6 md:flex lg:px-10">

                <Link href="/" className="flex shrink-0 items-center gap-2.5">
                    <Image src="/cblogo.webp" alt="" width={38} height={38} className="object-contain" priority />
                    <span className="font-brand text-3xl leading-none tracking-wide text-fg">CediBites</span>
                </Link>

                <nav className="flex flex-1 items-center justify-center gap-1" aria-label="Main">
                    {CUSTOMER_NAV.filter(item => item.href).map(item => {
                        const active = isNavActive(pathname, item);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href!}
                                aria-current={active ? 'page' : undefined}
                                className={`flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors duration-150 ease-out ${
                                    active
                                        ? 'bg-primary-soft text-primary-ink'
                                        : 'text-fg-muted hover:text-fg'
                                }`}
                            >
                                <Icon size={18} weight={active ? 'fill' : 'regular'} />
                                {item.longLabel}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex shrink-0 items-center gap-2.5">
                    <button
                        onClick={openSearch}
                        aria-label="Search the menu"
                        className="grid h-10 w-10 place-items-center rounded-lg border border-hairline bg-surface-sunken transition-colors duration-150 ease-out hover:border-hairline-strong"
                    >
                        <MagnifyingGlassIcon weight="bold" size={19} className="text-fg" />
                    </button>

                    <BranchChip />

                    <button
                        onClick={openCart}
                        className="relative grid h-10 w-10 place-items-center rounded-lg border border-hairline bg-surface-sunken transition-colors duration-150 ease-out hover:border-hairline-strong"
                        aria-label={`Open cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
                    >
                        <ShoppingBagIcon weight="bold" size={19} className="text-fg" />
                        {totalItems > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-md bg-primary-fill px-1 text-[10px] font-bold leading-none text-white tabular-nums">
                                {totalItems > 99 ? '99+' : totalItems}
                            </span>
                        )}
                    </button>

                    <div ref={userMenuRef} className="relative">
                        {isLoggedIn ? (
                            <>
                                <button
                                    onClick={() => setIsUserMenuOpen(p => !p)}
                                    className="grid h-10 w-10 place-items-center rounded-lg bg-primary-fill text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                                    aria-label="My account"
                                    aria-expanded={isUserMenuOpen}
                                >
                                    {initials}
                                </button>

                                <div
                                    className={`absolute right-0 top-full z-40 mt-2 w-56 origin-top-right rounded-2xl border border-hairline bg-surface-raised py-2 shadow-[0_12px_28px_-10px_rgba(0,0,0,0.30)] transition-all duration-150 ease-out ${
                                        isUserMenuOpen
                                            ? 'pointer-events-auto scale-100 opacity-100'
                                            : 'pointer-events-none scale-95 opacity-0'
                                    }`}
                                >
                                    <div className="border-b border-hairline px-4 pb-3 pt-1">
                                        <p className="truncate text-sm font-bold text-fg">{user?.name}</p>
                                        <p className="truncate text-xs text-fg-muted">{user?.phone}</p>
                                    </div>
                                    <Link
                                        href="/account"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                                    >
                                        <UserIcon weight="fill" size={15} className="text-fg-muted" /> My Account
                                    </Link>
                                    <Link
                                        href="/orders"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                                    >
                                        <ReceiptIcon weight="fill" size={15} className="text-fg-muted" /> My Orders
                                    </Link>
                                    <button
                                        onClick={() => { logout(); setIsUserMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-danger-ink transition-colors duration-150 ease-out hover:bg-danger-soft"
                                    >
                                        <SignOutIcon weight="fill" size={15} /> Sign Out
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={openAuth}
                                className="flex h-10 items-center rounded-lg bg-primary-fill px-4 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                            >
                                Sign in
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
