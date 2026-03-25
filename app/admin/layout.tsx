'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
    TagIcon,
    CashRegisterIcon,
    MonitorIcon,
    ClipboardTextIcon,
    PlusCircleIcon,
    HashStraightIcon,
    ReceiptIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { StaffAuthProvider, useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';

// ─── Nav config ───────────────────────────────────────────────────────────────

const ADMIN_NAV = [
    { href: '/admin/dashboard',  label: 'Dashboard',  icon: SquaresFourIcon           },
    { href: '/admin/orders',     label: 'Orders',     icon: ListIcon                  },
    { href: '/admin/branches',   label: 'Branches',   icon: BuildingsIcon             },
    { href: '/admin/menu',       label: 'Menu',       icon: ForkKnifeIcon             },
    { href: '/admin/menu-add-ons', label: 'Menu Add-ons', icon: PlusCircleIcon          },
    { href: '/admin/menu-tags',    label: 'Menu Tags',    icon: HashStraightIcon         },
    { href: '/admin/staff',      label: 'Staff',      icon: UsersThreeIcon            },
    { href: '/admin/customers',  label: 'Customers',  icon: UserCircleIcon            },
    { href: '/admin/promos',        label: 'Promos',        icon: TagIcon                   },
    { href: '/admin/transactions',  label: 'Transactions',  icon: ReceiptIcon               },
    { href: '/admin/analytics',     label: 'Analytics',     icon: ChartBarIcon              },
    { href: '/admin/settings',   label: 'Settings',   icon: GearSixIcon               },
    { href: '/admin/audit',      label: 'Audit Log',  icon: ClockCounterClockwiseIcon },
];

const BOTTOM_NAV = ADMIN_NAV.filter(n =>
    ['/admin/dashboard', '/admin/orders', '/admin/branches', '/admin/menu', '/admin/settings'].includes(n.href)
);

const ADMIN_DISPLAYS = [
    { href: '/pos/terminal',  label: 'POS Terminal',    icon: CashRegisterIcon,  external: true },
    { href: '/kitchen/display', label: 'Kitchen Display', icon: MonitorIcon, external: true },
    { href: '/order-manager', label: 'Order Manager',   icon: ClipboardTextIcon, external: true },
];

// ─── Sidebar link ─────────────────────────────────────────────────────────────

function SidebarLink({
    href, label, icon: Icon, active, external,
}: {
    href: string; label: string; icon: React.ElementType; active: boolean; external?: boolean;
}) {
    return (
        <Link
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className={`
                group flex items-center gap-3 py-2.5 rounded-xl
                text-sm font-medium font-body transition-all duration-150
                ${active
                    ? 'bg-[#fff8ec] text-primary px-3 border-l-[3px] border-primary ml-0 pl-2.25'
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

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { staffUser, isLoading, logout } = useStaffAuth();
    const [isSignOutOpen, setIsSignOutOpen] = useState(false);

    // Redirect to login if not authenticated or not admin/super_admin
    useEffect(() => {
        if (!isLoading) {
            if (!staffUser) {
                router.push('/staff/login');
                return;
            }

            // Only allow users with access_admin_panel permission
            if (!staffUser.permissions?.includes('access_admin_panel')) {
                router.push('/staff/login');
                return;
            }
        }
    }, [staffUser, isLoading, router]);

    // Show loading while checking authentication
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-neutral-light">
                <div className="text-center">
                    <Image src="/cblogo.webp" alt="CediBites" width={48} height={48} className="mx-auto mb-4" />
                    <p className="text-neutral-gray text-sm font-body">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render anything if not authenticated (will redirect)
    if (!staffUser || !staffUser.permissions?.includes('access_admin_panel')) {
        return null;
    }

    return (
        <div className="h-screen overflow-hidden bg-neutral-light w-full flex">

            {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
            <aside className="hidden md:flex flex-col w-60 shrink-0 bg-neutral-card border-r border-[#f0e8d8] sticky top-0 h-screen">

                {/* Logo + subtitle */}
                <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#f0e8d8]">
                    <Image src="/cblogo.webp" alt="CediBites" width={40} height={40} className="shrink-0" priority />
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

                    <div className="my-2 border-t border-[#f0e8d8]" />
                    <p className="text-[10px] font-body font-medium text-neutral-gray/60 uppercase tracking-wider px-3 pb-1">
                        Displays
                    </p>
                    {ADMIN_DISPLAYS.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={false}
                            external={item.external}
                        />
                    ))}
                </nav>

                {/* Admin identity + sign out */}
                <div className="px-3 py-4 border-t border-[#f0e8d8]">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1.5 bg-neutral-light rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-primary text-xs font-bold font-body">
                                {staffUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-text-dark text-xs font-semibold font-body truncate">{staffUser.name}</p>
                            <p className="text-neutral-gray text-[10px] font-body truncate">{staffUser.role}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsSignOutOpen(true)}
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
                                {staffUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
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

            <SignOutDialog
                isOpen={isSignOutOpen}
                onCancel={() => setIsSignOutOpen(false)}
                onConfirm={() => logout()}
            />
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <StaffAuthProvider>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </StaffAuthProvider>
    );
}
