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
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranchStaffSales } from '@/lib/api/hooks/useBranches';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(n: number): string {
    return `₵${n.toFixed(2)}`;
}

function dateLabel(iso: string): string {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (iso === today) return 'Today';
    if (iso === yesterday) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffSalesRow {
    employee_id: number;
    staff_name: string;
    total_orders: number;
    momo_total: number;
    momo_count: number;
    cash_total: number;
    cash_count: number;
    no_charge_total: number;
    no_charge_count: number;
    card_total: number;
    card_count: number;
    total_revenue: number;
}

// ─── Payment method config ────────────────────────────────────────────────────

const METHODS = [
    { key: 'momo',      label: 'MoMo',      icon: DeviceMobileIcon, color: 'text-yellow-600',  bg: 'bg-yellow-600/8' },
    { key: 'cash',      label: 'Cash',       icon: MoneyIcon,        color: 'text-secondary',   bg: 'bg-secondary/8' },
    { key: 'no_charge', label: 'No Charge',  icon: ProhibitIcon,     color: 'text-teal-600',    bg: 'bg-teal-600/8' },
    { key: 'card',      label: 'Card',       icon: CreditCardIcon,   color: 'text-blue-600',    bg: 'bg-blue-600/8' },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffSalesPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches?.[0]?.id ? Number(staffUser.branches[0].id) : null;

    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);

    const { staffSales, isLoading } = useBranchStaffSales(branchId, date);
    const rows = staffSales as StaffSalesRow[];

    const prevDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        setDate(d.toISOString().slice(0, 10));
    };

    const nextDay = () => {
        if (date >= today) return;
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        setDate(d.toISOString().slice(0, 10));
    };

    // Grand totals
    const totals = useMemo(() => {
        return rows.reduce(
            (acc, r) => ({
                orders: acc.orders + r.total_orders,
                revenue: acc.revenue + r.total_revenue,
                momo: acc.momo + r.momo_total,
                cash: acc.cash + r.cash_total,
                noCharge: acc.noCharge + r.no_charge_total,
                card: acc.card + r.card_total,
            }),
            { orders: 0, revenue: 0, momo: 0, cash: 0, noCharge: 0, card: 0 },
        );
    }, [rows]);

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <UsersThreeIcon size={20} weight="fill" className="text-primary" />
                    <h1 className="text-text-dark text-2xl font-bold font-body">Staff Sales</h1>
                </div>

                {/* Date nav */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={prevDay}
                        className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray hover:text-text-dark cursor-pointer"
                    >
                        <CaretLeftIcon size={14} weight="bold" />
                    </button>
                    <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={e => setDate(e.target.value)}
                        className="text-text-dark text-sm font-semibold font-body bg-transparent border-none cursor-pointer text-center"
                    />
                    <span className="text-neutral-gray text-xs font-body">{dateLabel(date)}</span>
                    <button
                        type="button"
                        onClick={nextDay}
                        disabled={date >= today}
                        className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray hover:text-text-dark disabled:opacity-30 cursor-pointer disabled:cursor-default"
                    >
                        <CaretRightIcon size={14} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Summary row */}
            {!isLoading && rows.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3 text-center">
                        <p className="text-text-dark text-xl font-bold font-body">{rows.length}</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">Staff Memberss</p>
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
            ) : rows.length === 0 ? (
                <div className="py-16 text-center">
                    <UsersThreeIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                    <p className="text-text-dark text-sm font-medium font-body">No sales recorded</p>
                    <p className="text-neutral-gray text-sm font-body mt-1">
                        {date === today ? 'No staff sales today yet.' : `No sales data for ${dateLabel(date)}.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rows.map((row) => (
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
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {METHODS.map(m => {
                                    const total = row[`${m.key}_total` as keyof StaffSalesRow] as number;
                                    const count = row[`${m.key}_count` as keyof StaffSalesRow] as number;
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
