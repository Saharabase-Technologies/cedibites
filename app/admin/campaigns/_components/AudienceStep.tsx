'use client';

import { UsersThreeIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react';
import type { CampaignSegmentOption, CampaignSegmentValue } from '@/types/marketing';

/**
 * Who gets it.
 *
 * The presets are shown with a live headcount beside each, because "Lapsed"
 * means nothing to anybody until it says 4,812 people next to it — and the
 * difference between picking a segment with 12 in it and one with 12,000 is the
 * difference between a test and an invoice.
 *
 * The custom rule builder slots in below these; a preset is the starting point
 * you then narrow.
 */
export function AudienceStep({
    segments,
    value,
    onChange,
    isLoading,
    recipientCap,
    seedMode,
}: {
    segments: CampaignSegmentOption[];
    value: CampaignSegmentValue;
    onChange: (value: CampaignSegmentValue) => void;
    isLoading: boolean;
    recipientCap: number;
    seedMode: boolean;
}) {
    const chosen = segments.find((s) => s.value === value);
    const overCap = !seedMode && !!chosen && recipientCap > 0 && chosen.count > recipientCap;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-14 text-neutral-gray font-body">
                <SpinnerGapIcon size={20} className="animate-spin" />
                Counting who is in each group…
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-3">
                {segments.map((option) => {
                    const active = option.value === value;
                    const empty = option.count === 0;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            aria-pressed={active}
                            className={`
                                text-left rounded-2xl border px-4 py-3.5 transition-colors
                                ${active
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                                    : 'border-[#f0e8d8] bg-white hover:border-neutral-gray/40'}
                            `}
                        >
                            <div className="flex items-baseline justify-between gap-3">
                                <p className={`text-sm font-semibold font-body ${active ? 'text-primary' : 'text-text-dark'}`}>
                                    {option.label}
                                </p>
                                <p
                                    className={`text-xs font-body shrink-0 tabular-nums ${
                                        empty ? 'text-neutral-gray/60' : 'text-text-dark font-semibold'
                                    }`}
                                >
                                    {option.count.toLocaleString()}
                                </p>
                            </div>
                            <p className="text-neutral-gray text-xs mt-1 font-body leading-snug">
                                {option.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Picking a group with nobody in it is a dead end that only shows
                itself at the send step otherwise. */}
            {chosen?.count === 0 && (
                <p className="flex items-start gap-2 text-neutral-gray text-sm font-body">
                    <UsersThreeIcon size={16} className="shrink-0 mt-0.5" />
                    Nobody is in this group right now, so there would be nothing to send.
                </p>
            )}

            {overCap && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <WarningCircleIcon size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-neutral-gray text-sm font-body">
                        That is {chosen.count.toLocaleString()} people, more than the{' '}
                        {recipientCap.toLocaleString()} allowed in one campaign. You can save this, but sending will
                        be refused until the limit is raised or you narrow the audience.
                    </p>
                </div>
            )}
        </div>
    );
}
