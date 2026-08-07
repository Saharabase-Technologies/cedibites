'use client';

import { useState, useMemo } from 'react';
import {
    CaretLeftIcon,
    CaretRightIcon,
    UsersThreeIcon,
    CurrencyCircleDollarIcon,
    ShoppingBagIcon,
    SpinnerGapIcon,
    UserCircleIcon,
    DeviceMobileIcon,
    MoneyIcon,
    ProhibitIcon,
    CreditCardIcon,
    HandCoinsIcon,
    BuildingsIcon,
    MagnifyingGlassIcon,
    XIcon,
} from '@phosphor-icons/react';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { useAdminStaffSales, type AnalyticsPeriod } from '@/lib/api/hooks/useAnalytics';
import type { AdminStaffSalesRow } from '@/lib/api/services/analytics.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(n: number): string {
    return `₵${n.toFixed(2)}`;
}

// ─── Period options ───────────────────────────────────────────────────────────

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
    { value: 'today',      label: 'Today' },
    { value: 'yesterday',  label: 'Yesterday' },
    { value: 'week',       label: 'This Week' },
    { value: 'last_week',  label: 'Last Week' },
    { value: 'month',      label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: '30d',        label: 'Last 30 Days' },
];

// ─── Payment method config ────────────────────────────────────────────────────

