'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { orderService } from '@/lib/api/services/order.service';
import type { EmployeeOrdersParams } from '@/lib/api/services/order.service';
import type { AdminOrder } from '@/lib/api/adapters/order.adapter';
import { mapApiOrderToAdminOrder } from '@/lib/api/adapters/order.adapter';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import {
    MagnifyingGlassIcon,
    XIcon,
    CaretLeftIcon,
    CaretRightIcon,
    FunnelIcon,
    ArrowUpRightIcon,
    PhoneIcon,
    MapPinIcon,
    ClockIcon,
    XCircleIcon,
    SpinnerIcon,
    ListIcon,
    DownloadSimpleIcon,
} from '@phosphor-icons/react';
import CancelOrderModal from '@/app/components/ui/CancelOrderModal';
import { useRequestCancel } from '@/lib/api/hooks/useOrders';
import { toast } from '@/lib/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'received' | 'preparing' | 'ready' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'cancel_requested';
type OrderSource = 'Online' | 'POS' | 'WhatsApp' | 'Instagram' | 'Facebook' | 'Phone';
type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded' | 'No Charge';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { dot: string; label: string; pulse?: boolean }> = {
    received:         { dot: 'bg-neutral-gray', label: 'Received' },
    preparing:        { dot: 'bg-primary',      label: 'Preparing',        pulse: true },
    ready:            { dot: 'bg-secondary',    label: 'Ready' },
    ready_for_pickup: { dot: 'bg-teal-600',     label: 'Ready for Pickup' },
    out_for_delivery: { dot: 'bg-teal-600',     label: 'Out for Delivery', pulse: true },
    delivered:        { dot: 'bg-secondary',    label: 'Delivered' },
    completed:        { dot: 'bg-secondary',    label: 'Completed' },
    cancelled:        { dot: 'bg-error',        label: 'Cancelled' },
    cancel_requested: { dot: 'bg-orange-500',   label: 'Cancel Requested', pulse: true },
};

const ALL_STATUSES: OrderStatus[] = ['received', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'completed', 'cancel_requested', 'cancelled'];
const ALL_SOURCES: OrderSource[] = ['Online', 'POS', 'WhatsApp', 'Instagram', 'Facebook', 'Phone'];
const ALL_PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Pending', 'Failed', 'Refunded', 'No Charge'];

const SOURCE_TO_API: Record<OrderSource, string> = {
    Online: 'online', POS: 'pos', WhatsApp: 'whatsapp', Instagram: 'instagram', Facebook: 'facebook', Phone: 'phone',
};
const PAYMENT_STATUS_TO_API: Record<PaymentStatus, string> = {
    Paid: 'completed', Pending: 'pending', Failed: 'failed', Refunded: 'refunded', 'No Charge': 'no_charge',
};

const PAGE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) { return `₵${v.toFixed(2)}`; }

function getDateRange(preset: string, custom?: { date_from: string; date_to: string }): { date_from?: string; date_to?: string } {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (preset === 'Today') return { date_from: today, date_to: today };
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    if (preset === 'Yesterday') return { date_from: yesterday.toISOString().slice(0, 10), date_to: yesterday.toISOString().slice(0, 10) };
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    if (preset === 'This Week') return { date_from: weekStart.toISOString().slice(0, 10), date_to: today };
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (preset === 'This Month') return { date_from: monthStart.toISOString().slice(0, 10), date_to: today };
    const lastWeekEnd = new Date(now); lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay() - 1);
    const lastWeekStart = new Date(lastWeekEnd); lastWeekStart.setDate(lastWeekStart.getDate() - 6);
    if (preset === 'Last Week') return { date_from: lastWeekStart.toISOString().slice(0, 10), date_to: lastWeekEnd.toISOString().slice(0, 10) };
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (preset === 'Last Month') return { date_from: lastMonthStart.toISOString().slice(0, 10), date_to: lastMonthEnd.toISOString().slice(0, 10) };
    if (preset === 'Custom' && custom?.date_from && custom?.date_to) {
        const { date_from: from, date_to: to } = custom;
        return from <= to ? { date_from: from, date_to: to } : { date_from: to, date_to: from };
    }
    return {};
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_STYLES[status] ?? STATUS_STYLES.received;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-text-dark">
            <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
            {cfg.label}
        </span>
    );
}

