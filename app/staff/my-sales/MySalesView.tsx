'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    ClockIcon,
    ReceiptIcon,
    CurrencyCircleDollarIcon,
    WarningCircleIcon,
    SpinnerGapIcon,
    ProhibitIcon,
    ClockCounterClockwiseIcon,
    MoneyIcon,
    DeviceMobileIcon,
    CreditCardIcon,
    HandCoinsIcon,
    BankIcon,
} from '@phosphor-icons/react';
import type { Order, PaymentMethod } from '@/types/order';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useMySalesOrders } from '@/app/staff/hooks/useStaffOrders';
import { formatGHS, formatDate } from './utils';
import StatCard from './components/StatCard';
import SourcePills from './components/SourcePills';
import SalesTable from './components/SalesTable';
import OrderDrawer from './components/OrderDrawer';

// ─── Payment method display config ─────────────────────────────────────────────

const PAYMENT_BREAKDOWN_CONFIG: {
    key: PaymentMethod;
    label: string;
    sub: string;
    icon: typeof MoneyIcon;
}[] = [
    { key: 'cash',         label: 'Cash Collected',    sub: 'Physical cash received',      icon: MoneyIcon },
    { key: 'mobile_money', label: 'POS MoMo',          sub: 'Paid via POS prompt',          icon: DeviceMobileIcon },
    { key: 'manual_momo',  label: 'Direct MoMo',       sub: 'Sent to branch number',        icon: HandCoinsIcon },
    { key: 'card',         label: 'Card Payments',     sub: 'POS card terminal',            icon: CreditCardIcon },
    { key: 'no_charge',    label: 'No Charge',         sub: 'Complimentary / staff meals',  icon: BankIcon },
];

export default function MySalesView() {
    const { staffUser } = useStaffAuth();
    const { isLoading } = useOrderStore();
    const rawMySales = useMySalesOrders(staffUser?.id ?? '');
    const myOrders = useMemo(
        () => [...rawMySales].sort((a, b) => b.placedAt - a.placedAt),
        [rawMySales],
    );

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const handleClose = useCallback(() => setSelectedOrder(null), []);
    const handleSelect = useCallback((order: Order) => {
        setSelectedOrder(prev => prev?.id === order.id ? null : order);
    }, []);

    const activeOrders = useMemo(() => myOrders.filter(o => o.status !== 'cancelled'), [myOrders]);
    const cancelledOrders = useMemo(() => myOrders.filter(o => o.status === 'cancelled'), [myOrders]);
    const completedOrders = useMemo(() => myOrders.filter(o => o.status === 'completed' || o.status === 'delivered'), [myOrders]);
    const totalRevenue = useMemo(() => activeOrders.filter(o => o.paymentMethod !== 'no_charge').reduce((s, o) => s + o.total, 0), [activeOrders]);

    // Revenue breakdown by payment method
    const paymentBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        activeOrders.forEach(o => {
            map[o.paymentMethod] = (map[o.paymentMethod] ?? 0) + o.total;
        });
        return map;
    }, [activeOrders]);

    const sourceBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        activeOrders.forEach(o => { map[o.source] = (map[o.source] ?? 0) + 1; });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [activeOrders]);

    // Filter payment configs to only show methods that have orders
    const visiblePaymentCards = useMemo(() => {
        return PAYMENT_BREAKDOWN_CONFIG.filter(p => (paymentBreakdown[p.key] ?? 0) > 0);
    }, [paymentBreakdown]);

    if (isLoading) {
        return (
            <div className="px-4 md:px-8 py-16 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                <SpinnerGapIcon size={18} className="animate-spin" />
                Loading your sales…
            </div>
        );
    }

    return (
        <>
            <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

                {/* ── Header ────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-text-dark dark:text-text-light text-xl font-bold font-body">My Sales</h1>
                        <p className="text-neutral-gray text-sm font-body mt-0.5 flex items-center gap-1.5">
                            <ClockIcon size={13} weight="fill" />
                            {formatDate(new Date())}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-warning/10 border border-warning/25 rounded-xl px-3 py-2 w-fit">
                        <WarningCircleIcon size={14} weight="fill" className="text-warning shrink-0" />
                        <p className="text-warning text-xs font-body font-medium">Today only · 24-hour view</p>
                    </div>
                </div>

                {/* ── Primary Stats ─────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatCard
                        icon={ReceiptIcon}
                        label="Orders Placed"
                        value={String(activeOrders.length)}
                        sub={cancelledOrders.length > 0 ? `${cancelledOrders.length} cancelled` : 'No cancellations'}
                        accent="text-text-light"
                    />
                    <StatCard
                        icon={CurrencyCircleDollarIcon}
                        label="Revenue Generated"
                        value={formatGHS(totalRevenue)}
                        sub="Excl. cancelled"
                        accent="text-text-light dark:text-text-light/75"
                    />
                    <StatCard
                        icon={ProhibitIcon}
                        label="Cancelled"
                        value={String(cancelledOrders.length)}
                        sub={cancelledOrders.length > 0 ? 'orders voided' : 'none today'}
                        accent="text-text-light dark:text-text-light/75"
                    />
                    <StatCard
                        icon={ClockCounterClockwiseIcon}
                        label="Completed"
                        value={String(completedOrders.length)}
                        sub="fulfilled orders"
                        accent="text-text-light dark:text-text-light/75"
                    />
                </div>

                {/* ── Revenue Breakdown by Payment Method ────────────────────── */}
                {visiblePaymentCards.length > 0 && (
                    <div className="mb-6">
                        <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">
                            Revenue Breakdown
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {visiblePaymentCards.map(({ key, label, sub, icon: Icon }) => (
                                <div
                                    key={key}
                                    className="bg-neutral-card dark:bg-brand-dark border border-[#f0e8d8] dark:border-brown-light/15 rounded-2xl px-4 py-3.5"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon size={14} weight="fill" className="text-primary shrink-0" />
                                        <span className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wide">{label}</span>
                                    </div>
                                    <p className="text-text-dark dark:text-text-light text-lg font-bold font-body leading-none">
                                        {formatGHS(paymentBreakdown[key] ?? 0)}
                                    </p>
                                    <p className="text-neutral-gray text-[10px] font-body mt-1">{sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Source breakdown pills ────────────────────────────────── */}
                <SourcePills breakdown={sourceBreakdown} />

                {/* ── Orders table ──────────────────────────────────────────── */}
                <SalesTable
                    activeOrders={activeOrders}
                    cancelledOrders={cancelledOrders}
                    totalRevenue={totalRevenue}
                    selectedId={selectedOrder?.id ?? null}
                    onSelect={handleSelect}
                />

                <p className="text-neutral-gray/40 text-xs font-body text-center mt-6">
                    Shows only orders you placed today · Click any row for full detail · Contact your branch manager for historical data.
                </p>

            </div>

            <OrderDrawer order={selectedOrder} onClose={handleClose} />
        </>
    );
}
