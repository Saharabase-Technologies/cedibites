'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    ListIcon,
    ChartBarIcon,
    ForkKnifeIcon,
    UsersThreeIcon,
    CircleNotchIcon,
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    XCircleIcon,
    ArrowUpRightIcon,
    XIcon,
    PhoneIcon,
    MapPinIcon,
    ClockIcon,
    SpinnerIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranchStats, useBranchTopItems, useBranchRevenueChart } from '@/lib/api/hooks/useBranches';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { mapApiOrderToAdminOrder, type AdminOrder } from '@/lib/api/adapters/order.adapter';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import { useRequestCancel } from '@/lib/api/hooks/useOrders';
import CancelOrderModal from '@/app/components/ui/CancelOrderModal';
import { toast } from '@/lib/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) {
    return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="bg-neutral-card border border-brown-light/15 rounded-2xl px-4 py-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Icon size={14} weight="fill" className="text-neutral-gray shrink-0" />
                <span className="text-neutral-gray text-sm font-bold font-body">{label}</span>
            </div>
            <p className="text-3xl font-bold font-body leading-none text-text-dark">{value}</p>
            {sub && <p className="text-neutral-gray text-xs font-body">{sub}</p>}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.received;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-text-dark">
            <span className={`h-2 w-2 rounded-full shrink-0 ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`} />
            {config.label}
        </span>
    );
}

function QuickLinkCard({
    href,
    icon: Icon,
    label,
    sub,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    sub: string;
}) {
    return (
        <Link
            href={href}
            className="
                bg-neutral-card border border-brown-light/30
                rounded-2xl px-4 py-4 flex items-center gap-3
                hover:border-brown-light/60 hover:bg-brown-light/5
                transition-colors group
            "
        >
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Icon size={18} weight="fill" className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-text-dark text-sm font-semibold font-body">{label}</p>
                <p className="text-neutral-gray text-xs font-body truncate">{sub}</p>
            </div>
            <ArrowUpRightIcon size={16} weight="bold" className="text-neutral-gray/50 group-hover:text-neutral-gray transition-colors shrink-0" />
        </Link>
    );
}

// ─── Order Detail Panel (inline drawer) ───────────────────────────────────────

