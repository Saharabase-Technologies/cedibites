'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    SquaresFourIcon,
    ListIcon,
    BuildingsIcon,
    UserCircleIcon,
    ChartBarIcon,
    SignOutIcon,
    CaretRightIcon,
    CaretDownIcon,
    CheckIcon,
    ShieldCheckIcon,
} from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { StaffAuthProvider, useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { PartnerScopeProvider, usePartnerScope, type PartnerScope } from '@/app/components/providers/PartnerScopeProvider';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';

// ─── Nav ──────────────────────────────────────────────────────────────────────

const PARTNER_NAV = [
    { href: '/partner/dashboard', label: 'Dashboard',  icon: SquaresFourIcon },
    { href: '/partner/orders',    label: 'Orders',     icon: ListIcon        },
    { href: '/partner/branch',    label: 'My Branch',  icon: BuildingsIcon   },
    { href: '/partner/analytics', label: 'Analytics',  icon: ChartBarIcon    },
    { href: '/partner/profile',   label: 'Profile',    icon: UserCircleIcon  },
];

const BOTTOM_NAV = PARTNER_NAV; // All 5 in bottom nav

// ─── Sidebar link ─────────────────────────────────────────────────────────────

function SidebarLink({ href, label, icon: Icon, active }: {
    href: string; label: string; icon: React.ElementType; active: boolean;
}) {
    return (
        <Link
            href={href}
            className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-body transition-all duration-150 ${
                active
                    ? 'bg-primary text-white font-bold shadow-sm shadow-primary/25'
                    : 'text-text-dark/80 font-semibold hover:bg-neutral-light hover:text-text-dark'
            }`}
        >
            <Icon size={19} weight={active ? 'fill' : 'bold'} className="shrink-0" />
            <span className="tracking-tight">{label}</span>
            {active && <CaretRightIcon size={13} weight="bold" className="ml-auto text-white/70" />}
        </Link>
    );
}

// ─── Bottom nav link ──────────────────────────────────────────────────────────

function BottomNavLink({ href, label, icon: Icon, active }: {
    href: string; label: string; icon: React.ElementType; active: boolean;
}) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center gap-1 flex-1 py-1.5"
        >
            <span className={`flex items-center justify-center w-11 h-7 rounded-full transition-colors ${active ? 'bg-primary/12' : ''}`}>
                <Icon size={21} weight={active ? 'fill' : 'bold'} className={active ? 'text-primary' : 'text-text-dark/55'} />
            </span>
            <span className={`text-[11px] font-body transition-colors ${active ? 'text-primary font-bold' : 'text-text-dark/60 font-semibold'}`}>{label}</span>
        </Link>
    );
}

// ─── Branch scope switcher ────────────────────────────────────────────────────

function ScopeSwitcher() {
    const { branches, hasMultiple, scope, setScope, scopeLabel } = usePartnerScope();
    const [open, setOpen] = useState(false);

    if (branches.length === 0) return null;

    // Single branch — static chip, no switching needed.
    if (!hasMultiple) {
        return (
            <div className="mx-3 mt-3 flex items-center gap-2 px-3 py-2.5 bg-primary/10 rounded-xl border border-primary/20">
                <BuildingsIcon size={14} weight="fill" className="text-primary shrink-0" />
                <span className="text-primary text-[13px] font-bold font-body truncate">{scopeLabel}</span>
            </div>
        );
    }

    const options: { value: PartnerScope; label: string }[] = [
        { value: 'all', label: 'All Branches' },
        ...branches.map(b => ({ value: b.id as PartnerScope, label: b.name })),
    ];

    return (
        <div className="relative mx-3 mt-3">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-primary/10 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
            >
                <BuildingsIcon size={14} weight="fill" className="text-primary shrink-0" />
                <span className="text-primary text-[13px] font-bold font-body truncate flex-1 text-left">{scopeLabel}</span>
                <CaretDownIcon size={12} weight="bold" className={`text-primary/70 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden="true" />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-neutral-card border border-[#f0e8d8] rounded-xl shadow-lg overflow-hidden py-1">
                        {options.map(opt => {
                            const active = opt.value === scope;
                            return (
                                <button
                                    key={String(opt.value)}
                                    type="button"
                                    onClick={() => { setScope(opt.value); setOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] font-body transition-colors cursor-pointer ${active ? 'text-primary font-semibold bg-primary/5' : 'text-text-dark/75 font-medium hover:bg-neutral-light'}`}
                                >
                                    <span className="truncate flex-1">{opt.label}</span>
                                    {active && <CheckIcon size={13} weight="bold" className="text-primary shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Inner shell ──────────────────────────────────────────────────────────────

function PartnerShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { staffUser, isLoading, logout } = useStaffAuth();
    const { scopeLabel } = usePartnerScope();
    const [isSignOutOpen, setIsSignOutOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && (!staffUser || !staffUser.permissions?.includes('access_partner_portal'))) {
            router.replace('/staff/login');
        }
    }, [isLoading, staffUser, router]);

    if (isLoading || !staffUser || !staffUser.permissions?.includes('access_partner_portal')) return null;

    const initials = staffUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div className="h-screen overflow-hidden bg-neutral-light w-full flex">

            {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
            <aside className="hidden md:flex flex-col w-60 shrink-0 bg-neutral-card border-r border-[#f0e8d8] sticky top-0 h-screen">

                {/* Logo + subtitle */}
                <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#f0e8d8]">
                    <Image src="/cblogo.webp" alt="CediBites" width={40} height={40} className="shrink-0" priority />
                    <div>
                        <p className="font-brand text-primary text-lg leading-none">CediBites</p>
                        <p className="text-text-dark/70 text-[10px] font-body font-semibold uppercase tracking-wider mt-1 flex items-center gap-1">
                            <ShieldCheckIcon size={11} weight="fill" className="text-primary" />
                            Partner Portal
                        </p>
                    </div>
                </div>

                {/* Branch scope switcher */}
                <ScopeSwitcher />

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
                    {PARTNER_NAV.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={pathname === item.href || pathname.startsWith(item.href + '/')}
                        />
                    ))}
                </nav>

                {/* Identity + sign out */}
                <div className="px-3 py-4 border-t border-[#f0e8d8]">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1.5 bg-neutral-light rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-primary text-xs font-bold font-body">{initials}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-text-dark text-[13px] font-bold font-body truncate">{staffUser.name}</p>
                            <p className="text-neutral-gray text-[10px] font-semibold font-body uppercase tracking-wider truncate">Branch Partner</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsSignOutOpen(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-text-dark/70 hover:text-error hover:bg-error/10 text-[13px] font-semibold font-body transition-all cursor-pointer"
                    >
                        <SignOutIcon size={16} weight="regular" className="shrink-0" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main area ─────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">

                {/* Mobile top bar */}
                <header className="md:hidden flex items-center justify-between px-4 py-3.5 bg-neutral-card border-b border-[#f0e8d8] sticky top-0 z-30">
                    <div className="flex items-center gap-2.5">
                        <Image src="/cblogo.webp" alt="CediBites" width={36} height={36} priority className="shrink-0" />
                        <div className="leading-none">
                            <span className="font-brand text-primary text-2xl">CediBites</span>
                            <span className="block text-neutral-gray text-[10px] font-body font-bold uppercase tracking-widest mt-0.5">Partner Portal</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-neutral-gray text-xs font-body hidden sm:block">{scopeLabel}</span>
                        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                            <span className="text-primary text-xs font-bold font-body">{initials}</span>
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

// ─── Layout root (provides StaffAuthProvider) ─────────────────────────────────

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
    return (
        <StaffAuthProvider>
            <PartnerScopeProvider>
                <PartnerShell>{children}</PartnerShell>
            </PartnerScopeProvider>
        </StaffAuthProvider>
    );
}
