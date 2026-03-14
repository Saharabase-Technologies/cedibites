'use client';

import { useState, useMemo } from 'react';
import {
    MagnifyingGlassIcon,
    XIcon,
    UserCircleIcon,
    PhoneIcon,
    EnvelopeIcon,
    MapPinIcon,
    ClockIcon,
    LockSimpleIcon,
    ProhibitIcon,
    TrashIcon,
    ArrowCounterClockwiseIcon,
    DownloadSimpleIcon,
    CaretRightIcon,
    WarningCircleIcon,
    ReceiptIcon,
    CurrencyCircleDollarIcon,
    TrendUpIcon,
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomerStatus = 'active' | 'suspended';
type AccountType = 'Registered' | 'Guest';

interface CustomerOrder {
    id: string;
    branch: string;
    status: string;
    amount: number;
    date: string;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    accountType: AccountType;
    status: CustomerStatus;
    totalOrders: number;
    totalSpend: number;
    lastOrderDate: string;
    joinDate: string;
    addresses: string[];
    orders: CustomerOrder[];
    mostOrderedItem: string;
    avgOrderValue: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const CUSTOMERS: Customer[] = [
    {
        id: 'c1', name: 'Ama Serwaa', phone: '0244123456', email: 'ama.serwaa@gmail.com',
        accountType: 'Registered', status: 'active',
        totalOrders: 24, totalSpend: 1840, lastOrderDate: 'Today 8:15 AM', joinDate: 'Jan 2024', avgOrderValue: 76.67,
        addresses: ['14 Ring Road, Osu, Accra', 'Airport Residential, Accra'],
        mostOrderedItem: 'Jollof Rice (Assorted)',
        orders: [
            { id: 'CB847291', branch: 'Osu',        status: 'delivered',  amount: 94,  date: 'Today 8:15 AM'    },
            { id: 'CB445566', branch: 'East Legon',  status: 'completed',  amount: 145, date: 'Yesterday 2:00 PM' },
            { id: 'CB220011', branch: 'Osu',        status: 'completed',  amount: 88,  date: 'Mar 8, 2:30 PM'   },
        ],
    },
    {
        id: 'c2', name: 'Kwame Asante', phone: '0277456789', email: 'kwame.asante@yahoo.com',
        accountType: 'Registered', status: 'active',
        totalOrders: 18, totalSpend: 1260, lastOrderDate: 'Yesterday', joinDate: 'Feb 2024', avgOrderValue: 70.00,
        addresses: ['East Legon, Accra'],
        mostOrderedItem: 'Waakye (Special)',
        orders: [
            { id: 'CB334466', branch: 'East Legon',  status: 'completed',  amount: 90,  date: 'Yesterday 9:30 AM' },
            { id: 'CB119977', branch: 'East Legon',  status: 'delivered',  amount: 73,  date: 'Mar 7, 12:00 PM'  },
        ],
    },
    {
        id: 'c3', name: 'Abena Boateng', phone: '0201987654', email: 'abena.b@gmail.com',
        accountType: 'Registered', status: 'active',
        totalOrders: 31, totalSpend: 2480, lastOrderDate: 'Today 9:30 AM', joinDate: 'Nov 2023', avgOrderValue: 80.00,
        addresses: ['East Legon Hills, Accra', 'Labone, Accra'],
        mostOrderedItem: 'Banku & Tilapia',
        orders: [
            { id: 'CB204837', branch: 'East Legon',  status: 'preparing',  amount: 73,  date: 'Today 9:30 AM'    },
            { id: 'CB667788', branch: 'East Legon',  status: 'completed',  amount: 82,  date: 'Yesterday 11:30 AM'},
        ],
    },
    {
        id: 'c4', name: 'Yaw Darko', phone: '0265321789',
        accountType: 'Guest', status: 'active',
        totalOrders: 5, totalSpend: 375, lastOrderDate: 'Today 10:05 AM', joinDate: 'Mar 2024', avgOrderValue: 75.00,
        addresses: ['Spintex Road, Accra'],
        mostOrderedItem: 'Banku & Tilapia',
        orders: [
            { id: 'CB173920', branch: 'Spintex',    status: 'out_for_delivery', amount: 110, date: 'Today 10:05 AM' },
        ],
    },
    {
        id: 'c5', name: 'Efua Mensah', phone: '0249654321', email: 'efua.m@outlook.com',
        accountType: 'Registered', status: 'suspended',
        totalOrders: 12, totalSpend: 840, lastOrderDate: '2 weeks ago', joinDate: 'Dec 2023', avgOrderValue: 70.00,
        addresses: ['Labone, Accra'],
        mostOrderedItem: 'Fufu & Light Soup',
        orders: [
            { id: 'CB998812', branch: 'Osu',        status: 'cancelled',  amount: 59,  date: '2 weeks ago' },
        ],
    },
    {
        id: 'c6', name: 'Kojo Appiah', phone: '0556123456',
        accountType: 'Guest', status: 'active',
        totalOrders: 8, totalSpend: 640, lastOrderDate: 'Today 11:10 AM', joinDate: 'Mar 2024', avgOrderValue: 80.00,
        addresses: ['East Legon, Accra'],
        mostOrderedItem: 'Fried Rice (Plain)',
        orders: [
            { id: 'CB774433', branch: 'East Legon',  status: 'ready_for_pickup', amount: 160, date: 'Today 11:10 AM' },
        ],
    },
    {
        id: 'c7', name: 'Adwoa Ofori', phone: '0270789456', email: 'adwoa.ofori@gmail.com',
        accountType: 'Registered', status: 'active',
        totalOrders: 42, totalSpend: 3360, lastOrderDate: 'Today 11:50 AM', joinDate: 'Oct 2023', avgOrderValue: 80.00,
        addresses: ['Spintex, Accra', 'Accra Mall Area'],
        mostOrderedItem: 'Jollof Rice (Plain)',
        orders: [
            { id: 'CB556677', branch: 'Spintex',    status: 'completed',  amount: 96,  date: 'Today 11:50 AM'   },
            { id: 'CB334477', branch: 'Spintex',    status: 'delivered',  amount: 88,  date: 'Yesterday 1:00 PM'},
        ],
    },
    {
        id: 'c8', name: 'Fiifi Annan', phone: '0244789123',
        accountType: 'Guest', status: 'active',
        totalOrders: 3, totalSpend: 210, lastOrderDate: 'Today 12:00 PM', joinDate: 'Mar 2024', avgOrderValue: 70.00,
        addresses: ['Osu, Accra'],
        mostOrderedItem: 'Kelewele',
        orders: [
            { id: 'CB112233', branch: 'Osu',        status: 'completed',  amount: 76,  date: 'Today 12:00 PM'   },
        ],
    },
];

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
    received:         { dot: 'bg-info',           label: 'Received'        },
    preparing:        { dot: 'bg-warning',         label: 'Preparing'       },
    ready:            { dot: 'bg-secondary',       label: 'Ready'           },
    ready_for_pickup: { dot: 'bg-secondary',       label: 'Ready Pickup'    },
    out_for_delivery: { dot: 'bg-primary',         label: 'Out for Delivery'},
    delivered:        { dot: 'bg-secondary',       label: 'Delivered'       },
    completed:        { dot: 'bg-neutral-gray/40', label: 'Completed'       },
    cancelled:        { dot: 'bg-error',           label: 'Cancelled'       },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) { return `GHS ${v.toFixed(2)}`; }

// ─── Customer detail panel ────────────────────────────────────────────────────

function CustomerDetailPanel({ customer, onClose, onSuspend, onUnsuspend, onDelete }: {
    customer: Customer;
    onClose: () => void;
    onSuspend: () => void;
    onUnsuspend: () => void;
    onDelete: () => void;
}) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    return (
        <>
            <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" onClick={onClose} />
            <aside className="fixed right-0 top-0 h-full z-40 w-full max-w-md bg-neutral-card border-l border-[#f0e8d8] flex flex-col shadow-2xl overflow-hidden">

                <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8d8]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                            <span className="text-primary text-sm font-bold font-body">{customer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                        </div>
                        <div>
                            <p className="text-text-dark text-sm font-bold font-body">{customer.name}</p>
                            <span className={`text-[10px] font-body px-2 py-0.5 rounded-full ${customer.accountType === 'Registered' ? 'bg-primary/10 text-primary' : 'bg-neutral-light text-neutral-gray'}`}>
                                {customer.accountType}
                            </span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer">
                        <XIcon size={16} className="text-neutral-gray" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

                    {/* Profile */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Contact</p>
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-2">
                            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-primary text-xs font-body hover:underline">
                                <PhoneIcon size={12} weight="fill" />
                                {customer.phone}
                            </a>
                            {customer.email && (
                                <div className="flex items-center gap-2">
                                    <EnvelopeIcon size={12} weight="fill" className="text-neutral-gray" />
                                    <span className="text-neutral-gray text-xs font-body">{customer.email}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <ClockIcon size={12} weight="fill" className="text-neutral-gray" />
                                <span className="text-neutral-gray text-xs font-body">Joined {customer.joinDate}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { icon: ReceiptIcon, label: 'Orders', value: customer.totalOrders },
                            { icon: CurrencyCircleDollarIcon, label: 'Total Spend', value: formatGHS(customer.totalSpend) },
                            { icon: TrendUpIcon, label: 'Avg. Order', value: formatGHS(customer.avgOrderValue) },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="bg-neutral-light rounded-xl p-3 text-center">
                                <Icon size={14} weight="fill" className="text-primary mx-auto mb-1" />
                                <p className="text-text-dark text-sm font-bold font-body">{value}</p>
                                <p className="text-neutral-gray text-[10px] font-body">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Most ordered */}
                    <div className="bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">Most Ordered</p>
                        <p className="text-text-dark text-sm font-semibold font-body">{customer.mostOrderedItem}</p>
                    </div>

                    {/* Saved addresses */}
                    {customer.addresses.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Saved Addresses</p>
                            <div className="flex flex-col gap-2">
                                {customer.addresses.map((addr, i) => (
                                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-neutral-light rounded-xl">
                                        <MapPinIcon size={12} weight="fill" className="text-neutral-gray mt-0.5 shrink-0" />
                                        <p className="text-neutral-gray text-xs font-body">{addr}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Order history */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Order History</p>
                        <div className="bg-neutral-light rounded-xl overflow-hidden">
                            {customer.orders.map((order, i) => {
                                const statusCfg = STATUS_STYLES[order.status] ?? STATUS_STYLES.received;
                                return (
                                    <div key={order.id} className={`flex items-center justify-between px-3 py-3 ${i < customer.orders.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-text-dark text-xs font-bold font-body">#{order.id}</span>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-body text-neutral-gray">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                                                </span>
                                            </div>
                                            <p className="text-neutral-gray text-[10px] font-body">{order.branch} · {order.date}</p>
                                        </div>
                                        <span className="text-text-dark text-xs font-bold font-body">{formatGHS(order.amount)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="border-t border-[#f0e8d8] p-4 flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Admin Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                        {customer.accountType === 'Registered' && (
                            <button type="button" className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                                <LockSimpleIcon size={13} weight="bold" className="text-primary" />
                                Reset Password
                            </button>
                        )}
                        {customer.status === 'active' ? (
                            <button type="button" onClick={onSuspend}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-error/10 rounded-xl text-error text-xs font-medium font-body hover:bg-error/20 transition-colors cursor-pointer">
                                <ProhibitIcon size={13} weight="bold" />
                                Suspend Account
                            </button>
                        ) : (
                            <button type="button" onClick={onUnsuspend}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-secondary/10 rounded-xl text-secondary text-xs font-medium font-body hover:bg-secondary/20 transition-colors cursor-pointer">
                                <ArrowCounterClockwiseIcon size={13} weight="bold" />
                                Unsuspend
                            </button>
                        )}
                        <button type="button" className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                            <DownloadSimpleIcon size={13} weight="bold" className="text-primary" />
                            Export Data
                        </button>
                        <button type="button" onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-error/10 rounded-xl text-error text-xs font-medium font-body hover:bg-error/20 transition-colors cursor-pointer">
                            <TrashIcon size={13} weight="bold" />
                            Delete Account
                        </button>
                    </div>
                </div>
            </aside>

            {showDeleteConfirm && (
                <DeleteCustomerModal
                    customer={customer}
                    onConfirm={() => { onDelete(); setShowDeleteConfirm(false); }}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </>
    );
}

function DeleteCustomerModal({ customer, onConfirm, onCancel }: { customer: Customer; onConfirm: () => void; onCancel: () => void }) {
    const [input, setInput] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="h-1.5 bg-error" />
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <WarningCircleIcon size={18} weight="fill" className="text-error" />
                        <h3 className="text-text-dark text-base font-bold font-body">Delete customer account?</h3>
                    </div>
                    <p className="text-neutral-gray text-sm font-body mb-4">
                        This will permanently delete <strong className="text-text-dark">{customer.name}</strong>&apos;s account and anonymise their order history (replacing name/phone/email with [Deleted Customer]).
                    </p>
                    <p className="text-xs font-body text-neutral-gray mb-2">Type <strong>CONFIRM</strong> to proceed:</p>
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="CONFIRM"
                        className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-error/50 mb-4" />
                    <div className="flex gap-3">
                        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Cancel</button>
                        <button type="button" onClick={onConfirm} disabled={input !== 'CONFIRM'}
                            className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                            Delete permanently
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterTab = 'All' | 'Registered' | 'Guest' | 'Suspended';
type SortBy = 'recent' | 'orders' | 'spend';

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>(CUSTOMERS);
    const [tab, setTab] = useState<FilterTab>('All');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('recent');
    const [selected, setSelected] = useState<Customer | null>(null);

    const TABS: FilterTab[] = ['All', 'Registered', 'Guest', 'Suspended'];

    const filtered = useMemo(() => {
        let list = customers;
        if (tab === 'Suspended') list = list.filter(c => c.status === 'suspended');
        else if (tab !== 'All') list = list.filter(c => c.accountType === tab && c.status === 'active');
        else list = list.filter(c => c.status !== 'suspended');

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email?.toLowerCase().includes(q));
        }

        if (sortBy === 'orders') list = [...list].sort((a, b) => b.totalOrders - a.totalOrders);
        else if (sortBy === 'spend') list = [...list].sort((a, b) => b.totalSpend - a.totalSpend);

        return list;
    }, [customers, tab, search, sortBy]);

    function suspend(c: Customer) {
        setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, status: 'suspended' } : x));
        setSelected(prev => prev?.id === c.id ? { ...prev, status: 'suspended' } : prev);
    }

    function unsuspend(c: Customer) {
        setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, status: 'active' } : x));
        setSelected(prev => prev?.id === c.id ? { ...prev, status: 'active' } : prev);
    }

    function deleteCustomer(c: Customer) {
        setCustomers(prev => prev.filter(x => x.id !== c.id));
        setSelected(null);
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Customers</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">{filtered.length} customers shown</p>
                </div>
                <button type="button" className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0">
                    <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                    Export CSV
                </button>
            </div>

            {/* Tabs + controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {TABS.map(t => (
                        <button key={t} type="button" onClick={() => setTab(t)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium font-body whitespace-nowrap transition-all cursor-pointer ${tab === t ? 'bg-primary text-white' : 'bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                            {t}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 ml-auto">
                    <div className="relative flex-1 min-w-[180px]">
                        <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                    </div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
                        className="px-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40 cursor-pointer">
                        <option value="recent">Most Recent</option>
                        <option value="orders">Most Orders</option>
                        <option value="spend">Highest Spend</option>
                    </select>
                </div>
            </div>

            {/* Customer list */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                <div className="hidden md:grid grid-cols-[1fr_90px_80px_90px_110px_80px_80px] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['Customer', 'Account', 'Orders', 'Total Spend', 'Last Order', 'Status', ''].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <UserCircleIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No customers found.</p>
                    </div>
                ) : (
                    filtered.map((customer, i) => (
                        <div
                            key={customer.id}
                            onClick={() => setSelected(customer)}
                            className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1fr_90px_80px_90px_110px_80px_80px] gap-2 md:gap-4 md:items-center cursor-pointer hover:bg-neutral-light/60 transition-colors ${i < filtered.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                    <span className="text-primary text-[10px] font-bold font-body">{customer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-text-dark text-sm font-semibold font-body truncate">{customer.name}</p>
                                    <p className="text-neutral-gray text-[10px] font-body">{customer.phone}</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-medium font-body px-2 py-0.5 rounded-full w-fit ${customer.accountType === 'Registered' ? 'bg-primary/10 text-primary' : 'bg-neutral-light text-neutral-gray'}`}>
                                {customer.accountType}
                            </span>
                            <span className="text-text-dark text-sm font-body">{customer.totalOrders}</span>
                            <span className="text-text-dark text-sm font-bold font-body">{formatGHS(customer.totalSpend)}</span>
                            <span className="text-neutral-gray text-xs font-body">{customer.lastOrderDate}</span>
                            <span className={`text-[10px] font-bold font-body px-2 py-0.5 rounded-full w-fit ${customer.status === 'active' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                                {customer.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                            <CaretRightIcon size={14} className="text-neutral-gray/40 hidden md:block" />
                        </div>
                    ))
                )}
            </div>

            {/* Detail panel */}
            {selected && (
                <CustomerDetailPanel
                    customer={selected}
                    onClose={() => setSelected(null)}
                    onSuspend={() => suspend(selected)}
                    onUnsuspend={() => unsuspend(selected)}
                    onDelete={() => deleteCustomer(selected)}
                />
            )}
        </div>
    );
}
