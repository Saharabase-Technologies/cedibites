'use client';

import { useState, useMemo, useCallback } from 'react';
import { usePayments, usePaymentStats } from '@/lib/api/hooks/usePayments';
import { useBranches } from '@/lib/api/hooks/useBranches';
import { paymentService } from '@/lib/api/services/payment.service';
import type { Payment, PaymentsParams } from '@/lib/api/services/payment.service';
import type { Branch } from '@/types/api';
import {
    MagnifyingGlassIcon,
    XIcon,
    CaretLeftIcon,
    CaretRightIcon,
    DownloadSimpleIcon,
    FunnelIcon,
    PhoneIcon,
    ArrowCounterClockwiseIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    WarningCircleIcon,
    CurrencyDollarIcon,
    DeviceMobileIcon,
    CreditCardIcon,
    ProhibitIcon,
    ReceiptIcon,
    HourglassIcon,
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled' | 'expired' | 'no_charge';
type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'wallet' | 'ghqr' | 'no_charge';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PaymentStatus, { label: string; dot: string; icon: React.ElementType }> = {
    pending:   { label: 'Pending',   dot: 'bg-primary',      icon: ClockIcon                 },
    completed: { label: 'Completed', dot: 'bg-secondary',    icon: CheckCircleIcon           },
    failed:    { label: 'Failed',    dot: 'bg-error',        icon: XCircleIcon               },
    refunded:  { label: 'Refunded',  dot: 'bg-neutral-gray', icon: ArrowCounterClockwiseIcon },
    cancelled: { label: 'Cancelled', dot: 'bg-error',        icon: XCircleIcon               },
    expired:   { label: 'Expired',   dot: 'bg-neutral-gray', icon: WarningCircleIcon         },
    no_charge: { label: 'No Charge', dot: 'bg-teal-500',     icon: ProhibitIcon              },
};

const METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: React.ElementType }> = {
    cash:         { label: 'Cash',      icon: CurrencyDollarIcon },
    mobile_money: { label: 'MoMo',      icon: DeviceMobileIcon   },
    card:         { label: 'Card',      icon: CreditCardIcon     },
    wallet:       { label: 'Wallet',    icon: CurrencyDollarIcon },
    ghqr:         { label: 'GhQR',      icon: CurrencyDollarIcon },
    no_charge:    { label: 'No Charge', icon: ProhibitIcon       },
};

const ALL_STATUSES: PaymentStatus[] = ['pending', 'completed', 'failed', 'refunded', 'cancelled', 'expired', 'no_charge'];
const ALL_METHODS: PaymentMethod[] = ['cash', 'mobile_money', 'card', 'wallet', 'ghqr', 'no_charge'];
const DATE_PRESETS = ['Today', 'Yesterday', 'This Week', 'This Month', 'All Time'];
const PAGE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: string | number) {
    return `₵${Number(v).toFixed(2)}`;
}

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function getDateRange(preset: string): { date_from?: string; date_to?: string } {
    if (preset === 'All Time') return {};
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (preset === 'Today') return { date_from: today, date_to: today };
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (preset === 'Yesterday') return { date_from: yesterdayStr, date_to: yesterdayStr };
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    if (preset === 'This Week') return { date_from: weekStart.toISOString().slice(0, 10), date_to: today };
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (preset === 'This Month') return { date_from: monthStart.toISOString().slice(0, 10), date_to: today };
    return {};
}

function getCustomerName(payment: Payment): string {
    return payment.order?.customer?.name || payment.order?.contact_name || 'Walk-in';
}

function getCustomerPhone(payment: Payment): string | null {
    return payment.order?.customer?.phone || payment.order?.contact_phone || null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as PaymentStatus] ?? STATUS_CONFIG.pending;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-text-dark">
            <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function MethodBadge({ method }: { method: string }) {
    const cfg = METHOD_CONFIG[method as PaymentMethod] ?? METHOD_CONFIG.cash;
    const Icon = cfg.icon;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-body text-neutral-gray">
            <Icon size={12} weight="fill" />
            {cfg.label}
        </span>
    );
}

// ─── Filter group ─────────────────────────────────────────────────────────────

