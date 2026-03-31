'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { orderService } from '@/lib/api/services/order.service';
import type { EmployeeOrdersParams } from '@/lib/api/services/order.service';
import { useBranches } from '@/lib/api/hooks/useBranches';
import type { AdminOrder } from '@/lib/api/adapters/order.adapter';
import { mapApiOrderToAdminOrder } from '@/lib/api/adapters/order.adapter';
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
    WarningCircleIcon,
    CheckCircleIcon,
    ArrowCounterClockwiseIcon,
    NotePencilIcon,
    ChatTextIcon,
    ArrowsClockwiseIcon,
    DownloadSimpleIcon,
    XCircleIcon,
} from '@phosphor-icons/react';
import CancelOrderModal from '@/app/components/ui/CancelOrderModal';
import { useCancelOrder } from '@/lib/api/hooks/useOrders';
import { toast } from '@/lib/utils/toast';
import { useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'received' | 'preparing' | 'ready' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
type OrderSource = 'Online' | 'POS' | 'WhatsApp' | 'Instagram' | 'Facebook' | 'Phone';
type PaymentMethod = 'Mobile Money' | 'Cash on Delivery' | 'Cash at Pickup' | 'Cash' | 'Card' | 'Wallet' | 'GhQR' | 'No Charge';
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
};

const SOURCE_STYLES: Record<OrderSource, string> = {
    WhatsApp: 'bg-[#25D366]/10 text-[#128C7E]',
    Instagram: 'bg-pink-50 text-pink-600',
    Facebook: 'bg-blue-50 text-blue-600',
    Phone: 'bg-neutral-light text-neutral-gray',
    Online: 'bg-primary/10 text-primary',
    POS: 'bg-secondary/10 text-secondary',
};

