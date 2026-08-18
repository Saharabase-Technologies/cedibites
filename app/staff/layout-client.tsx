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
    WarehouseIcon,
    ChatCircleTextIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { StaffAuthProvider, useStaffAuth, type StaffRole } from '@/app/components/providers/StaffAuthProvider';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';
import { InterruptionGateProvider } from '@/app/components/providers/InterruptionGate';
import { CautionInterstitial } from '@/app/components/messaging/CautionInterstitial';
import { StaffMessageBell } from '@/app/components/messaging/StaffMessageBell';
import { useStaffInbox } from '@/lib/api/hooks/useStaffInbox';

// ─── Nav configs (permission-gated) ───────────────────────────────────────────

const MANAGER_NAV_MAIN = [
    { href: '/staff/manager/dashboard', label: 'Dashboard', icon: SquaresFourIcon },
    { href: '/staff/manager/orders',    label: 'Orders',    icon: ListIcon },
    // No permission gate. Receiving a message is the job, not a privilege —
    // gating the inbox would mean editing all ten roles and silently excluding
    // whichever one was missed.
    { href: '/staff/messages',          label: 'Messages',  icon: ChatCircleTextIcon },
];

const MANAGER_NAV_TOOLS = [
    { href: '/staff/manager/analytics', label: 'Analytics', icon: ChartBarIcon,   permission: 'view_analytics' },
    // Gated on viewing, not managing. The branch manager reads the menu and
    // marks a dish sold out at his own branch; he does not create, rename,
    // reprice or delete, because every branch serves the same menu. Gating
    // this on `manage_menu` hid the section from him entirely the moment that
    // permission moved to the Admin — along with the sold-out toggle, which is
    // the one thing he needs from it during service.
    { href: '/staff/manager/menu',      label: 'Menu',       icon: ForkKnifeIcon,  permission: 'view_menu' },
    // Same story: he reads his branch's roster and keeps notes on his own
    // people. Hiring, roles and access are the Admin's.
    { href: '/staff/manager/staff',     label: 'Staff',      icon: UsersThreeIcon, permission: 'view_employees' },
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
    { href: '/staff/messages',         label: 'Messages',  icon: ChatCircleTextIcon },
];

const DISPLAYS_NAV = [
    { href: '/pos/terminal',       label: 'POS Terminal',    icon: CashRegisterIcon,  permission: 'access_pos',              external: true  },
    { href: '/kitchen/display',    label: 'Kitchen Display', icon: MonitorIcon,       permission: 'access_kitchen',          external: true  },
    { href: '/order-manager',      label: 'Order Manager',   icon: ClipboardTextIcon, permission: 'access_order_manager',    external: true  },
    // A separate portal, like the three above it: you go to inventory to do a
    // count or a transfer and come back to what you were doing, so it opens
    // alongside the staff portal rather than replacing it.
    { href: '/inventory/dashboard', label: 'Inventory',      icon: WarehouseIcon,     permission: 'access_inventory_portal', external: true  },
];

// ─── Sidebar link ─────────────────────────────────────────────────────────────

function SidebarLink({
    href, label, icon: Icon, active, external, badge, urgent,
}: {
    href: string; label: string; icon: React.ElementType; active: boolean; external?: boolean;
    /** Unread count. Hidden at zero — a badge showing 0 is noise. */
    badge?: number;
    /** Something is waiting that must be acknowledged. Red, and it pulses. */
    urgent?: boolean;
}) {
    const showBadge = (badge ?? 0) > 0;

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
            <Icon size={20} weight={active || showBadge ? 'fill' : 'regular'} className="shrink-0" />
            <span>{label}</span>

            {showBadge && (
                <span
                    className={`
            ml-auto flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full
            text-[10px] font-bold font-body leading-none text-white
            ${urgent ? 'bg-error animate-pulse' : 'bg-primary text-brand-darker'}
          `}
                >
                    {badge! > 9 ? '9+' : badge}
                </span>
            )}

            {active && !showBadge && (
                <CaretRightIcon size={14} weight="bold" className="ml-auto opacity-60" />
            )}
        </Link>
    );
}

// ─── Bottom nav link ──────────────────────────────────────────────────────────

function BottomNavLink({
    href, label, icon: Icon, active, badge, urgent,
}: {
    href: string; label: string; icon: React.ElementType; active: boolean;
    badge?: number; urgent?: boolean;
}) {
    const showBadge = (badge ?? 0) > 0;

    return (
        <Link
            href={href}
            className={`
        relative flex flex-col items-center gap-1 flex-1 py-2
        text-xs font-medium font-body transition-colors duration-150
        ${active ? 'text-primary' : 'text-neutral-gray'}
      `}
        >
            <span className="relative">
                <Icon size={22} weight={active || showBadge ? 'fill' : 'regular'} className="shrink-0" />

                {/* Sits on the icon rather than after the label: the bottom bar
                    is width-constrained and a badge on the text pushes the
                    label into an ellipsis on a narrow handset. */}
                {showBadge && (
                    <span
                        className={`
              absolute -top-1.5 -right-2 flex items-center justify-center
              min-w-4 h-4 px-1 rounded-full text-[9px] font-bold leading-none text-white
              ${urgent ? 'bg-error animate-pulse' : 'bg-primary text-brand-darker'}
            `}
                    >
                        {badge! > 9 ? '9+' : badge}
                    </span>
                )}
            </span>

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
        employee:       'Sales Staff',
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

    // Called before the early returns below, unconditionally, because hooks must
    // be. It tolerates a null user id and simply stays idle until there is one.
    const { summary: inboxSummary } = useStaffInbox(staffUser?.user_id ?? null);

    const unreadMessages = inboxSummary.unread;
    // A caution waiting on an acknowledgement is a different thing from an
    // unread notice, and the badge says so in red rather than burying it in one
    // undifferentiated count.
    const pendingCautions = inboxSummary.pending.length;

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
                    <div className="min-w-0">
                        <p className="font-body font-bold text-primary text-lg leading-none">CediBites</p>
                        <p className="text-neutral-gray text-[10px] font-body mt-0.5">Staff Portal</p>
                    </div>
                    {/* The bell was previously only inside the md:hidden mobile
                        header, so on desktop - where staff actually spend the
                        shift - there was no bell at all. */}
                    <StaffMessageBell className="ml-auto" />
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
                            badge={item.href === '/staff/messages' ? unreadMessages : undefined}
                            urgent={item.href === '/staff/messages' && pendingCautions > 0}
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
                    <div className="flex items-center gap-1">
                        <StaffMessageBell />
                        <Link href="/staff/profile" className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <UserCircleIcon size={14} weight="fill" className="text-primary" />
                            </div>
                            <p className="text-text-light text-xs font-body">{staffUser.name.split(' ')[0]}</p>
                        </Link>
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
                        badge={item.href === '/staff/messages' ? unreadMessages : undefined}
                        urgent={item.href === '/staff/messages' && pendingCautions > 0}
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
            {/* The gate wraps the whole staff shell so a claim registered by the
                new-order wizard is still honoured after navigating to another
                page inside it. Mounting it per-page would drop the claim on
                every route change, which is precisely when somebody is
                mid-task. */}
            <InterruptionGateProvider>
                <StaffLayoutShell>{children}</StaffLayoutShell>
                <CautionInterstitial />
            </InterruptionGateProvider>
        </StaffAuthProvider>
    );
}
