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
import { GHS, GHSRate } from '@/lib/sms/cost';
import type { Campaign } from '@/types/marketing';

/**
 * The last thing between a draft and the bill.
 *
 * Every figure is resolved live on the server rather than read off the draft, so
 * the recipient count shown is the one the send will actually use. A segment
 * written against last week is a segment that has changed.
 *
 * Each number says whether it is per person or for everyone, and the arithmetic
 * between them is spelled out. "GHS 0.20" on its own was read as the price for
 * one customer when it was the total for four — harmless at four, a four-figure
 * surprise at 28,000.
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
        // Never from cache. The whole point is that these are current at the
        // moment the button is pressed.
        staleTime: 0,
        gcTime: 0,
    });

    const going = preview?.effective_recipient_count ?? 0;
    const perPerson = preview && going > 0 ? preview.estimated_cost / going : 0;

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
            <div className="w-full max-w-md bg-neutral-card rounded-3xl shadow-xl border border-[#f0e8d8]">

                <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0e8d8]">
                    <h2 className="text-text-dark text-lg font-semibold font-body">Send this campaign?</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-gray hover:text-text-dark transition-colors cursor-pointer"
                    >
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
                                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                                    <FlaskIcon size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-neutral-gray text-sm font-body">
                                        <span className="text-text-dark font-semibold">Test mode is on.</span>{' '}
                                        This goes to {going} staff test number{going === 1 ? '' : 's'}, not to the{' '}
                                        {preview.recipient_count.toLocaleString()} people in this audience.
                                    </p>
                                </div>
                            )}

                            {preview.over_cap && (
                                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                                    <WarningCircleIcon size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                                    <p className="text-rose-700 text-sm font-body">
                                        This audience holds {preview.recipient_count.toLocaleString()} people, over the
                                        limit of {preview.cap.toLocaleString()} for one campaign. Sending will be
                                        refused.
                                    </p>
                                </div>
                            )}

                            {going === 0 && !preview.seed_mode && (
                                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                                    <WarningCircleIcon size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-neutral-gray text-sm font-body">
                                        Nobody is in this audience right now, so there is nothing to send.
                                    </p>
                                </div>
                            )}

                            <dl className="rounded-2xl bg-white border border-[#f0e8d8] divide-y divide-[#f0e8d8]">
                                <Line
                                    label="Going to"
                                    value={`${going.toLocaleString()} ${going === 1 ? 'person' : 'people'}`}
                                />
                                <Line label="Length" value={`${preview.characters} characters`} />
                                {/*
                                    At the rate's own precision, not two
                                    decimals. Hubtel charges GHS 0.0243 a text;
                                    shown as "0.02" the line stops multiplying
                                    to the total below it, and a total that
                                    cannot be checked against its parts is one
                                    nobody should trust.
                                */}
                                <Line
                                    label="Costs us per person"
                                    value={`${preview.segments} text${preview.segments === 1 ? '' : 's'} · ${GHSRate(perPerson)}`}
                                />
                                <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
                                    <dt className="text-text-dark text-sm font-semibold font-body">
                                        Total we pay for this send
                                        <span className="block text-neutral-gray text-xs font-normal mt-0.5">
                                            {preview.segments} text{preview.segments === 1 ? '' : 's'} ×{' '}
                                            {going.toLocaleString()} {going === 1 ? 'person' : 'people'} ×{' '}
                                            {GHSRate(perPerson / Math.max(preview.segments, 1))}
                                        </span>
                                    </dt>
                                    <dd className="text-text-dark text-xl font-bold font-body tabular-nums">
                                        {GHS(preview.estimated_cost)}
                                    </dd>
                                </div>
                            </dl>

                            {preview.encoding === 'UCS_2' && (
                                <p className="text-amber-700 text-xs font-body leading-relaxed">
                                    This message contains{' '}
                                    <span className="font-mono">{preview.non_gsm_characters.join(' ')}</span>, which cut
                                    the limit from 160 characters to 70 — so it costs {preview.segments} texts each
                                    instead of one. Go back and swap them if you can.
                                </p>
                            )}

                            <p className="text-neutral-gray text-xs font-body leading-relaxed">
                                The total is a projection from the rate Hubtel last charged us. Once the send
                                completes, the campaign shows what it was actually billed.
                                {!preview.seed_mode && ' Once this starts, it cannot be recalled.'}
                            </p>
                        </>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                            <WarningCircleIcon size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-rose-700 text-sm font-body">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-[#f0e8d8] bg-white text-text-dark text-sm font-semibold font-body py-3 hover:bg-neutral-light transition-colors min-h-11 cursor-pointer"
                        >
                            Not yet
                        </button>
                        <button
                            type="button"
                            onClick={confirm}
                            disabled={send.isPending || isLoading || preview?.over_cap || going === 0}
                            className="flex-1 rounded-xl bg-primary text-white text-sm font-semibold font-body py-3 hover:bg-primary/90 transition-colors min-h-11 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

function Line({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-neutral-gray text-sm font-body">{label}</dt>
            <dd className="text-text-dark text-sm font-medium font-body text-right">{value}</dd>
        </div>
    );
}
