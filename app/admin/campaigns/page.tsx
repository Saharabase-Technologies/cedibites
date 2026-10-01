'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    MegaphoneIcon,
    FlaskIcon,
    WarningCircleIcon,
    PlusIcon,
    PaperPlaneTiltIcon,
    PauseCircleIcon,
} from '@phosphor-icons/react';
import {
    PageHeader,
    FilterBar,
    SearchBar,
    FilterSelect,
    DataTable,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { MarketingTabNav } from '@/app/admin/components/MarketingTabNav';
import { useCampaigns, useCampaignSegments } from '@/lib/api/hooks/useCampaigns';
import { GHS } from '@/lib/sms/cost';
import { serverNow } from '@/lib/utils/serverClock';
import type { Campaign, CampaignStatus } from '@/types/marketing';
import { CampaignStatusBadge } from './_components/CampaignStatusBadge';
import { SendDirectDialog } from './_components/SendDirectDialog';
import { ListMakeup } from './_components/ListMakeup';
import { CHART } from './_components/charts';

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'sending', label: 'Sending' },
    { value: 'paused', label: 'Paused' },
    { value: 'sent', label: 'Sent' },
    { value: 'partly_sent', label: 'Partly sent' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const NOT_SENT: CampaignStatus[] = ['draft', 'scheduled', 'cancelled'];

/** A campaign with people still to send to. Somebody has to act on these. */
const isUnfinished = (c: Campaign): boolean => c.status === 'paused' || Boolean(c.can_resume);

export default function AdminCampaignsPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [sendingDirect, setSendingDirect] = useState(false);

    const { campaigns, isLoading, error } = useCampaigns();
    const { seedMode } = useCampaignSegments();

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();

        return campaigns.filter((c) => {
            if (status && c.status !== status) return false;
            if (!term) return true;
            return c.name.toLowerCase().includes(term) || c.message.toLowerCase().includes(term);
        });
    }, [campaigns, search, status]);

    const unfinished = useMemo(() => campaigns.filter(isUnfinished), [campaigns]);

    const columns: DataTableColumn<Campaign>[] = [
        {
            key: 'name',
            header: 'Campaign',
            sortValue: (c) => c.name.toLowerCase(),
            cell: (c) => (
                // Held to a width, so a long name is cut with an ellipsis here
                // and the figures to its right keep their columns. The full
                // name is one click away, and on hover.
                <div className="w-44 sm:w-56 lg:w-72" title={c.name}>
                    <p className="text-text-dark font-semibold font-body truncate">{c.name}</p>
                    <p className="text-neutral-gray text-xs font-body truncate mt-0.5">{c.message}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortValue: (c) => c.status,
            cell: (c) => <CampaignStatusBadge status={c.status} />,
        },
        {
            // The newest campaign is the one anybody opened this page to see,
            // so the table opens sorted on this, newest first.
            key: 'date',
            header: 'Date',
            hideBelow: 'sm',
            sortValue: (c) => new Date(c.started_at ?? c.created_at ?? 0).getTime(),
            cell: (c) => (
                <div className="whitespace-nowrap">
                    <p className="text-text-dark text-sm font-body tabular-nums">
                        {day(c.started_at ?? c.created_at)}
                    </p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5">
                        {c.started_at ? 'sent' : 'written'}
                    </p>
                </div>
            ),
        },
        {
            key: 'audience',
            header: 'Audience',
            hideBelow: 'md',
            sortValue: (c) => c.recipient_count,
            cell: (c) => (
                <div className="whitespace-nowrap">
                    <p className="text-text-dark text-sm font-body">{c.segment_label}</p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5 tabular-nums">
                        {c.recipient_count.toLocaleString()} {c.recipient_count === 1 ? 'person' : 'people'}
                    </p>
                </div>
            ),
        },
        {
            key: 'result',
            header: 'Sent to',
            sortValue: (c) => (c.recipient_count > 0 ? c.sent_count / c.recipient_count : 0),
            cell: (c) => <Reach campaign={c} />,
        },
        {
            key: 'cost',
            header: 'Cost',
            align: 'right',
            hideBelow: 'md',
            sortValue: (c) => c.actual_cost ?? c.estimated_cost,
            cell: (c) => {
                const measured = c.actual_cost !== null;

                return (
                    <div className="text-right whitespace-nowrap">
                        <p className="text-text-dark font-semibold font-body tabular-nums">
                            {GHS(c.actual_cost ?? c.estimated_cost)}
                        </p>
                        {/*
                            Which number this is, always. "GHS 0.20" alone was
                            read as the price for one person when it was the
                            total for four — a misreading that scales into a
                            four-figure surprise on the real list.
                        */}
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            {measured ? 'charged in total' : 'projected in total'}
                        </p>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <div className="mb-5">
                    <MarketingTabNav />
                </div>

                <PageHeader
                    title="Campaigns"
                    subtitle="Write a text, choose who gets it, check the cost, then send."
                    // One text to one number. Sits beside the campaign button
                    // rather than somewhere else entirely: it is the same job at
                    // a different scale, and staff who cannot find it here will
                    // use their own handset, where nothing is recorded.
                    secondaryAction={{
                        label: 'Send a text',
                        onClick: () => setSendingDirect(true),
                        icon: <PaperPlaneTiltIcon size={15} weight="fill" />,
                    }}
                    action={{
                        label: 'New campaign',
                        onClick: () => router.push('/admin/campaigns/new'),
                        icon: <PlusIcon size={16} weight="bold" />,
                    }}
                />

                <SendDirectDialog isOpen={sendingDirect} onClose={() => setSendingDirect(false)} />

                {/*
                    A campaign that stopped part way is the one thing on this
                    page that cannot wait, so it is said above the table and
                    not left for somebody to notice in a column.
                */}
                {unfinished.length > 0 && (
                    <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                        <PauseCircleIcon size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            {unfinished.slice(0, 3).map((c) => (
                                <p key={c.id} className="text-text-dark text-sm font-body">
                                    <span className="font-semibold">{c.name}</span> reached{' '}
                                    {c.sent_count.toLocaleString()} of {c.recipient_count.toLocaleString()}.{' '}
                                    {c.pause_reason_label ? `${c.pause_reason_label}. ` : ''}
                                    <Link
                                        href={`/admin/campaigns/${c.id}`}
                                        className="font-semibold underline underline-offset-2 hover:text-primary transition-colors"
                                    >
                                        Open it to send to the rest
                                    </Link>
                                </p>
                            ))}
                            {unfinished.length > 3 && (
                                <p className="text-neutral-gray text-sm font-body mt-0.5">
                                    And {unfinished.length - 3} more below.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/*
                    Stated at the top rather than buried, because the alternative
                    is somebody discovering after a demo that nothing reached a
                    customer — or worse, assuming it is on when it is not.
                */}
                {seedMode && (
                    <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                        <FlaskIcon size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-text-dark text-sm font-semibold font-body">Test mode is on</p>
                            <p className="text-neutral-gray text-sm font-body mt-0.5">
                                Every send goes to the staff test numbers only. No customer receives anything,
                                whichever audience is chosen.
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-5 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-rose-700 text-sm font-body">
                            {error instanceof Error ? error.message : 'Could not load campaigns.'}
                        </p>
                    </div>
                )}

                <FilterBar>
                    <SearchBar value={search} onChange={setSearch} placeholder="Search campaigns…" />
                    <FilterSelect
                        value={status}
                        onChange={setStatus}
                        options={STATUS_OPTIONS}
                        placeholder="Any status"
                    />
                </FilterBar>

                <DataTable
                    data={rows}
                    columns={columns}
                    rowKey={(c) => c.id}
                    defaultSortKey="date"
                    defaultSortDir="desc"
                    isLoading={isLoading}
                    onRowClick={(c) => router.push(`/admin/campaigns/${c.id}`)}
                    emptyState={
                        <div className="flex flex-col items-center text-center py-16">
                            <MegaphoneIcon size={40} className="text-neutral-gray/50" />
                            <h3 className="text-text-dark font-semibold font-body mt-4">
                                {campaigns.length === 0 ? 'No campaigns yet' : 'Nothing matches that'}
                            </h3>
                            <p className="text-neutral-gray text-sm mt-1.5 font-body max-w-sm">
                                {campaigns.length === 0
                                    ? 'Write one, and you will see the recipient count and the cost before anything goes out.'
                                    : 'Try a different search or clear the status filter.'}
                            </p>
                        </div>
                    }
                />

                <ListMakeup />
            </div>
        </div>
    );
}

/**
 * How much of its list a campaign reached, as a figure over a thin bar.
 *
 * The figure is the content and the bar is its picture: green for sent to,
 * gold for held, red for refused. A campaign that stopped at 39 of 3,539 shows
 * a bar that is almost all gold, which no status word alone gets across.
 */
function Reach({ campaign: c }: { campaign: Campaign }) {
    if (NOT_SENT.includes(c.status)) {
        return <span className="text-neutral-gray text-sm font-body">Not sent</span>;
    }

    const total = Math.max(c.recipient_count, 1);
    const waiting = Math.max(0, c.recipient_count - c.sent_count - c.failed_count);

    const parts = [
        { key: 'sent', value: c.sent_count, color: CHART.delivered },
        { key: 'waiting', value: waiting, color: CHART.waiting },
        { key: 'refused', value: c.failed_count, color: CHART.refused },
    ].filter((p) => p.value > 0);

    return (
        <div className="min-w-36">
            <p className="text-text-dark text-sm font-body tabular-nums whitespace-nowrap">
                <span className="font-semibold">{c.sent_count.toLocaleString()}</span>
                <span className="text-neutral-gray"> of {c.recipient_count.toLocaleString()}</span>
            </p>
            <div className="flex h-1.5 gap-0.5 mt-1.5 rounded-sm overflow-hidden" aria-hidden>
                {parts.map((p) => (
                    <span
                        key={p.key}
                        style={{ flexGrow: p.value / total, flexBasis: 0, minWidth: 3, backgroundColor: p.color }}
                    />
                ))}
            </div>
            <p className="text-neutral-gray text-xs font-body mt-1 whitespace-nowrap">{reachNote(c, waiting)}</p>
        </div>
    );
}

/** The one thing worth saying under the figure. Never the figure again. */
function reachNote(c: Campaign, waiting: number): string {
    if (c.status === 'sending') return 'going out now';
    if (waiting > 0) return `${waiting.toLocaleString()} held, not sent`;
    if (c.failed_count > 0) return `${c.failed_count.toLocaleString()} refused`;
    // Null, not zero, when there was no link. Zero would read as "nobody
    // tapped" rather than "not measured".
    if (c.click_through_rate !== null) return `${c.click_through_rate}% tapped the link`;

    return 'the whole list';
}

/** "1 Oct", or with the year once it is not this one. The stamp is the server's. */
function day(iso: string | null): string {
    if (!iso) return '';

    const date = new Date(iso);
    const sameYear = date.getFullYear() === serverNow().getFullYear();

    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(sameYear ? {} : { year: 'numeric' }),
    });
}
