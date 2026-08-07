'use client';

import type { AnalyticsPeriod } from '@/lib/api/hooks/useAnalytics';

// ─── Canonical period set (single source of truth) ──────────────────────────────

export interface CustomRange {
    date_from: string;
    date_to: string;
}

/** Ordered, canonical list of analytics periods used across the platform. */
export const PERIOD_OPTIONS: { key: AnalyticsPeriod; label: string }[] = [
    { key: 'today',      label: 'Today'        },
    { key: 'yesterday',  label: 'Yesterday'    },
    { key: 'week',       label: 'This Week'    },
    { key: 'last_week',  label: 'Last Week'    },
    { key: 'month',      label: 'This Month'   },
    { key: 'last_month', label: 'Last Month'   },
    { key: '30d',        label: 'Last 30 Days' },
    { key: '90d',        label: 'Last 90 Days' },
    { key: 'custom',     label: 'Custom'       },
];

/** Period → human label, for export filenames / report headers. */
export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = PERIOD_OPTIONS.reduce(
    (acc, p) => { acc[p.key] = p.label; return acc; },
    {} as Record<AnalyticsPeriod, string>,
);

// ─── Component ──────────────────────────────────────────────────────────────────

interface PeriodFilterProps {
    value: AnalyticsPeriod;
    onChange: (period: AnalyticsPeriod) => void;
    /** Current custom range — required for the date inputs when `value === 'custom'`. */
    customRange?: CustomRange;
    onCustomRangeChange?: (range: CustomRange) => void;
    /** Periods to hide (e.g. exclude 'custom' on a page that can't support it). */
    exclude?: AnalyticsPeriod[];
    className?: string;
}

/**
 * Shared period selector — a horizontally-scrollable pill row plus an inline
 * date-range picker shown when "Custom" is active. Drives every analytics view.
 */
export default function PeriodFilter({
    value,
    onChange,
    customRange,
    onCustomRangeChange,
    exclude,
    className = '',
}: PeriodFilterProps) {
    const options = exclude?.length
        ? PERIOD_OPTIONS.filter(p => !exclude.includes(p.key))
        : PERIOD_OPTIONS;

    const today = new Date().toISOString().slice(0, 10);
    const range = customRange ?? { date_from: today, date_to: today };

    return (
        <div className={className}>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {options.map(p => (
                    <button
                        key={p.key}
                        type="button"
                        onClick={() => onChange(p.key)}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold font-body whitespace-nowrap transition-all cursor-pointer ${
                            value === p.key
                                ? 'bg-primary text-white'
                                : 'bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {value === 'custom' && onCustomRangeChange && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
                    <label className="flex items-center gap-2 text-xs font-body text-neutral-gray">
                        <span className="uppercase tracking-wider font-semibold">From</span>
                        <input
                            type="date"
                            value={range.date_from}
                            max={range.date_to || today}
                            onChange={e => onCustomRangeChange({ ...range, date_from: e.target.value })}
                            className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-card text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                        />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-body text-neutral-gray">
                        <span className="uppercase tracking-wider font-semibold">To</span>
                        <input
                            type="date"
                            value={range.date_to}
                            min={range.date_from}
                            max={today}
                            onChange={e => onCustomRangeChange({ ...range, date_to: e.target.value })}
                            className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-card text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                        />
                    </label>
                </div>
            )}
        </div>
    );
}
