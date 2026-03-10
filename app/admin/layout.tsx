'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    SquaresFourIcon,
    ListIcon,
    BuildingsIcon,
    ForkKnifeIcon,
    UsersThreeIcon,
    UserCircleIcon,
    ChartBarIcon,
    GearSixIcon,
    ClockCounterClockwiseIcon,
    SignOutIcon,
    CaretRightIcon,
    ShieldCheckIcon,
} from '@phosphor-icons/react';

// ─── Nav config ───────────────────────────────────────────────────────────────

const ADMIN_NAV = [
    { href: '/admin/dashboard',  label: 'Dashboard',  icon: SquaresFourIcon           },
    { href: '/admin/orders',     label: 'Orders',     icon: ListIcon                  },
    { href: '/admin/branches',   label: 'Branches',   icon: BuildingsIcon             },
    { href: '/admin/menu',       label: 'Menu',       icon: ForkKnifeIcon             },
    { href: '/admin/staff',      label: 'Staff',      icon: UsersThreeIcon            },
    { href: '/admin/customers',  label: 'Customers',  icon: UserCircleIcon            },
    { href: '/admin/analytics',  label: 'Analytics',  icon: ChartBarIcon              },
    { href: '/admin/settings',   label: 'Settings',   icon: GearSixIcon               },
    { href: '/admin/audit',      label: 'Audit Log',  icon: ClockCounterClockwiseIcon },
];

const BOTTOM_NAV = ADMIN_NAV.filter(n =>
    ['/admin/dashboard', '/admin/orders', '/admin/branches', '/admin/menu', '/admin/settings'].includes(n.href)
);

const ADMIN = { name: 'Nana Kwame Adjei', email: 'admin@cedibites.com' };

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
                group flex items-center gap-3 py-2.5 rounded-xl
                text-sm font-medium font-body transition-all duration-150
                ${active
                    ? 'bg-[#fff8ec] text-primary px-3 border-l-[3px] border-primary ml-0 pl-[9px]'
                    : 'text-neutral-gray hover:bg-neutral-light hover:text-text-dark px-3'
                }
            `}
        >
            <Icon size={18} weight={active ? 'fill' : 'regular'} className="shrink-0" />
            <span>{label}</span>
            {active && <CaretRightIcon size={12} weight="bold" className="ml-auto opacity-40" />}
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
            className={`flex flex-col items-center gap-1 flex-1 py-2 text-xs font-medium font-body transition-colors ${active ? 'text-primary' : 'text-neutral-gray'}`}
        >
            <Icon size={22} weight={active ? 'fill' : 'regular'} />
            <span>{label}</span>
        </Link>
    );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="h-screen overflow-hidden bg-neutral-light w-full flex">

            {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
            <aside className="hidden md:flex flex-col w-60 shrink-0 bg-neutral-card border-r border-[#f0e8d8] sticky top-0 h-screen">

                {/* Logo + subtitle */}
                <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#f0e8d8]">
                    <Image src="/cblogo.webp" alt="CediBites" width={40} height={40} className="shrink-0" />
                    <div>
                        <p className="font-brand text-primary text-lg leading-none">CediBites</p>
                        <p className="text-neutral-gray text-[10px] font-body mt-0.5 flex items-center gap-1">
                            <ShieldCheckIcon size={10} weight="fill" className="text-primary/70" />
                            Admin Console
                        </p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
                    {ADMIN_NAV.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={pathname === item.href || pathname.startsWith(item.href + '/')}
                        />
                    ))}
                </nav>

                {/* Admin identity + sign out */}
                <div className="px-3 py-4 border-t border-[#f0e8d8]">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1.5 bg-neutral-light rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-primary text-xs font-bold font-body">
                                {ADMIN.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-text-dark text-xs font-semibold font-body truncate">{ADMIN.name}</p>
                            <p className="text-neutral-gray text-[10px] font-body truncate">{ADMIN.email}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => { window.location.href = '/staff/login'; }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-gray hover:text-error hover:bg-error/10 text-sm font-medium font-body transition-all cursor-pointer"
                    >
                        <SignOutIcon size={16} weight="regular" className="shrink-0" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main area ─────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">

                {/* Mobile top bar */}
                <header className="md:hidden flex items-center justify-between px-4 py-3 bg-neutral-card border-b border-[#f0e8d8] sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <Image src="/cblogo.webp" alt="CediBites" width={24} height={24} />
                        <span className="font-brand text-primary text-base">CediBites</span>
                        <span className="text-neutral-gray text-xs font-body ml-1">Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                            <span className="text-primary text-[10px] font-bold font-body">
                                {ADMIN.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
                    {children}
                </main>
            </div>

            {/* ── Bottom nav (mobile) ───────────────────────────────────────── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center bg-neutral-card border-t border-[#f0e8d8] px-2">
                {BOTTOM_NAV.map(item => (
                    <BottomNavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={pathname === item.href || pathname.startsWith(item.href + '/')}
                    />
                ))}
            </nav>

        </div>
    );
}
