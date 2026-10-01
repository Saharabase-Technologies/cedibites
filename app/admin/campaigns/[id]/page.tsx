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
    PauseCircleIcon,
} from '@phosphor-icons/react';
import { useCampaign, useCampaignMutations, useCampaignReport } from '@/lib/api/hooks/useCampaigns';
import { GHS } from '@/lib/sms/cost';
import { serverNow } from '@/lib/utils/serverClock';
import type { Campaign, CampaignReport } from '@/types/marketing';
import { CampaignStatusBadge } from '../_components/CampaignStatusBadge';
import { SendConfirmDialog } from '../_components/SendConfirmDialog';
import { SendTestDialog } from '../_components/SendTestDialog';
import { ResumeDialog } from '../_components/ResumeDialog';
import { DeliveryBreakdown } from '../_components/DeliveryBreakdown';
import { DeliveryCharts, ReachPanel, reachFromCampaign } from '../_components/ReachPanel';

const STARTED: Campaign['status'][] = ['sending', 'paused', 'sent', 'partly_sent', 'failed'];

/** Hubtel is asked about delivery for two days after a send. */
const SETTLING_HOURS = 48;

/**
 * One campaign: what it says, what it will cost, and afterwards what it did.
 *
 * Sending lives here rather than in the list, because it is the one act in this
 * console that spends money and it should take a deliberate visit.
 *
 * Once a campaign has gone out the page leads with how far it got, measured
 * against the whole list. If it stopped, the reason and the way to finish it
 * come before anything else.
 */
export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const { campaign, isLoading, error, refetch } = useCampaign(Number(id));
    const { cancel, remove } = useCampaignMutations();

    const started = campaign ? STARTED.includes(campaign.status) : false;

    const { report } = useCampaignReport(Number(id), {
        enabled: started,
        live: campaign?.status === 'sending',
        settling: campaign ? stillSettling(campaign) : false,
    });

    const [confirming, setConfirming] = useState(false);
    const [testing, setTesting] = useState(false);
    const [resuming, setResuming] = useState(false);
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
                            {campaign.started_at && ` on ${when(campaign.started_at)}`}
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

                {/*
                    First on the page when there is something to do. A campaign
                    that stopped used to say "3,500 could not be delivered" in
                    small print under a full progress bar, with no reason and
                    no way to finish it.
                */}
                <Unfinished campaign={campaign} report={report} onResume={() => setResuming(true)} />

                {started && <ReachPanel campaign={campaign} report={report} />}

                {/*
                    The message leads and the figures sit beside it, narrower.
                    They are a short list of facts about one send, so they are
                    set as a list and not as a row of matching tiles.
                */}
                <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr] items-start gap-4 mb-4">
                    <section className="bg-neutral-card rounded-2xl shadow-sm px-5 py-4">
                        <h2 className="text-text-dark font-semibold font-body mb-2">The message</h2>
                        <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{campaign.message}</p>
                        <p className="text-neutral-gray text-xs mt-3 font-body">
                            {campaign.segments_per_message} text
                            {campaign.segments_per_message === 1 ? '' : 's'} per person
                        </p>

                        {/*
                            Whether anybody has actually read this on a handset.
                            Sits with the message rather than with the figures,
                            because it says something about the words and nothing
                            about the money.
                        */}
                        {campaign.last_tested_at ? (
                            <p className="flex items-center gap-1.5 text-neutral-gray text-xs mt-2 font-body">
                                <CheckCircleIcon size={13} weight="fill" className="text-emerald-600 shrink-0" />
                                Tested to {campaign.last_tested_phone} on {when(campaign.last_tested_at)}
                                {campaign.last_tested_by && ` by ${campaign.last_tested_by}`}
                            </p>
                        ) : campaign.is_editable ? (
                            <p className="flex items-center gap-1.5 text-amber-700 text-xs mt-2 font-body">
                                <FlaskIcon size={13} weight="fill" className="shrink-0" />
                                Nobody has read this on a phone yet.
                            </p>
                        ) : started ? (
                            <p className="text-neutral-gray text-xs mt-2 font-body">
                                Sent without a test first.
                            </p>
                        ) : null}
                    </section>

                    <section className="bg-neutral-card rounded-2xl shadow-sm px-5 py-4">
                        <dl className="divide-y divide-[#f0e8d8] font-body">
                            <Fact
                                label="Audience"
                                value={`${campaign.recipient_count.toLocaleString()} ${
                                    campaign.recipient_count === 1 ? 'person' : 'people'
                                }`}
                                note={campaign.segment_label}
                            />
                            {/* Which figure this is, always. Null stays null. */}
                            <Fact
                                label={campaign.actual_cost === null ? 'Projected cost' : 'Charged by Hubtel'}
                                value={GHS(campaign.actual_cost ?? campaign.estimated_cost)}
                                note={
                                    campaign.actual_cost === null
                                        ? 'An estimate, for everyone on the list'
                                        : `Of ${GHS(campaign.estimated_cost)} projected for the whole list`
                                }
                            />
                            <Fact
                                label="Tapped the link"
                                value={campaign.click_through_rate === null ? 'No link' : `${campaign.click_through_rate}%`}
                                note={campaign.click_through_rate === null ? 'Nothing to measure' : 'Of those sent to'}
                            />
                        </dl>
                    </section>
                </div>

                <DeliveryCharts campaign={campaign} report={report} />

                {/*
                    The per-recipient truth behind the delivered figure.
                    Renders nothing until a send has been accepted, so a draft
                    does not carry an empty delivery panel.
                */}
                <DeliveryBreakdown campaignId={campaign.id} />

                {campaign.short_link && (
                    <div className="bg-neutral-card rounded-2xl shadow-sm px-5 py-4 mb-4">
                        <h2 className="text-text-dark font-semibold font-body mb-1.5">The link in this message</h2>
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

            {resuming && (
                <ResumeDialog
                    campaign={campaign}
                    reach={report?.reach ?? null}
                    onClose={() => setResuming(false)}
                    onSent={() => { setResuming(false); void refetch(); }}
                />
            )}
        </div>
    );
}

