'use client';

import { useState } from 'react';
import {
    StarIcon,
    ChatCircleTextIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { useCustomerFeedback } from '@/lib/api/hooks/useCustomerFeedback';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import type { CustomerFeedback } from '@/types/order-feedback';

/**
 * What customers said about their orders.
 *
 * Not the beta bug reporter at /admin/feedback, and not per-dish stars — this is
 * one person on one order, a few hours after they ate.
 */
export default function CustomerFeedbackPage() {
    const [branchId, setBranchId] = useState<number | null>(null);
    const [unhappyOnly, setUnhappyOnly] = useState(false);

    const { branches } = useBranchesApi();
    const { feedback, summary, isLoading, error } = useCustomerFeedback({
        branch_id: branchId ?? undefined,
        unhappy_only: unhappyOnly || undefined,
    });

    return (
        <div className="h-full overflow-y-auto bg-neutral-light dark:bg-brand-darker">
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">

                <header className="mb-6">
                    <h1 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                        Customer feedback
                    </h1>
                    <p className="text-neutral-gray text-sm mt-1 font-body max-w-xl">
                        What people said when we asked how their order went.
                    </p>
                </header>

                {summary && summary.sent > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <Stat
                            label="Overall"
                            value={summary.average_overall !== null ? summary.average_overall.toFixed(1) : '—'}
                            accent
                        />
                        <Stat
                            label="The food"
                            value={summary.average_food !== null ? summary.average_food.toFixed(1) : '—'}
                        />
                        <Stat
                            label="Service"
                            value={summary.average_service !== null ? summary.average_service.toFixed(1) : '—'}
                        />
                        {/*
                            Answered over sent — requests that never went out are
                            excluded, because a message nobody received must not
                            read as a message nobody answered.
                        */}
                        <Stat
                            label="Answered"
                            value={summary.response_rate !== null ? `${summary.response_rate}%` : '—'}
                        />
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <select
                        value={branchId ?? ''}
                        onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                        className="rounded-xl border border-brown-light/25 bg-white dark:bg-brand-dark px-3 py-2 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary"
                    >
                        <option value="">Every branch</option>
                        {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    {/*
                        A three-star with a paragraph attached says more than a
                        five-star with nothing, so this is the useful default view
                        once volume picks up.
                    */}
                    <button
                        onClick={() => setUnhappyOnly((v) => !v)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium font-body transition-colors ${
                            unhappyOnly
                                ? 'border-warning bg-warning/10 text-warning'
                                : 'border-brown-light/25 text-neutral-gray hover:text-text-dark'
                        }`}
                    >
                        Three stars or fewer
                    </button>
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                        <p className="text-error text-sm font-body">
                            {error instanceof Error ? error.message : 'Could not load feedback.'}
                        </p>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-20 text-neutral-gray font-body">
                        <SpinnerGapIcon size={22} className="animate-spin" />
                        Loading…
                    </div>
                ) : feedback.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-20">
                        <ChatCircleTextIcon size={40} className="text-neutral-gray/50" />
                        <h3 className="text-text-dark dark:text-text-light font-semibold font-body mt-4">
                            Nothing back yet
                        </h3>
                        <p className="text-neutral-gray text-sm mt-1.5 font-body max-w-sm">
                            Feedback requests are turned off until somebody switches them on. Once they are, answers
                            land here a few hours after each order.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {feedback.map((item) => (
                            <FeedbackRow key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function FeedbackRow({ item }: { item: CustomerFeedback }) {
    const unhappy = (item.rating_overall ?? 5) <= 3;

    return (
        <div
            className={`rounded-2xl border bg-white dark:bg-brand-dark px-5 py-4 ${
                unhappy ? 'border-warning/40' : 'border-brown-light/25'
            }`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                                key={star}
                                size={16}
                                weight={star <= (item.rating_overall ?? 0) ? 'fill' : 'regular'}
                                className={star <= (item.rating_overall ?? 0) ? 'text-primary' : 'text-neutral-gray/30'}
                            />
                        ))}
                    </div>

                    {item.comment && (
                        <p className="text-text-dark dark:text-text-light text-sm mt-2 font-body">
                            {item.comment}
                        </p>
                    )}

                    <p className="text-neutral-gray text-xs mt-2 font-body">
                        {item.customer_name ?? 'Customer'}
                        {item.branch_name && ` · ${item.branch_name}`}
                        {item.order_number && ` · ${item.order_number}`}
                        {item.submitted_at &&
                            ` · ${new Date(item.submitted_at).toLocaleDateString('en-GH', {
                                day: 'numeric', month: 'short',
                            })}`}
                    </p>
                </div>

                {(item.rating_food !== null || item.rating_service !== null) && (
                    <div className="text-right shrink-0 text-xs font-body text-neutral-gray">
                        {item.rating_food !== null && <p>Food {item.rating_food}/5</p>}
                        {item.rating_service !== null && <p>Service {item.rating_service}/5</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-dark px-4 py-3">
            <p className="text-neutral-gray text-xs font-body">{label}</p>
            <p className={`text-xl font-semibold font-body mt-0.5 ${
                accent ? 'text-primary' : 'text-text-dark dark:text-text-light'
            }`}>
                {value}
            </p>
        </div>
    );
}
