'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon, EyeIcon, RobotIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import {
    PageHeader,
    SegmentedTabs,
    DataTable,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { StaffCommsTabNav } from '@/app/admin/components/StaffCommsTabNav';
import { messagingRuleService } from '@/lib/api/services/messaging.service';
import type { RuleActivityRow } from '@/types/messaging';

/**
 * What one rule has actually done: who it reached, what it said, and what came
 * back.
 *
 * Shows held-back considerations alongside the sends by default. A rule that
 * matched 94 and sent 6 is behaving correctly, and a screen showing only the 6
 * makes that indistinguishable from a rule that is broken — which is how a
 * working rule gets switched off.
 */
export default function RuleActivityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [scope, setScope] = useState('all');

    const { data, isLoading } = useQuery({
        queryKey: ['rule-activity', id, scope],
        queryFn: () => messagingRuleService.activity(Number(id), scope === 'sent'),
    });

    const rows = data?.data ?? [];
    const rule = data?.meta?.rule;

    const columns: DataTableColumn<RuleActivityRow>[] = [
        {
            key: 'user',
            header: 'Who',
            sortValue: (r) => r.user.name.toLowerCase(),
            cell: (r) => (
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body truncate">{r.user.name}</p>
                    <p className="text-neutral-gray text-xs font-body truncate mt-0.5">
                        {r.user.role?.replace(/_/g, ' ') ?? '—'}
                        {r.about ? ` · ${r.about}` : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'outcome',
            header: 'Outcome',
            sortValue: (r) => (r.sent ? 'sent' : (r.held_back_reason ?? '')),
            cell: (r) =>
                r.sent ? (
                    <span className="inline-block px-2 py-0.5 rounded-full border border-secondary/25 bg-secondary-light text-[11px] font-body text-secondary">
                        Sent
                    </span>
                ) : (
                    // The reason, not just "held back" — the whole point of
                    // recording suppressions is being able to say why.
                    <span
                        className="inline-block px-2 py-0.5 rounded-full border border-[#e3ddd0] bg-neutral-light text-[11px] font-body text-neutral-gray"
                        title={r.held_back_reason ?? ''}
                    >
                        {r.held_back_label ?? 'Held back'}
                    </span>
                ),
        },
        {
            key: 'seen',
            header: 'Seen',
            hideBelow: 'md',
            sortValue: (r) => (r.acknowledged_at ? 2 : r.read_at ? 1 : 0),
            cell: (r) => {
                if (!r.sent) return <span className="text-[11px] font-body text-neutral-gray">—</span>;

                if (r.acknowledged_at) {
                    return (
                        <span className="flex items-center gap-1 text-[11px] font-body text-secondary">
                            <CheckIcon size={13} weight="bold" />
                            Acknowledged
                        </span>
                    );
                }

                if (r.read_at) {
                    return (
                        <span className="flex items-center gap-1 text-[11px] font-body text-neutral-gray">
                            <EyeIcon size={13} weight="fill" />
                            Read
                        </span>
                    );
                }

                return <span className="text-[11px] font-body text-neutral-gray">Not read</span>;
            },
        },
        {
            key: 'reply',
            header: 'What they said',
            hideBelow: 'lg',
            cell: (r) =>
                r.quick_reply || r.reply_body ? (
                    <span className="text-text-dark text-xs font-body">
                        {r.quick_reply && <strong>{r.quick_reply}</strong>}
                        {r.quick_reply && r.reply_body && ' — '}
                        {r.reply_body}
                    </span>
                ) : (
                    <span className="text-[11px] font-body text-neutral-gray">—</span>
                ),
        },
        {
            key: 'fired_at',
            header: 'When',
            align: 'right',
            hideBelow: 'md',
            sortValue: (r) => r.fired_at ?? '',
            cell: (r) => (
                <span className="text-neutral-gray text-xs font-body">
                    {r.fired_at ? new Date(r.fired_at).toLocaleString() : '—'}
                </span>
            ),
        },
    ];

    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <div className="mb-5">
                    <StaffCommsTabNav />
                </div>

                <Link
                    href="/admin/messages/rules"
                    className="inline-flex items-center gap-1.5 font-body text-sm text-neutral-gray hover:text-text-dark mb-4"
                >
                    <ArrowLeftIcon size={16} />
                    All rules
                </Link>

                <PageHeader
                    title={rule?.name ?? 'Rule activity'}
                    subtitle="Everyone this rule considered, and what came back."
                />

                <div className="mb-4">
                    <SegmentedTabs
                        value={scope}
                        onChange={setScope}
                        options={[
                            { value: 'all', label: 'Everything it considered' },
                            { value: 'sent', label: 'Only what was sent' },
                        ]}
                    />
                </div>

                <DataTable
                    data={rows}
                    columns={columns}
                    rowKey={(r) => r.id}
                    isLoading={isLoading}
                    defaultSortKey="fired_at"
                    emptyState={
                        <div className="flex flex-col items-center text-center py-16">
                            <RobotIcon size={34} className="text-neutral-gray mb-3" />
                            <p className="font-body text-sm text-neutral-gray">
                                This rule has not fired yet.
                            </p>
                        </div>
                    }
                />
            </div>
        </div>
    );
}
