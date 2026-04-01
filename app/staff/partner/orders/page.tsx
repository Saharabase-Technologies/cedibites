'use client';

import { useState, useMemo } from 'react';
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
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { formatPrice, type OrderStatus } from '@/types/order';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: OrderStatus | 'all' | 'active' | 'done' }[] = [
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

function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

function isToday(ts: number) {
    const d = new Date(ts);
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.received;
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-semibold font-body text-text-dark">{cfg.label}</span>
        </span>
    );
}

// ─── Order row (expandable) ───────────────────────────────────────────────────

function OrderRow({ order, isLast }: { order: ReturnType<typeof useOrderStore>['orders'][number]; isLast: boolean }) {
    const [open, setOpen] = useState(false);

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
                    {order.items.reduce((s, it) => s + it.quantity, 0)} item{order.items.reduce((s, it) => s + it.quantity, 0) !== 1 ? 's' : ''}
                </span>
                <StatusDot status={order.status} />
                <span className="text-neutral-gray text-xs font-body flex items-center gap-1">
                    <ClockIcon size={11} weight="fill" />
                    {isToday(order.placedAt) ? formatTime(order.placedAt) : formatDate(order.placedAt)}
                </span>
                <span className="text-text-dark text-sm font-bold font-body">{formatPrice(order.total)}</span>
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
                        <span className="text-neutral-gray capitalize">{order.fulfillmentType?.replace('_', ' ')}</span>
                        <span className="text-neutral-gray capitalize">{order.paymentMethod?.replace('_', ' ')} · {order.paymentStatus}</span>
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
                </div>
            )}
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerOrdersPage() {
    const { staffUser } = useStaffAuth();
    const { orders } = useOrderStore();
    const branchName = staffUser?.branches[0]?.name ?? '';

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const branchOrders = useMemo(() =>
        orders
            .filter(o => o.branch.name === branchName)
            .sort((a, b) => b.placedAt - a.placedAt),
    [orders, branchName]);

    const filtered = useMemo(() => {
        let list = branchOrders.filter(o => matchesFilter(o.status as OrderStatus, statusFilter));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                o.contact.name.toLowerCase().includes(q) ||
                o.orderNumber.toLowerCase().includes(q)
            );
        }
        return list;
    }, [branchOrders, statusFilter, search]);

    const activeCount = branchOrders.filter(o => ACTIVE_STATUSES.includes(o.status as OrderStatus)).length;

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ListIcon size={20} weight="fill" className="text-primary" />
                        <h1 className="text-text-dark text-2xl font-bold font-body">Orders</h1>
                    </div>
                    <p className="text-neutral-gray text-sm font-body">
                        {branchOrders.length} total · {activeCount} active now
                    </p>
                </div>
            </div>

            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon size={15} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input
                        type="text"
                        placeholder="Search by name or order #..."
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
                    <p className="text-neutral-gray text-sm font-body">No orders match your filters.</p>
                </div>
            ) : (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                        {['Customer', 'Items', 'Status', 'Time', 'Amount', ''].map((h, i) => (
                            <span key={i} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                        ))}
                    </div>
                    {filtered.map((order, i) => (
                        <OrderRow key={order.id} order={order} isLast={i === filtered.length - 1} />
                    ))}
                </div>
            )}
        </div>
    );
}
