'use client';

import { FlaskIcon, WarningCircleIcon, LinkSimpleIcon } from '@phosphor-icons/react';
import { measureMessage } from '@/lib/sms/meter';
import { breakDownCost, GHS } from '@/lib/sms/cost';
import type { CampaignSegmentOption, ShortLink } from '@/types/marketing';

/**
 * The last screen before the money.
 *
 * Its only job is to make the total impossible to misread. Every figure says
 * whether it is per person or for everyone, and the arithmetic between them is
 * written out — "1 text × 4 people × GHS 0.05" — so the number is checkable
 * rather than trusted.
 */
export function ReviewStep({
    name,
    message,
    segment,
    link,
    ratePerSegment,
    seedMode,
    seedCount,
}: {
    name: string;
    message: string;
    segment?: CampaignSegmentOption;
    link?: ShortLink;
    ratePerSegment: number;
    seedMode: boolean;
    /** How many staff test numbers are configured, when test mode is on. */
    seedCount: number | null;
}) {
    const meter = measureMessage(message);
    const audience = segment?.count ?? 0;
    const cost = breakDownCost(meter.segments, audience, ratePerSegment);

    return (
        <div className="flex flex-col gap-5">

            {seedMode && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <FlaskIcon size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-neutral-gray text-sm font-body">
                        <span className="text-text-dark font-semibold">Test mode is on.</span>{' '}
                        {seedCount === null
                            ? 'This goes to the staff test numbers, not to this audience.'
                            : `This goes to ${seedCount} staff test number${seedCount === 1 ? '' : 's'}, not to the ${audience.toLocaleString()} people below.`}
                    </p>
                </div>
            )}

            {/* ── The message as it will arrive ─────────────────────────── */}
            <div>
                <p className="text-neutral-gray text-xs font-body uppercase tracking-wide mb-2">
                    What they will receive
                </p>
                <div className="rounded-2xl bg-white border border-[#f0e8d8] px-4 py-3">
                    <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{message || '—'}</p>
                </div>
                {link && (
                    <p className="flex items-center gap-1.5 text-neutral-gray text-xs font-body mt-2">
                        <LinkSimpleIcon size={13} />
                        <span className="font-mono">{link.sms_url}</span> goes to {link.target_url}
                    </p>
                )}
            </div>

            {/* ── The numbers ───────────────────────────────────────────── */}
            <dl className="rounded-2xl bg-white border border-[#f0e8d8] divide-y divide-[#f0e8d8]">
                <Line label="Called" value={name || '—'} />
                <Line
                    label="Going to"
                    value={
                        segment
                            ? `${segment.label} — ${audience.toLocaleString()} ${audience === 1 ? 'person' : 'people'}`
                            : '—'
                    }
                />
                <Line
                    label="Length"
                    value={`${meter.characters} characters${meter.encoding === 'UCS_2' ? ' (special characters)' : ''}`}
                />
                <Line
                    label="Costs each person"
                    value={`${meter.segments} text${meter.segments === 1 ? '' : 's'} · ${GHS(cost.perPerson)}`}
                />
                <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
                    <dt className="text-text-dark text-sm font-semibold font-body">
                        Total for everyone
                        {/* The arithmetic, so the total is checkable rather than trusted. */}
                        <span className="block text-neutral-gray text-xs font-normal mt-0.5">
                            {cost.workingOut}
                        </span>
                    </dt>
                    <dd className="text-text-dark text-xl font-bold font-body tabular-nums">{GHS(cost.total)}</dd>
                </div>
            </dl>

            {meter.encoding === 'UCS_2' && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <WarningCircleIcon size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-neutral-gray text-sm font-body">
                        <span className="font-mono text-text-dark">{meter.non_gsm_characters.join('  ')}</span> cut the
                        limit from 160 characters to 70, so this costs {meter.segments} texts each instead of fewer.
                        Go back to the message step to swap them.
                    </p>
                </div>
            )}

            <p className="text-neutral-gray text-xs font-body leading-relaxed">
                The total uses our configured rate of {GHS(ratePerSegment)} per text. Once Hubtel replies, the
                campaign shows what it actually charged.
            </p>
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
