'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    ListIcon,
    MagnifyingGlassIcon,
    XIcon,
    ClockIcon,
    PhoneIcon,
    MapPinIcon,
    CaretDownIcon,
    CaretUpIcon,
    FunnelIcon,
    SpinnerIcon,
    WarningIcon,
    ProhibitIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { useRequestCancel, useCancelOrder } from '@/lib/api/hooks/useOrders';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import { formatPrice, type OrderStatus, type Order } from '@/types/order';
import { STATUS_CONFIG } from '@/lib/constants/order.constants';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import CancelOrderModal from '@/app/components/ui/CancelOrderModal';
import { toast } from '@/lib/utils/toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUS_FILTERS: { label: string; value: string }[] = [
    { label: 'All',       value: 'all'       },
    { label: 'Active',    value: 'active'    },
    { label: 'Completed', value: 'done'      },
    { label: 'Cancelled', value: 'cancelled' },
];

const ACTIVE_STATUSES: OrderStatus[] = ['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'ready_for_pickup'];
const DONE_STATUSES: OrderStatus[]   = ['delivered', 'completed'];

function matchesFilter(status: OrderStatus, filter: string): boolean {
    if (filter === 'all')       return true;
    if (filter === 'active')    return ACTIVE_STATUSES.includes(status);
    if (filter === 'done')      return DONE_STATUSES.includes(status);
    return status === filter;
}

function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.received;
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-semibold font-body" style={{ color: cfg.textColor }}>{cfg.label}</span>
        </span>
    );
}

// ─── Order row (expandable + cancel) ──────────────────────────────────────────

