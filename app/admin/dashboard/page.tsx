'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useAdminDashboard } from '@/lib/api/hooks/useAdminDashboard';
import { useAnalytics } from '@/lib/api/hooks/useAnalytics';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';
import Link from 'next/link';
import {
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    CircleNotchIcon,
    XCircleIcon,
    TrendUpIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowUpRightIcon,
    ListIcon,
    DownloadSimpleIcon,
    WifiHighIcon,
    DatabaseIcon,
    ClockIcon,
    CheckCircleIcon,
    TagIcon,
} from '@phosphor-icons/react';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { toast } from '@/lib/utils/toast';
import { exportElementToPdf } from '@/lib/utils/exportPdf';


function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function formatGHS(v: number) {
    return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type OrderSource = 'WhatsApp' | 'Phone' | 'Online' | 'POS' | 'Instagram' | 'Facebook';


const SOURCE_COLORS: Record<OrderSource, string> = {
    WhatsApp: 'bg-[#25D366]/10 text-[#128C7E]',
    Instagram: 'bg-pink-50 text-pink-600',
    Facebook: 'bg-blue-50 text-blue-600',
    Phone: 'bg-neutral-light text-neutral-gray',
    Online: 'bg-primary/10 text-primary',
    POS: 'bg-secondary/10 text-secondary',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
    icon: Icon,
    label,
    value,
    trend,
    sub,
    subAlert,
    accent = false,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    trend?: number;
    sub?: string;
    subAlert?: string;
    accent?: boolean;
}) {
    const up = (trend ?? 0) >= 0;
    return (
        <div className={`rounded-2xl px-5 py-4 flex flex-col gap-2 ${accent ? 'bg-primary' : 'bg-neutral-card border border-[#f0e8d8]'}`}>
            <div className="flex items-center gap-2">
                <Icon size={14} weight="fill" className={accent ? 'text-white/70' : 'text-neutral-gray'} />
                <span className={`text-[10px] font-bold font-body uppercase tracking-widest ${accent ? 'text-white/80' : 'text-neutral-gray'}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold font-body leading-none ${accent ? 'text-white' : 'text-text-dark'}`}>{value}</p>
            {sub && <p className={`text-xs font-body ${accent ? 'text-white/70' : 'text-neutral-gray'}`}>{sub}</p>}
            {subAlert && <p className="text-xs font-semibold font-body text-orange-500">{subAlert}</p>}
            {trend !== undefined && (
                <div className="flex items-center gap-1">
                    {up
                        ? <ArrowUpIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-secondary'} />
                        : <ArrowDownIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-error'} />
                    }
                    <span className={`text-xs font-semibold font-body ${accent ? 'text-white/80' : (up ? 'text-secondary' : 'text-error')}`}>
                        {Math.abs(trend)}% vs last week
                    </span>
                </div>
            )}
        </div>
    );
}

function BranchStatusDot({ status }: { status: 'open' | 'closed' | 'busy' }) {
    const cfg = {
        open: { color: 'bg-secondary', label: 'Open' },
        closed: { color: 'bg-error', label: 'Closed' },
        busy: { color: 'bg-warning', label: 'Busy' },
    }[status];
    return (
        <span className="inline-flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${cfg.color} animate-pulse`} />
            <span className="text-[10px] font-body font-medium text-neutral-gray">{cfg.label}</span>
        </span>
    );
}

function SourceBadge({ source }: { source: OrderSource }) {
    return (
        <span className={`text-[10px] font-medium font-body px-2 py-0.5 rounded-full ${SOURCE_COLORS[source]}`}>
            {source}
        </span>
    );
}

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