function DashboardOrderPanel({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const { requestCancel } = useRequestCancel();
    const queryClient = useQueryClient();

    const subtotal = order.items.reduce((s, i) => s + i.qty * i.price, 0);
    const isTerminal = ['completed', 'delivered', 'cancelled'].includes(order.status);

    const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
        received:         { dot: 'bg-neutral-gray', label: 'Received' },
        preparing:        { dot: 'bg-primary',      label: 'Preparing' },
        ready:            { dot: 'bg-secondary',    label: 'Ready' },
        ready_for_pickup: { dot: 'bg-teal-600',     label: 'Ready for Pickup' },
        out_for_delivery: { dot: 'bg-teal-600',     label: 'Out for Delivery' },
        delivered:        { dot: 'bg-secondary',    label: 'Delivered' },
        completed:        { dot: 'bg-secondary',    label: 'Completed' },
        cancel_requested: { dot: 'bg-orange-400',   label: 'Cancel Requested' },
    };

    const ALLOWED_STATUSES = Object.keys(STATUS_STYLES);

    async function overrideStatus(newStatus: string): Promise<void> {
        setUpdatingStatus(true);
        try {
            await apiClient.patch(`/employee/orders/${order.dbId}/status`, { status: newStatus });
            queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
            setShowStatusPicker(false);
            toast.success('Order status updated');
        } catch { toast.error('Failed to update status'); }
        finally { setUpdatingStatus(false); }
    }

    return (
        <>
            <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" onClick={onClose} />
            <aside className="fixed right-0 top-0 h-full z-40 w-full max-w-md bg-neutral-card border-l border-[#f0e8d8] flex flex-col shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8d8]">
                    <div>
                        <p className="text-text-dark text-sm font-bold font-body">#{order.id}</p>
                        <p className="text-neutral-gray text-xs font-body">{order.placedAtFull}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light transition-colors cursor-pointer">
                            <XIcon size={16} className="text-neutral-gray" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Customer</p>
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-1.5">
                            <p className="text-text-dark text-sm font-semibold font-body">{order.customer}</p>
                            <a href={`tel:${order.phone}`} className="text-primary text-xs font-body flex items-center gap-1.5 hover:underline">
                                <PhoneIcon size={12} weight="fill" />{order.phone}
                            </a>
                            {order.address && order.address !== '—' && (
                                <div className="flex items-start gap-1.5 mt-0.5">
                                    <MapPinIcon size={12} weight="fill" className="text-neutral-gray mt-0.5 shrink-0" />
                                    <p className="text-neutral-gray text-xs font-body">{order.address}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1 bg-neutral-light rounded-xl p-3">
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">Source</p>
                            <p className="text-text-dark text-xs font-semibold font-body">{order.source}</p>
                        </div>
                        {order.assignedEmployee && (
                            <div className="flex-1 bg-neutral-light rounded-xl p-3">
                                <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">Staff</p>
                                <p className="text-text-dark text-xs font-semibold font-body">{order.assignedEmployee}</p>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Items</p>
                        <div className="bg-neutral-light rounded-xl overflow-hidden">
                            {order.items.map((item, i) => (
                                <div key={i} className={`flex justify-between px-3 py-2.5 ${i < order.items.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                    <span className="text-text-dark text-xs font-body">{item.qty}× {getOrderItemLineLabel({ name: item.name, sizeLabel: item.sizeLabel })}</span>
                                    <span className="text-text-dark text-xs font-bold font-body">{formatGHS(item.qty * item.price)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between px-3 py-2.5 border-t border-[#f0e8d8] bg-neutral-card">
                                <span className="text-text-dark text-xs font-bold font-body">Total</span>
                                <span className="text-primary text-sm font-bold font-body">{formatGHS(subtotal)}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Payment</p>
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-1.5">
                            <div className="flex justify-between"><span className="text-neutral-gray text-xs font-body">Method</span><span className="text-text-dark text-xs font-semibold font-body">{order.payment}</span></div>
                            <div className="flex justify-between"><span className="text-neutral-gray text-xs font-body">Status</span>
                                <span className={`text-xs font-semibold font-body capitalize ${order.paymentStatus === 'paid' ? 'text-secondary' : order.paymentStatus === 'failed' ? 'text-error' : order.paymentStatus === 'pending' ? 'text-warning' : order.paymentStatus === 'refunded' ? 'text-blue-600' : 'text-neutral-gray'}`}>
                                    {order.paymentStatus === 'no_charge' ? 'No Charge' : order.paymentStatus}
                                </span>
                            </div>
                            <div className="flex justify-between"><span className="text-neutral-gray text-xs font-body">Order Total</span><span className="text-text-dark text-xs font-semibold font-body">{formatGHS(order.amount)}</span></div>
                            <div className="flex justify-between"><span className="text-neutral-gray text-xs font-body">Amount Paid</span><span className="text-primary text-xs font-bold font-body">{formatGHS(order.amountPaid)}</span></div>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Timeline</p>
                        <div className="flex flex-col gap-0">
                            {order.timeline.map((ev, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                        {i < order.timeline.length - 1 && <div className="w-0.5 h-6 bg-[#f0e8d8]" />}
                                    </div>
                                    <div className="pb-3">
                                        <p className="text-text-dark text-xs font-semibold font-body">{ev.status}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">{ev.at} · {ev.by}{ev.byName ? ` (${ev.byName})` : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="border-t border-[#f0e8d8] p-4 flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Actions</p>
                    {order.status === 'cancel_requested' && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                            <p className="text-xs font-bold text-orange-700 font-body">Cancel Requested</p>
                            <p className="text-xs text-neutral-gray font-body italic">Waiting for admin approval</p>
                        </div>
                    )}
                    {showStatusPicker && (
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-2">
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Update Status</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {ALLOWED_STATUSES.filter(s => s !== order.status).map(s => (
                                    <button key={s} type="button" disabled={updatingStatus} onClick={() => overrideStatus(s)}
                                        className="flex items-center gap-1.5 px-2.5 py-2 bg-neutral-card border border-[#f0e8d8] rounded-lg text-text-dark text-xs font-medium font-body hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                                        <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_STYLES[s]?.dot ?? 'bg-neutral-gray'}`} />{STATUS_STYLES[s]?.label ?? s}
                                    </button>
                                ))}
                            </div>
                            <button type="button" onClick={() => setShowStatusPicker(false)} className="text-xs text-neutral-gray font-body hover:text-text-dark transition-colors text-left cursor-pointer">Cancel</button>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setShowStatusPicker(v => !v)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                            <ClockIcon size={13} weight="bold" className="text-primary" />Update Status
                        </button>
                        {!isTerminal && order.status !== 'cancel_requested' ? (
                            <button type="button" onClick={() => setShowConfirm(true)} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-error/10 rounded-xl text-error text-xs font-medium font-body hover:bg-error/20 transition-colors cursor-pointer">
                                <XCircleIcon size={13} weight="bold" />Request Cancel
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-neutral-gray text-xs font-medium font-body opacity-40 cursor-not-allowed">
                                <XCircleIcon size={13} weight="bold" />Request Cancel
                            </div>
                        )}
                    </div>
                </div>
            </aside>
            {showConfirm && (
                <CancelOrderModal orderNumber={order.id} theme="light" context="staff" onCancel={() => setShowConfirm(false)}
                    onConfirm={async (reason) => { await requestCancel({ id: order.dbId, reason }); queryClient.invalidateQueries({ queryKey: ['employee-orders'] }); toast.success('Cancellation requested'); }} />
            )}
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : null;
    const { stats } = useBranchStats(branchId, true);
    const { topItems } = useBranchTopItems(branchId, { date: 'today', limit: 5 });
    const { chartData } = useBranchRevenueChart(branchId, { period: 'week' });
    const { orders: rawOrders } = useEmployeeOrders({
        branch_id: branchId ?? undefined,
        status: ['received', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery', 'cancel_requested'],
        per_page: 5,
    });

    const orders = useMemo(() => rawOrders.map(mapApiOrderToAdminOrder), [rawOrders]);

    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const handleOrderClick = useCallback((order: AdminOrder) => setSelectedOrder(order), []);
    const handleCloseDrawer = useCallback(() => setSelectedOrder(null), []);

    const todayRevenue = stats?.today_revenue ?? 0;
    const todayOrders = stats?.today_orders ?? 0;
    const todayCancelled = stats?.today_cancelled ?? 0;
    const todayCancelledRevenue = stats?.today_cancelled_revenue ?? 0;
    const activeOrderCount = orders.length;
    const weekTotal = chartData.length > 0 ? chartData.reduce((s, b) => s + (b.revenue ?? 0), 0) : 0;

    // Revenue chart hover state
    const [hoveredBar, setHoveredBar] = useState<number | null>(null);
    const chartMax = chartData.length > 0 ? Math.max(...chartData.map(d => d.revenue ?? 0), 1) : 1;

    // Calculate max sold for progress bars
    const maxSold = topItems.length > 0 ? Math.max(...topItems.map(i => i.units)) : 1;
    const maxRev = topItems.length > 0 ? Math.max(...topItems.map(i => i.rev)) : 1;

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* ── Period stats ────────────────────────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-text-dark font-bold text-base font-body">Today&apos;s Overview</h2>
                    <Link
                        href="/staff/manager/analytics"
                        className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors"
                    >
                        <ChartBarIcon size={14} weight="bold" />
                        Full analytics
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={CurrencyCircleDollarIcon} label="Revenue" value={formatGHS(todayRevenue)} sub="Today" />
                    <StatCard icon={ReceiptIcon} label="Orders" value={String(todayOrders)} sub="Today" />
                    <StatCard icon={CircleNotchIcon} label="Active Orders" value={String(activeOrderCount)} sub="In progress" />
                    <StatCard icon={XCircleIcon} label="Cancelled" value={String(todayCancelled)} sub={todayCancelledRevenue > 0 ? formatGHS(todayCancelledRevenue) + ' lost' : 'Today'} />
                </div>
            </div>

            {/* ── Weekly bar chart (with tooltips + uniform color) ────────────── */}
            <div className="bg-neutral-card border border-brown-light/15 rounded-2xl px-4 pt-4 pb-5 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-text-dark text-sm font-semibold font-body">Revenue this week</p>
                    <p className="text-primary text-sm font-bold font-body">{formatGHS(weekTotal)}</p>
                </div>
                <div className="flex items-end gap-2 h-32">
                    {chartData.length > 0 ? chartData.map((bar, i) => {
                        const val = bar.revenue ?? 0;
                        const h = Math.round((val / chartMax) * 112) || 4;
                        const compactLabel = val === 0 ? null : val >= 1000 ? `₵${(val / 1000).toFixed(1)}k` : `₵${Math.round(val)}`;
                        const isHovered = hoveredBar === i;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 relative group"
                                onMouseEnter={() => setHoveredBar(i)}
                                onMouseLeave={() => setHoveredBar(null)}
                            >
                                {isHovered && val > 0 && (
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 bg-text-dark text-white rounded-lg px-2.5 py-1.5 text-[10px] font-body whitespace-nowrap shadow-lg pointer-events-none">
                                        <p className="font-bold">{formatGHS(val)}</p>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text-dark" />
                                    </div>
                                )}
                                <div
                                    className={`w-full rounded-sm transition-all duration-200 flex items-end justify-center pb-0.5 ${isHovered ? 'bg-primary' : 'bg-primary/70'}`}
                                    style={{ height: Math.max(h, 4), minHeight: 4 }}
                                >
                                    {compactLabel && h > 18 && (
                                        <span className="text-[10px] text-white font-bold font-body leading-none select-none">{compactLabel}</span>
                                    )}
                                </div>
                                <span className="text-[10px] text-neutral-gray font-body">{bar.day}</span>
                            </div>
                        );
                    }) : (
                        Array.from({ length: 7 }, (_, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full rounded-md bg-neutral-gray/20 h-2" />
                                <span className="text-[10px] text-neutral-gray font-body">—</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Active orders (click opens drawer) ───────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-text-dark font-bold text-base font-body">Active Orders</h2>
                    <Link
                        href="/staff/manager/orders"
                        className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors"
                    >
                        <ListIcon size={14} weight="bold" />
                        View all
                    </Link>
                </div>

                <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[minmax(0,1fr)_100px_90px_minmax(0,1fr)_80px] gap-3 px-4 py-2.5 border-b border-[#f0e8d8] text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">
                        <span>Customer</span>
                        <span>Order</span>
                        <span>Status</span>
                        <span>Staff</span>
                        <span className="text-right">Time</span>
                    </div>
                    {orders.length > 0 ? orders.slice(0, 5).map((order, i) => {
                        const raw = rawOrders.find(r => String(r.id) === String(order.dbId));
                        const staffName = raw?.staff_name ?? raw?.assigned_employee?.name ?? '—';
                        return (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => handleOrderClick(order)}
                                className={`w-full grid grid-cols-[minmax(0,1fr)_100px_90px_minmax(0,1fr)_80px] gap-3 px-4 py-3 items-center hover:bg-brown-light/5 transition-colors cursor-pointer text-left ${
                                    i < Math.min(orders.length, 5) - 1 ? 'border-b border-brown-light/10' : ''
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="text-text-dark text-sm font-semibold font-body truncate">{order.customer}</p>
                                    <p className="text-neutral-gray text-[10px] font-body">{order.source}</p>
                                </div>
                                <span className="text-neutral-gray text-xs font-body font-medium">#{order.id}</span>
                                <StatusBadge status={order.status} />
                                <p className="text-text-dark text-xs font-body truncate">{staffName}</p>
                                <span className="text-neutral-gray text-xs font-body text-right">{order.timeAgo ?? order.placedAt}</span>
                            </button>
                        );
                    }) : (
                        <div className="px-4 py-8 text-center">
                            <p className="text-neutral-gray text-sm font-body">No active orders right now</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Top items (full-width with revenue + units) ───────────────── */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-text-dark font-bold text-base font-body">Top Items Today</h2>
                    <span className="text-neutral-gray text-xs font-body">by units sold</span>
                </div>

                <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                    {topItems.length > 0 ? (
                        <>
                            <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_100px_100px_minmax(0,1fr)] gap-3 px-4 py-2.5 border-b border-[#f0e8d8] text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">
                                <span>Item</span>
                                <span className="text-right">Units Sold</span>
                                <span className="text-right">Revenue</span>
                                <span>Progress</span>
                            </div>
                            {topItems.map((item, i) => (
                                <div
                                    key={item.name}
                                    className={`grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_100px_100px_minmax(0,1fr)] gap-2 sm:gap-3 px-4 py-3 items-center ${i < topItems.length - 1 ? 'border-b border-brown-light/10' : ''}`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-neutral-gray/50 text-xs font-bold font-body w-4 shrink-0">{i + 1}</span>
                                        <p className="text-text-dark text-sm font-medium font-body truncate">{item.name}</p>
                                    </div>
                                    <p className="text-text-dark text-xs font-bold font-body sm:text-right">{item.units} sold</p>
                                    <p className="text-primary text-xs font-bold font-body sm:text-right">{formatGHS(item.rev)}</p>
                                    <div className="h-1.5 bg-brown-light/15 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(item.rev / maxRev) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="px-4 py-8 text-center">
                            <p className="text-neutral-gray text-sm font-body">No sales data for today</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Manager quick links ─────────────────────────────────────────── */}
            <div>
                <h2 className="text-text-dark font-bold text-base font-body mb-3">Manager Tools</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <QuickLinkCard
                        href="/staff/manager/analytics"
                        icon={ChartBarIcon}
                        label="Full Analytics"
                        sub="Revenue, trends &amp; order history"
                    />
                    <QuickLinkCard
                        href="/staff/manager/menu"
                        icon={ForkKnifeIcon}
                        label="Menu Management"
                        sub="Edit items, toggle availability"
                    />
                    <QuickLinkCard
                        href="/staff/manager/staff"
                        icon={UsersThreeIcon}
                        label="Staff Management"
                        sub="View &amp; manage branch staff"
                    />
                </div>
            </div>

            {/* Order detail drawer */}
            {selectedOrder && <DashboardOrderPanel order={selectedOrder} onClose={handleCloseDrawer} />}
        </div>
    );
}