function OrderRow({ order, isLast, onCancel }: { order: Order; isLast: boolean; onCancel: (order: Order) => void }) {
    const [open, setOpen] = useState(false);
    const canCancel = !['cancelled', 'delivered', 'completed', 'cancel_requested'].includes(order.status);

    return (
        <>
            <div
                className={`px-5 py-3.5 flex flex-col md:grid md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 md:items-center cursor-pointer hover:bg-neutral-light/60 transition-colors ${!isLast ? 'border-b border-[#f0e8d8]' : ''}`}
                onClick={() => setOpen(o => !o)}
            >
                <div className="min-w-0">
                    <p className="text-text-dark text-sm font-semibold font-body truncate">{order.contact.name}</p>
                    <p className="text-neutral-gray text-xs font-body">#{order.orderNumber}</p>
                </div>
                <span className="text-neutral-gray text-xs font-body">
                    <span className="md:hidden text-neutral-gray/60">Items: </span>
                    {order.items.reduce((s, it) => s + it.quantity, 0)} item{order.items.reduce((s, it) => s + it.quantity, 0) !== 1 ? 's' : ''}
                </span>
                <div>
                    <span className="md:hidden text-neutral-gray/60 text-xs font-body">Status: </span>
                    <StatusDot status={order.status} />
                </div>
                <span className="text-neutral-gray text-xs font-body flex items-center gap-1">
                    <ClockIcon size={11} weight="fill" />
                    {formatTime(order.placedAt)}
                </span>
                <span className="text-text-dark text-sm font-bold font-body">
                    <span className="md:hidden text-neutral-gray/60 text-xs font-normal">Total: </span>
                    {formatPrice(order.total)}
                </span>
                <span className="shrink-0 text-neutral-gray">
                    {open ? <CaretUpIcon size={14} weight="bold" /> : <CaretDownIcon size={14} weight="bold" />}
                </span>
            </div>

            {open && (
                <div className={`px-5 py-4 bg-[#faf6f0] flex flex-col gap-3 ${!isLast ? 'border-b border-[#f0e8d8]' : ''}`}>
                    <div className="flex flex-wrap gap-4 text-xs font-body">
                        {order.contact.phone && (
                            <span className="flex items-center gap-1.5 text-neutral-gray">
                                <PhoneIcon size={12} weight="fill" />
                                {order.contact.phone}
                            </span>
                        )}
                        {order.contact?.address && (
                            <span className="flex items-center gap-1.5 text-neutral-gray">
                                <MapPinIcon size={12} weight="fill" />
                                {order.contact.address}
                            </span>
                        )}
                        {order.fulfillmentType && (
                            <span className="text-neutral-gray capitalize">{order.fulfillmentType.replace('_', ' ')}</span>
                        )}
                        {order.paymentMethod && (
                            <span className="text-neutral-gray capitalize">{order.paymentMethod.replace('_', ' ')} · {order.paymentStatus}</span>
                        )}
                    </div>
                    <div className="border-t border-[#f0e8d8] pt-3 flex flex-col gap-1.5">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs font-body">
                                <span className="text-text-dark">{item.quantity}× {getOrderItemLineLabel(item)}</span>
                                <span className="text-neutral-gray">{formatPrice(item.unitPrice * item.quantity)}</span>
                            </div>
                        ))}
                        {(order.discount ?? 0) > 0 && (
                            <div className="flex items-center justify-between text-xs font-body">
                                <span className="text-secondary">Discount</span>
                                <span className="text-secondary">−{formatPrice(order.discount ?? 0)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm font-bold font-body border-t border-[#f0e8d8] mt-1 pt-1">
                            <span className="text-text-dark">Total</span>
                            <span className="text-text-dark">{formatPrice(order.total)}</span>
                        </div>
                    </div>
                    {canCancel && (
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); onCancel(order); }}
                            className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-error/30 hover:bg-error/10 text-error text-xs font-semibold font-body transition-colors cursor-pointer mt-1"
                        >
                            <ProhibitIcon size={12} weight="fill" />
                            Cancel Order
                        </button>
                    )}
                </div>
            )}
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesOrdersPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;
    const isAdmin = staffUser?.permissions?.includes('access_admin_panel') ?? false;

    const today = useMemo(() => todayISO(), []);

    const { orders: apiOrders, isLoading, error } = useEmployeeOrders({
        branch_id: branchId,
        date_from: today,
        date_to: today,
        per_page: 200,
    });

    const todayOrders = useMemo(() =>
        apiOrders.map(mapApiOrderToOrder).sort((a, b) => b.placedAt - a.placedAt),
    [apiOrders]);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
    const PAGE_SIZE = 20;

    const { requestCancel } = useRequestCancel();
    const { cancelOrder } = useCancelOrder();

    const filtered = useMemo(() => {
        let list = todayOrders.filter(o => matchesFilter(o.status as OrderStatus, statusFilter));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                o.contact.name.toLowerCase().includes(q) ||
                o.orderNumber.toLowerCase().includes(q) ||
                (o.contact.phone ?? '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [todayOrders, statusFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    useEffect(() => { setPage(0); }, [statusFilter, search]);

    const activeCount = todayOrders.filter(o => ACTIVE_STATUSES.includes(o.status as OrderStatus)).length;

    const handleCancel = useCallback(async (reason: string) => {
        if (!cancelTarget) return;
        if (isAdmin) {
            await cancelOrder({ id: Number(cancelTarget.id), reason });
            toast.success('Order cancelled');
        } else {
            await requestCancel({ id: Number(cancelTarget.id), reason });
            toast.success('Cancel request submitted — awaiting manager approval');
        }
    }, [cancelTarget, isAdmin, cancelOrder, requestCancel]);

    if (!branchId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
                <WarningIcon size={32} weight="fill" className="text-warning" />
                <p className="text-text-dark text-sm font-body font-semibold">No branch assigned</p>
                <p className="text-neutral-gray text-xs font-body text-center">Your account is not assigned to any branch. Contact an administrator.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <SpinnerIcon size={32} className="text-primary animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
                <WarningIcon size={32} weight="fill" className="text-error" />
                <p className="text-text-dark text-sm font-body font-semibold">Unable to load orders</p>
                <p className="text-neutral-gray text-xs font-body text-center">Please check your connection and try again.</p>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ListIcon size={20} weight="fill" className="text-primary" />
                        <h1 className="text-text-dark text-2xl font-bold font-body">Today&apos;s Orders</h1>
                    </div>
                    <p className="text-neutral-gray text-sm font-body">
                        {todayOrders.length} order{todayOrders.length !== 1 ? 's' : ''} today · {activeCount} active
                    </p>
                </div>
            </div>

            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon size={15} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input
                        type="text"
                        placeholder="Search by name, order #, or phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary"
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray hover:text-text-dark cursor-pointer">
                            <XIcon size={14} weight="bold" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1 bg-neutral-card border border-[#f0e8d8] rounded-xl p-1">
                    <FunnelIcon size={14} weight="bold" className="text-neutral-gray ml-2 shrink-0" />
                    {STATUS_FILTERS.map(f => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => setStatusFilter(f.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all cursor-pointer ${statusFilter === f.value ? 'bg-primary text-white' : 'text-neutral-gray hover:text-text-dark'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center bg-neutral-card border border-[#f0e8d8] rounded-2xl">
                    <ListIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                    <p className="text-neutral-gray text-sm font-body">
                        {todayOrders.length === 0 ? 'No orders placed today yet.' : 'No orders match your filters.'}
                    </p>
                </div>
            ) : (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                        {['Customer', 'Items', 'Status', 'Time', 'Amount', ''].map((h, i) => (
                            <span key={i} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                        ))}
                    </div>
                    {paged.map((order, i) => (
                        <OrderRow key={order.id} order={order} isLast={i === paged.length - 1} onCancel={setCancelTarget} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 px-1">
                    <span className="text-neutral-gray text-xs font-body">
                        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold font-body border border-[#f0e8d8] bg-neutral-card text-neutral-gray hover:text-text-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-body text-neutral-gray">{page + 1} / {totalPages}</span>
                        <button
                            type="button"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold font-body border border-[#f0e8d8] bg-neutral-card text-neutral-gray hover:text-text-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Cancel modal */}
            {cancelTarget && (
                <CancelOrderModal
                    orderNumber={cancelTarget.orderNumber}
                    theme="light"
                    context="staff"
                    onCancel={() => setCancelTarget(null)}
                    onConfirm={handleCancel}
                />
            )}
        </div>
    );
}
