'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { CancelRequestsBell } from './components/CancelRequestsBell';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { useCancelRequestAlerts } from '@/lib/hooks/useCancelRequestAlerts';
import { useBranches } from '@/lib/api/hooks/useBranches';
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
    ChatCircleDotsIcon,
    SignOutIcon,
    CaretRightIcon,
    ShieldCheckIcon,
    TagIcon,
    CashRegisterIcon,
    MonitorIcon,
    ClipboardTextIcon,
    ReceiptIcon,
    HeartbeatIcon,
    WarningCircleIcon,
    UsersIcon,
    KeyIcon,
    SlidersIcon,
    WarehouseIcon,
    LinkSimpleIcon,
    MegaphoneIcon,
    RobotIcon,
    ChatCircleTextIcon,
    XIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { StaffAuthProvider, useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';

// ─── Nav config ───────────────────────────────────────────────────────────────

const ADMIN_GROUPS = [
    {
        title: 'Overview',
        items: [
            { href: '/admin/dashboard',  label: 'Dashboard',  icon: SquaresFourIcon },
            { href: '/admin/analytics',  label: 'Analytics',  icon: ChartBarIcon    },
        ],
    },
    {
        title: 'Operations',
        items: [
            { href: '/admin/orders',        label: 'Orders',        icon: ListIcon    },
            { href: '/admin/transactions',  label: 'Transactions',  icon: ReceiptIcon },
        ],
    },
    {
        title: 'Catalog',
        items: [
            { href: '/admin/menu',      label: 'Menu',      icon: ForkKnifeIcon },
            { href: '/admin/promos',    label: 'Promos',    icon: TagIcon       },
            { href: '/admin/branches',  label: 'Branches',  icon: BuildingsIcon },
        ],
    },
    {
        title: 'People',
        items: [
            { href: '/admin/customers',  label: 'Customers',  icon: UserCircleIcon },
            { href: '/admin/staff',      label: 'Staff',      icon: UsersThreeIcon },
        ],
    },
];

// Reaching the whole customer list in one act, at four figures a send. Gated on
// `manage_campaigns` — admin and tech_admin only, the same ceiling the contact
// export already enforces. Rendered separately from ADMIN_GROUPS for that reason.
const MARKETING_NAV = [
    { href: '/admin/campaigns',   label: 'Campaigns',   icon: MegaphoneIcon  },
    // Same reach as a campaign, spread thin — one person at a time, over time.
    { href: '/admin/automations', label: 'Automations', icon: RobotIcon      },
    { href: '/admin/links',       label: 'Short Links', icon: LinkSimpleIcon },
    // What customers said about their orders. Distinct from "Feedback" under
    // System, which is the in-app bug reporter — hence the fuller label.
    { href: '/admin/customer-feedback', label: 'Customer Feedback', icon: ChatCircleTextIcon },
];

// Messages to staff, and the rules that send them without anybody pressing
// send. Separate from Marketing: that reaches customers and costs money per
// send; this reaches our own people and is free.
const STAFF_COMMS_NAV = [
    { href: '/admin/messages', label: 'Staff Messages', icon: ChatCircleTextIcon },
];

// Rendered after Displays, near the bottom of the sidebar.
const SYSTEM_GROUP = {
    title: 'System',
    items: [
        { href: '/admin/feedback',  label: 'Feedback',   icon: ChatCircleDotsIcon        },
        { href: '/admin/settings',  label: 'Settings',   icon: GearSixIcon               },
        { href: '/admin/audit',     label: 'Audit Log',  icon: ClockCounterClockwiseIcon },
    ],
};

const ADMIN_NAV = [...ADMIN_GROUPS.flatMap(g => g.items), ...SYSTEM_GROUP.items];

const BOTTOM_NAV = ADMIN_NAV.filter(n =>
    ['/admin/dashboard', '/admin/orders', '/admin/branches', '/admin/menu', '/admin/settings'].includes(n.href)
);

// Every menu tab is now a genuine child of /admin/menu, so the prefix match is
// enough. The special case that used to sit here existed because add-ons and
// tags were siblings pretending to be children.
function isNavActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(href + '/');
}

const ADMIN_DISPLAYS = [
    { href: '/pos/terminal',       label: 'POS Terminal',    icon: CashRegisterIcon,  external: true },
    { href: '/kitchen/display',    label: 'Kitchen Display', icon: MonitorIcon,        external: true },
    { href: '/order-manager',      label: 'Order Manager',   icon: ClipboardTextIcon, external: true },
    // Opens alongside the admin portal, like the three above it — see the same
    // entry in app/staff/layout-client.tsx.
    { href: '/inventory/dashboard', label: 'Inventory',       icon: WarehouseIcon,      external: true  },
];

