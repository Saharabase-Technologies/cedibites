'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    TrendUpIcon,
    CheckCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    BuildingsIcon,
    ChartBarIcon,
    CaretRightIcon,
    SpinnerIcon,
    WarningIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { usePartnerScope } from '@/app/components/providers/PartnerScopeProvider';
import {
    useSalesComparison,
    useRevenueTrend,
    useAnalytics,
    useBranchPerformanceAnalytics,
    type AnalyticsPeriod,
} from '@/lib/api/hooks/useAnalytics';
import PeriodFilter, { type CustomRange } from '@/app/components/analytics/PeriodFilter';
import GrowthTrendCard from '@/app/components/analytics/GrowthTrendCard';
import { formatPrice } from '@/types/order';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─── Delta chip ───────────────────────────────────────────────────────────────

function Delta({ pct, light = false }: { pct: number | null | undefined; light?: boolean }) {
    if (pct === null || pct === undefined) {
        return <span className={`text-[11px] font-body ${light ? 'text-white/60' : 'text-neutral-gray/70'}`}>—</span>;
    }
    const up = pct >= 0;
    const tone = light
        ? 'text-white'
        : up ? 'text-secondary' : 'text-error';
    return (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold font-body ${tone}`}>
            {up ? <ArrowUpIcon size={11} weight="bold" /> : <ArrowDownIcon size={11} weight="bold" />}
            {Math.abs(pct)}%
        </span>
    );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, delta, sub, accent = false }: {
    icon: React.ElementType;
    label: string;
    value: string;
    delta?: number | null;
    sub?: string;
    accent?: boolean;
}) {
    return (
        <div className={`rounded-2xl px-5 py-4 flex flex-col gap-2 ${accent ? 'bg-primary' : 'bg-neutral-card border border-[#f0e8d8]'}`}>
            <div className="flex items-center gap-2">
                <Icon size={14} weight="fill" className={accent ? 'text-white/70' : 'text-neutral-gray'} />
                <span className={`text-[10px] font-bold font-body uppercase tracking-widest ${accent ? 'text-white/80' : 'text-neutral-gray'}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold font-body leading-none ${accent ? 'text-white' : 'text-text-dark'}`}>{value}</p>
            <div className="flex items-center gap-2">
                {delta !== undefined && <Delta pct={delta} light={accent} />}
                {sub && <span className={`text-[11px] font-body ${accent ? 'text-white/70' : 'text-neutral-gray'}`}>{sub}</span>}
            </div>
        </div>
    );
}

// ─── Branch portfolio card ────────────────────────────────────────────────────

function BranchCard({ name, rev, orders, fulfilment, onClick }: {
    name: string; rev: number; orders: number; fulfilment: number; onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-5 py-4 flex flex-col gap-3 text-left hover:border-primary/40 hover:shadow-sm transition-all group cursor-pointer"
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <BuildingsIcon size={16} weight="fill" className="text-primary" />
                    </div>
                    <span className="text-text-dark text-sm font-bold font-body truncate">{name}</span>
                </div>
                <CaretRightIcon size={14} weight="bold" className="text-neutral-gray/40 group-hover:text-primary transition-colors shrink-0" />
            </div>
            <div>
                <p className="text-text-dark text-xl font-bold font-body leading-none">{formatPrice(rev)}</p>
                <p className="text-neutral-gray text-[11px] font-body mt-1">{orders} completed · {fulfilment}% fulfilled</p>
            </div>
        </button>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerDashboardPage() {
    const router = useRouter();
    const { staffUser } = useStaffAuth();
    const { branchIds, isAll, hasMultiple, primaryBranchId, scopeLabel, setScope } = usePartnerScope();

    const [period, setPeriod] = useState<AnalyticsPeriod>('month');
    const [customRange, setCustomRange] = useState<CustomRange>(() => {
        const today = new Date().toISOString().slice(0, 10);
        return { date_from: today, date_to: today };
    });
    const range = period === 'custom' ? customRange : undefined;

    const { data: comparison, isLoading: cmpLoading, error: cmpError } = useSalesComparison(period, undefined, range, branchIds);
    const { data: trend, isLoading: trendLoading } = useRevenueTrend(period, undefined, undefined, range, branchIds);
    const { orders: orderAnalytics } = useAnalytics(period, undefined, range, branchIds);
    const showPortfolio = isAll && hasMultiple;
    const { data: branchPerf } = useBranchPerformanceAnalytics(period, undefined, range, showPortfolio ? branchIds : undefined);

    const fulfilment = useMemo(() => {
        const s = orderAnalytics?.orders_by_status;
        const total = orderAnalytics?.total_orders ?? 0;
        if (!s || total === 0) return 0;
        return Math.round((((s['delivered'] ?? 0) + (s['completed'] ?? 0)) / total) * 100);
    }, [orderAnalytics]);

    const cancelled = orderAnalytics?.orders_by_status?.['cancelled'] ?? 0;

    const dateStr = new Date().toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    if (!primaryBranchId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
                <WarningIcon size={32} weight="fill" className="text-warning" />
                <p className="text-text-dark text-sm font-body font-semibold">No branch assigned</p>
                <p className="text-neutral-gray text-xs font-body text-center">Your account is not assigned to any branch. Contact an administrator.</p>
            </div>
        );
    }

    if (cmpLoading || trendLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <SpinnerIcon size={32} className="text-primary animate-spin" />
            </div>
        );
    }

    if (cmpError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
                <WarningIcon size={32} weight="fill" className="text-error" />
                <p className="text-text-dark text-sm font-body font-semibold">Unable to load dashboard data</p>
                <p className="text-neutral-gray text-xs font-body text-center">Please check your connection and try again.</p>
            </div>
        );
    }

    const cur = comparison?.current;
    const delta = comparison?.delta;

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">
                        {greeting()}, {staffUser?.name?.split(' ')[0] ?? 'Partner'}
                    </h1>
                    <p className="text-neutral-gray text-sm font-body mt-1 flex items-center gap-2">
                        {dateStr}
                        <span className="inline-flex items-center gap-1 text-secondary font-semibold">
                            <BuildingsIcon size={12} weight="fill" />
                            {scopeLabel}
                        </span>
                    </p>
                </div>
            </div>

            {/* Period selector */}
            <PeriodFilter
                value={period}
                onChange={setPeriod}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
                className="mb-5"
            />

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <KpiCard icon={CurrencyCircleDollarIcon} label="Revenue" value={formatPrice(cur?.revenue ?? 0)} delta={delta?.revenue} accent />
                <KpiCard icon={ReceiptIcon} label="Orders" value={String(cur?.orders ?? 0)} delta={delta?.orders} />
                <KpiCard icon={TrendUpIcon} label="Avg. Order" value={formatPrice(cur?.aov ?? 0)} delta={delta?.aov} />
                <KpiCard icon={CheckCircleIcon} label="Fulfilment" value={`${fulfilment}%`} sub={cancelled > 0 ? `${cancelled} cancelled` : undefined} />
            </div>

            {/* Growth trajectory */}
            <div className="mb-6">
                <GrowthTrendCard trend={trend} />
            </div>

            {/* Portfolio (multi-branch only) */}
            {showPortfolio && (
                <div className="mb-2">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-text-dark font-bold text-sm font-body uppercase tracking-wider">Branch Performance</h2>
                        <span className="text-neutral-gray text-xs font-body">{branchPerf?.length ?? 0} branches</span>
                    </div>
                    {(!branchPerf || branchPerf.length === 0) ? (
                        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-10 text-center">
                            <ChartBarIcon size={26} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                            <p className="text-neutral-gray text-sm font-body">No branch activity in this period.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {branchPerf.map(b => (
                                <BranchCard
                                    key={b.id}
                                    name={b.name}
                                    rev={b.rev}
                                    orders={b.orders}
                                    fulfilment={b.fulfilment}
                                    onClick={() => { setScope(b.id); router.push('/partner/analytics'); }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
