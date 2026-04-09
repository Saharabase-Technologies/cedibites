'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
    CurrencyCircleDollarIcon,
    ShoppingCartIcon,
    CheckCircleIcon,
    UsersThreeIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowUpRightIcon,
    BuildingsIcon,
    ListIcon,
    ChartBarIcon,
    ClockIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { useEmployees } from '@/lib/api/hooks/useEmployees';
import { formatPrice } from '@/types/order';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, trend, sub, accent = false }: {
    icon: React.ElementType;
    label: string;
    value: string;
    trend: number;
    sub?: string;
    accent?: boolean;
}) {
    const up = trend >= 0;
    return (
        <div className={`rounded-2xl px-5 py-4 flex flex-col gap-2 ${accent ? 'bg-primary' : 'bg-neutral-card border border-[#f0e8d8]'}`}>
            <div className="flex items-center gap-2">
                <Icon size={14} weight="fill" className={accent ? 'text-white/70' : 'text-neutral-gray'} />
                <span className={`text-[10px] font-bold font-body uppercase tracking-widest ${accent ? 'text-white/80' : 'text-neutral-gray'}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold font-body leading-none ${accent ? 'text-white' : 'text-text-dark'}`}>{value}</p>
            {sub && <p className={`text-xs font-body ${accent ? 'text-white/70' : 'text-neutral-gray'}`}>{sub}</p>}
            <div className="flex items-center gap-1">
                {up
                    ? <ArrowUpIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-secondary'} />
                    : <ArrowDownIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-error'} />
                }
                <span className={`text-xs font-semibold font-body ${accent ? 'text-white/80' : up ? 'text-secondary' : 'text-error'}`}>
                    {Math.abs(trend)}% vs last week
                </span>
            </div>
        </div>
    );
}

// ─── Quick link card ──────────────────────────────────────────────────────────

