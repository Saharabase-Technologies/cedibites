'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    PaperPlaneTiltIcon,
    PencilSimpleIcon,
    ProhibitIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
    CursorClickIcon,
} from '@phosphor-icons/react';
import { useCampaign, useCampaignMutations } from '@/lib/api/hooks/useCampaigns';
import { ComposeDialog } from '../_components/ComposeDialog';
import { SendConfirmDialog } from '../_components/SendConfirmDialog';

/**
 * One campaign: what it says, what it will cost, and afterwards what it did.
 *
 * Sending lives here rather than in the list, because it is the one act in this
 * console that spends money and it should take a deliberate visit.
 */
export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const { campaign, isLoading, error, refetch } = useCampaign(Number(id));
    const { cancel, remove } = useCampaignMutations();

    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-20 text-neutral-gray font-body">
                <SpinnerGapIcon size={22} className="animate-spin" />
                Loading…
            </div>
        );
    }

    if (error || !campaign) {
        return (
            <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
                <div className="flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                    <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                    <p className="text-error text-sm font-body">
                        {error instanceof Error ? error.message : 'Could not load this campaign.'}
                    </p>
                </div>
            </div>
        );
    }

    const started = campaign.status === 'sending' || campaign.status === 'sent' || campaign.status === 'failed';
    const progress = campaign.recipient_count > 0
        ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.recipient_count) * 100)
        : 0;

    async function act(action: 'cancel' | 'delete') {
        if (!campaign) return;
        setActionError(null);

        try {
            if (action === 'cancel') {
                await cancel.mutateAsync(campaign.id);
                void refetch();
            } else {
                await remove.mutateAsync(campaign.id);
                router.push('/admin/campaigns');
            }
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'That did not work.');
        }
    }

    return (
        <div className="h-full overflow-y-auto bg-neutral-light dark:bg-brand-darker">
            <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">

                <Link
                    href="/admin/campaigns"
                    className="inline-flex items-center gap-2 text-neutral-gray hover:text-text-dark text-sm font-body mb-4 transition-colors"
                >
                    <ArrowLeftIcon size={15} />
                    All campaigns
                </Link>

                <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div className="min-w-0">
                        <h1 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                            {campaign.name}
                        </h1>
                        <p className="text-neutral-gray text-sm mt-1 font-body">
                            {campaign.status_label} · {campaign.segment_label}
                            {campaign.created_by && ` · written by ${campaign.created_by}`}
                            {campaign.approved_by && ` · sent by ${campaign.approved_by}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {campaign.is_editable && (
                            <>
                                <button
                                    onClick={() => setEditing(true)}
                                    className="flex items-center gap-2 rounded-xl border border-brown-light/25 px-3 py-2 text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors"
                                >
                                    <PencilSimpleIcon size={15} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => setConfirming(true)}
                                    className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-semibold font-body transition-colors"
                                >
                                    <PaperPlaneTiltIcon size={15} weight="fill" />
                                    Send
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {actionError && (
                    <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                        <p className="text-error text-sm font-body">{actionError}</p>
                    </div>
                )}

                {/* The message, shown as it will arrive. */}
                <div className="rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-dark px-5 py-4 mb-4">
                    <p className="text-neutral-gray text-xs font-body uppercase tracking-wide mb-2">
                        The message
                    </p>
                    <p className="text-text-dark dark:text-text-light text-sm font-body whitespace-pre-wrap">
                        {campaign.message}
                    </p>
                    <p className="text-neutral-gray text-xs mt-3 font-body">
                        {campaign.segments_per_message} text
                        {campaign.segments_per_message === 1 ? '' : 's'} per person
                    </p>
                </div>

                {started && (
                    <>
                        <div className="rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-dark px-5 py-4 mb-4">
                            <div className="flex items-baseline justify-between mb-2">
                                <p className="text-neutral-gray text-xs font-body uppercase tracking-wide">
                                    Progress
                                </p>
                                <p className="text-text-dark dark:text-text-light text-sm font-semibold font-body">
                                    {campaign.sent_count.toLocaleString()} of{' '}
                                    {campaign.recipient_count.toLocaleString()}
                                </p>
                            </div>
                            <div className="h-2 rounded-full bg-neutral-light dark:bg-brand-darker overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            {campaign.failed_count > 0 && (
                                <p className="text-error text-xs mt-2 font-body">
                                    {campaign.failed_count.toLocaleString()} could not be delivered.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <Stat label="Recipients" value={campaign.recipient_count.toLocaleString()} />
                            <Stat label="Delivered" value={campaign.sent_count.toLocaleString()} />
                            <Stat
                                label={campaign.actual_cost === null ? 'Projected cost' : 'Actual cost'}
                                value={`GHS ${(campaign.actual_cost ?? campaign.estimated_cost).toFixed(2)}`}
                            />
                            {/*
                                The number that turns "we sent 28,000 messages" —
                                a cost — into "3,400 people opened the menu",
                                which is a business case.
                            */}
                            <Stat
                                label="Tapped the link"
                                value={
                                    campaign.click_through_rate === null
                                        ? '—'
                                        : `${campaign.click_through_rate}%`
                                }
                                accent={campaign.click_through_rate !== null}
                            />
                        </div>

                        {campaign.short_link && (
                            <div className="rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-dark px-5 py-4 mb-4">
                                <p className="text-neutral-gray text-xs font-body uppercase tracking-wide mb-1.5">
                                    The link in this message
                                </p>
                                <p className="text-text-dark dark:text-text-light text-sm font-mono">
                                    {campaign.short_link.sms_url}
                                </p>
                                <p className="text-primary text-xs font-semibold font-body mt-1.5 flex items-center gap-1.5">
                                    <CursorClickIcon size={13} weight="fill" />
                                    {campaign.short_link.click_count.toLocaleString()} taps
                                </p>
                            </div>
                        )}
                    </>
                )}

                {campaign.is_editable && (
                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            onClick={() => act('cancel')}
                            className="flex items-center gap-2 text-neutral-gray hover:text-warning text-sm font-medium font-body transition-colors"
                        >
                            <ProhibitIcon size={15} />
                            Cancel this campaign
                        </button>
                        <button
                            onClick={() => act('delete')}
                            className="flex items-center gap-2 text-neutral-gray hover:text-error text-sm font-medium font-body transition-colors"
                        >
                            Delete it
                        </button>
                    </div>
                )}
            </div>

            {editing && (
                <ComposeDialog
                    campaign={campaign}
                    onClose={() => setEditing(false)}
                    onSaved={() => { setEditing(false); void refetch(); }}
                />
            )}

            {confirming && (
                <SendConfirmDialog
                    campaign={campaign}
                    onClose={() => setConfirming(false)}
                    onSent={() => { setConfirming(false); void refetch(); }}
                />
            )}
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-dark px-4 py-3">
            <p className="text-neutral-gray text-xs font-body">{label}</p>
            <p className={`text-lg font-semibold font-body mt-0.5 ${accent ? 'text-primary' : 'text-text-dark dark:text-text-light'}`}>
                {value}
            </p>
        </div>
    );
}
