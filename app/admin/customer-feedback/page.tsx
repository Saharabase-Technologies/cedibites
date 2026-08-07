'use client';

import { useMemo, useState } from 'react';
import { StarIcon, ChatCircleTextIcon, WarningCircleIcon } from '@phosphor-icons/react';
import {
    PageHeader,
    FilterBar,
    SearchBar,
    FilterSelect,
    SegmentedTabs,
    DataTable,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { MarketingTabNav } from '@/app/admin/components/MarketingTabNav';
import { useCustomerFeedback } from '@/lib/api/hooks/useCustomerFeedback';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import type { CustomerFeedback } from '@/types/order-feedback';

type View = 'all' | 'unhappy';

export default function CustomerFeedbackPage() {
    const [branchId, setBranchId] = useState('');
    const [view, setView] = useState<View>('all');
    const [search, setSearch] = useState('');

    const { branches } = useBranchesApi();
    const { feedback, summary, isLoading, error } = useCustomerFeedback({
        branch_id: branchId ? Number(branchId) : undefined,
        unhappy_only: view === 'unhappy' || undefined,
    });

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return feedback;

        return feedback.filter(
            (f) =>
                (f.comment ?? '').toLowerCase().includes(term) ||
                (f.customer_name ?? '').toLowerCase().includes(term) ||
                (f.order_number ?? '').toLowerCase().includes(term),
        );
    }, [feedback, search]);

    const columns: DataTableColumn<CustomerFeedback>[] = [
        {
            key: 'rating',
            header: 'Rating',
            width: 'w-32',
            sortValue: (f) => f.rating_overall ?? 0,
            cell: (f) => <Stars value={f.rating_overall ?? 0} />,
        },
        {
            key: 'comment',
            header: 'What they said',
            cell: (f) =>
                f.comment ? (
                    <p className="text-text-dark text-sm font-body">{f.comment}</p>
                ) : (
                    <span className="text-neutral-gray/60 text-sm font-body italic">No comment</span>
                ),
        },
        {
            key: 'breakdown',
            header: 'Food / Service',
            align: 'right',
            hideBelow: 'lg',
            cell: (f) => (
                <span className="text-neutral-gray text-sm font-body tabular-nums">
                    {f.rating_food ?? '—'} / {f.rating_service ?? '—'}
                </span>
            ),
        },
        {
            key: 'who',
            header: 'Order',
            align: 'right',
            hideBelow: 'md',
            sortValue: (f) => f.submitted_at ?? '',
            cell: (f) => (
                <div className="text-right">
                    <p className="text-text-dark text-sm font-body">{f.customer_name ?? 'Customer'}</p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5">
                        {f.branch_name && `${f.branch_name} · `}
                        {f.submitted_at &&
                            new Date(f.submitted_at).toLocaleDateString('en-GH', {
                                day: 'numeric',
                                month: 'short',
                            })}
                    </p>
                </div>
            ),
        },
    ];

    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <div className="mb-5">
                    <MarketingTabNav />
                </div>

                <PageHeader
                    title="Customer feedback"
                    subtitle="What people said when we asked how their order went."
                />

                {summary && summary.sent > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        <Stat
                            label="Overall"
                            value={summary.average_overall !== null ? summary.average_overall.toFixed(1) : '—'}
                            note="out of 5"
                            accent
                        />
                        <Stat
                            label="The food"
                            value={summary.average_food !== null ? summary.average_food.toFixed(1) : '—'}
                            note="out of 5"
                        />
                        <Stat
                            label="Service"
                            value={summary.average_service !== null ? summary.average_service.toFixed(1) : '—'}
                            note="out of 5"
                        />
                        {/*
                            Answered over sent. Requests that never went out are
                            excluded — a message nobody received must not read as
                            a message nobody answered.
                        */}
                        <Stat
                            label="Answered"
                            value={summary.response_rate !== null ? `${summary.response_rate}%` : '—'}
                            note={`${summary.answered} of ${summary.sent} asked`}
                        />
                    </div>
                )}

                {error && (
                    <div className="mb-5 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-rose-700 text-sm font-body">
                            {error instanceof Error ? error.message : 'Could not load feedback.'}
                        </p>
                    </div>
                )}

                <FilterBar>
                    {/*
                        A three-star with a paragraph attached says more than a
                        five-star with nothing, so this becomes the useful
                        default view once volume picks up.
                    */}
                    <SegmentedTabs
                        options={[
                            { value: 'all', label: 'Everything' },
                            { value: 'unhappy', label: 'Three stars or fewer' },
                        ]}
                        value={view}
                        onChange={setView}
                    />
                    <SearchBar value={search} onChange={setSearch} placeholder="Search comments…" />
                    <FilterSelect
                        value={branchId}
                        onChange={setBranchId}
                        options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                        placeholder="Every branch"
                    />
                </FilterBar>

                <DataTable
                    data={rows}
                    columns={columns}
                    rowKey={(f) => f.id}
                    defaultSortKey="who"
                    defaultSortDir="desc"
                    isLoading={isLoading}
                    needsAttention={(f) => (f.rating_overall ?? 5) <= 3}
                    emptyState={
                        <div className="flex flex-col items-center text-center py-16">
                            <ChatCircleTextIcon size={40} className="text-neutral-gray/50" />
                            <h3 className="text-text-dark font-semibold font-body mt-4">Nothing back yet</h3>
                            <p className="text-neutral-gray text-sm mt-1.5 font-body max-w-sm">
                                Feedback requests are turned off until somebody switches them on. Once they are,
                                answers land here a few hours after each order.
                            </p>
                        </div>
                    }
                />
            </div>
        </div>
    );
}

function Stars({ value }: { value: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                    key={star}
                    size={15}
                    weight={star <= value ? 'fill' : 'regular'}
                    className={star <= value ? 'text-primary' : 'text-neutral-gray/30'}
                />
            ))}
        </div>
    );
}

function Stat({
    label, value, note, accent,
}: {
    label: string;
    value: string;
    note?: string;
    accent?: boolean;
}) {
    return (
        <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4 py-3">
            <p className="text-neutral-gray text-xs font-body">{label}</p>
            <p className={`text-xl font-semibold font-body tabular-nums mt-0.5 ${accent ? 'text-primary' : 'text-text-dark'}`}>
                {value}
            </p>
            {note && <p className="text-neutral-gray text-[11px] font-body mt-0.5">{note}</p>}
        </div>
    );
}