const METHODS = [
    { key: 'momo',         label: 'MoMo',        icon: DeviceMobileIcon, color: 'text-yellow-600',  bg: 'bg-yellow-600/8' },
    { key: 'cash',         label: 'Cash',        icon: MoneyIcon,        color: 'text-secondary',   bg: 'bg-secondary/8' },
    { key: 'manual_momo',  label: 'Direct MoMo', icon: HandCoinsIcon,    color: 'text-orange-600',  bg: 'bg-orange-600/8' },
    { key: 'no_charge',    label: 'No Charge',   icon: ProhibitIcon,     color: 'text-teal-600',    bg: 'bg-teal-600/8' },
    { key: 'card',         label: 'Card',        icon: CreditCardIcon,   color: 'text-blue-600',    bg: 'bg-blue-600/8' },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStaffSalesPage() {
    const { branches } = useBranchesApi();
    const [period, setPeriod] = useState<AnalyticsPeriod>('today');
    const [branchFilter, setBranchFilter] = useState<number | undefined>(undefined);
    const [search, setSearch] = useState('');

    const { data: rawRows, isLoading } = useAdminStaffSales(period, branchFilter);
    const rows = (rawRows ?? []) as AdminStaffSalesRow[];

    // Filter by search
    const filteredRows = useMemo(() => {
        if (!search.trim()) return rows;
        const q = search.toLowerCase();
        return rows.filter(r => r.staff_name.toLowerCase().includes(q));
    }, [rows, search]);

    // Grand totals
    const totals = useMemo(() => {
        return filteredRows.reduce(
            (acc, r) => ({
                orders: acc.orders + r.total_orders,
                revenue: acc.revenue + r.total_revenue,
                momo: acc.momo + r.momo_total,
                cash: acc.cash + r.cash_total,
                manualMomo: acc.manualMomo + r.manual_momo_total,
                noCharge: acc.noCharge + r.no_charge_total,
                card: acc.card + r.card_total,
            }),
            { orders: 0, revenue: 0, momo: 0, cash: 0, manualMomo: 0, noCharge: 0, card: 0 },
        );
    }, [filteredRows]);

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-text-dark text-xl font-bold font-body">Staff Sales</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        Per-staff revenue breakdown by payment method across all branches.
                    </p>
                </div>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                {/* Period selector */}
                <select
                    value={period}
                    onChange={e => setPeriod(e.target.value as AnalyticsPeriod)}
                    className="bg-neutral-card border border-[#f0e8d8] rounded-xl px-3 py-2 text-sm font-body text-text-dark focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                    {PERIODS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>

                {/* Branch filter */}
                <select
                    value={branchFilter ?? ''}
                    onChange={e => setBranchFilter(e.target.value ? Number(e.target.value) : undefined)}
                    className="bg-neutral-card border border-[#f0e8d8] rounded-xl px-3 py-2 text-sm font-body text-text-dark focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                    <option value="">All Branches</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>

                {/* Staff search */}
                <div className="relative flex-1 max-w-xs">
                    <MagnifyingGlassIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search staff..."
                        className="w-full pl-8 pr-8 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-sm font-body text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary/50"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray hover:text-text-dark cursor-pointer"
                        >
                            <XIcon size={12} weight="bold" />
                        </button>
                    )}
                </div>
            </div>

            {/* Summary row */}
            {!isLoading && filteredRows.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3 text-center">
                        <p className="text-text-dark text-xl font-bold font-body">{filteredRows.length}</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">Staff Members</p>
                    </div>
                    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3 text-center">
                        <p className="text-text-dark text-xl font-bold font-body">{totals.orders}</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">Total Orders</p>
                    </div>
                    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3 text-center">
                        <p className="text-primary text-xl font-bold font-body">{formatGHS(totals.revenue)}</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">Revenue</p>
                        {totals.noCharge > 0 && (
                            <p className="text-teal-600 text-[10px] font-body mt-0.5">+ {formatGHS(totals.noCharge)} no-charge</p>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                    <SpinnerGapIcon size={18} className="animate-spin" />
                    Loading staff sales...
                </div>
            ) : filteredRows.length === 0 ? (
                <div className="py-16 text-center">
                    <UsersThreeIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                    <p className="text-text-dark text-sm font-medium font-body">No sales recorded</p>
                    <p className="text-neutral-gray text-sm font-body mt-1">
                        {search
                            ? `No staff matching "${search}".`
                            : 'No staff sales data for the selected period.'
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRows.map((row) => (
                        <div
                            key={row.employee_id}
                            className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-5 py-4"
                        >
                            {/* Staff header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <UserCircleIcon size={22} weight="fill" className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-text-dark text-sm font-semibold font-body">{row.staff_name}</p>
                                        <p className="text-neutral-gray text-xs font-body">
                                            {row.total_orders} order{row.total_orders !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-primary text-lg font-bold font-body">{formatGHS(row.total_revenue)}</p>
                                    <p className="text-neutral-gray text-[10px] font-body">total revenue</p>
                                </div>
                            </div>

                            {/* Payment breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {METHODS.map(m => {
                                    const total = row[`${m.key}_total` as keyof AdminStaffSalesRow] as number;
                                    const count = row[`${m.key}_count` as keyof AdminStaffSalesRow] as number;
                                    if (count === 0) return (
                                        <div key={m.key} className="rounded-xl bg-neutral-light/60 px-3 py-2">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <m.icon size={12} weight="fill" className="text-neutral-gray/40" />
                                                <span className="text-neutral-gray/40 text-[10px] font-body">{m.label}</span>
                                            </div>
                                            <p className="text-neutral-gray/40 text-xs font-body">—</p>
                                        </div>
                                    );
                                    return (
                                        <div key={m.key} className={`rounded-xl ${m.bg} px-3 py-2`}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <m.icon size={12} weight="fill" className={m.color} />
                                                <span className={`${m.color} text-[10px] font-bold font-body`}>{m.label}</span>
                                                <span className="text-neutral-gray text-[10px] font-body ml-auto">×{count}</span>
                                            </div>
                                            <p className={`${m.color} text-sm font-bold font-body`}>{formatGHS(total)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Grand total footer */}
                    <div className="bg-brown/5 border border-brown/15 rounded-2xl px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-text-dark text-sm font-bold font-body">Revenue</p>
                            <p className="text-primary text-lg font-bold font-body">{formatGHS(totals.revenue)}</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-body">
                            <div className="flex items-center gap-1.5">
                                <DeviceMobileIcon size={12} weight="fill" className="text-yellow-600" />
                                <span className="text-text-dark">MoMo: {formatGHS(totals.momo)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MoneyIcon size={12} weight="fill" className="text-secondary" />
                                <span className="text-text-dark">Cash: {formatGHS(totals.cash)}</span>
                            </div>
                            {totals.manualMomo > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <HandCoinsIcon size={12} weight="fill" className="text-orange-600" />
                                    <span className="text-text-dark">Direct MoMo: {formatGHS(totals.manualMomo)}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <CreditCardIcon size={12} weight="fill" className="text-blue-600" />
                                <span className="text-text-dark">Card: {formatGHS(totals.card)}</span>
                            </div>
                        </div>
                        {totals.noCharge > 0 && (
                            <div className="mt-3 pt-3 border-t border-brown/10 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-body">
                                    <ProhibitIcon size={12} weight="fill" className="text-teal-600" />
                                    <span className="text-teal-600 font-medium">No Charge (Loss)</span>
                                </div>
                                <span className="text-teal-600 text-sm font-bold font-body">{formatGHS(totals.noCharge)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
