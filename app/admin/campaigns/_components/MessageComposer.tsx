'use client';

import { WarningCircleIcon, SparkleIcon } from '@phosphor-icons/react';
import { measureMessage, canPlainify, plainify } from '@/lib/sms/meter';

/**
 * The message box, and the counter that tells you what it costs.
 *
 * The counter is not decoration. SMS is billed in whole segments, so the number
 * next to the box is the difference between one text and two — multiplied by
 * however many thousand people are in the audience.
 */
export function MessageComposer({
    value,
    onChange,
    recipients,
    ratePerSegment = 0.05,
}: {
    value: string;
    onChange: (value: string) => void;
    recipients: number;
    ratePerSegment?: number;
}) {
    const meter = measureMessage(value);
    const unicode = meter.encoding === 'UCS_2';
    const cost = meter.segments * recipients * ratePerSegment;

    // Warn while there is still room to act. Under twenty characters left is when
    // the next word is the one that costs money.
    const nearlyFull = meter.segments > 0 && meter.remaining_in_segment <= 20;

    return (
        <div>
            <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                The message <span className="text-primary">*</span>
            </label>

            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={5}
                placeholder="CediBites: Friday treat! 20% off all jollof today only at East Legon & Spintex. Order: cedibites.com/r/A7X9Kp"
                className="w-full rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary resize-y"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <p className="text-neutral-gray text-xs font-body">
                    <span className={nearlyFull ? 'text-warning font-semibold' : ''}>
                        {meter.characters} characters
                    </span>
                    {' · '}
                    <span className={meter.segments > 1 ? 'text-warning font-semibold' : ''}>
                        {meter.segments} text{meter.segments === 1 ? '' : 's'} each
                    </span>
                    {meter.segments > 0 && ` · ${meter.remaining_in_segment} left before the next one`}
                </p>

                {recipients > 0 && (
                    <p className="text-text-dark dark:text-text-light text-xs font-semibold font-body">
                        ≈ GHS {cost.toFixed(2)}
                    </p>
                )}
            </div>

            {/*
                The expensive mistake, caught before it is made. One character
                outside the plain alphabet — usually a curly quote pasted out of
                Word — drops the limit from 160 to 70 and triples the bill for
                the whole list. Nothing on screen would otherwise look wrong.
            */}
            {unicode && (
                <div className="mt-3 flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-2xl px-4 py-3">
                    <WarningCircleIcon size={18} weight="fill" className="text-warning shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-text-dark dark:text-text-light text-sm font-semibold font-body">
                            These characters are making it cost more
                        </p>
                        <p className="text-neutral-gray text-sm font-body mt-0.5">
                            <span className="font-mono text-text-dark dark:text-text-light">
                                {meter.non_gsm_characters.join('  ')}
                            </span>
                            {' — '}
                            they cut the limit from 160 characters to 70, so this now costs{' '}
                            {meter.segments} text{meter.segments === 1 ? '' : 's'} per person instead of{' '}
                            {measureMessage(plainify(value)).segments}.
                        </p>

                        {/* Offered, never applied silently — it is the operator's copy. */}
                        {canPlainify(value) && (
                            <button
                                type="button"
                                onClick={() => onChange(plainify(value))}
                                className="mt-2 flex items-center gap-1.5 rounded-xl bg-warning/20 hover:bg-warning/30 text-warning text-xs font-semibold font-body px-3 py-1.5 transition-colors"
                            >
                                <SparkleIcon size={13} weight="fill" />
                                Swap them for plain ones
                            </button>
                        )}
                    </div>
                </div>
            )}

            <p className="text-neutral-gray text-xs mt-2 font-body leading-relaxed">
                Write a web address without <span className="font-mono">https://</span> — phones turn{' '}
                <span className="font-mono">cedibites.com/r/A7X9Kp</span> into a link on their own, and the{' '}
                <span className="font-mono">https://</span> costs eight characters for nothing.
            </p>
        </div>
    );
}