const PLATFORM_NAV = [
    { href: '/admin/platform',            label: 'System Health',   icon: HeartbeatIcon     },
    { href: '/admin/platform/errors',     label: 'Error Feed',      icon: WarningCircleIcon },
    { href: '/admin/platform/admins',     label: 'Platform Team',   icon: UsersIcon         },
    { href: '/admin/platform/passwords',  label: 'Staff Passwords', icon: KeyIcon           },
    // Toggles that used to need an SSH session and a .env edit. DB overrides on
    // an allowlist — no credentials, and a bad value cannot stop the app booting.
    { href: '/admin/platform/settings',   label: 'Settings',        icon: SlidersIcon       },
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

// ─── Nav list ────────────────────────────────────────────────────────────

// One list, rendered in two places: pinned open in the desktop sidebar, and
// inside the drawer on a phone. The bottom bar carries five destinations; this
// carries all twenty six, which is why it has to exist on mobile at all.
// onNavigate fires on any link tap so the drawer shuts behind you.
function AdminNavList({
    staffUser, pathname, className, onNavigate,
}: {
    staffUser: { permissions?: string[] };
    pathname: string;
    className: string;
    onNavigate?: () => void;
}) {
    return (
        <nav
            className={className}
            onClick={onNavigate ? (e) => {
                if ((e.target as HTMLElement).closest('a')) onNavigate();
            } : undefined}
        >
            {ADMIN_GROUPS.map((group, gi) => (
                <div key={group.title}>
                    {gi > 0 && <div className="my-2 border-t border-[#f0e8d8]" />}
                    <p className="text-[10px] font-body font-medium text-neutral-gray/60 uppercase tracking-wider px-3 pb-1">
                        {group.title}
                    </p>
                    {group.items.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={isNavActive(pathname, item.href)}
                        />
                    ))}
                </div>
            ))}

            {/* Reaching every member of staff at once, and the rules that
                do it unprompted. `staff_messages.manage` is admin and
                tech_admin only — branch managers deliberately do not
                send. Receiving needs no permission at all. */}
            {staffUser.permissions?.includes('staff_messages.manage') && (
                <>
                    <div className="my-2 border-t border-[#f0e8d8]" />
                    <p className="text-[10px] font-body font-medium text-neutral-gray/60 uppercase tracking-wider px-3 pb-1">
                        Staff comms
                    </p>
                    {STAFF_COMMS_NAV.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={isNavActive(pathname, item.href)}
                        />
                    ))}
                </>
            )}

            {staffUser.permissions?.includes('manage_campaigns') && (
                <>
                    <div className="my-2 border-t border-[#f0e8d8]" />
                    <p className="text-[10px] font-body font-medium text-neutral-gray/60 uppercase tracking-wider px-3 pb-1">
                        Marketing
                    </p>
                    {MARKETING_NAV.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={isNavActive(pathname, item.href)}
                        />
                    ))}
                </>
            )}

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

            <div className="my-2 border-t border-[#f0e8d8]" />
            <p className="text-[10px] font-body font-medium text-neutral-gray/60 uppercase tracking-wider px-3 pb-1">
                {SYSTEM_GROUP.title}
            </p>
            {SYSTEM_GROUP.items.map(item => (
                <SidebarLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isNavActive(pathname, item.href)}
                />
            ))}

            {staffUser.permissions?.includes('access_platform_admin') && (
                <>
                    <div className="my-2 border-t border-[#f0e8d8]" />
                    <p className="text-[10px] font-body font-medium text-neutral-gray/60 uppercase tracking-wider px-3 pb-1">
                        Platform
                    </p>
                    {PLATFORM_NAV.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={pathname === item.href}
                        />
                    ))}
                </>
            )}
        </nav>
    );
}

// ─── Account footer ───────────────────────────────────────────────────────────