function FilterGroup<T>({
    label, options, selected, onToggle, labelFn,
}: {
    label: string; options: T[]; selected: string[]; onToggle: (v: T) => void; labelFn?: (v: T) => string;
}) {
    return (
        <div>
            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map(opt => (
                    <button key={String(opt)} type="button" onClick={() => onToggle(opt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${selected.includes(opt as unknown as string) ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-neutral-light text-neutral-gray hover:text-text-dark border border-transparent'}`}>
                        {labelFn ? labelFn(opt) : String(opt)}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Order detail panel ───────────────────────────────────────────────────────

function OrderDetailPanel({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
    const [showConfirm, setShowConfirm] = useState<null | 'cancel'>(null);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const { requestCancel } = useRequestCancel();
    const queryClient = useQueryClient();

    const subtotal = order.items.reduce((s, i) => s + i.qty * i.price, 0);
    const isTerminal = ['completed', 'delivered', 'cancelled'].includes(order.status);

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
                {/* Header */}
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
                    {/* Customer */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Customer</p>
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-1.5">
                            <p className="text-text-dark text-sm font-semibold font-body">{order.customer}</p>
                            <a href={`tel:${order.phone}`} className="text-primary text-xs font-body flex items-center gap-1.5 hover:underline">
                                <PhoneIcon size={12} weight="fill" />{order.phone}
                            </a>
                            {order.email && <p className="text-neutral-gray text-xs font-body">{order.email}</p>}
                            {order.address && order.address !== '—' && (
                                <div className="flex items-start gap-1.5 mt-0.5">
                                    <MapPinIcon size={12} weight="fill" className="text-neutral-gray mt-0.5 shrink-0" />
                                    <p className="text-neutral-gray text-xs font-body">{order.address}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Source + Staff */}
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

                    {/* Items */}
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

                    {/* Payment */}
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
                            {order.hubtelRef && (
                                <div className="flex justify-between"><span className="text-neutral-gray text-xs font-body">Hubtel Ref</span><span className="text-text-dark text-[10px] font-body font-mono">{order.hubtelRef}</span></div>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
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

                {/* Actions */}
                <div className="border-t border-[#f0e8d8] p-4 flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Actions</p>
                    {showStatusPicker && (
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-2">
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Update Status</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {(['received', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'completed'] as string[]).filter(s => s !== order.status).map(s => (
                                    <button key={s} type="button" disabled={updatingStatus} onClick={() => overrideStatus(s)}
                                        className="flex items-center gap-1.5 px-2.5 py-2 bg-neutral-card border border-[#f0e8d8] rounded-lg text-text-dark text-xs font-medium font-body hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                                        <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_STYLES[s]?.dot ?? 'bg-neutral-gray'}`} />{STATUS_STYLES[s]?.label ?? s}
                                    </button>
                                ))}
                            </div>
                            <button type="button" onClick={() => setShowStatusPicker(false)} className="text-xs text-neutral-gray font-body hover:text-text-dark transition-colors text-left cursor-pointer">Cancel</button>
                        </div>
                    )}
                    {order.status === 'cancel_requested' && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                            <p className="text-xs font-bold text-orange-700 font-body">Cancel Requested</p>
                            {order.cancelRequestedBy && <p className="text-xs text-orange-600 font-body">By: {order.cancelRequestedBy}</p>}
                            {order.cancelRequestReason && <p className="text-xs text-text-dark font-body">&ldquo;{order.cancelRequestReason}&rdquo;</p>}
                            <p className="text-xs text-neutral-gray font-body italic">Waiting for admin approval</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        {order.status === 'cancel_requested' ? (
                            <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-neutral-gray text-xs font-medium font-body opacity-40 cursor-not-allowed">
                                <ClockIcon size={13} weight="bold" />Update Status
                            </div>
                        ) : (
                            <button type="button" onClick={() => setShowStatusPicker(v => !v)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                                <ClockIcon size={13} weight="bold" className="text-primary" />Update Status
                            </button>
                        )}
                        {!isTerminal && order.status !== 'cancel_requested' ? (
                            <button type="button" onClick={() => setShowConfirm('cancel')} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-error/10 rounded-xl text-error text-xs font-medium font-body hover:bg-error/20 transition-colors cursor-pointer">
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
            {showConfirm === 'cancel' && (
                <CancelOrderModal orderNumber={order.id} theme="light" context="staff" onCancel={() => setShowConfirm(null)}
                    onConfirm={async (reason) => { await requestCancel({ id: order.dbId, reason }); queryClient.invalidateQueries({ queryKey: ['employee-orders'] }); toast.success('Cancellation requested'); }} />
            )}
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerOrdersPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;
    const branchName = staffUser?.branches[0]?.name ?? '';

    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<string[]>([]);
    const [datePreset, setDatePreset] = useState('Today');
    const [customDateFrom, setCustomDateFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [customDateTo, setCustomDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [page, setPage] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const orderParams = useMemo(() => {
        const params: EmployeeOrdersParams = { page: page + 1, per_page: PAGE_SIZE, branch_id: branchId };
        if (search.trim()) params.search = search.trim();
        if (selectedStatuses.length) params.status = selectedStatuses;
        if (selectedSources.length) params.order_source = selectedSources.map(s => SOURCE_TO_API[s as OrderSource]).join(',');
        if (selectedPaymentStatuses.length) params.payment_status = selectedPaymentStatuses.map(s => PAYMENT_STATUS_TO_API[s as PaymentStatus]);
        const range = getDateRange(datePreset, datePreset === 'Custom' ? { date_from: customDateFrom, date_to: customDateTo } : undefined);
        if (range.date_from) params.date_from = range.date_from;
        if (range.date_to) params.date_to = range.date_to;
        return params;
    }, [search, selectedStatuses, selectedSources, selectedPaymentStatuses, datePreset, customDateFrom, customDateTo, page, branchId]);

    const { orders: apiOrders, meta, isLoading } = useEmployeeOrders(orderParams);
    const orders = useMemo(() => apiOrders.map(mapApiOrderToAdminOrder), [apiOrders]);
    const totalPages = (meta as any)?.last_page ?? 1;

    function toggleFilter<T extends string>(arr: T[], set: (v: T[]) => void, val: T) {
        set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
    }

    const activeFilterCount = selectedStatuses.length + selectedSources.length + selectedPaymentStatuses.length;

    const handleExportCsv = useCallback(async () => {
        setIsExporting(true);
        try {
            const exportParams: EmployeeOrdersParams = { per_page: 1000, branch_id: branchId };
            if (search.trim()) exportParams.search = search.trim();
            if (selectedStatuses.length) exportParams.status = selectedStatuses;
            if (selectedSources.length) exportParams.order_source = selectedSources.map(s => SOURCE_TO_API[s as OrderSource]).join(',');
            if (selectedPaymentStatuses.length) exportParams.payment_status = selectedPaymentStatuses.map(s => PAYMENT_STATUS_TO_API[s as PaymentStatus]);
            const range = getDateRange(datePreset, datePreset === 'Custom' ? { date_from: customDateFrom, date_to: customDateTo } : undefined);
            if (range.date_from) exportParams.date_from = range.date_from;
            if (range.date_to) exportParams.date_to = range.date_to;
            const response = await orderService.getEmployeeOrders(exportParams);
            const rawData = response?.data;
            const ordersArray = Array.isArray(rawData) ? rawData : (rawData as { data?: unknown[] } | undefined)?.data ?? [];
            const allOrders = ordersArray.map(item => mapApiOrderToAdminOrder(item as any));
            const headers = ['Order #', 'Placed At', 'Customer', 'Phone', 'Source', 'Status', 'Payment', 'Payment Status', 'Amount (GHS)', 'Items'];
            const rows = allOrders.map(o => [o.id, o.createdAt, o.customer, o.phone, o.source, o.status, o.payment, o.paymentStatus, o.amount.toFixed(2), o.items.map(i => `${i.name} x${i.qty}`).join('; ')]);
            const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `orders-${branchName.toLowerCase().replace(/\s+/g, '-')}-${datePreset.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
        } finally { setIsExporting(false); }
    }, [search, selectedStatuses, selectedSources, selectedPaymentStatuses, datePreset, customDateFrom, customDateTo, branchId, branchName]);

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ListIcon size={20} weight="fill" className="text-primary" />
                        <h1 className="text-text-dark text-2xl font-bold font-body">Orders</h1>
                    </div>
                    <p className="text-neutral-gray text-sm font-body">{branchName} · {(meta as any)?.total ?? 0} orders</p>
                </div>
                <button type="button" onClick={handleExportCsv} disabled={isExporting || orders.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                    <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                    {isExporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 mb-4">
                <div className="flex gap-3 mb-3">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                            placeholder="Search by order #, customer, phone…"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body placeholder:text-neutral-gray/60 focus:outline-none focus:border-primary/40" />
                    </div>
                    <button type="button" onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium font-body transition-colors cursor-pointer ${showFilters || activeFilterCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-neutral-light border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                        <FunnelIcon size={15} weight={activeFilterCount > 0 ? 'fill' : 'regular'} />Filters
                        {activeFilterCount > 0 && <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
                    </button>
                </div>
                <div className="flex gap-2 flex-wrap mb-3">
                    {['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'Custom'].map(p => (
                        <button key={p} type="button" onClick={() => { setDatePreset(p); setPage(0); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${datePreset === p ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}>{p}</button>
                    ))}
                </div>
                {datePreset === 'Custom' && (
                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
                        <input type="date" value={customDateFrom} onChange={e => { setCustomDateFrom(e.target.value); setPage(0); }}
                            className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-light text-sm font-body text-text-dark focus:outline-none focus:border-primary/40" />
                        <input type="date" value={customDateTo} onChange={e => { setCustomDateTo(e.target.value); setPage(0); }}
                            className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-light text-sm font-body text-text-dark focus:outline-none focus:border-primary/40" />
                    </div>
                )}
                {showFilters && (
                    <div className="border-t border-[#f0e8d8] pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FilterGroup label="Status" options={ALL_STATUSES} selected={selectedStatuses} onToggle={v => toggleFilter(selectedStatuses, setSelectedStatuses, v)} labelFn={v => STATUS_STYLES[v]?.label ?? v} />
                        <FilterGroup label="Source" options={ALL_SOURCES} selected={selectedSources} onToggle={v => toggleFilter(selectedSources, setSelectedSources, v)} />
                        <FilterGroup label="Payment Status" options={ALL_PAYMENT_STATUSES} selected={selectedPaymentStatuses} onToggle={v => toggleFilter(selectedPaymentStatuses, setSelectedPaymentStatuses, v)} />
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-4">
                <div className="hidden md:grid grid-cols-[1fr_0.7fr_1.4fr_0.9fr_0.9fr_1.1fr_1fr_0.8fr] gap-3 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['Order #', 'Source', 'Customer', 'Payment', 'Pay Status', 'Status', 'Amount', 'Time'].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>
                {!mounted || isLoading ? (
                    <div className="px-4 py-16 text-center">
                        <SpinnerIcon size={24} className="text-primary animate-spin mx-auto mb-2" />
                        <p className="text-neutral-gray text-sm font-body">Loading orders…</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <ListIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                        <p className="text-neutral-gray text-sm font-body">No orders match your filters.</p>
                    </div>
                ) : (
                    orders.map((order, i) => (
                        <div key={order.id} onClick={() => setSelectedOrder(order)}
                            className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1fr_0.7fr_1.4fr_0.9fr_0.9fr_1.1fr_1fr_0.8fr] gap-2 md:gap-3 md:items-center cursor-pointer hover:bg-neutral-light/60 transition-colors ${i < orders.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                            <div className="flex items-center gap-2 md:block">
                                <span className="text-text-dark text-sm font-bold font-body">#{order.id}</span>
                                <ArrowUpRightIcon size={12} className="text-neutral-gray/40 md:hidden" />
                            </div>
                            <span className="text-text-dark text-xs font-body">{order.source}</span>
                            <div className="min-w-0">
                                <p className="text-text-dark text-xs font-semibold font-body truncate">{order.customer}</p>
                                <p className="text-neutral-gray text-[10px] font-body">{order.phone}</p>
                            </div>
                            <span className="text-neutral-gray text-[10px] font-body">{order.payment}</span>
                            <span className={`text-[10px] font-semibold font-body capitalize ${order.paymentStatus === 'paid' ? 'text-secondary' : order.paymentStatus === 'failed' ? 'text-error' : order.paymentStatus === 'pending' ? 'text-warning' : order.paymentStatus === 'refunded' ? 'text-blue-600' : 'text-neutral-gray'}`}>
                                {order.paymentStatus === 'no_charge' ? 'No Charge' : order.paymentStatus}
                            </span>
                            <StatusBadge status={order.status} />
                            <div className="flex flex-col">
                                <span className="text-text-dark text-sm font-bold font-body">{formatGHS(order.amount)}</span>
                                <span className="text-neutral-gray text-[10px] font-body">{order.paymentStatus === 'no_charge' ? 'Waived' : `Paid: ${formatGHS(order.amountPaid)}`}</span>
                            </div>
                            <span className="text-neutral-gray text-xs font-body">{order.placedAt}</span>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
                        <CaretLeftIcon size={14} weight="bold" /> Previous
                    </button>
                    <span className="text-neutral-gray text-xs font-body">Page {page + 1} of {totalPages}</span>
                    <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
                        Next <CaretRightIcon size={14} weight="bold" />
                    </button>
                </div>
            )}

            {selectedOrder && <OrderDetailPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
}