/**
 * What stopped it, and the button that finishes it.
 *
 * Shown for a paused campaign, and for a finished one with people still left
 * to send to. The reason and the remedy are the server's own sentences, the
 * same ones the alert email carries, so the screen and the email agree.
 */
function Unfinished({
    campaign,
    report,
    onResume,
}: {
    campaign: Campaign;
    report: CampaignReport | null;
    onResume: () => void;
}) {
    const paused = campaign.status === 'paused';

    if (!paused && !campaign.can_resume) {
        return null;
    }

    const reach = report?.reach ?? reachFromCampaign(campaign);
    const left = reach.resumable || campaign.resumable_count || 0;

    // For a finished campaign the reason comes off the list itself: whatever
    // most of the missed people were refused for.
    const cause = report?.reasons.find((r) => r.reason !== 'invalid_recipient') ?? null;
    const reason = campaign.pause_reason_label ?? cause?.label ?? null;
    const remedy = campaign.pause_remedy ?? cause?.remedy ?? null;

    return (
        <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0 flex-1 basis-80">
                    <h2 className="flex items-center gap-2 text-text-dark font-semibold font-body">
                        <PauseCircleIcon size={18} weight="fill" className="text-amber-600 shrink-0" />
                        {paused
                            ? `Stopped at ${campaign.sent_count.toLocaleString()} of ${campaign.recipient_count.toLocaleString()}`
                            : `${left.toLocaleString()} ${left === 1 ? 'person was' : 'people were'} missed`}
                    </h2>

                    {reason && (
                        <p className="text-text-dark text-sm font-body mt-2">
                            <span className="font-semibold">{reason}.</span>
                            {remedy && ` ${remedy}`}
                        </p>
                    )}

                    <p className="text-neutral-gray text-sm font-body mt-1.5">
                        Nobody has been texted twice. When it is put right, send to the rest from here.
                    </p>
                </div>

                {left > 0 && (
                    <button
                        onClick={onResume}
                        className="flex items-center gap-2 rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm shrink-0"
                    >
                        <PaperPlaneTiltIcon size={15} weight="fill" />
                        Send to the {left.toLocaleString()} who {paused ? 'are waiting' : 'were missed'}
                    </button>
                )}
            </div>
        </section>
    );
}

/**
 * Whether delivery figures can still move.
 *
 * Decides only how often the page asks again, which is the machine's business.
 * It still reads the server's clock, so a till an hour slow does not stop
 * refreshing an hour early.
 */
function stillSettling(campaign: Campaign): boolean {
    const from = campaign.completed_at ?? campaign.started_at;

    if (!from || !STARTED.includes(campaign.status)) {
        return false;
    }

    return serverNow().getTime() - new Date(from).getTime() < SETTLING_HOURS * 60 * 60 * 1000;
}

/**
 * A moment on the campaign, as people say it.
 *
 * The timestamp is the server's, read straight off the campaign, so this only
 * has to format it. Nothing here asks the local machine what time it is.
 */
function when(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
    return (
        <div className="py-3 first:pt-0 last:pb-0">
            <dt className="text-neutral-gray text-xs">{label}</dt>
            <dd className="text-text-dark text-lg font-semibold mt-0.5">{value}</dd>
            {note && <dd className="text-neutral-gray text-xs mt-0.5">{note}</dd>}
        </div>
    );
}
