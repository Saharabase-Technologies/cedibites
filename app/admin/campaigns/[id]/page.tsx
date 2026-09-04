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
    TrashIcon,
    FlaskIcon,
    CheckCircleIcon,
} from '@phosphor-icons/react';
import { useCampaign, useCampaignMutations } from '@/lib/api/hooks/useCampaigns';
import { GHS } from '@/lib/sms/cost';
import { CampaignStatusBadge } from '../_components/CampaignStatusBadge';
import { SendConfirmDialog } from '../_components/SendConfirmDialog';
import { SendTestDialog } from '../_components/SendTestDialog';
import { DeliveryBreakdown } from '../_components/DeliveryBreakdown';

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

    const [confirming, setConfirming] = useState(false);
    const [testing, setTesting] = useState(false);
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
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                    <WarningCircleIcon size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-rose-700 text-sm font-body">
                        {error instanceof Error ? error.message : 'Could not load this campaign.'}
                    </p>
                </div>
            </div>
        );
    }

    const started = ['sending', 'sent', 'failed'].includes(campaign.status);
    const accounted = campaign.sent_count + campaign.failed_count;
    const progress = campaign.recipient_count > 0
        ? Math.round((accounted / campaign.recipient_count) * 100)
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
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">

                <Link
                    href="/admin/campaigns"
                    className="inline-flex items-center gap-2 text-neutral-gray hover:text-text-dark text-sm font-body mb-4 transition-colors"
                >
                    <ArrowLeftIcon size={15} />
                    All campaigns
                </Link>

                <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold font-brand text-text-dark">{campaign.name}</h1>
                            <CampaignStatusBadge status={campaign.status} />
                        </div>
                        <p className="text-neutral-gray text-sm mt-1 font-body">
                            {campaign.segment_label}
                            {campaign.created_by && ` · written by ${campaign.created_by}`}
                            {campaign.approved_by && ` · sent by ${campaign.approved_by}`}
                        </p>
                    </div>

                    {campaign.is_editable && (
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                href={`/admin/campaigns/${campaign.id}/edit`}
                                className="flex items-center gap-2 rounded-xl border border-[#f0e8d8] bg-neutral-card px-4 py-2.5 text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors min-h-11"
                            >
                                <PencilSimpleIcon size={15} />
                                Edit
                            </Link>
                            {/*
                                Between Edit and Send because that is the order
                                of the job. A campaign nobody has read on a phone
                                is a campaign nobody has read.
                            */}
                            <button
                                onClick={() => setTesting(true)}
                                className="flex items-center gap-2 rounded-xl border border-[#f0e8d8] bg-neutral-card px-4 py-2.5 text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors min-h-11 cursor-pointer"
                            >
                                <FlaskIcon size={15} weight="fill" />
                                Test
                            </button>
                            <button
                                onClick={() => setConfirming(true)}
                                className="flex items-center gap-2 rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm"
                            >
                                <PaperPlaneTiltIcon size={15} weight="fill" />
                                Send
                            </button>
                        </div>
                    )}
                </header>

                {actionError && (
                    <div className="mb-5 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-rose-700 text-sm font-body">{actionError}</p>
                    </div>
                )}

                <div className="bg-neutral-card rounded-2xl shadow-sm px-5 py-4 mb-4">
                    <p className="text-neutral-gray text-xs font-body uppercase tracking-wide mb-2">The message</p>
                    <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{campaign.message}</p>
                    <p className="text-neutral-gray text-xs mt-3 font-body">
                        {campaign.segments_per_message} text
                        {campaign.segments_per_message === 1 ? '' : 's'} per person
                    </p>

                    {/*
                        Whether anybody has actually read this on a handset.
                        Sits with the message rather than in the figures above,
                        because it says something about the words and nothing
                        about the money.
                    */}
                    {campaign.last_tested_at ? (
                        <p className="flex items-center gap-1.5 text-neutral-gray text-xs mt-2 font-body">
                            <CheckCircleIcon size={13} weight="fill" className="text-emerald-600 shrink-0" />
                            Tested to {campaign.last_tested_phone} on {testedOn(campaign.last_tested_at)}
                            {campaign.last_tested_by && ` by ${campaign.last_tested_by}`}
                        </p>
                    ) : campaign.is_editable ? (
                        <p className="flex items-center gap-1.5 text-amber-700 text-xs mt-2 font-body">
                            <FlaskIcon size={13} weight="fill" className="shrink-0" />
                            Nobody has read this on a phone yet.
                        </p>
                    ) : null}
                </div>

                {started && (
                    <div className="bg-neutral-card rounded-2xl shadow-sm px-5 py-4 mb-4">
                        <div className="flex items-baseline justify-between mb-2">
                            <p className="text-neutral-gray text-xs font-body uppercase tracking-wide">Progress</p>
                            <p className="text-text-dark text-sm font-semibold font-body tabular-nums">
                                {campaign.sent_count.toLocaleString()} of{' '}
                                {campaign.recipient_count.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-light overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${
                                    campaign.status === 'failed' ? 'bg-rose-400' : 'bg-primary'
                                }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {campaign.failed_count > 0 && (
                            <p className="text-rose-700 text-xs mt-2 font-body">
                                {campaign.failed_count.toLocaleString()} could not be delivered.
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <Stat
                        label="Audience"
                        value={campaign.recipient_count.toLocaleString()}
                        note={campaign.recipient_count === 1 ? 'person' : 'people'}
                    />
                    {/*
                        Accepted and delivered are different numbers, and the
                        gap between them is the interesting one. Before the poll
                        has run there is nothing honest to say about delivery, so
                        it says so rather than showing the accepted count twice.
                    */}
                    <Stat
                        label="Delivered"
                        value={
                            !started
                                ? '—'
                                : campaign.delivery_checked_at
                                  ? campaign.delivered_count.toLocaleString()
                                  : campaign.sent_count.toLocaleString()
                        }
                        note={
                            !started
                                ? 'not sent yet'
                                : campaign.delivery_checked_at
                                  ? `of ${campaign.sent_count.toLocaleString()} accepted`
                                  : 'accepted, delivery not checked yet'
                        }
                    />
                    {/* Which figure this is, always — and null stays null. */}
                    <Stat
                        label={campaign.actual_cost === null ? 'Projected cost' : 'Actual cost'}
                        value={GHS(campaign.actual_cost ?? campaign.estimated_cost)}
                        note={campaign.actual_cost === null ? 'estimate, everyone' : 'charged by Hubtel'}
                    />
                    <Stat
                        label="Tapped the link"
                        value={campaign.click_through_rate === null ? '—' : `${campaign.click_through_rate}%`}
                        note={campaign.click_through_rate === null ? 'no link attached' : 'of those delivered'}
                        accent={campaign.click_through_rate !== null}
                    />
                </div>

                {/*
                    The per-recipient truth behind the Delivered tile above.
                    Renders nothing until a send has been accepted, so a draft
                    does not carry an empty delivery panel.
                */}
                <DeliveryBreakdown campaignId={campaign.id} />

                {campaign.short_link && (
                    <div className="bg-neutral-card rounded-2xl shadow-sm px-5 py-4 mb-4">
                        <p className="text-neutral-gray text-xs font-body uppercase tracking-wide mb-1.5">
                            The link in this message
                        </p>
                        <p className="text-text-dark text-sm font-mono">{campaign.short_link.sms_url}</p>
                        <p className="text-primary text-xs font-semibold font-body mt-1.5 flex items-center gap-1.5">
                            <CursorClickIcon size={13} weight="fill" />
                            {campaign.short_link.click_count.toLocaleString()} taps
                        </p>
                    </div>
                )}

                {campaign.is_editable && (
                    <div className="flex flex-wrap gap-4 pt-2">
                        <button
                            onClick={() => act('cancel')}
                            className="flex items-center gap-2 text-neutral-gray hover:text-amber-700 text-sm font-medium font-body transition-colors cursor-pointer"
                        >
                            <ProhibitIcon size={15} />
                            Cancel this campaign
                        </button>
                        <button
                            onClick={() => act('delete')}
                            className="flex items-center gap-2 text-neutral-gray hover:text-rose-700 text-sm font-medium font-body transition-colors cursor-pointer"
                        >
                            <TrashIcon size={15} />
                            Delete it
                        </button>
                    </div>
                )}
            </div>

            {/* Mounted only while open, so the number field starts fresh each time. */}
            {testing && (
                <SendTestDialog
                    campaign={campaign}
                    onClose={() => setTesting(false)}
                    onSent={() => { setTesting(false); void refetch(); }}
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

/**
 * When the test went out.
 *
 * The timestamp is the server's, read straight off the campaign, so this only
 * has to format it. Nothing here asks the local machine what time it is.
 */
function testedOn(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
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
        <div className="rounded-2xl bg-neutral-card shadow-sm px-4 py-3">
            <p className="text-neutral-gray text-xs font-body">{label}</p>
            <p className={`text-lg font-semibold font-body tabular-nums mt-0.5 ${accent ? 'text-primary' : 'text-text-dark'}`}>
                {value}
            </p>
            {note && <p className="text-neutral-gray text-[10px] font-body uppercase tracking-wide mt-0.5">{note}</p>}
        </div>
    );
}
