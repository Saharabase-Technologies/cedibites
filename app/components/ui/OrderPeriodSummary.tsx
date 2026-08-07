'use client';

import { CheckCircleIcon, WarningCircleIcon, XCircleIcon } from '@phosphor-icons/react';
import type { OrderPeriodSummary as Summary } from '@/types/api';

const formatGhs = (n: number): string =>
    new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(n);

interface Props {
    summary: Summary | null;
    isLoading?: boolean;
    /** Optional caption shown above the strip (e.g. "Today", "Custom range"). */
    label?: string;
    /** Hide currency amounts, show counts only. */
    countsOnly?: boolean;
    className?: string;
}

/**
 * Low-attention strip summarizing the orders matching the current filter scope.
 *
 * Designed to sit above an orders table without competing for attention:
 * three pills (valid / issues / total) using small text & muted backgrounds.
 *
 * - "Valid" = paid (status != cancelled AND has completed payment)
 * - "Issues" = distinct orders that are cancelled OR refunded OR failed-without-completed.
 *              An order matching multiple buckets is counted ONCE; its amount is summed once.
 * - "Total" = every order in the scope
 *
 * Mirrors the AnalyticsService definitions so numbers match the dashboards.
 */
export default function OrderPeriodSummary({
    summary,
    isLoading,
    label,
    countsOnly = false,
    className = '',
}: Props): React.ReactElement {
    const issuesCount = summary?.issues_count ?? 0;
    const issuesAmount = summary?.issues_amount ?? 0;

    const showLoading = isLoading && !summary;

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            {label && (
                <span className="text-neutral-gray text-[10px] font-medium font-body uppercase tracking-wider mr-1">
                    {label}
                </span>
            )}

            <span
                title="Completed orders with successful payment"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full"
            >
                <CheckCircleIcon size={12} weight="fill" className="text-emerald-600" />
                <span className="text-emerald-700 text-[11px] font-semibold font-body">
                    {showLoading ? '…' : `${summary?.valid_count ?? 0} valid`}
                </span>
                {!countsOnly && summary && summary.valid_count > 0 && (
                    <span className="text-emerald-600/70 text-[10px] font-body">
                        · {formatGhs(summary.valid_revenue)}
                    </span>
                )}
            </span>

            <span
                title="Cancelled, failed, and refunded orders"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-full"
            >
                <WarningCircleIcon size={12} weight="fill" className="text-amber-600" />
                <span className="text-amber-700 text-[11px] font-semibold font-body">
                    {showLoading ? '…' : `${issuesCount} issues`}
                </span>
                {!countsOnly && summary && issuesCount > 0 && (
                    <span className="text-amber-600/70 text-[10px] font-body">
                        · {formatGhs(issuesAmount)}
                    </span>
                )}
            </span>

            {summary && issuesCount > 0 && !countsOnly && (
                <span className="hidden sm:inline-flex items-center gap-2 text-neutral-gray text-[10px] font-body">
                    {summary.cancelled_count > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <XCircleIcon size={10} className="text-rose-500" />
                            {summary.cancelled_count} cancelled
                        </span>
                    )}
                    {summary.failed_count > 0 && (
                        <span>· {summary.failed_count} failed</span>
                    )}
                    {summary.refunded_count > 0 && (
                        <span>· {summary.refunded_count} refunded</span>
                    )}
                </span>
            )}

            <span
                title="All orders in the current filter scope"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-light border border-[#f0e8d8] rounded-full"
            >
                <span className="text-neutral-gray text-[11px] font-body">
                    {showLoading ? '…' : `${summary?.total_count ?? 0} total`}
                </span>
            </span>
        </div>
    );
}