function FilterGroup<T extends string>({
    label, options, selected, onToggle, labelFn,
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

// ─── Detail panel ─────────────────────────────────────────────────────────────

function TransactionDetailPanel({ payment, onClose }: {
    payment: Payment; onClose: () => void;
}) {

    return (
        <>
            <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" onClick={onClose} />
            <aside className="fixed right-0 top-0 h-full z-40 w-full max-w-md bg-neutral-card border-l border-[#f0e8d8] flex flex-col shadow-2xl overflow-hidden">

                <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8d8]">
                    <div>
                        <p className="text-text-dark text-sm font-bold font-body">{payment.order?.order_number ?? `#${payment.id}`}</p>
                        <p className="text-neutral-gray text-xs font-body">{formatDate(payment.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={payment.payment_status} />
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light transition-colors cursor-pointer">
                            <XIcon size={16} className="text-neutral-gray" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

                    <div className="bg-neutral-light rounded-2xl p-4 text-center">
                        <p className="text-neutral-gray text-xs font-body mb-1">Amount</p>
                        <p className="text-text-dark text-3xl font-bold font-body">{formatGHS(payment.amount)}</p>
                        <div className="flex items-center justify-center mt-2">
                            <MethodBadge method={payment.payment_method} />
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Customer</p>
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-1.5">
                            <p className="text-text-dark text-sm font-semibold font-body">{getCustomerName(payment)}</p>
                            {getCustomerPhone(payment) && (
                                <a href={`tel:${getCustomerPhone(payment)}`} className="text-primary text-xs font-body flex items-center gap-1.5 hover:underline">
                                    <PhoneIcon size={12} weight="fill" />
                                    {getCustomerPhone(payment)}
                                </a>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Payment Details</p>
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-2">
                            {[
                                { label: 'Transaction ID', value: payment.transaction_id ?? '—' },
                                { label: 'Paid At', value: formatDate(payment.paid_at) },
                                { label: 'Source', value: payment.order?.order_source?.toUpperCase() ?? '—' },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-center text-xs font-body">
                                    <span className="text-neutral-gray">{label}</span>
                                    <span className="text-text-dark font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </aside>
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTransactionsPage() {
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<PaymentStatus[]>([]);
    const [selectedMethods, setSelectedMethods] = useState<PaymentMethod[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

    const { branches } = useBranches();
    const [datePreset, setDatePreset] = useState('Today');
    const [page, setPage] = useState(1);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const activeFilterCount = selectedStatuses.length + selectedMethods.length + (selectedBranchId ? 1 : 0);

    const params = useMemo((): PaymentsParams => {
        const range = getDateRange(datePreset);
        return {
            page,
            per_page: PAGE_SIZE,
            ...(selectedStatuses.length === 1 ? { payment_status: selectedStatuses[0] } : {}),
            ...(selectedMethods.length === 1 ? { payment_method: selectedMethods[0] } : {}),
            ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
            ...range,
        };
    }, [page, selectedStatuses, selectedMethods, selectedBranchId, datePreset]);

    const { payments: rawPayments, meta, isLoading, refetch } = usePayments(params);

    const statsParams = useMemo(() => ({
        ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
        ...getDateRange(datePreset),
    }), [selectedBranchId, datePreset]);

    const { stats } = usePaymentStats(statsParams);

    const payments = useMemo(() => {
        let list = rawPayments;
        if (selectedStatuses.length > 1) list = list.filter(p => selectedStatuses.includes(p.payment_status as PaymentStatus));
        if (selectedMethods.length > 1) list = list.filter(p => selectedMethods.includes(p.payment_method as PaymentMethod));
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(p =>
                p.order?.order_number?.toLowerCase().includes(q) ||
                getCustomerName(p).toLowerCase().includes(q) ||
                (getCustomerPhone(p) ?? '').includes(q) ||
                (p.transaction_id ?? '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [rawPayments, selectedStatuses, selectedMethods, search]);

    const totalPages = meta?.last_page ?? 1;

    const totalCollected = useMemo(() =>
        payments.filter(p => p.payment_status === 'completed').reduce((s, p) => s + Number(p.amount), 0),
        [payments]
    );

    function toggleStatus(s: PaymentStatus) {
        setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
        setPage(1);
    }

    function toggleMethod(m: PaymentMethod) {
        setSelectedMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
        setPage(1);
    }

    const handleExportCsv = useCallback(async () => {
        setIsExporting(true);
        try {
            const range = getDateRange(datePreset);
            const response = await paymentService.getPayments({ per_page: 1000, ...range });
            const rows = response.data ?? [];
            const header = ['ID', 'Order', 'Customer', 'Phone', 'Method', 'Status', 'Amount', 'Transaction ID', 'Paid At', 'Created At'];
            const lines = rows.map(p => [
                p.id, p.order?.order_number ?? '', getCustomerName(p), getCustomerPhone(p) ?? '',
                p.payment_method, p.payment_status, Number(p.amount).toFixed(2),
                p.transaction_id ?? '', p.paid_at ?? '', p.created_at,
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
            const csv = [header.join(','), ...lines].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions-${datePreset.toLowerCase().replace(/\s/g, '-')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    }, [datePreset]);

    return (
        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Transactions</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        {meta ? `${meta.total} total` : '—'}
                        {totalCollected > 0 && (
                            <> · <span className="text-secondary font-medium">{formatGHS(totalCollected)} collected</span></>
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={isExporting || payments.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                    {isExporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </div>

            {/* ── Stats cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

                {/* Completed */}
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                        <CheckCircleIcon size={20} weight="fill" className="text-secondary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-0.5">Completed</p>
                        <p className="text-text-dark text-xl font-bold font-body leading-none">
                            {formatGHS(stats?.completed.total ?? 0)}
                        </p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            {stats?.completed.count ?? 0} transaction{stats?.completed.count !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Pending */}
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <HourglassIcon size={20} weight="fill" className="text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-0.5">Pending</p>
                        <p className="text-text-dark text-xl font-bold font-body leading-none">
                            {formatGHS(stats?.pending.total ?? 0)}
                        </p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            {stats?.pending.count ?? 0} awaiting payment
                        </p>
                    </div>
                </div>

                {/* No Charge */}
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                        <ProhibitIcon size={20} weight="fill" className="text-teal-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-0.5">No Charge</p>
                        <p className="text-text-dark text-xl font-bold font-body leading-none">
                            {formatGHS(stats?.no_charge.total ?? 0)}
                        </p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            {stats?.no_charge.count ?? 0} order{stats?.no_charge.count !== 1 ? 's' : ''} · foregone revenue
                        </p>
                    </div>
                </div>

            </div>

            {/* ── Filters bar ────────────────────────────────────────────── */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 mb-4">

                {/* Search + filter toggle */}
                <div className="flex gap-3 mb-3">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
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
                        {activeFilterCount > 0 && (
                            <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>
                        )}
                    </button>
                </div>

                {/* Date presets */}
                <div className="flex gap-2 flex-wrap">
                    {DATE_PRESETS.map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => { setDatePreset(p); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${datePreset === p ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Expanded filters */}
                {showFilters && (
                    <div className="border-t border-[#f0e8d8] mt-3 pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Branch</p>
                            <div className="flex flex-wrap gap-1.5">
                                {branches.map((branch: Branch) => (
                                    <button
                                        key={branch.id}
                                        type="button"
                                        onClick={() => { setSelectedBranchId(selectedBranchId === branch.id ? null : branch.id); setPage(1); }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${selectedBranchId === branch.id ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-neutral-light text-neutral-gray hover:text-text-dark border border-transparent'}`}
                                    >
                                        {branch.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <FilterGroup
                            label="Status"
                            options={ALL_STATUSES}
                            selected={selectedStatuses}
                            onToggle={toggleStatus}
                            labelFn={s => STATUS_CONFIG[s].label}
                        />
                        <FilterGroup
                            label="Method"
                            options={ALL_METHODS}
                            selected={selectedMethods}
                            onToggle={toggleMethod}
                            labelFn={m => METHOD_CONFIG[m].label}
                        />
                    </div>
                )}
            </div>

            {/* ── Table ──────────────────────────────────────────────────── */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-4">

                <div className="hidden md:grid grid-cols-[1fr_1fr_0.9fr_1fr_1fr_1.2fr] gap-3 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['Order #', 'Customer', 'Method', 'Status', 'Amount', 'Date'].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {isLoading && payments.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">Loading transactions…</p>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <ReceiptIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No transactions match your filters.</p>
                    </div>
                ) : (
                    payments.map((payment, i) => (
                        <div
                            key={payment.id}
                            onClick={() => setSelectedPayment(payment)}
                            className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1fr_1fr_0.9fr_1fr_1fr_1.2fr] gap-2 md:gap-3 md:items-center cursor-pointer hover:bg-neutral-light/60 transition-colors ${i < payments.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                        >
                            <span className="text-text-dark text-sm font-bold font-body">
                                {payment.order?.order_number ? `#${payment.order.order_number}` : `#${payment.id}`}
                            </span>
                            <div className="min-w-0">
                                <p className="text-text-dark text-xs font-semibold font-body truncate">{getCustomerName(payment)}</p>
                                {getCustomerPhone(payment) && (
                                    <p className="text-neutral-gray text-[10px] font-body">{getCustomerPhone(payment)}</p>
                                )}
                            </div>
                            <MethodBadge method={payment.payment_method} />
                            <StatusBadge status={payment.payment_status} />
                            <span className={`text-sm font-bold font-body ${payment.payment_status === 'completed' ? 'text-secondary' : 'text-text-dark'}`}>
                                {formatGHS(payment.amount)}
                            </span>
                            <span className="text-neutral-gray text-xs font-body">{formatDate(payment.created_at)}</span>
                        </div>
                    ))
                )}
            </div>

            {/* ── Pagination ─────────────────────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
                        <CaretLeftIcon size={14} weight="bold" /> Previous
                    </button>
                    <span className="text-neutral-gray text-xs font-body">Page {page} of {totalPages}</span>
                    <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
                        Next <CaretRightIcon size={14} weight="bold" />
                    </button>
                </div>
            )}

            {/* ── Detail panel ───────────────────────────────────────────── */}
            {selectedPayment && (
                <TransactionDetailPanel
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}
        </div>
    );
}
