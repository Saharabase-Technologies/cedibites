'use client';

import { useState, useMemo } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'received' | 'preparing' | 'ready' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
type OrderSource = 'Online' | 'POS' | 'WhatsApp' | 'Instagram' | 'Facebook' | 'Phone';
type PaymentMethod = 'Mobile Money' | 'Cash on Delivery' | 'Cash at Pickup';

interface OrderItem {
    name: string;
    qty: number;
    price: number;
}

interface TimelineEvent {
    status: string;
    at: string;
    by: string;
}

interface AdminOrder {
    id: string;
    customer: string;
    phone: string;
    email?: string;
    address: string;
    branch: string;
    source: OrderSource;
    items: OrderItem[];
    amount: number;
    payment: PaymentMethod;
    paymentStatus: 'paid' | 'pending' | 'failed';
    hubtelRef?: string;
    status: OrderStatus;
    placedAt: string;
    placedAtFull: string;
    timeline: TimelineEvent[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const ORDERS: AdminOrder[] = [
    {
        id: 'CB847291', customer: 'Ama Serwaa', phone: '0244123456', email: 'ama@gmail.com',
        address: '14 Ring Road, Osu, Accra', branch: 'Osu', source: 'WhatsApp',
        items: [{ name: 'Jollof Rice (Assorted)', qty: 2, price: 85 }, { name: 'Sobolo (Large)', qty: 2, price: 20 }],
        amount: 190, payment: 'Mobile Money', paymentStatus: 'paid', hubtelRef: 'HBT-2024-001',
        status: 'delivered', placedAt: '8:15 AM', placedAtFull: 'Today 8:15 AM',
        timeline: [
            { status: 'Received', at: '8:15 AM', by: 'System' },
            { status: 'Preparing', at: '8:18 AM', by: 'Kofi (Staff)' },
            { status: 'Out for Delivery', at: '8:45 AM', by: 'Kofi (Staff)' },
            { status: 'Delivered', at: '9:10 AM', by: 'Rider - Kweku' },
        ],
    },
    {
        id: 'CB204837', customer: 'Abena Boateng', phone: '0201987654',
        address: 'East Legon Hills, Accra', branch: 'East Legon', source: 'Instagram',
        items: [{ name: 'Waakye (Special)', qty: 1, price: 73 }],
        amount: 73, payment: 'Mobile Money', paymentStatus: 'paid',
        status: 'preparing', placedAt: '9:30 AM', placedAtFull: 'Today 9:30 AM',
        timeline: [
            { status: 'Received', at: '9:30 AM', by: 'System' },
            { status: 'Preparing', at: '9:33 AM', by: 'Esi (Staff)' },
        ],
    },
    {
        id: 'CB173920', customer: 'Yaw Darko', phone: '0277456789',
        address: 'Spintex Road, Accra', branch: 'Spintex', source: 'Facebook',
        items: [{ name: 'Banku & Tilapia', qty: 2, price: 55 }, { name: 'Pineapple Juice', qty: 2, price: 18 }],
        amount: 146, payment: 'Cash on Delivery', paymentStatus: 'pending',
        status: 'out_for_delivery', placedAt: '10:05 AM', placedAtFull: 'Today 10:05 AM',
        timeline: [
            { status: 'Received', at: '10:05 AM', by: 'System' },
            { status: 'Preparing', at: '10:08 AM', by: 'Akosua (Staff)' },
            { status: 'Out for Delivery', at: '10:40 AM', by: 'Rider - Ato' },
        ],
    },
    {
        id: 'CB998812', customer: 'Efua Mensah', phone: '0265321789',
        address: 'Labone, Accra', branch: 'Osu', source: 'Phone',
        items: [{ name: 'Fufu & Light Soup', qty: 1, price: 59 }],
        amount: 59, payment: 'Mobile Money', paymentStatus: 'paid',
        status: 'ready', placedAt: '10:45 AM', placedAtFull: 'Today 10:45 AM',
        timeline: [
            { status: 'Received', at: '10:45 AM', by: 'Kofi (Staff)' },
            { status: 'Preparing', at: '10:47 AM', by: 'Kofi (Staff)' },
            { status: 'Ready', at: '11:10 AM', by: 'Kitchen' },
        ],
    },
    {
        id: 'CB774433', customer: 'Kojo Appiah', phone: '0556123456',
        address: 'East Legon, Accra', branch: 'East Legon', source: 'WhatsApp',
        items: [{ name: 'Fried Rice (Plain)', qty: 2, price: 65 }, { name: 'Milo Ice Cream', qty: 3, price: 10 }],
        amount: 160, payment: 'Mobile Money', paymentStatus: 'paid',
        status: 'ready_for_pickup', placedAt: '11:10 AM', placedAtFull: 'Today 11:10 AM',
        timeline: [
            { status: 'Received', at: '11:10 AM', by: 'System' },
            { status: 'Preparing', at: '11:12 AM', by: 'Esi (Staff)' },
            { status: 'Ready for Pickup', at: '11:40 AM', by: 'Kitchen' },
        ],
    },
    {
        id: 'CB556677', customer: 'Adwoa Ofori', phone: '0249654321',
        address: 'Spintex, Accra', branch: 'Spintex', source: 'Online',
        items: [{ name: 'Jollof Rice (Plain)', qty: 2, price: 48 }],
        amount: 96, payment: 'Mobile Money', paymentStatus: 'paid',
        status: 'completed', placedAt: '11:50 AM', placedAtFull: 'Today 11:50 AM',
        timeline: [
            { status: 'Received', at: '11:50 AM', by: 'System' },
            { status: 'Preparing', at: '11:52 AM', by: 'Akosua (Staff)' },
            { status: 'Delivered', at: '12:25 PM', by: 'Rider' },
            { status: 'Completed', at: '12:26 PM', by: 'System' },
        ],
    },
    {
        id: 'CB112233', customer: 'Fiifi Annan', phone: '0270789456',
        address: 'Osu, Accra', branch: 'Osu', source: 'POS',
        items: [{ name: 'Kelewele', qty: 2, price: 20 }, { name: 'Sobolo', qty: 2, price: 18 }],
        amount: 76, payment: 'Cash at Pickup', paymentStatus: 'paid',
        status: 'completed', placedAt: '12:00 PM', placedAtFull: 'Today 12:00 PM',
        timeline: [
            { status: 'Received', at: '12:00 PM', by: 'POS - Kofi' },
            { status: 'Completed', at: '12:15 PM', by: 'POS - Kofi' },
        ],
    },
    {
        id: 'CB332211', customer: 'Nana Asare', phone: '0244789123',
        address: 'Spintex, Accra', branch: 'Spintex', source: 'Phone',
        items: [{ name: 'Banku & Okro Stew', qty: 1, price: 35 }],
        amount: 35, payment: 'Cash on Delivery', paymentStatus: 'failed',
        status: 'cancelled', placedAt: '12:20 PM', placedAtFull: 'Today 12:20 PM',
        timeline: [
            { status: 'Received', at: '12:20 PM', by: 'Akosua (Staff)' },
            { status: 'Cancelled', at: '12:25 PM', by: 'Admin - Nana Kwame', },
        ],
    },
    {
        id: 'CB445566', customer: 'Akua Owusu', phone: '0201456789',
        address: 'Airport Residential, Accra', branch: 'East Legon', source: 'WhatsApp',
        items: [{ name: 'Jollof Rice (Assorted)', qty: 2, price: 85 }, { name: 'Fried Plantain', qty: 1, price: 15 }],
        amount: 185, payment: 'Mobile Money', paymentStatus: 'paid',
        status: 'received', placedAt: '1:00 PM', placedAtFull: 'Today 1:00 PM',
        timeline: [{ status: 'Received', at: '1:00 PM', by: 'System' }],
    },
    {
        id: 'CB667788', customer: 'Kwame Frimpong', phone: '0277654123',
        address: 'East Legon, Accra', branch: 'East Legon', source: 'Instagram',
        items: [{ name: 'Waakye (Small)', qty: 2, price: 41 }],
        amount: 82, payment: 'Mobile Money', paymentStatus: 'paid',
        status: 'preparing', placedAt: '1:15 PM', placedAtFull: 'Today 1:15 PM',
        timeline: [
            { status: 'Received', at: '1:15 PM', by: 'System' },
            { status: 'Preparing', at: '1:17 PM', by: 'Esi (Staff)' },
        ],
    },
];

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
const ALL_PAYMENTS: PaymentMethod[] = ['Mobile Money', 'Cash on Delivery', 'Cash at Pickup'];
const ALL_BRANCHES = ['Osu', 'East Legon', 'Spintex'];

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
                                <span className={`text-xs font-semibold font-body capitalize ${order.paymentStatus === 'paid' ? 'text-secondary' : order.paymentStatus === 'failed' ? 'text-error' : 'text-warning'}`}>
                                    {order.paymentStatus}
                                </span>
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
                                        <p className="text-neutral-gray text-[10px] font-body">{ev.at} · {ev.by}</p>
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
                <ConfirmModal
                    title="Cancel this order?"
                    description={`Order #${order.id} for ${order.customer} will be cancelled. An SMS will be sent to the customer.`}
                    onConfirm={() => setShowConfirm(null)}
                    onCancel={() => setShowConfirm(null)}
                    dangerous
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

export default function AdminOrdersPage() {
    const [search, setSearch] = useState('');
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
    const [datePreset, setDatePreset] = useState('Today');
    const [page, setPage] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const filtered = useMemo(() => {
        let list = ORDERS;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                o.id.toLowerCase().includes(q) ||
                o.customer.toLowerCase().includes(q) ||
                o.phone.includes(q)
            );
        }
        if (selectedBranches.length) list = list.filter(o => selectedBranches.includes(o.branch));
        if (selectedStatuses.length) list = list.filter(o => selectedStatuses.includes(o.status));
        if (selectedSources.length) list = list.filter(o => selectedSources.includes(o.source));
        if (selectedPayments.length) list = list.filter(o => selectedPayments.includes(o.payment));
        return list;
    }, [search, selectedBranches, selectedStatuses, selectedSources, selectedPayments]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageOrders = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    function toggleFilter<T extends string>(arr: T[], set: (v: T[]) => void, val: T) {
        set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
    }

    const activeFilterCount = selectedBranches.length + selectedStatuses.length + selectedSources.length + selectedPayments.length;

    return (
        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Orders</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">All branches · {filtered.length} orders</p>
                </div>
                <button type="button" className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0">
                    <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                    Export CSV
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
                            onClick={() => setDatePreset(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${datePreset === p ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Expanded filters */}
                {showFilters && (
                    <div className="border-t border-[#f0e8d8] pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <FilterGroup label="Branch" options={ALL_BRANCHES} selected={selectedBranches} onToggle={v => toggleFilter(selectedBranches, setSelectedBranches, v)} />
                        <FilterGroup label="Status" options={ALL_STATUSES} selected={selectedStatuses} onToggle={v => toggleFilter(selectedStatuses, setSelectedStatuses, v)} labelFn={v => STATUS_STYLES[v]?.label ?? v} />
                        <FilterGroup label="Source" options={ALL_SOURCES} selected={selectedSources} onToggle={v => toggleFilter(selectedSources, setSelectedSources, v)} />
                        <FilterGroup label="Payment" options={ALL_PAYMENTS} selected={selectedPayments} onToggle={v => toggleFilter(selectedPayments, setSelectedPayments, v)} />
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-4">
                <div className="hidden md:grid grid-cols-[1.2fr_1fr_0.9fr_1.3fr_1fr_1.2fr_1fr_1fr] gap-3 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['Order #', 'Branch', 'Source', 'Customer', 'Payment', 'Status', 'Amount', 'Time'].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {pageOrders.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">No orders match your filters.</p>
                    </div>
                ) : (
                    pageOrders.map((order, i) => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1.2fr_1fr_0.9fr_1.3fr_1fr_1.2fr_1fr_1fr] gap-2 md:gap-3 md:items-center cursor-pointer hover:bg-neutral-light/60 transition-colors ${i < pageOrders.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
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
                            <span className="text-neutral-gray text-[10px] font-body">{order.payment.split(' ')[0]}</span>
                            <StatusBadge status={order.status} />
                            <span className="text-text-dark text-sm font-bold font-body">{formatGHS(order.amount)}</span>
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

function FilterGroup<T extends string>({
    label,
    options,
    selected,
    onToggle,
    labelFn,
}: {
    label: string;
    options: T[];
    selected: T[];
    onToggle: (v: T) => void;
    labelFn?: (v: T) => string;
}) {
    return (
        <div>
            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onToggle(opt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${selected.includes(opt) ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-neutral-light text-neutral-gray hover:text-text-dark border border-transparent'}`}
                    >
                        {labelFn ? labelFn(opt) : opt}
                    </button>
                ))}
            </div>
        </div>
    );
}
