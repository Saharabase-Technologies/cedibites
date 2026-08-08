'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, QuestionIcon } from '@phosphor-icons/react';
import { SegmentedTabs } from '@/app/inventory/_components';
import { useCampaignDeliveries } from '@/lib/api/hooks/useCampaigns';
import type { DeliveryOutcomeValue } from '@/types/marketing';

/**
 * Who received a campaign and who did not.
 *
 * Built around one distinction: a dead number and a handset that was switched
 * off both read as "not delivered" and call for opposite responses. Retire the
 * first; try the second again tomorrow. A single failure count cannot tell you
 * which you have, so this never shows one.
 */

const TONE: Record<DeliveryOutcomeValue | 'unknown', { bg: string; text: string; icon: React.ReactNode }> = {
    delivered: { bg: 'bg-secondary/10', text: 'text-secondary', icon: <CheckCircleIcon size={14} weight="fill" /> },
    failed: { bg: 'bg-error/10', text: 'text-error', icon: <XCircleIcon size={14} weight="fill" /> },
    pending: { bg: 'bg-warning/10', text: 'text-warning', icon: <ClockIcon size={14} weight="fill" /> },
    unconfirmed: { bg: 'bg-neutral-light', text: 'text-neutral-gray', icon: <QuestionIcon size={14} weight="fill" /> },
    unknown: { bg: 'bg-neutral-light', text: 'text-neutral-gray', icon: <QuestionIcon size={14} weight="fill" /> },
};

const FILTERS: { value: string; label: string }[] = [
    { value: 'not_delivered', label: 'Did not arrive' },
    { value: 'delivered', label: 'Delivered' },
    { value: '', label: 'Everyone' },
];

export function DeliveryBreakdown({ campaignId }: { campaignId: number }) {
    // Opens on the ones that did not arrive, because that is the only list
    // anybody comes to this screen to read.
    const [outcome, setOutcome] = useState('not_delivered');

    const { summary, deliveries, total, isLoading } = useCampaignDeliveries(campaignId, { outcome });

    if (!summary || summary.accepted === 0) {
        return null;
    }

    return (
        <div className="bg-neutral-card rounded-2xl shadow-sm px-5 py-4 mb-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="text-text-dark font-semibold font-body">Delivery</h2>
                <p className="text-neutral-gray text-xs font-body">
                    {summary.is_final
                        ? `Final — we stopped checking ${summary.window_hours}h after the send`
                        : 'Still settling — networks keep retrying for hours'}
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <Tally
                    tone="delivered"
                    value={summary.delivered}
                    label="Delivered"
                    note={summary.delivery_rate !== null ? `${summary.delivery_rate}% of accepted` : undefined}
                />
                <Tally
                    tone="failed"
                    value={summary.failed}
                    label="Failed"
                    note="dead or barred numbers"
                />
                {/*
                    The one that must never be filed under failures. The handset
                    was almost certainly off — the person is fine, and some
                    carriers never return a receipt at all.
                */}
                <Tally
                    tone="unconfirmed"
                    value={summary.unconfirmed}
                    label="Never confirmed"
                    note="usually a phone that was off"
                />
                {summary.pending > 0 ? (
                    <Tally tone="pending" value={summary.pending} label="Still trying" note="network is retrying" />
                ) : (
                    <Tally
                        tone="unknown"
                        value={summary.unknown}
                        label="No status"
                        note="not read back yet"
                    />
                )}
            </div>

            {summary.unconfirmed > 0 && (
                <p className="text-neutral-gray text-xs font-body mb-4 leading-relaxed">
                    <strong className="text-text-dark">Never confirmed is not failed.</strong>{' '}
                    Those numbers are worth sending to again another day — unlike the failed ones,
                    which will cost the same and fail the same.
                </p>
            )}

            <div className="mb-3">
                <SegmentedTabs value={outcome} onChange={setOutcome} options={FILTERS} />
            </div>

            {isLoading && deliveries.length === 0 ? (
                <p className="text-neutral-gray text-sm font-body py-6 text-center">Loading…</p>
            ) : deliveries.length === 0 ? (
                <p className="text-neutral-gray text-sm font-body py-6 text-center">
                    {outcome === 'not_delivered'
                        ? 'Every message we have a status for arrived.'
                        : 'Nothing here.'}
                </p>
            ) : (
                <>
                    <div className="rounded-xl border border-[#f0e8d8] overflow-hidden">
                        {deliveries.map((d) => (
                            <div
                                key={d.id}
                                className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-body border-b border-[#f0e8d8] last:border-0"
                            >
                                <span className="text-text-dark font-medium">{d.phone}</span>
                                <span className="flex items-center gap-2 shrink-0">
                                    {/* Hubtel's own word, so an unfamiliar status is
                                        visible rather than flattened into ours. */}
                                    {d.provider_status && (
                                        <span className="text-neutral-gray/70 hidden sm:inline">
                                            {d.provider_status}
                                        </span>
                                    )}
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${TONE[d.outcome].bg} ${TONE[d.outcome].text}`}
                                    >
                                        {TONE[d.outcome].icon}
                                        {d.outcome === 'unconfirmed' ? 'Not confirmed' : d.outcome}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>

                    {total > deliveries.length && (
                        <p className="text-neutral-gray text-xs font-body text-center mt-3">
                            Showing {deliveries.length.toLocaleString()} of {total.toLocaleString()}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

function Tally({
    tone,
    value,
    label,
    note,
}: {
    tone: DeliveryOutcomeValue | 'unknown';
    value: number;
    label: string;
    note?: string;
}) {
    return (
        <div className="rounded-xl bg-neutral-light/60 px-3 py-2.5">
            <p className={`text-lg font-bold font-body tabular-nums ${value > 0 ? TONE[tone].text : 'text-text-dark'}`}>
                {value.toLocaleString()}
            </p>
            <p className="text-text-dark text-[11px] font-body font-medium mt-0.5">{label}</p>
            {note && <p className="text-neutral-gray text-[10px] font-body leading-tight mt-0.5">{note}</p>}
        </div>
    );
}
