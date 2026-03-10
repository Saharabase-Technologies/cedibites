'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    SquaresFourIcon,
    PlusCircleIcon,
    ListIcon,
    ReceiptIcon,
    SignOutIcon,
    UserCircleIcon,
    CaretRightIcon,
    ChartBarIcon,
    ForkKnifeIcon,
    UsersThreeIcon,
    GearSixIcon,
} from '@phosphor-icons/react';
import { StaffAuthProvider, useStaffAuth, type StaffRole } from '@/app/components/providers/StaffAuthProvider';

// ─── Nav configs per role ──────────────────────────────────────────────────────

const SALES_NAV = [
    { href: '/staff/sales/dashboard', label: 'Dashboard', icon: SquaresFourIcon },
    { href: '/staff/sales/new-order', label: 'New Order', icon: PlusCircleIcon  },
    { href: '/staff/sales/orders',    label: 'Orders',    icon: ListIcon        },
    { href: '/staff/sales/my-sales',  label: 'My Sales',  icon: ReceiptIcon     },
];

const MANAGER_NAV_MAIN = [
    { href: '/staff/manager/dashboard', label: 'Dashboard', icon: SquaresFourIcon },
    { href: '/staff/manager/new-order', label: 'New Order', icon: PlusCircleIcon  },
    { href: '/staff/manager/orders',    label: 'Orders',    icon: ListIcon        },
];

const MANAGER_NAV_TOOLS = [
    { href: '/staff/manager/analytics', label: 'Analytics', icon: ChartBarIcon  },
    { href: '/staff/manager/menu',      label: 'Menu',       icon: ForkKnifeIcon },
    { href: '/staff/manager/staff',     label: 'Staff',      icon: UsersThreeIcon },
    { href: '/staff/manager/settings',  label: 'Configure',  icon: GearSixIcon   },
];

function navItemsForRole(role: StaffRole) {
    if (role === 'manager') return { main: MANAGER_NAV_MAIN, tools: MANAGER_NAV_TOOLS };
    return { main: SALES_NAV, tools: [] };
}

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
            <span className="truncate max-w-13 text-center">{label}</span>
        </Link>
    );
}

// ─── Role label ───────────────────────────────────────────────────────────────

function roleLabel(role: StaffRole): string {
    return role === 'manager' ? 'Branch Manager' : 'Sales Staff';
}

// ─── Inner shell (consumes StaffAuthProvider) ─────────────────────────────────

function StaffLayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { staffUser, isLoading, logout } = useStaffAuth();

    // Login page gets no chrome
    if (pathname === '/staff/login') return <>{children}</>;

    // While reading localStorage, render nothing to avoid flash
    if (isLoading) return null;

    // Not logged in → redirect
    if (!staffUser) {
        router.replace('/staff/login');
        return null;
    }

    const { main: mainNav, tools: toolsNav } = navItemsForRole(staffUser.role);
    const isManager = staffUser.role === 'manager';
    const allMobileNav = [...mainNav, ...toolsNav];

    const handleLogout = () => {
        logout();
        router.replace('/staff/login');
    };

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
                <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
                    {mainNav.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={pathname.startsWith(item.href)}
                        />
                    ))}

                    {isManager && toolsNav.length > 0 && (
                        <>
                            <div className="my-2 border-t border-brown-light/15" />
                            <p className="text-[10px] font-body font-medium text-neutral-gray/60 uppercase tracking-wider px-3 pb-1">
                                Manager
                            </p>
                            {toolsNav.map(item => (
                                <SidebarLink
                                    key={item.href}
                                    href={item.href}
                                    label={item.label}
                                    icon={item.icon}
                                    active={pathname.startsWith(item.href)}
                                />
                            ))}
                        </>
                    )}
                </nav>

                {/* Staff info + logout */}
                <div className="px-3 py-4 border-t border-brown-light/50">
                    <Link href="/staff/profile" className="flex items-center gap-2.5 px-3 py-2.5 mb-2 rounded-xl hover:bg-brown-light/10 transition-colors group">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <UserCircleIcon size={18} weight="fill" className="text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-text-light text-xs font-medium font-body truncate group-hover:text-primary transition-colors">{staffUser.name}</p>
                            <p className="text-neutral-gray text-[10px] font-body truncate">
                                {roleLabel(staffUser.role)} · {staffUser.branch}
                            </p>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
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
                        <Image src="/cblogo.webp" alt="CediBites" width={24} height={24} />
                        <span className="font-brand text-primary text-base">CediBites</span>
                    </div>
                    <Link href="/staff/profile" className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <UserCircleIcon size={14} weight="fill" className="text-primary" />
                        </div>
                        <p className="text-text-light text-xs font-body">{staffUser.name.split(' ')[0]}</p>
                    </Link>
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
        flex items-center overflow-x-auto
        bg-brown border-t border-brown-light/15
        px-2 pb-safe
      ">
                {allMobileNav.map(item => (
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
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-1 flex-1 py-2 text-xs font-medium font-body text-neutral-gray cursor-pointer"
                >
                    <SignOutIcon size={22} weight="regular" />
                    <span>Sign Out</span>
                </button>
            </nav>

        </div>
    );
}

// ─── Layout root (provides StaffAuthProvider) ─────────────────────────────────

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <StaffAuthProvider>
            <StaffLayoutShell>{children}</StaffLayoutShell>
        </StaffAuthProvider>
    );
}
