'use client';

import { useMemo } from 'react';
import {
    ClockIcon,
    PhoneIcon,
    WhatsappLogoIcon,
    InstagramLogoIcon,
    FacebookLogoIcon,
    GlobeIcon,
    DeviceMobileIcon,
    ReceiptIcon,
    CurrencyCircleDollarIcon,
    ListChecksIcon,
    TrendUpIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderSource = 'online' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'pos';
type OrderStatus = 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'ready_for_pickup' | 'delivered' | 'completed' | 'cancelled';
type PaymentMethod = 'momo' | 'cash_delivery' | 'cash_pickup';

interface SalesOrder {
    id: string;
    status: OrderStatus;
    source: OrderSource;
    branch: string;
    customer: { name: string; phone: string };
    itemCount: number;
    total: number;
    payment: PaymentMethod;
    placedAt: Date;
}

// ─── Mock data — replace with GET /api/v1/staff/my-sales?period=today ─────────
//
// Backend responsibility:
//   - Only return orders created BY this staff member (from JWT identity)
//   - Enforce 24-hour window server-side — non-manager staff cannot query beyond this
//   - Manager staff have no time restriction on their own sales history
//   - Response shape: { orders: SalesOrder[], generatedAt: ISO string }

function hoursAgo(h: number) { return new Date(Date.now() - h * 3600000); }
function minsAgo(m: number) { return new Date(Date.now() - m * 60000); }

const MY_SALES_TODAY: SalesOrder[] = [
    { id: 'CB847291', status: 'out_for_delivery', source: 'whatsapp', branch: 'East Legon', customer: { name: 'Ama Serwaa', phone: '0244 123 456' }, itemCount: 4, total: 94, payment: 'momo', placedAt: minsAgo(22) },
    { id: 'CB391045', status: 'completed', source: 'phone', branch: 'Osu', customer: { name: 'Kweku Asante', phone: '0201 987 654' }, itemCount: 2, total: 50, payment: 'cash_pickup', placedAt: minsAgo(85) },
    { id: 'CB204837', status: 'delivered', source: 'instagram', branch: 'Tema', customer: { name: 'Abena Boateng', phone: '0551 234 567' }, itemCount: 1, total: 73, payment: 'momo', placedAt: hoursAgo(2) },
    { id: 'CB173920', status: 'preparing', source: 'facebook', branch: 'Madina', customer: { name: 'Yaw Darko', phone: '0277 654 321' }, itemCount: 4, total: 110, payment: 'cash_delivery', placedAt: minsAgo(34) },
    { id: 'CB998812', status: 'delivered', source: 'phone', branch: 'East Legon', customer: { name: 'Efua Mensah', phone: '0244 567 890' }, itemCount: 2, total: 59, payment: 'momo', placedAt: hoursAgo(3) },
    { id: 'CB774433', status: 'cancelled', source: 'whatsapp', branch: 'Osu', customer: { name: 'Kojo Appiah', phone: '0200 112 233' }, itemCount: 3, total: 117, payment: 'momo', placedAt: hoursAgo(1) },
    { id: 'CB556677', status: 'completed', source: 'phone', branch: 'La Paz', customer: { name: 'Adwoa Ofori', phone: '0245 678 901' }, itemCount: 2, total: 96, payment: 'cash_pickup', placedAt: hoursAgo(4) },
    { id: 'CB112233', status: 'delivered', source: 'facebook', branch: 'Dzorwulu', customer: { name: 'Fiifi Annan', phone: '0266 778 899' }, itemCount: 2, total: 76, payment: 'momo', placedAt: hoursAgo(5) },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_ICON: Record<OrderSource, React.ElementType> = {
    online: GlobeIcon,
    phone: PhoneIcon,
    whatsapp: WhatsappLogoIcon,
    instagram: InstagramLogoIcon,
    facebook: FacebookLogoIcon,
    pos: DeviceMobileIcon,
};

const SOURCE_LABEL: Record<OrderSource, string> = {
    online: 'Online',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    pos: 'POS',
};

const STATUS: Record<OrderStatus, { dot: string; label: string }> = {
    received: { dot: 'bg-neutral-gray', label: 'Received' },
    preparing: { dot: 'bg-primary', label: 'Preparing' },
    ready: { dot: 'bg-warning', label: 'Ready' },
    out_for_delivery: { dot: 'bg-info', label: 'Delivering' },
    ready_for_pickup: { dot: 'bg-info', label: 'Ready Pickup' },
    delivered: { dot: 'bg-secondary', label: 'Delivered' },
    completed: { dot: 'bg-secondary', label: 'Completed' },
    cancelled: { dot: 'bg-error', label: 'Cancelled' },
};

const PAY_LABEL: Record<PaymentMethod, string> = {
    momo: 'MoMo',
    cash_delivery: 'Cash',
    cash_pickup: 'Cash',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(n: number) { return `GHS ${n.toFixed(2)}`; }
function formatTime(d: Date) {
    return d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(d: Date) {
    return d.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent }: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
    accent: string;
}) {
    return (
        <div className="bg-brown border border-brown-light/15 rounded-2xl px-4 py-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Icon size={15} weight="fill" className={accent} />
                <span className="text-neutral-gray text-xs font-body">{label}</span>
            </div>
            <p className={`text-2xl font-bold font-body leading-none ${accent}`}>{value}</p>
            {sub && <p className="text-neutral-gray text-xs font-body">{sub}</p>}
        </div>
    );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function SalesRow({ order, index }: { order: SalesOrder; index: number }) {
    const SourceIcon = SOURCE_ICON[order.source];
    const status = STATUS[order.status];
    const isCancelled = order.status === 'cancelled';

    return (
        <tr className={`
      border-b border-brown-light/10 transition-colors hover:bg-brown-light/5
      ${isCancelled ? 'opacity-50' : ''}
    `}>

            {/* # */}
            <td className="px-4 py-3.5 text-neutral-gray text-xs font-body w-8 text-center">
                {index + 1}
            </td>

            {/* Time */}
            <td className="px-4 py-3.5 text-text-light text-xs font-body whitespace-nowrap">
                {formatTime(order.placedAt)}
            </td>

            {/* Order ID */}
            <td className="px-4 py-3.5">
                <span className="text-text-light text-xs font-bold font-body tracking-wide">#{order.id}</span>
            </td>

            {/* Customer */}
            <td className="px-4 py-3.5 min-w-[150px]">
                <p className="text-text-light text-sm font-semibold font-body leading-none">{order.customer.name}</p>
                <p className="text-neutral-gray text-[10px] font-body mt-0.5">{order.customer.phone}</p>
            </td>

            {/* Branch — hidden on smaller screens */}
            <td className="px-4 py-3.5 text-neutral-gray text-xs font-body whitespace-nowrap hidden lg:table-cell">
                {order.branch}
            </td>

            {/* Source — hidden on mobile */}
            <td className="px-4 py-3.5 hidden md:table-cell">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium font-body text-neutral-gray">
                    <SourceIcon size={11} weight="fill" />
                    {SOURCE_LABEL[order.source]}
                </span>
            </td>

            {/* Items */}
            <td className="px-4 py-3.5 text-neutral-gray text-xs font-body text-center hidden sm:table-cell">
                {order.itemCount}
            </td>

            {/* Payment */}
            <td className="px-4 py-3.5 text-neutral-gray text-xs font-body hidden md:table-cell">
                {PAY_LABEL[order.payment]}
            </td>

            {/* Total */}
            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                <span className={`text-sm font-bold font-body ${isCancelled ? 'line-through text-neutral-gray' : 'text-primary'}`}>
                    {formatGHS(order.total)}
                </span>
            </td>

            {/* Status */}
            <td className="px-4 py-3.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold font-body text-neutral-gray whitespace-nowrap">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${status.dot}`} />
                    {status.label}
                </span>
            </td>
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MySalesPage() {

    // TODO: replace with real staff auth context
    // const { staff } = useStaffAuth();
    const staffName = 'Kofi Mensah';

    // TODO: fetch from GET /api/v1/staff/my-sales?period=today
    const orders = MY_SALES_TODAY;

    const activeOrders = useMemo(() => orders.filter(o => o.status !== 'cancelled'), [orders]);
    const cancelledOrders = useMemo(() => orders.filter(o => o.status === 'cancelled'), [orders]);

    const totalRevenue = useMemo(() => activeOrders.reduce((s, o) => s + o.total, 0), [activeOrders]);
    const totalItems = useMemo(() => activeOrders.reduce((s, o) => s + o.itemCount, 0), [activeOrders]);
    const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

    const sourceBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        activeOrders.forEach(o => { map[o.source] = (map[o.source] ?? 0) + 1; });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [activeOrders]);

    const today = new Date();

    // Suppress unused var warning until auth is wired
    void staffName;

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark dark:text-text-light text-xl font-bold font-body">My Sales</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5 flex items-center gap-1.5">
                        <ClockIcon size={13} weight="fill" />
                        {formatDate(today)}
                    </p>
                </div>

                {/* 24hr restriction badge */}
                <div className="flex items-center gap-2 bg-warning/10 border border-warning/25 rounded-xl px-3 py-2 w-fit">
                    <WarningCircleIcon size={14} weight="fill" className="text-warning shrink-0" />
                    <p className="text-warning text-xs font-body font-medium">
                        Today only · 24-hour view
                    </p>
                </div>
            </div>

            {/* ── Stats ──────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard
                    icon={ReceiptIcon}
                    label="Orders Placed"
                    value={String(activeOrders.length)}
                    sub={cancelledOrders.length > 0 ? `${cancelledOrders.length} cancelled` : 'No cancellations'}
                    accent="text-primary"
                />
                <StatCard
                    icon={CurrencyCircleDollarIcon}
                    label="Revenue Generated"
                    value={formatGHS(totalRevenue)}
                    sub="Excl. cancelled"
                    accent="text-secondary"
                />
                <StatCard
                    icon={ListChecksIcon}
                    label="Items Sold"
                    value={String(totalItems)}
                    accent="text-info"
                />
                <StatCard
                    icon={TrendUpIcon}
                    label="Avg. Order Value"
                    value={formatGHS(avgOrderValue)}
                    accent="text-warning"
                />
            </div>

            {/* ── Source breakdown pills ─────────────────────────────────────── */}
            {sourceBreakdown.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {sourceBreakdown.map(([src, count]) => {
                        const Icon = SOURCE_ICON[src as OrderSource];
                        return (
                            <div
                                key={src}
                                className="flex items-center gap-1.5 bg-brown border border-brown-light/15 rounded-full px-3 py-1.5"
                            >
                                <Icon size={12} weight="fill" className="text-neutral-gray" />
                                <span className="text-neutral-gray text-xs font-body">{SOURCE_LABEL[src as OrderSource]}</span>
                                <span className="text-text-light text-xs font-bold font-body">{count}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Table ──────────────────────────────────────────────────────── */}
            {orders.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-20">
                    <ReceiptIcon size={36} weight="thin" className="text-neutral-gray/40" />
                    <p className="text-neutral-gray text-sm font-body">No orders placed by you today.</p>
                </div>
            ) : (
                <div className="bg-brown border border-brown-light/15 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px]">

                            {/* Head */}
                            <thead>
                                <tr className="border-b border-brown-light/20 bg-brand-dark/40">
                                    {['#', 'Time', 'Order', 'Customer', 'Branch', 'Source', 'Items', 'Payment', 'Total', 'Status'].map((h, i) => (
                                        <th
                                            key={h}
                                            className={`
                        px-4 py-3 text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider
                        ${i === 0 ? 'text-center w-8' : 'text-left'}
                        ${h === 'Branch' ? 'hidden lg:table-cell' : ''}
                        ${h === 'Source' ? 'hidden md:table-cell' : ''}
                        ${h === 'Items' ? 'hidden sm:table-cell text-center' : ''}
                        ${h === 'Payment' ? 'hidden md:table-cell' : ''}
                        ${h === 'Total' ? 'text-right' : ''}
                      `}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Body — active first, cancelled at bottom */}
                            <tbody>
                                {activeOrders.map((order, i) => (
                                    <SalesRow key={order.id} order={order} index={i} />
                                ))}
                                {cancelledOrders.map((order, i) => (
                                    <SalesRow key={order.id} order={order} index={activeOrders.length + i} />
                                ))}
                            </tbody>

                            {/* Foot */}
                            <tfoot>
                                <tr className="border-t-2 border-brown-light/25 bg-brand-dark/20">
                                    <td
                                        colSpan={8}
                                        className="px-4 py-4 text-text-light text-sm font-bold font-body text-right hidden md:table-cell"
                                    >
                                        Total Revenue
                                    </td>
                                    <td
                                        colSpan={8}
                                        className="px-4 py-4 text-text-light text-sm font-bold font-body text-right md:hidden"
                                    >
                                        Total
                                    </td>
                                    <td className="px-4 py-4 text-primary text-base font-bold font-body text-right whitespace-nowrap">
                                        {formatGHS(totalRevenue)}
                                    </td>
                                    <td className="px-4 py-4" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Footer notice */}
            <p className="text-neutral-gray/40 text-xs font-body text-center mt-6">
                Shows only orders you placed today. Contact your branch manager for historical data.
            </p>

        </div>
    );
}
