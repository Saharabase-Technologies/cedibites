'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CaretRightIcon, SignOutIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { StaffUser } from '@/app/components/providers/StaffAuthProvider';
import { OpeningPrompt } from '@/app/components/opening/OpeningPrompt';

// The sales staff frame: a white page with the sales red down the side.
//
// Below 768 the phone bars, from 768 to 1279 the 88px rail, from 1280 the full
// sidebar. The `cb-sales` class on the root element is what switches the
// colour scope on in app/globals.css, for this frame and for every drawer and
// dialog that renders outside it. Plan: docs/STAFF_PORTAL_BUILD.md, Section 6.

export type SalesNavItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    /** A shorter name for the rail, where the full one would wrap. */
    railLabel?: string;
    external?: boolean;
};

// Unselected text and icons on the red. 5.3:1 on #a51c1f.
const MUTED = 'text-[#f3cfcd]';

const KEY_RING = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white';

function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return (first + last).toUpperCase();
}

function linkProps(item: SalesNavItem) {
    return item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

// ─── The count on Messages ───────────────────────────────────────────────────

function Count({ value, urgent, className }: { value: number; urgent: boolean; className: string }) {
    return (
        <span
            className={`
        flex items-center justify-center rounded-full text-[10px] font-bold leading-none tabular-nums
        ${urgent ? 'bg-error text-white ring-2 ring-white animate-pulse' : 'bg-white text-primary'}
        ${className}
      `}
        >
            {value > 9 ? '9+' : value}
        </span>
    );
}

// ─── Rail, 768 to 1279 ───────────────────────────────────────────────────────

function RailLink({ item, active, badge, urgent }: {
    item: SalesNavItem; active: boolean; badge?: number; urgent?: boolean;
}) {
    const Icon = item.icon;
    const showBadge = (badge ?? 0) > 0;
    return (
        <Link
            href={item.href}
            {...linkProps(item)}
            aria-current={active ? 'page' : undefined}
            className={`
        relative flex flex-col items-center justify-center gap-1 px-1
        min-h-16 [@media(max-height:699px)]:min-h-14 rounded-xl
        text-[11px] leading-tight text-center transition-colors duration-150 ${KEY_RING}
        ${active ? 'bg-white text-primary font-bold' : `${MUTED} font-medium hover:bg-white/10 hover:text-white`}
      `}
        >
            <Icon size={22} weight={active ? 'fill' : 'regular'} className="shrink-0" />
            <span>{item.railLabel ?? item.label}</span>
            {showBadge && (
                <Count value={badge!} urgent={!!urgent} className="absolute top-2 right-3.5 min-w-4.5 h-4.5 px-1.25" />
            )}
        </Link>
    );
}

// ─── Sidebar, 1280 and wider ─────────────────────────────────────────────────

function SideLink({ item, active, badge, urgent }: {
    item: SalesNavItem; active: boolean; badge?: number; urgent?: boolean;
}) {
    const Icon = item.icon;
    const showBadge = (badge ?? 0) > 0;
    return (
        <Link
            href={item.href}
            {...linkProps(item)}
            aria-current={active ? 'page' : undefined}
            className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-sm font-medium transition-colors duration-150 ${KEY_RING}
        ${active ? 'bg-white text-primary' : `${MUTED} hover:bg-white/10 hover:text-white`}
      `}
        >
            <Icon size={20} weight={active ? 'fill' : 'regular'} className="shrink-0" />
            <span>{item.label}</span>
            {showBadge && <Count value={badge!} urgent={!!urgent} className="ml-auto min-w-5 h-5 px-1.5" />}
            {active && !showBadge && (
                <CaretRightIcon size={14} weight="bold" className="ml-auto opacity-60" />
            )}
        </Link>
    );
}

// ─── Phone bottom bar, below 768 ─────────────────────────────────────────────

function BottomLink({ item, active, badge, urgent }: {
    item: SalesNavItem; active: boolean; badge?: number; urgent?: boolean;
}) {
    const Icon = item.icon;
    const showBadge = (badge ?? 0) > 0;
    return (
        <Link
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`
        relative flex flex-col items-center gap-1 flex-1 py-2 min-h-14
        text-xs font-medium transition-colors duration-150 ${KEY_RING}
        ${active ? 'text-white' : MUTED}
      `}
        >
            <span className="relative">
                <Icon size={22} weight={active ? 'fill' : 'regular'} className="shrink-0" />
                {showBadge && (
                    <Count value={badge!} urgent={!!urgent} className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 text-[9px]" />
                )}
            </span>
            <span className="truncate max-w-16 text-center">{item.label}</span>
        </Link>
    );
}

// ─── Frame ───────────────────────────────────────────────────────────────────

export function SalesFrame({
    staffUser, pathname, mainNav, displaysNav, unreadMessages, pendingCautions, onSignOut, children,
}: {
    staffUser: StaffUser;
    pathname: string;
    mainNav: SalesNavItem[];
    displaysNav: SalesNavItem[];
    unreadMessages: number;
    pendingCautions: number;
    onSignOut: () => void;
    children: ReactNode;
}) {
    const branch = staffUser.branches[0]?.name ?? '';
    const initials = initialsOf(staffUser.name);
    const who = branch ? `${staffUser.name}, ${branch}` : staffUser.name;

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
    const badgeFor = (href: string) => (href === '/staff/messages' ? unreadMessages : undefined);
    const urgentFor = (href: string) => href === '/staff/messages' && pendingCautions > 0;

    return (
        <div className="cb-sales h-screen overflow-hidden bg-bg w-full flex">

            {/* ── Rail ─────────────────────────────────────────────────────── */}
            <nav aria-label="Staff portal" className="hidden md:flex xl:hidden flex-col w-22 shrink-0 h-screen bg-primary z-40">
                <div className="shrink-0 flex justify-center py-3.5 border-b border-white/18">
                    <Image src="/logo/mark-white.webp" alt="CediBites" width={48} height={34} priority className="h-auto" />
                </div>

                {/* The list scrolls and the foot stays put. On a POS the page
                    is about 600px tall, which is less than the whole rail. */}
                <div className="cb-rail-scroll flex-1 min-h-0 overflow-y-auto px-2 py-2.5 flex flex-col gap-1">
                    {mainNav.map(item => (
                        <RailLink
                            key={item.href}
                            item={item}
                            active={isActive(item.href)}
                            badge={badgeFor(item.href)}
                            urgent={urgentFor(item.href)}
                        />
                    ))}
                    {displaysNav.length > 0 && (
                        <>
                            <div className="shrink-0 h-px bg-white/18 mx-1 my-1.5" />
                            {displaysNav.map(item => (
                                <RailLink key={item.href} item={item} active={false} />
                            ))}
                        </>
                    )}
                </div>

                <div className="shrink-0 px-2 py-3 border-t border-white/18 flex flex-col items-center gap-1.5">
                    <Link
                        href="/staff/profile"
                        aria-label={`${who}. Your profile`}
                        title={who}
                        className={`flex items-center justify-center w-11 h-11 rounded-full ${KEY_RING}`}
                    >
                        <span className={`
              flex items-center justify-center w-9 h-9 rounded-full text-[13px] font-bold text-white
              ${isActive('/staff/profile') ? 'bg-white/30' : 'bg-white/16 hover:bg-white/25'}
            `}>
                            {initials}
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={onSignOut}
                        className={`min-h-11 w-full rounded-xl text-[11px] font-medium cursor-pointer transition-colors ${MUTED} hover:bg-white/10 hover:text-white ${KEY_RING}`}
                    >
                        Sign out
                    </button>
                </div>
            </nav>

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <nav aria-label="Staff portal" className="hidden xl:flex flex-col w-56 shrink-0 h-screen bg-primary z-40">
                <div className="shrink-0 px-4 py-5 border-b border-white/18">
                    <Image src="/logo/logo-white.webp" alt="CediBites" width={150} height={24} priority className="h-auto" />
                    <p className={`text-[10px] mt-1.5 ${MUTED}`}>Staff Portal</p>
                </div>

                <div className="cb-rail-scroll flex-1 min-h-0 overflow-y-auto px-3 py-4 flex flex-col gap-1">
                    {mainNav.map(item => (
                        <SideLink
                            key={item.href}
                            item={item}
                            active={isActive(item.href)}
                            badge={badgeFor(item.href)}
                            urgent={urgentFor(item.href)}
                        />
                    ))}
                    {displaysNav.length > 0 && (
                        <>
                            <div className="shrink-0 h-px bg-white/18 my-2" />
                            <p className={`text-[10px] font-medium uppercase tracking-wider px-3 pb-1 ${MUTED}`}>
                                Displays
                            </p>
                            {displaysNav.map(item => (
                                <SideLink key={item.href} item={item} active={false} />
                            ))}
                        </>
                    )}
                </div>

                <div className="shrink-0 px-3 py-4 border-t border-white/18 flex flex-col gap-2">
                    <Link
                        href="/staff/profile"
                        aria-current={isActive('/staff/profile') ? 'page' : undefined}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors ${KEY_RING}`}
                    >
                        <span className="w-7 h-7 rounded-full bg-white/16 flex items-center justify-center shrink-0 text-[11px] font-bold text-white">
                            {initials}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium text-white truncate">{staffUser.name}</span>
                            <span className={`block text-[10px] truncate ${MUTED}`}>
                                {branch ? `Sales staff · ${branch}` : 'Sales staff'}
                            </span>
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={onSignOut}
                        className={`flex items-center gap-2.5 min-h-11 px-3 rounded-xl text-sm font-medium cursor-pointer transition-colors ${MUTED} hover:bg-white/10 hover:text-white ${KEY_RING}`}
                    >
                        <SignOutIcon size={18} className="shrink-0" />
                        Sign out
                    </button>
                </div>
            </nav>

            {/* ── Page ─────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
                <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-primary">
                    <Image src="/logo/logo-white.webp" alt="CediBites" width={110} height={18} priority className="h-auto" />
                    <Link
                        href="/staff/profile"
                        aria-label={`${who}. Your profile`}
                        className={`flex items-center gap-2 min-h-11 rounded-xl px-1 ${KEY_RING}`}
                    >
                        <span className="text-xs font-medium text-white">{staffUser.name.split(' ')[0]}</span>
                        <span className="w-8 h-8 rounded-full bg-white/16 flex items-center justify-center text-[11px] font-bold text-white">
                            {initials}
                        </span>
                    </Link>
                </header>

                <main className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
                    <OpeningPrompt />
                    {children}
                </main>
            </div>

            {/* ── Phone bottom bar ─────────────────────────────────────────── */}
            <nav aria-label="Staff portal" className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center overflow-x-auto bg-primary px-2 pb-safe">
                {mainNav.map(item => (
                    <BottomLink
                        key={item.href}
                        item={item}
                        active={isActive(item.href)}
                        badge={badgeFor(item.href)}
                        urgent={urgentFor(item.href)}
                    />
                ))}
                <button
                    type="button"
                    onClick={onSignOut}
                    className={`flex flex-col items-center gap-1 flex-1 py-2 min-h-14 text-xs font-medium cursor-pointer ${MUTED} ${KEY_RING}`}
                >
                    <SignOutIcon size={22} />
                    <span>Sign out</span>
                </button>
            </nav>
        </div>
    );
}