export default function AdminDashboardPage() {
    const exportRef = useRef<HTMLDivElement>(null);
    const [_refresh] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const { orders } = useOrderStore();
    const { userName, kpis, branches, liveOrders, isLoading } = useAdminDashboard();
    const { sales } = useAnalytics('week');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    useEffect(() => {
        setMounted(true);
    }, []);

    const startOfDay = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }, []);

    const liveKpis = useMemo(() => {
        const todayOrders = orders.filter(o => o.placedAt >= startOfDay);
        const cancelledToday = todayOrders.filter(o => o.status === 'cancelled' || o.status === 'cancel_requested');
        const activeStatuses = new Set(['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'ready_for_pickup', 'cancel_requested']);
        return {
            revenueToday: todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
            ordersToday: todayOrders.length,
            activeOrders: todayOrders.filter(o => activeStatuses.has(o.status)).length,
            cancelledToday: cancelledToday.length,
            cancelledValue: cancelledToday.reduce((s, o) => s + o.total, 0),
            cancelReqCount: orders.filter(o => o.status === 'cancel_requested').length,
        };
    }, [orders, startOfDay]);

    const displayKpis = {
        revenueToday: kpis?.revenue_today ?? liveKpis.revenueToday,
        ordersToday: kpis?.orders_today ?? liveKpis.ordersToday,
        activeOrders: kpis?.active_orders ?? liveKpis.activeOrders,
        cancelledToday: kpis?.cancelled_today ?? liveKpis.cancelledToday,
    };

    async function handleExportPdf(): Promise<void> {
        if (!exportRef.current || isExporting) {
            return;
        }

        setIsExporting(true);
        try {
            const filename = `dashboard-${new Date().toISOString().slice(0, 10)}.pdf`;
            await exportElementToPdf({
                element: exportRef.current,
                filename,
            });
            toast.success('Dashboard exported as PDF');
        } catch (error) {
            console.error('Failed to export dashboard PDF:', error);
            toast.error('Failed to export dashboard report');
        } finally {
            setIsExporting(false);
        }
    }

    // Prevent hydration mismatch by only showing dynamic content after mount
    if (!mounted) {
        return (
            <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-7">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={exportRef} className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">
                        {greeting()}, {userName}
                    </h1>
                    <p className="text-neutral-gray text-sm font-body mt-1 flex items-center gap-2">
                        {dateStr}
                        <span className="inline-flex items-center gap-1 text-neutral-gray">
                            <span className="w-2 h-2 rounded-full bg-secondary" />
                            {branches.length} active branches
                        </span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void handleExportPdf()}
                    disabled={isExporting}
                    data-export-ignore
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <DownloadSimpleIcon size={16} weight="bold" className="text-primary" />
                    {isExporting ? 'Exporting…' : 'Export PDF'}
                </button>
            </div>

            {/* ── Cross-branch KPI row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-7">
                <KpiCard icon={CurrencyCircleDollarIcon} label="Revenue Today" value={isLoading ? '…' : formatGHS(displayKpis.revenueToday)} accent />
                <KpiCard icon={ReceiptIcon} label="Orders Today" value={isLoading ? '…' : String(displayKpis.ordersToday)} />
                <KpiCard icon={CircleNotchIcon} label="Active Now" value={isLoading ? '…' : String(displayKpis.activeOrders)} />
                <KpiCard
                    icon={XCircleIcon}
                    label="Cancelled Today"
                    value={isLoading ? '…' : String(displayKpis.cancelledToday)}
                    sub={(kpis?.cancelled_revenue_today ?? liveKpis.cancelledValue) > 0 ? formatGHS(kpis?.cancelled_revenue_today ?? liveKpis.cancelledValue) + ' lost' : undefined}
                    subAlert={liveKpis.cancelReqCount > 0 ? `${liveKpis.cancelReqCount} pending approval` : undefined}
                />
                <KpiCard
                    icon={TagIcon}
                    label="No Charge Today"
                    value={isLoading ? '…' : String(kpis?.no_charge_today ?? 0)}
                    sub={(kpis?.no_charge_today_amount ?? 0) > 0 ? formatGHS(kpis?.no_charge_today_amount ?? 0) + ' waived' : undefined}
                />
            </div>

            {/* ── Branch performance strip ─────────────────────────────────────── */}
            <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-text-dark font-bold text-sm font-body uppercase tracking-wider">Branch Performance</h2>
                    <Link
                        href="/admin/branches"
                        data-export-ignore
                        className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors"
                    >
                        <ArrowUpRightIcon size={13} weight="bold" />
                        Manage branches
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {branches.map((branch) => (
                        <Link
                            key={branch.id}
                            href={`/admin/analytics?branch=${branch.id}`}
                            className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-4 flex flex-col gap-2 hover:border-primary/30 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-text-dark text-sm font-bold font-body">{branch.name}</span>
                                <BranchStatusDot status={(branch.status as 'open') || 'open'} />
                            </div>
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-primary text-lg font-bold font-body leading-none">{formatGHS(branch.revenue_today ?? 0)}</p>
                                    <p className="text-neutral-gray text-xs font-body mt-1">{branch.orders_today ?? 0} orders today</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Revenue chart (7-day) ────────────────────────────────────────── */}
            <RevenueChart salesByDay={sales?.sales_by_day} />

            {/* ── Live order feed ──────────────────────────────────────────────── */}
            <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-text-dark font-bold text-sm font-body uppercase tracking-wider">Live Order Feed</h2>
                    <Link
                        href="/admin/orders"
                        data-export-ignore
                        className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors"
                    >
                        <ListIcon size={13} />
                        View all orders
                    </Link>
                </div>
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1.2fr_0.9fr_1fr_1fr] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                        {['Customer', 'Branch', 'Source', 'Status', 'Staff', 'Time', 'Amount'].map(h => (
                            <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                        ))}
                    </div>
                    {liveOrders.length === 0 && !isLoading ? (
                        <div className="px-4 py-8 text-center text-neutral-gray text-sm font-body">No active orders</div>
                    ) : (
                        liveOrders.map((order, i) => (
                            <div
                                key={order.id}
                                className={`px-4 py-3 flex flex-col md:grid md:grid-cols-[1.5fr_1fr_1fr_1.2fr_0.9fr_1fr_1fr] gap-2 md:gap-4 md:items-center hover:bg-neutral-light/60 transition-colors ${i < liveOrders.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                            >
                                <div className="min-w-0">
                                    <p className="text-text-dark text-sm font-semibold font-body truncate">{order.customer}</p>
                                    <p className="text-neutral-gray text-xs font-body">#{order.id}</p>
                                </div>
                                <span className="text-text-dark text-xs font-body">{order.branch}</span>
                                <SourceBadge source={order.source as OrderSource} />
                                <StatusDot status={order.status} />
                                <span className="text-text-dark text-xs font-body truncate">{order.assigned_employee ?? '—'}</span>
                                <span className="text-neutral-gray text-xs font-body">{order.time_ago} ago</span>
                                <span className="text-text-dark text-sm font-bold font-body">₵{order.amount}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── System health ────────────────────────────────────────────────── */}
            <SystemHealth
                activeBranches={branches.length}
                activeOrders={displayKpis.activeOrders}
                liveOrdersCount={liveOrders.length}
                lastOrderAge={liveOrders[0]?.time_ago ?? null}
            />

        </div>
    );
}

// ─── Revenue chart ────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function RevenueChart({ salesByDay }: { salesByDay?: Array<{ date: string; total: number; orders: number }> }) {
    const weekTotal = salesByDay?.length
        ? salesByDay.reduce((s, d) => s + Number(d.total), 0)
        : 0;

    const dayLabels = salesByDay?.length
        ? salesByDay.map((d) => DAYS[(new Date(d.date).getDay() + 6) % 7] ?? d.date)
        : DAYS;
    const values = salesByDay?.length
        ? salesByDay.map((d) => Number(d.total))
        : DAYS.map(() => 0);
    const chartMax = Math.max(...values, 1);

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-7">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <p className="text-text-dark text-sm font-bold font-body">Revenue — All Branches (7 days)</p>
                    <p className="text-primary text-base font-bold font-body mt-0.5">{formatGHS(weekTotal)}</p>
                </div>
            </div>

            <div className="flex items-end gap-2 h-32">
                {dayLabels.map((day, di) => {
                    const val = values[di] ?? 0;
                    const h = Math.round((val / chartMax) * 112) || 4;
                    const compactLabel = val === 0 ? null : val >= 1000 ? `₵${(val / 1000).toFixed(1)}k` : `₵${val}`;
                    return (
                        <div key={`${day}-${di}`} className="flex-1 flex flex-col items-center gap-1 relative group">
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-brand-dark text-white text-[10px] font-semibold font-body px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {formatGHS(val)}
                            </div>
                            <div className="w-full rounded-sm bg-primary/85 relative flex items-start justify-center overflow-hidden" style={{ height: h, minHeight: 4, transition: 'height 0.3s ease' }}>
                                {compactLabel && h > 18 && (
                                    <span className="text-[8px] text-white font-bold font-body leading-none mt-1 select-none">{compactLabel}</span>
                                )}
                            </div>
                            <span className="text-[9px] text-neutral-gray font-body">{day}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── System health panel ──────────────────────────────────────────────────────

function SystemHealth({
    activeBranches,
    activeOrders,
    liveOrdersCount,
    lastOrderAge,
}: {
    activeBranches: number;
    activeOrders: number;
    liveOrdersCount: number;
    lastOrderAge: string | null;
}) {
    const items = [
        { icon: CheckCircleIcon, label: 'Active Branches', value: String(activeBranches), color: 'text-secondary' },
        { icon: WifiHighIcon, label: 'Live Feed', value: `${liveOrdersCount} orders`, color: 'text-secondary' },
        { icon: DatabaseIcon, label: 'Active Orders', value: String(activeOrders), color: 'text-secondary' },
        { icon: ClockIcon, label: 'Last order', value: lastOrderAge ? `${lastOrderAge} ago` : 'No recent orders', color: 'text-neutral-gray' },
    ];
    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-4 flex flex-wrap gap-4">
            <p className="text-neutral-gray text-xs font-bold font-body uppercase tracking-wider w-full mb-1">System Health</p>
            {items.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                    <Icon size={14} weight="fill" className={color} />
                    <span className="text-neutral-gray text-xs font-body">{label}:</span>
                    <span className={`text-xs font-semibold font-body ${color}`}>{value}</span>
                </div>
            ))}
        </div>
    );
}
