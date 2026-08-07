'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    XIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
    PaperPlaneTiltIcon,
    FlaskIcon,
} from '@phosphor-icons/react';
import { campaignService } from '@/lib/api/services/campaign.service';
import { useCampaignMutations } from '@/lib/api/hooks/useCampaigns';
import type { Campaign } from '@/types/marketing';

/**
 * The confirm step, and the last thing standing between a draft and the bill.
 *
 * Every figure here is resolved live on the server rather than read off the
 * draft, so the recipient count shown is the one the send will actually use.
 * A segment written against last week is a segment that has changed.
 */
export function SendConfirmDialog({
    campaign,
    onClose,
    onSent,
}: {
    campaign: Campaign;
    onClose: () => void;
    onSent: () => void;
}) {
    const { send } = useCampaignMutations();
    const [error, setError] = useState<string | null>(null);

    const { data: preview, isLoading } = useQuery({
        queryKey: ['campaigns', 'preview', campaign.id],
        queryFn: () => campaignService.previewCampaign(campaign.id),
        // Never served from cache. The whole point is that these numbers are
        // current at the moment the button is pressed.
        staleTime: 0,
        gcTime: 0,
    });

    async function confirm() {
        setError(null);

        try {
            await send.mutateAsync(campaign.id);
            onSent();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send the campaign.');
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
            <div className="w-full max-w-md bg-white dark:bg-brand-dark rounded-3xl shadow-xl border border-brown-light/20">

                <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0e8d8] dark:border-brown-light/20">
                    <h2 className="text-text-dark dark:text-text-light text-lg font-semibold font-body">
                        Send this campaign?
                    </h2>
                    <button onClick={onClose} className="text-neutral-gray hover:text-text-dark transition-colors">
                        <XIcon size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    {isLoading || !preview ? (
                        <div className="flex items-center justify-center gap-3 py-10 text-neutral-gray font-body">
                            <SpinnerGapIcon size={20} className="animate-spin" />
                            Counting…
                        </div>
                    ) : (
                        <>
                            {preview.seed_mode && (
                                <div className="flex items-start gap-3 bg-secondary/10 border border-secondary/30 rounded-2xl px-4 py-3">
                                    <FlaskIcon size={18} weight="fill" className="text-secondary shrink-0 mt-0.5" />
                                    <p className="text-neutral-gray text-sm font-body">
                                        <span className="text-text-dark dark:text-text-light font-semibold">
                                            Test mode is on.
                                        </span>{' '}
                                        This goes to {preview.effective_recipient_count} staff test number
                                        {preview.effective_recipient_count === 1 ? '' : 's'}, not to the{' '}
                                        {preview.recipient_count.toLocaleString()} people in this audience.
                                    </p>
                                </div>
                            )}

                            {preview.over_cap && (
                                <div className="flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                                    <WarningCircleIcon size={18} weight="fill" className="text-error shrink-0 mt-0.5" />
                                    <p className="text-error text-sm font-body">
                                        This audience holds {preview.recipient_count.toLocaleString()} people, over the
                                        limit of {preview.cap.toLocaleString()} for one campaign. Sending will be
                                        refused.
                                    </p>
                                </div>
                            )}

                            <dl className="rounded-2xl bg-neutral-light dark:bg-brand-darker px-4 py-3 flex flex-col gap-2.5">
                                <Line
                                    label="Going to"
                                    value={`${preview.effective_recipient_count.toLocaleString()} ${
                                        preview.effective_recipient_count === 1 ? 'person' : 'people'
                                    }`}
                                />
                                <Line label="Length" value={`${preview.characters} characters`} />
                                <Line
                                    label="Costs per person"
                                    value={`${preview.segments} text${preview.segments === 1 ? '' : 's'}`}
                                />
                                <div className="border-t border-brown-light/20 pt-2.5">
                                    <Line
                                        label="Projected total"
                                        value={`GHS ${preview.estimated_cost.toFixed(2)}`}
                                        strong
                                    />
                                </div>
                            </dl>

                            {preview.encoding === 'UCS_2' && (
                                <p className="text-warning text-xs font-body leading-relaxed">
                                    This message contains characters ({preview.non_gsm_characters.join(' ')}) that cut
                                    the limit from 160 to 70, so it costs {preview.segments} texts per person instead
                                    of one. Go back and swap them if you can.
                                </p>
                            )}

                            <p className="text-neutral-gray text-xs font-body leading-relaxed">
                                The projection uses our configured rate. Once Hubtel replies, the campaign will show
                                what it actually charged.
                                {!preview.seed_mode && ' Once this starts, it cannot be recalled.'}
                            </p>
                        </>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                            <WarningCircleIcon size={18} weight="fill" className="text-error shrink-0 mt-0.5" />
                            <p className="text-error text-sm font-body">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-brown-light/25 text-text-dark dark:text-text-light text-sm font-semibold font-body py-3 hover:bg-neutral-light dark:hover:bg-brand-darker transition-colors"
                        >
                            Not yet
                        </button>
                        <button
                            type="button"
                            onClick={confirm}
                            disabled={send.isPending || isLoading || preview?.over_cap}
                            className="flex-1 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-semibold font-body py-3 transition-colors flex items-center justify-center gap-2"
                        >
                            {send.isPending
                                ? <SpinnerGapIcon size={16} className="animate-spin" />
                                : <PaperPlaneTiltIcon size={16} weight="fill" />}
                            Send it
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-neutral-gray text-sm font-body">{label}</dt>
            <dd className={`font-body ${
                strong
                    ? 'text-text-dark dark:text-text-light text-lg font-semibold'
                    : 'text-text-dark dark:text-text-light text-sm font-medium'
            }`}>
                {value}
            </dd>
        </div>
    );
}
