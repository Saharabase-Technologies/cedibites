'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
    PlusCircleIcon,
    ListIcon,
    ReceiptIcon,
    SignOutIcon,
    UserCircleIcon,
    CaretRightIcon,
} from '@phosphor-icons/react';

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { href: '/staff/new-order', label: 'New Order', icon: PlusCircleIcon },
    { href: '/staff/orders',    label: 'Orders',    icon: ListIcon        },
    { href: '/staff/my-sales',  label: 'My Sales',  icon: ReceiptIcon     },
];

// ─── Sidebar link ─────────────────────────────────────────────────────────────

function SidebarLink({
    href, label, icon: Icon, active,
}: {
    href: string; label: string; icon: React.ElementType; active: boolean;
}) {
    return (
        <Link
            href={href}
            className={`
        group flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-sm font-medium font-body transition-all duration-150
        ${active
                    ? 'bg-primary text-brand-darker'
                    : 'text-neutral-gray hover:bg-brown-light/10 hover:text-text-light'
                }
      `}
        >
            <Icon size={20} weight={active ? 'fill' : 'regular'} className="shrink-0" />
            <span>{label}</span>
            {active && <CaretRightIcon size={14} weight="bold" className="ml-auto opacity-60" />}
        </Link>
    );
}

// ─── Bottom nav link ──────────────────────────────────────────────────────────

function BottomNavLink({
    href, label, icon: Icon, active,
}: {
    href: string; label: string; icon: React.ElementType; active: boolean;
}) {
    return (
        <Link
            href={href}
            className={`
        flex flex-col items-center gap-1 flex-1 py-2
        text-xs font-medium font-body transition-colors duration-150
        ${active ? 'text-primary' : 'text-neutral-gray'}
      `}
        >
            <Icon size={22} weight={active ? 'fill' : 'regular'} className="shrink-0" />
            <span>{label}</span>
        </Link>
    );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Skip the shell entirely on the login page
    if (pathname === '/staff/login') return <>{children}</>;

    // TODO: replace with real staff auth context
    const staff = { name: 'Kofi Mensah', role: 'Sales Staff', branch: 'East Legon' };

    return (
        <div className="h-screen overflow-hidden bg-neutral-light dark:bg-brand-darker w-full flex">

            {/* ── Sidebar (desktop) ───────────────────────────────────────────── */}
            <aside className="hidden md:flex flex-col w-56 shrink-0 bg-brown border-r border-brown-light/15 sticky top-0 h-screen">

                {/* Logo */}
                <div className="flex items-center gap-2.5 px-4 py-5 border-b border-brown-light/15">
                    <Image src="/cblogo.webp" alt="CediBites" width={44} height={44} className="shrink-0" />
                    <div>
                        <p className="font-body font-bold text-primary text-lg leading-none">CediBites</p>
                        <p className="text-neutral-gray text-[10px] font-body mt-0.5">Staff Portal</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
                    {NAV_ITEMS.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={pathname.startsWith(item.href)}
                        />
                    ))}
                </nav>

                {/* Staff info + logout */}
                <div className="px-3 py-4 border-t border-brown-light/50">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <UserCircleIcon size={18} weight="fill" className="text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-text-light text-xs font-medium font-body truncate">{staff.name}</p>
                            <p className="text-neutral-gray text-[10px] font-body truncate">
                                {staff.role} · {staff.branch}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => { window.location.href = '/staff/login'; }}
                        className="
              w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
              text-neutral-gray hover:text-error hover:bg-error/10
              text-sm font-medium font-body transition-all duration-150 cursor-pointer
            "
                    >
                        <SignOutIcon size={18} weight="regular" className="shrink-0" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main content ─────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">

                {/* Mobile top bar */}
                <header className="
          md:hidden
          flex items-center justify-between
          px-4 py-3
          bg-brown border-b border-brown-light/15
          sticky top-0 z-30
        ">
                    <div className="flex items-center gap-2">
                        <Image src="/images/cblogo.webp" alt="CediBites" width={24} height={24} />
                        <span className="font-brand text-primary text-base">CediBites</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <UserCircleIcon size={14} weight="fill" className="text-primary" />
                        </div>
                        <p className="text-text-light text-xs font-body">{staff.name.split(' ')[0]}</p>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
                    {children}
                </main>
            </div>

            {/* ── Bottom nav (mobile) ──────────────────────────────────────────── */}
            <nav className="
        md:hidden
        fixed bottom-0 left-0 right-0 z-30
        flex items-center
        bg-brown border-t border-brown-light/15
        px-2 pb-safe
      ">
                {NAV_ITEMS.map(item => (
                    <BottomNavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={pathname.startsWith(item.href)}
                    />
                ))}
                <button
                    type="button"
                    onClick={() => { window.location.href = '/staff/login'; }}
                    className="flex flex-col items-center gap-1 flex-1 py-2 text-xs font-medium font-body text-neutral-gray cursor-pointer"
                >
                    <SignOutIcon size={22} weight="regular" />
                    <span>Sign Out</span>
                </button>
            </nav>

        </div>
    );
}