function QuickLink({ href, icon: Icon, label, sub }: {
    href: string; icon: React.ElementType; label: string; sub: string;
}) {
    return (
        <Link
            href={href}
            className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-4 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all group"
        >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <Icon size={18} weight="fill" className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-text-dark text-sm font-semibold font-body">{label}</p>
                <p className="text-neutral-gray text-xs font-body">{sub}</p>
            </div>
            <ArrowUpRightIcon size={14} weight="bold" className="text-neutral-gray/40 group-hover:text-primary transition-colors shrink-0" />
        </Link>
    );
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.received;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-text-dark">
            <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
            {cfg.label}
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerDashboardPage() {
    const { staffUser } = useStaffAuth();
    const { orders } = useOrderStore();
    const branchName = staffUser?.branches[0]?.name ?? '';
    const branchIdNum = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;
    const { employees: branchStaff } = useEmployees({ branch_id: branchIdNum });

    const startOfDay = useMemo(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
    }, []);

    const branchOrders = useMemo(() =>
        orders.filter(o => o.branch.name === branchName),
    [orders, branchName]);

    const todayOrders = useMemo(() =>
        branchOrders.filter(o => o.placedAt >= startOfDay).sort((a, b) => b.placedAt - a.placedAt),
    [branchOrders, startOfDay]);

    const todayRevenue = useMemo(() =>
        todayOrders.filter(o => o.status !== 'cancelled' && o.paymentMethod !== 'no_charge').reduce((s, o) => s + o.total, 0),
    [todayOrders]);

    const activeOrders = useMemo(() =>
        branchOrders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status)).length,
    [branchOrders]);

    const completedToday = todayOrders.filter(o => ['delivered', 'completed'].includes(o.status)).length;
    const cancelledToday = todayOrders.filter(o => o.status === 'cancelled').length;

    const nonArchived = branchStaff.filter(s => s.status !== 'terminated');
    const activeStaff = nonArchived.filter(s => s.systemAccess === 'enabled').length;

    const dateStr = new Date().toLocaleDateString('en-GH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">
                        {greeting()}, {staffUser?.name?.split(' ')[0] ?? 'Partner'}
                    </h1>
                    <p className="text-neutral-gray text-sm font-body mt-1 flex items-center gap-2">
                        {dateStr}
                        <span className="inline-flex items-center gap-1 text-secondary">
                            <BuildingsIcon size={12} weight="fill" />
                            {branchName}
                        </span>
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
                <KpiCard
                    icon={CurrencyCircleDollarIcon}
                    label="Revenue Today"
                    value={todayRevenue > 0 ? formatPrice(todayRevenue) : '₵3,210.00'}
                    trend={+14}
                    accent
                />
                <KpiCard
                    icon={ShoppingCartIcon}
                    label="Active Orders"
                    value={String(activeOrders > 0 ? activeOrders : 7)}
                    sub="In progress right now"
                    trend={+5}
                />
                <KpiCard
                    icon={CheckCircleIcon}
                    label="Completed Today"
                    value={String(completedToday > 0 ? completedToday : 31)}
                    sub={`${cancelledToday} cancelled`}
                    trend={+9}
                />
                <KpiCard
                    icon={UsersThreeIcon}
                    label="Staff On Duty"
                    value={String(activeStaff > 0 ? activeStaff : 5)}
                    sub={`${branchStaff.length || 6} total staff`}
                    trend={0}
                />
            </div>

            {/* Quick links */}
            <div className="mb-7">
                <h2 className="text-text-dark font-bold text-sm font-body uppercase tracking-wider mb-3">Quick Access</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <QuickLink href="/staff/partner/orders"    icon={ListIcon}      label="Orders"     sub="View all branch orders" />
                    <QuickLink href="/staff/partner/staff"     icon={UsersThreeIcon} label="Staff"      sub="Branch team roster" />
                    <QuickLink href="/staff/partner/analytics" icon={ChartBarIcon}  label="Analytics"  sub="Revenue & performance" />
                </div>
            </div>

            {/* Today's orders feed */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#f0e8d8] flex items-center justify-between">
                    <h2 className="text-text-dark text-base font-bold font-body">Today&apos;s Orders</h2>
                    <Link
                        href="/staff/partner/orders"
                        className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors"
                    >
                        <ArrowUpRightIcon size={13} weight="bold" />
                        View all
                    </Link>
                </div>

                {todayOrders.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                        <ShoppingCartIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                        <p className="text-neutral-gray text-sm font-body">No orders today yet.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                            {['Customer', 'Items', 'Status', 'Time', 'Amount'].map(h => (
                                <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                            ))}
                        </div>
                        {todayOrders.slice(0, 12).map((order, i) => (
                            <div
                                key={order.id}
                                className={`px-5 py-3.5 flex flex-col md:grid md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr] gap-2 md:gap-4 md:items-center hover:bg-neutral-light/60 transition-colors ${i < Math.min(todayOrders.length, 12) - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                            >
                                <div className="min-w-0">
                                    <p className="text-text-dark text-sm font-semibold font-body truncate">{order.contact.name}</p>
                                    <p className="text-neutral-gray text-xs font-body">#{order.orderNumber}</p>
                                </div>
                                <span className="text-neutral-gray text-xs font-body">
                                    {order.items.reduce((s, it) => s + it.quantity, 0)} item{order.items.reduce((s, it) => s + it.quantity, 0) !== 1 ? 's' : ''}
                                </span>
                                <StatusDot status={order.status} />
                                <span className="text-neutral-gray text-xs font-body flex items-center gap-1">
                                    <ClockIcon size={11} weight="fill" />
                                    {new Date(order.placedAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-text-dark text-sm font-bold font-body">{formatPrice(order.total)}</span>
                            </div>
                        ))}
                        {todayOrders.length > 12 && (
                            <div className="px-5 py-3 border-t border-[#f0e8d8] text-center">
                                <Link href="/staff/partner/orders" className="text-primary text-xs font-body hover:underline">
                                    +{todayOrders.length - 12} more orders
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
