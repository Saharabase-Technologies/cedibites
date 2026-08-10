'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MegaphoneIcon, FlaskIcon, WarningCircleIcon, PlusIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
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
import type { Campaign, CampaignStatus } from '@/types/marketing';
import { CampaignStatusBadge } from './_components/CampaignStatusBadge';
import { SendDirectDialog } from './_components/SendDirectDialog';

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'sending', label: 'Sending' },
    { value: 'sent', label: 'Sent' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
];

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

    const columns: DataTableColumn<Campaign>[] = [
        {
            key: 'name',
            header: 'Campaign',
            sortValue: (c) => c.name.toLowerCase(),
            cell: (c) => (
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body truncate">{c.name}</p>
                    <p className="text-neutral-gray text-xs font-body truncate max-w-md mt-0.5">{c.message}</p>
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
            key: 'audience',
            header: 'Audience',
            hideBelow: 'md',
            sortValue: (c) => c.recipient_count,
            cell: (c) => (
                <div>
                    <p className="text-text-dark text-sm font-body">{c.segment_label}</p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5">
                        {c.recipient_count.toLocaleString()} {c.recipient_count === 1 ? 'person' : 'people'}
                    </p>
                </div>
            ),
        },
        {
            key: 'cost',
            header: 'Cost',
            align: 'right',
            sortValue: (c) => c.actual_cost ?? c.estimated_cost,
            cell: (c) => {
                const measured = c.actual_cost !== null;

                return (
                    <div className="text-right">
                        <p className="text-text-dark font-semibold font-body">
                            {GHS(c.actual_cost ?? c.estimated_cost)}
                        </p>
                        {/*
                            Which number this is, always. "GHS 0.20" alone was
                            read as the price for one person when it was the
                            total for four — a misreading that scales into a
                            four-figure surprise on the real list.
                        */}
                        <p className="text-neutral-gray text-[10px] font-body uppercase tracking-wide">
                            {measured ? 'actual, everyone' : 'projected, everyone'}
                        </p>
                    </div>
                );
            },
        },
        {
            key: 'result',
            header: 'Result',
            align: 'right',
            hideBelow: 'lg',
            sortValue: (c) => c.sent_count,
            cell: (c) => {
                if (c.status === 'draft' || c.status === 'scheduled' || c.status === 'cancelled') {
                    return <span className="text-neutral-gray text-sm font-body">—</span>;
                }

                return (
                    <div className="text-right">
                        <p className="text-text-dark text-sm font-body">
                            {c.sent_count.toLocaleString()} of {c.recipient_count.toLocaleString()} sent
                        </p>
                        {/*
                            Null, not zero, when there was no link. Zero would
                            read as "nobody tapped" rather than "not measured".
                        */}
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            {c.click_through_rate !== null
                                ? `${c.click_through_rate}% tapped the link`
                                : c.failed_count > 0
                                  ? `${c.failed_count.toLocaleString()} failed`
                                  : 'no link to measure'}
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
                    defaultSortKey="name"
                    isLoading={isLoading}
                    onRowClick={(c) => router.push(`/admin/campaigns/${c.id}`)}
                    // Anything that spent money and reached nobody wants dealing
                    // with, so it gets the gold edge the inventory tables use for
                    // rows waiting on a person.
                    needsAttention={(c) => c.status === 'failed'}
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
            </div>
        </div>
    );
}
