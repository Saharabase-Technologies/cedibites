'use client';

import { WarningCircleIcon, SparkleIcon, LinkSimpleIcon } from '@phosphor-icons/react';
import { FormField, Textarea, Select } from '@/app/inventory/_components';
import { measureMessage, canPlainify, plainify } from '@/lib/sms/meter';
import { breakDownCost, GHS, GHSRate } from '@/lib/sms/cost';
import type { ShortLink } from '@/types/marketing';

/**
 * What they read, and what it costs to say it.
 *
 * The counter is not decoration. SMS is billed in whole 160-character steps, so
 * the number beside the box is the difference between one text and two —
 * multiplied by however many thousand people are in the audience.
 */
export function MessageStep({
    message,
    onMessageChange,
    links,
    shortLinkId,
    onShortLinkChange,
    recipients,
    ratePerSegment,
}: {
    message: string;
    onMessageChange: (value: string) => void;
    links: ShortLink[];
    shortLinkId: number | null;
    onShortLinkChange: (id: number | null) => void;
    recipients: number;
    ratePerSegment: number;
}) {
    const meter = measureMessage(message);
    const cost = breakDownCost(meter.segments, recipients, ratePerSegment);
    const unicode = meter.encoding === 'UCS_2';
    const nearlyFull = meter.segments > 0 && meter.remaining_in_segment <= 20;

    /** Drop the link's short address into the message rather than making them type it. */
    function attach(id: number | null) {
        onShortLinkChange(id);
        if (id === null) return;

        const link = links.find((l) => l.id === id);
        if (link && !message.includes(link.sms_url)) {
            onMessageChange(message ? `${message.trimEnd()} ${link.sms_url}` : link.sms_url);
        }
    }

    return (
        <div className="grid lg:grid-cols-[1fr_260px] gap-6">
            <div className="flex flex-col gap-5 min-w-0">
                <FormField label="The message" required>
                    <Textarea
                        value={message}
                        onChange={(e) => onMessageChange(e.target.value)}
                        rows={6}
                        placeholder="CediBites: Friday treat! 20% off all jollof today only at East Legon & Spintex. Order: cedibites.com/r/A7X9Kp"
                    />
                </FormField>

                {/*
                    The expensive mistake, caught before it is made. One curly
                    quote pasted out of Word drops the limit from 160 characters
                    to 70 and triples the bill for the whole list — and nothing
                    on screen would otherwise look wrong.
                */}
                {unicode && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-text-dark text-sm font-semibold font-body">
                                These characters are making it cost more
                            </p>
                            <p className="text-neutral-gray text-sm font-body mt-0.5">
                                <span className="font-mono text-text-dark">
                                    {meter.non_gsm_characters.join('  ')}
                                </span>{' '}
                                cut the limit from 160 characters to 70, so this now costs {meter.segments} text
                                {meter.segments === 1 ? '' : 's'} each instead of{' '}
                                {measureMessage(plainify(message)).segments}.
                            </p>

                            {/* Offered, never applied silently — it is their copy. */}
                            {canPlainify(message) && (
                                <button
                                    type="button"
                                    onClick={() => onMessageChange(plainify(message))}
                                    className="mt-2 flex items-center gap-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold font-body px-3 py-1.5 transition-colors cursor-pointer"
                                >
                                    <SparkleIcon size={13} weight="fill" />
                                    Swap them for plain ones
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <FormField
                    label="Attach a short link"
                    hint="A short link is the only way to count taps. Without one you will know how many texts went out, but not how many people acted on them."
                >
                    <Select
                        value={shortLinkId ?? ''}
                        onChange={(e) => attach(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">No link</option>
                        {links.filter((l) => !l.is_expired).map((link) => (
                            <option key={link.id} value={link.id}>
                                {link.label} · {link.sms_url}
                            </option>
                        ))}
                    </Select>
                </FormField>

                {links.length === 0 && (
                    <p className="flex items-center gap-1.5 text-neutral-gray text-xs font-body">
                        <LinkSimpleIcon size={13} />
                        No short links yet. Make one under Short Links and it will appear here.
                    </p>
                )}

                <p className="text-neutral-gray text-xs font-body leading-relaxed">
                    Leave <span className="font-mono">https://</span> off any web address. Phones turn{' '}
                    <span className="font-mono">cedibites.com/r/A7X9Kp</span> into a link on their own, and those
                    eight characters only push you closer to a second text.
                </p>
            </div>

            {/* ── The meter ─────────────────────────────────────────────── */}
            <aside className="lg:sticky lg:top-4 self-start w-full">
                <div className="rounded-2xl bg-neutral-light/60 p-4 flex flex-col gap-3">
                    <Metric
                        label="Characters"
                        value={String(meter.characters)}
                        note={
                            meter.segments === 0
                                ? 'Nothing written yet'
                                : `${meter.remaining_in_segment} left before it costs another text`
                        }
                        warn={nearlyFull}
                    />

                    <Metric
                        label="Texts per person"
                        value={String(meter.segments)}
                        note={unicode ? 'Special characters: 70 per text' : '160 characters per text'}
                        warn={meter.segments > 1}
                    />

                    {/*
                        We pay Hubtel; the customer pays nothing. This said "each
                        person pays us", which is not a wording quibble — it
                        describes revenue where there is a cost.
                    */}
                    <div className="border-t border-[#f0e8d8] pt-3">
                        <Metric
                            label="Costs us per person"
                            value={GHSRate(cost.perPerson)}
                            note={`${GHSRate(ratePerSegment)} a text`}
                        />
                    </div>

                    <div className="border-t border-[#f0e8d8] pt-3">
                        <p className="text-neutral-gray text-xs font-body">Total we pay for this send</p>
                        <p className="text-text-dark text-2xl font-bold font-body tabular-nums mt-0.5">
                            {GHS(cost.total)}
                        </p>
                        {/* The arithmetic, so the total is checkable rather than trusted. */}
                        <p className="text-neutral-gray text-[11px] font-body mt-1">{cost.workingOut}</p>
                    </div>
                </div>
            </aside>
        </div>
    );
}

function Metric({
    label, value, note, warn,
}: {
    label: string;
    value: string;
    note: string;
    warn?: boolean;
}) {
    return (
        <div>
            <p className="text-neutral-gray text-xs font-body">{label}</p>
            <p
                className={`text-lg font-semibold font-body tabular-nums ${
                    warn ? 'text-amber-700' : 'text-text-dark'
                }`}
            >
                {value}
            </p>
            {note && <p className="text-neutral-gray text-[11px] font-body mt-0.5">{note}</p>}
        </div>
    );
}
