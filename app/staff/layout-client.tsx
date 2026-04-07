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
    ClockIcon,
    CashRegisterIcon,
    MonitorIcon,
    ClipboardTextIcon,
    CurrencyCircleDollarIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { StaffAuthProvider, useStaffAuth, type StaffRole } from '@/app/components/providers/StaffAuthProvider';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';

// ─── Nav configs (permission-gated) ───────────────────────────────────────────

const MANAGER_NAV_MAIN = [
    { href: '/staff/manager/dashboard', label: 'Dashboard', icon: SquaresFourIcon },
    { href: '/staff/manager/orders',    label: 'Orders',    icon: ListIcon },
];

const MANAGER_NAV_TOOLS = [
    { href: '/staff/manager/analytics', label: 'Analytics', icon: ChartBarIcon,   permission: 'view_analytics' },
    { href: '/staff/manager/menu',      label: 'Menu',       icon: ForkKnifeIcon,  permission: 'manage_menu' },
    { href: '/staff/manager/staff',     label: 'Staff',      icon: UsersThreeIcon, permission: 'manage_employees' },
    { href: '/staff/manager/staff-sales', label: 'Staff Sales', icon: CurrencyCircleDollarIcon, permission: 'view_orders' },
    { href: '/staff/manager/shifts',    label: 'Shifts',     icon: ClockIcon,      permission: 'manage_shifts' },
    { href: '/staff/manager/settings',  label: 'Configure',  icon: GearSixIcon,    permission: 'manage_settings' },
];

const SALES_NAV = [
    { href: '/staff/sales/dashboard',  label: 'Dashboard', icon: SquaresFourIcon },
    { href: '/staff/sales/new-order',  label: 'New Order', icon: PlusCircleIcon,  permission: 'create_orders', roles: ['call_center'] as string[] },
    { href: '/staff/sales/orders',     label: 'Orders',    icon: ListIcon },
    { href: '/staff/sales/my-sales',   label: 'My Sales',  icon: ReceiptIcon,     permission: 'view_my_sales' },
    { href: '/staff/sales/my-shifts',  label: 'My Shifts', icon: ClockIcon,       permission: 'view_my_shifts' },
];

const DISPLAYS_NAV = [
    { href: '/pos/terminal',    label: 'POS Terminal',    icon: CashRegisterIcon,  permission: 'access_pos',           external: true },
    { href: '/kitchen/display', label: 'Kitchen Display', icon: MonitorIcon,       permission: 'access_kitchen',       external: true },
    { href: '/order-manager',   label: 'Order Manager',   icon: ClipboardTextIcon, permission: 'access_order_manager', external: true },
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

function roleLabel(role: StaffRole | string): string {
    const map: Record<string, string> = {
        admin:          'Admin',
        tech_admin:     'Tech Admin',
        branch_partner: 'Branch Partner',
        manager:        'Branch Manager',
        call_center:    'Call Center',
        employee:       'Staff',
        kitchen:        'Kitchen',
        rider:          'Rider',
    };
    return map[role] ?? 'Staff';
}

// ─── Inner shell (consumes StaffAuthProvider) ─────────────────────────────────

function StaffLayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { staffUser, isLoading, logout, can } = useStaffAuth();
    const [isSignOutOpen, setIsSignOutOpen] = useState(false);

    const isPublicPath = pathname === '/staff/login'
        || pathname === '/staff/forgot-password'
        || pathname === '/staff/reset-password';

    // Not logged in → redirect (must be before any early returns)
    useEffect(() => {
        if (!isLoading && !staffUser && !isPublicPath) {
            router.replace('/staff/login');
        }
    }, [isLoading, staffUser, isPublicPath, router]);

    // Public pages get no chrome
    if (isPublicPath) return <>{children}</>;

    // While reading localStorage, render nothing to avoid flash
    if (isLoading) return null;

    if (!staffUser) return null;

    // ── Build permission-gated nav ──
    const isManagerPortal = can('access_manager_portal');

    const mainNav = isManagerPortal
        ? MANAGER_NAV_MAIN.filter(i => !('permission' in i) || can((i as { permission: string }).permission))
        : SALES_NAV.filter(i => (!('permission' in i) || can((i as { permission: string }).permission)) && (!('roles' in i) || !(i as { roles?: string[] }).roles || (i as { roles?: string[] }).roles!.includes(staffUser.role)));

    const toolsNav = isManagerPortal
        ? MANAGER_NAV_TOOLS.filter(i => can(i.permission))
        : [];

    const displaysNav = DISPLAYS_NAV.filter(i => can(i.permission));

    const allMobileNav = [...mainNav, ...toolsNav];

    return (
        <div className="h-screen overflow-hidden bg-neutral-light dark:bg-brand-darker w-full flex">

            {/* ── Sidebar (desktop) ───────────────────────────────────────────── */}
            <aside className="hidden md:flex flex-col w-56 shrink-0 bg-brown border-r border-brown-light/15 sticky top-0 h-screen">

                {/* Logo */}
                <div className="flex items-center gap-2.5 px-4 py-5 border-b border-brown-light/15">
                    <Image src="/cblogo.webp" alt="CediBites" width={44} height={44} className="shrink-0" priority />
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
                            active={pathname === item.href || pathname.startsWith(item.href + '/')}
                        />
                    ))}

                    {toolsNav.length > 0 && (
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
                                    active={pathname === item.href || pathname.startsWith(item.href + '/')}
                                />
                            ))}
                        </>
                    )}

                    {displaysNav.length > 0 && (
                        <>
                            <div className="my-2 border-t border-brown-light/15" />
                            <p className="text-[10px] font-body font-medium text-neutral-gray/60 uppercase tracking-wider px-3 pb-1">
                                Displays
                            </p>
                            {displaysNav.map(item => (
                                <SidebarLink
                                    key={item.href}
                                    href={item.href}
                                    label={item.label}
                                    icon={item.icon}
                                    active={false}
                                    external={item.external}
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
                                {roleLabel(staffUser.role)} · {staffUser.branches[0]?.name ?? ''}
                            </p>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setIsSignOutOpen(true)}
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
                        active={pathname === item.href || pathname.startsWith(item.href + '/')}
                    />
                ))}
                <button
                    type="button"
                    onClick={() => setIsSignOutOpen(true)}
                    className="flex flex-col items-center gap-1 flex-1 py-2 text-xs font-medium font-body text-neutral-gray cursor-pointer"
                >
                    <SignOutIcon size={22} weight="regular" />
                    <span>Sign Out</span>
                </button>
            </nav>

            <SignOutDialog
                isOpen={isSignOutOpen}
                onCancel={() => setIsSignOutOpen(false)}
                onConfirm={() => logout()}
            />
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