// Sits under the nav in the sidebar and in the drawer. Sign Out used to exist
// only in the sidebar, so on a phone there was no way out of the admin console.
function AdminAccount({
    staffUser, onSignOut,
}: {
    staffUser: { name: string; role: string };
    onSignOut: () => void;
}) {
    return (
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
                onClick={onSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-gray hover:text-error hover:bg-error/10 text-sm font-medium font-body transition-all cursor-pointer"
            >
                <SignOutIcon size={16} weight="regular" className="shrink-0" />
                Sign Out
            </button>
        </div>
    );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { staffUser, isLoading, logout } = useStaffAuth();
    const [isSignOutOpen, setIsSignOutOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);

    // The drawer closes on the tap that navigates (see onNavigate below), not
    // on a pathname effect — `lint:hooks` gates the deploy and rejects setState
    // in an effect body. Escape is for the counter tablets, which have keyboards.
    useEffect(() => {
        if (!isNavOpen) return;
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setIsNavOpen(false); }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isNavOpen]);

    // Web Push + real-time cancel alerts
    usePushNotifications();
    const { branches } = useBranches();
    const branchIds = (branches ?? []).map((b: { id: number }) => b.id);
    useCancelRequestAlerts(branchIds);

    // Navigate when a push notification is clicked (service worker message)
    useEffect(() => {
        function onSWMessage(event: MessageEvent) {
            if (event.data?.type === 'PUSH_NOTIFICATION_CLICK' && event.data?.data?.url) {
                setIsNavOpen(false);
                router.push(event.data.data.url);
            }
        }
        navigator.serviceWorker?.addEventListener('message', onSWMessage);
        return () => navigator.serviceWorker?.removeEventListener('message', onSWMessage);
    }, [router]);

    // Redirect to login if not authenticated or not authorized
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
                <div className="flex items-center justify-between px-4 py-5 border-b border-[#f0e8d8]">
                    <div className="flex items-center gap-2.5">
                        <Image src="/cblogo.webp" alt="CediBites" width={40} height={40} className="shrink-0" priority />
                        <div>
                            <p className="font-brand text-primary text-lg leading-none">CediBites</p>
                            <p className="text-neutral-gray text-[10px] font-body mt-0.5 flex items-center gap-1">
                                <ShieldCheckIcon size={10} weight="fill" className="text-primary/70" />
                                Admin Console
                            </p>
                        </div>
                    </div>
                    <CancelRequestsBell />
                </div>

                {/* Nav */}
                <AdminNavList
                    staffUser={staffUser}
                    pathname={pathname}
                    className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto"
                />

                <AdminAccount staffUser={staffUser} onSignOut={() => setIsSignOutOpen(true)} />
            </aside>

            {/* ── Main area ─────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">

                {/* Mobile top bar */}
                <header className="md:hidden flex items-center justify-between px-4 py-3 bg-neutral-card border-b border-[#f0e8d8] sticky top-0 z-30">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setIsNavOpen(true)}
                            aria-label="Open menu"
                            aria-expanded={isNavOpen}
                            className="-ml-2 min-h-11 w-11 flex items-center justify-center rounded-xl text-neutral-gray hover:bg-neutral-light hover:text-text-dark transition-colors cursor-pointer"
                        >
                            <ListIcon size={22} weight="bold" />
                        </button>
                        <Image src="/cblogo.webp" alt="CediBites" width={24} height={24} />
                        <span className="font-brand text-primary text-base">CediBites</span>
                        <span className="text-neutral-gray text-xs font-body ml-1">Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CancelRequestsBell />
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

            {/* ── Nav drawer (mobile) ───────────────────────────────────────── */}
            {/* The bottom bar below holds five destinations. This holds all of
                them, which is the only way to reach Analytics, Campaigns,
                Platform and the rest from a phone. */}
            <div
                className={`md:hidden fixed inset-0 z-50 ${isNavOpen ? '' : 'pointer-events-none'}`}
                aria-hidden={!isNavOpen}
            >
                <button
                    type="button"
                    tabIndex={isNavOpen ? 0 : -1}
                    aria-label="Close menu"
                    onClick={() => setIsNavOpen(false)}
                    className={`absolute inset-0 bg-text-dark/40 transition-opacity duration-150 ease-out motion-reduce:transition-none ${isNavOpen ? 'opacity-100' : 'opacity-0'}`}
                />
                <div
                    className={`absolute inset-y-0 left-0 flex w-68 max-w-[85%] flex-col bg-neutral-card transition-transform duration-150 ease-out motion-reduce:transition-none ${isNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <div className="flex items-center justify-between px-4 py-5 border-b border-[#f0e8d8]">
                        <div className="flex items-center gap-2.5">
                            <Image src="/cblogo.webp" alt="CediBites" width={40} height={40} className="shrink-0" />
                            <div>
                                <p className="font-brand text-primary text-lg leading-none">CediBites</p>
                                <p className="text-neutral-gray text-[10px] font-body mt-0.5 flex items-center gap-1">
                                    <ShieldCheckIcon size={10} weight="fill" className="text-primary/70" />
                                    Admin Console
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            tabIndex={isNavOpen ? 0 : -1}
                            onClick={() => setIsNavOpen(false)}
                            aria-label="Close menu"
                            className="-mr-2 min-h-11 w-11 flex items-center justify-center rounded-xl text-neutral-gray hover:bg-neutral-light hover:text-text-dark transition-colors cursor-pointer"
                        >
                            <XIcon size={18} weight="bold" />
                        </button>
                    </div>

                    <AdminNavList
                        staffUser={staffUser}
                        pathname={pathname}
                        className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto"
                        onNavigate={() => setIsNavOpen(false)}
                    />

                    <AdminAccount
                        staffUser={staffUser}
                        onSignOut={() => { setIsNavOpen(false); setIsSignOutOpen(true); }}
                    />
                </div>
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