const ALL_STATUSES: OrderStatus[] = ['received', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
const ALL_SOURCES: OrderSource[] = ['Online', 'POS', 'WhatsApp', 'Instagram', 'Facebook', 'Phone'];
const ALL_PAYMENTS: PaymentMethod[] = ['Mobile Money', 'Cash', 'Card', 'Wallet', 'GhQR', 'No Charge'];
const ALL_PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Pending', 'Failed', 'Refunded', 'No Charge'];

const SOURCE_TO_API: Record<OrderSource, string> = {
    Online: 'online',
    POS: 'pos',
    WhatsApp: 'whatsapp',
    Instagram: 'instagram',
    Facebook: 'facebook',
    Phone: 'phone',
};

const PAYMENT_STATUS_TO_API: Record<PaymentStatus, string> = {
    Paid: 'completed',
    Pending: 'pending',
    Failed: 'failed',
    Refunded: 'refunded',
    'No Charge': 'no_charge',
};

const PAGE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) {
    return `₵${v.toFixed(2)}`;
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

function SourceBadge({ source }: { source: OrderSource }) {
    return (
        <span className={`text-[10px] font-medium font-body px-2 py-0.5 rounded-full ${SOURCE_STYLES[source]}`}>
            {source}
        </span>
    );
}

// ─── Confirmation modal ───────────────────────────────────────────────────────

function ConfirmModal({
    title,
    description,
    onConfirm,
    onCancel,
    dangerous = false,
}: {
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    dangerous?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                {dangerous && <div className="h-1.5 bg-error" />}
                <div className="p-6">
                    <h3 className="text-text-dark text-base font-bold font-body mb-2">{title}</h3>
                    <p className="text-neutral-gray text-sm font-body mb-6">{description}</p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-light text-text-dark text-sm font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium font-body transition-colors cursor-pointer ${dangerous ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary-hover'}`}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Order detail panel ───────────────────────────────────────────────────────

function OrderDetailPanel({
    order,
    onClose,
}: {
    order: AdminOrder;
    onClose: () => void;
}) {
    const [showConfirm, setShowConfirm] = useState<null | 'cancel' | 'refund'>(null);
    const [noteText, setNoteText] = useState('');
    const [showNote, setShowNote] = useState(false);
    const { cancelOrder } = useCancelOrder();
    const queryClient = useQueryClient();

    const subtotal = order.items.reduce((s, i) => s + i.qty * i.price, 0);

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" onClick={onClose} />

            <aside className="fixed right-0 top-0 h-full z-40 w-full max-w-md bg-neutral-card border-l border-[#f0e8d8] flex flex-col shadow-2xl overflow-hidden">

                {/* Panel header */}
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
                                <PhoneIcon size={12} weight="fill" />
                                {order.phone}
                            </a>
                            {order.email && <p className="text-neutral-gray text-xs font-body">{order.email}</p>}
                            <div className="flex items-start gap-1.5 mt-0.5">
                                <MapPinIcon size={12} weight="fill" className="text-neutral-gray mt-0.5 shrink-0" />
                                <p className="text-neutral-gray text-xs font-body">{order.address}</p>
                            </div>
                        </div>
                    </div>

                    {/* Branch + Source */}
                    <div className="flex gap-3">
                        <div className="flex-1 bg-neutral-light rounded-xl p-3">
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">Branch</p>
                            <p className="text-text-dark text-sm font-semibold font-body">{order.branch}</p>
                        </div>
                        <div className="flex-1 bg-neutral-light rounded-xl p-3">
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">Source</p>
                            <SourceBadge source={order.source} />
                        </div>
                    </div>

                    {/* Assigned Employee */}
                    {order.assignedEmployee && (
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Assigned Staff</p>
                            <div className="bg-neutral-light rounded-xl p-3">
                                <p className="text-text-dark text-sm font-semibold font-body">{order.assignedEmployee}</p>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Items</p>
                        <div className="bg-neutral-light rounded-xl overflow-hidden">
                            {order.items.map((item, i) => (
                                <div key={i} className={`flex justify-between px-3 py-2.5 ${i < order.items.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                    <span className="text-text-dark text-xs font-body">{item.qty}× {item.name}</span>
                                    <span className="text-text-dark text-xs font-bold font-body">₵{item.qty * item.price}</span>
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
                            <div className="flex justify-between">
                                <span className="text-neutral-gray text-xs font-body">Method</span>
                                <span className="text-text-dark text-xs font-semibold font-body">{order.payment}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-gray text-xs font-body">Status</span>
                                <span className={`text-xs font-semibold font-body capitalize ${
                                    order.paymentStatus === 'paid' ? 'text-secondary' : 
                                    order.paymentStatus === 'failed' ? 'text-error' : 
                                    order.paymentStatus === 'pending' ? 'text-warning' : 
                                    order.paymentStatus === 'refunded' ? 'text-blue-600' :
                                    'text-neutral-gray'
                                }`}>
                                    {order.paymentStatus === 'no_charge' ? 'No Charge' : order.paymentStatus}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-gray text-xs font-body">Order Total</span>
                                <span className="text-text-dark text-xs font-semibold font-body">{formatGHS(order.amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-gray text-xs font-body">Amount Paid</span>
                                <span className="text-primary text-xs font-bold font-body">{formatGHS(order.amountPaid)}</span>
                            </div>
                            {order.hubtelRef && (
                                <div className="flex justify-between">
                                    <span className="text-neutral-gray text-xs font-body">Hubtel Ref</span>
                                    <span className="text-text-dark text-[10px] font-body font-mono">{order.hubtelRef}</span>
                                </div>
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
                                        <p className="text-neutral-gray text-[10px] font-body">
                                            {ev.at} · {ev.by}{ev.byName ? ` (${ev.byName})` : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add note */}
                    {showNote && (
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Internal Note</p>
                            <textarea
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                rows={3}
                                className="w-full bg-neutral-light border border-[#f0e8d8] rounded-xl px-3 py-2.5 text-text-dark text-sm font-body resize-none focus:outline-none focus:border-primary/40"
                                placeholder="Staff-only note..."
                            />
                            <button
                                type="button"
                                className="mt-2 px-4 py-2 bg-primary rounded-xl text-white text-xs font-medium font-body cursor-pointer"
                            >
                                Save note
                            </button>
                        </div>
                    )}
                </div>

                {/* Admin action buttons */}
                <div className="border-t border-[#f0e8d8] p-4 flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Admin Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                            <ArrowsClockwiseIcon size={13} weight="bold" className="text-primary" />
                            Override Status
                        </button>
                        <button type="button" onClick={() => setShowConfirm('cancel')} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-error/10 rounded-xl text-error text-xs font-medium font-body hover:bg-error/20 transition-colors cursor-pointer">
                            <XCircleIcon size={13} weight="bold" />
                            Cancel Order
                        </button>
                        <button type="button" onClick={() => setShowConfirm('refund')} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                            <ArrowCounterClockwiseIcon size={13} weight="bold" className="text-secondary" />
                            Issue Refund
                        </button>
                        <button type="button" onClick={() => setShowNote(!showNote)} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                            <NotePencilIcon size={13} weight="bold" className="text-primary" />
                            Add Note
                        </button>
                        <button type="button" className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer col-span-2">
                            <ChatTextIcon size={13} weight="bold" className="text-primary" />
                            Re-send SMS
                        </button>
                    </div>
                </div>
            </aside>

            {/* Confirm modals */}
            {showConfirm === 'cancel' && (
                <CancelOrderModal
                    orderNumber={order.id}
                    theme="light"
                    onCancel={() => setShowConfirm(null)}
                    onConfirm={async (reason) => {
                        await cancelOrder({ id: order.dbId, reason });
                        queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
                    }}
                />
            )}
            {showConfirm === 'refund' && (
                <ConfirmModal
                    title="Issue refund?"
                    description={`A refund of ${formatGHS(order.amount)} will be issued to ${order.customer} via ${order.payment}.`}
                    onConfirm={() => setShowConfirm(null)}
                    onCancel={() => setShowConfirm(null)}
                />
            )}
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function getDateRange(
    preset: string,
    custom?: { date_from: string; date_to: string },
): { date_from?: string; date_to?: string } {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (preset === 'Today') {
        return { date_from: today, date_to: today };
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (preset === 'Yesterday') {
        return { date_from: yesterdayStr, date_to: yesterdayStr };
    }
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    if (preset === 'This Week') {
        return { date_from: weekStartStr, date_to: today };
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    if (preset === 'This Month') {
        return { date_from: monthStartStr, date_to: today };
    }
    if (preset === 'Custom' && custom?.date_from && custom?.date_to) {
        const { date_from: from, date_to: to } = custom;
        return from <= to ? { date_from: from, date_to: to } : { date_from: to, date_to: from };
    }
    return {};
}

export default function AdminOrdersPage() {
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
    const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<string[]>([]);
    const [datePreset, setDatePreset] = useState('Today');
    const [customDateFrom, setCustomDateFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [customDateTo, setCustomDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [page, setPage] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { branches } = useBranches();
    const branchIdByName = useMemo(() => {
        const m: Record<string, number> = {};
        for (const b of branches) m[b.name] = b.id;
        return m;
    }, [branches]);

    const orderParams = useMemo(() => {
        const params: EmployeeOrdersParams = {
            page: page + 1,
            per_page: PAGE_SIZE,
        };
        if (search.trim()) params.search = search.trim();
        if (selectedStatuses.length) params.status = selectedStatuses;
        if (selectedSources.length) {
            const mappedSources = selectedSources.map((s) => SOURCE_TO_API[s as OrderSource]);
            params.order_source = mappedSources.join(',');
        }
        if (selectedPaymentStatuses.length) {
            const mappedStatuses = selectedPaymentStatuses.map((s) => PAYMENT_STATUS_TO_API[s as PaymentStatus]);
            params.payment_status = mappedStatuses;
        }
        if (selectedBranches.length === 1 && branchIdByName[selectedBranches[0]]) {
            params.branch_id = branchIdByName[selectedBranches[0]];
        }
        const range = getDateRange(
            datePreset,
            datePreset === 'Custom' ? { date_from: customDateFrom, date_to: customDateTo } : undefined,
        );
        if (range.date_from) params.date_from = range.date_from;
        if (range.date_to) params.date_to = range.date_to;
        return params;
    }, [search, selectedStatuses, selectedSources, selectedBranches, selectedPaymentStatuses, datePreset, customDateFrom, customDateTo, page, branchIdByName]);

    const { orders: apiOrders, meta, isLoading } = useEmployeeOrders(orderParams);

    const orders = useMemo(() => apiOrders.map(mapApiOrderToAdminOrder), [apiOrders]);

    const pageOrders = useMemo(() => {
        let list = orders;
        if (selectedPayments.length) {
            list = list.filter((o) => selectedPayments.includes(o.payment));
        }
        if (selectedBranches.length > 1) {
            list = list.filter((o) => selectedBranches.includes(o.branch));
        }
        return list;
    }, [orders, selectedPayments, selectedBranches]);

    const totalPages = (meta as any)?.last_page ?? 1;

    function toggleFilter<T extends string>(arr: T[], set: (v: T[]) => void, val: T) {
        set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
    }

    const activeFilterCount = selectedBranches.length + selectedStatuses.length + selectedSources.length + selectedPayments.length + selectedPaymentStatuses.length;

    const handleExportCsv = useCallback(async () => {
        setIsExporting(true);
        try {
            const exportParams: EmployeeOrdersParams = { per_page: 1000 };
            if (search.trim()) exportParams.search = search.trim();
            if (selectedStatuses.length) exportParams.status = selectedStatuses;
            if (selectedSources.length) {
                exportParams.order_source = selectedSources.map((s) => SOURCE_TO_API[s as OrderSource]).join(',');
            }
            if (selectedPaymentStatuses.length) {
                exportParams.payment_status = selectedPaymentStatuses.map((s) => PAYMENT_STATUS_TO_API[s as PaymentStatus]);
            }
            if (selectedBranches.length === 1 && branchIdByName[selectedBranches[0]]) {
                exportParams.branch_id = branchIdByName[selectedBranches[0]];
            }
            const range = getDateRange(
                datePreset,
                datePreset === 'Custom' ? { date_from: customDateFrom, date_to: customDateTo } : undefined,
            );
            if (range.date_from) exportParams.date_from = range.date_from;
            if (range.date_to) exportParams.date_to = range.date_to;

            const response = await orderService.getEmployeeOrders(exportParams);
            const rawData = response?.data;
            const ordersArray = Array.isArray(rawData) ? rawData : (rawData as { data?: unknown[] } | undefined)?.data ?? [];
            let allOrders = ordersArray.map((item) => mapApiOrderToAdminOrder(item as any));

            if (selectedPayments.length) {
                allOrders = allOrders.filter((o) => selectedPayments.includes(o.payment));
            }
            if (selectedBranches.length > 1) {
                allOrders = allOrders.filter((o) => selectedBranches.includes(o.branch));
            }

            const headers = ['Order #', 'Placed At', 'Customer', 'Phone', 'Email', 'Branch', 'Source', 'Status', 'Payment', 'Payment Status', 'Amount (GHS)', 'Items'];
            const rows = allOrders.map((o) => [
                o.id,
                o.createdAt,
                o.customer,
                o.phone,
                o.email ?? '',
                o.branch,
                o.source,
                o.status,
                o.payment,
                o.paymentStatus,
                o.amount.toFixed(2),
                o.items.map((i) => `${i.name} x${i.qty}`).join('; '),
            ]);
            const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-${datePreset.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    }, [search, selectedStatuses, selectedSources, selectedBranches, selectedPayments, selectedPaymentStatuses, datePreset, customDateFrom, customDateTo, branchIdByName]);

    return (
        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Orders</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        {`All branches · ${(meta as any)?.total ?? 0} orders`}
                    </p>
                </div>
                <button type="button" onClick={handleExportCsv} disabled={isExporting || orders.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                    <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                    {isExporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </div>

            {/* Filters bar */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 mb-4">

                {/* Search + filter toggle */}
                <div className="flex gap-3 mb-3">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0); }}
                            placeholder="Search by order #, customer, phone…"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body placeholder:text-neutral-gray/60 focus:outline-none focus:border-primary/40"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium font-body transition-colors cursor-pointer ${showFilters || activeFilterCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-neutral-light border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}
                    >
                        <FunnelIcon size={15} weight={activeFilterCount > 0 ? 'fill' : 'regular'} />
                        Filters
                        {activeFilterCount > 0 && <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
                    </button>
                </div>

                {/* Date presets */}
                <div className="flex gap-2 flex-wrap mb-3">
                    {['Today', 'Yesterday', 'This Week', 'This Month', 'Custom'].map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => { setDatePreset(p); setPage(0); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${datePreset === p ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                {datePreset === 'Custom' && (
                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
                        <input
                            type="date"
                            value={customDateFrom}
                            onChange={(event) => { setCustomDateFrom(event.target.value); setPage(0); }}
                            className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-light text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                        />
                        <input
                            type="date"
                            value={customDateTo}
                            onChange={(event) => { setCustomDateTo(event.target.value); setPage(0); }}
                            className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-light text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                        />
                    </div>
                )}

                {/* Expanded filters */}
                {showFilters && (
                    <div className="border-t border-[#f0e8d8] pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        <FilterGroup label="Branch" options={branches} selected={selectedBranches} onToggle={(b: any) => toggleFilter(selectedBranches, setSelectedBranches, b.name)} keyFn={(b: any) => b.id} valueFn={(b: any) => b.name} labelFn={(b: any) => b.name} />
                        <FilterGroup label="Status" options={ALL_STATUSES} selected={selectedStatuses} onToggle={v => toggleFilter(selectedStatuses, setSelectedStatuses, v)} labelFn={v => STATUS_STYLES[v]?.label ?? v} />
                        <FilterGroup label="Source" options={ALL_SOURCES} selected={selectedSources} onToggle={v => toggleFilter(selectedSources, setSelectedSources, v)} />
                        <FilterGroup label="Payment Method" options={ALL_PAYMENTS} selected={selectedPayments} onToggle={v => toggleFilter(selectedPayments, setSelectedPayments, v)} />
                        <FilterGroup label="Payment Status" options={ALL_PAYMENT_STATUSES} selected={selectedPaymentStatuses} onToggle={v => toggleFilter(selectedPaymentStatuses, setSelectedPaymentStatuses, v)} />
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-4">
                <div className="hidden md:grid grid-cols-[1fr_0.9fr_0.8fr_1.2fr_0.9fr_0.9fr_1fr_1fr_0.8fr] gap-3 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['Order #', 'Branch', 'Source', 'Customer', 'Payment Method', 'Payment Status', 'Status', 'Order / Paid', 'Time'].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {!mounted || isLoading ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">Loading orders…</p>
                    </div>
                ) : pageOrders.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">No orders match your filters.</p>
                    </div>
                ) : (
                    pageOrders.map((order, i) => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1fr_0.9fr_0.8fr_1.2fr_0.9fr_0.9fr_1fr_1fr_0.8fr] gap-2 md:gap-3 md:items-center cursor-pointer hover:bg-neutral-light/60 transition-colors ${i < pageOrders.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                        >
                            <div className="flex items-center gap-2 md:block">
                                <span className="text-text-dark text-sm font-bold font-body">#{order.id}</span>
                                <ArrowUpRightIcon size={12} className="text-neutral-gray/40 md:hidden" />
                            </div>
                            <span className="text-text-dark text-xs font-body">{order.branch}</span>
                            <span className='text-text-dark text-xs font-body'>{order.source}</span>
                            <div className="min-w-0">
                                <p className="text-text-dark text-xs font-semibold font-body truncate">{order.customer}</p>
                                <p className="text-neutral-gray text-[10px] font-body">{order.phone}</p>
                            </div>
                            <span className="text-neutral-gray text-[10px] font-body">{order.payment}</span>
                            <span className={`text-[10px] font-semibold font-body capitalize ${
                                order.paymentStatus === 'paid' ? 'text-secondary' : 
                                order.paymentStatus === 'failed' ? 'text-error' : 
                                order.paymentStatus === 'pending' ? 'text-warning' : 
                                order.paymentStatus === 'refunded' ? 'text-blue-600' :
                                'text-neutral-gray'
                            }`}>
                                {order.paymentStatus === 'no_charge' ? 'No Charge' : order.paymentStatus}
                            </span>
                            <StatusBadge status={order.status} />
                            <div className="flex flex-col">
                                <span className="text-text-dark text-sm font-bold font-body">{formatGHS(order.amount)}</span>
                                <span className="text-neutral-gray text-[10px] font-body">{order.paymentStatus === 'no_charge' ? `Waived: ${formatGHS(order.amount)}` : `Paid: ${formatGHS(order.amountPaid)}`}</span>
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

            {/* Order detail panel */}
            {selectedOrder && (
                <OrderDetailPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            )}
        </div>
    );
}

// ─── Filter group ─────────────────────────────────────────────────────────────

function FilterGroup<T>({
    label,
    options,
    selected,
    onToggle,
    labelFn,
    keyFn,
    valueFn,
}: {
    label: string;
    options: T[];
    selected: string[];
    onToggle: (v: T) => void;
    labelFn?: (v: T) => string;
    keyFn?: (v: T) => string | number;
    valueFn?: (v: T) => string;
}) {
    const isSelected = (opt: T) => (valueFn ? selected.includes(valueFn(opt)) : selected.includes(opt as unknown as string));
    return (
        <div>
            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map(opt => (
                    <button
                        key={keyFn ? keyFn(opt) : String(opt)}
                        type="button"
                        onClick={() => onToggle(opt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${isSelected(opt) ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-neutral-light text-neutral-gray hover:text-text-dark border border-transparent'}`}
                    >
                        {labelFn ? labelFn(opt) : String(opt)}
                    </button>
                ))}
            </div>
        </div>
    );
}
