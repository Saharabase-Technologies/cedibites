'use client';

import { ArrowRightIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { formatPrice } from './pricing';
import type { Totals } from './pricing';
import type { PaymentMethod, Stage } from './types';

/**
 * The total, and the one button that moves you forward.
 *
 * There is a single button at the foot of the screen for the whole checkout. On
 * the first two questions it carries you to the next one; on the last it takes
 * the money. Which of those it is doing is the only thing that changes about
 * it, so the thumb never has to look for it in a new place.
 *
 * The figure lives on the left and the action on the right, so neither says
 * what the other already said. The button never carries a price.
 */

function label(stage: Stage, method: PaymentMethod, placing: boolean): string {
    if (placing) return 'Sending it through';
    if (stage !== 'pay') return 'Continue';
    return method === 'mobile_money' ? 'Pay with Mobile Money' : 'Place the order';
}

function Button({ stage, method, placing, disabled, onAdvance, className = '' }: {
    stage: Stage;
    method: PaymentMethod;
    placing: boolean;
    disabled: boolean;
    onAdvance: () => void;
    className?: string;
}) {
    return (
        <button
            onClick={onAdvance}
            disabled={disabled || placing}
            className={
                'flex min-h-13 items-center justify-center gap-2 rounded-xl bg-primary-fill px-5 text-[15px] font-bold text-white ' +
                'transition-[filter] duration-150 ease-out hover:brightness-95 ' +
                'disabled:bg-surface-sunken disabled:text-fg-subtle disabled:hover:brightness-100 ' +
                className
            }
        >
            {placing && <SpinnerGapIcon size={17} className="animate-spin" />}
            {label(stage, method, placing)}
            {!placing && <ArrowRightIcon size={16} weight="bold" />}
        </button>
    );
}

/**
 * Pinned to the foot of a phone, clear of the home indicator.
 *
 * `PayBarSpacer` goes at the end of the form so the last field can always be
 * scrolled out from under this.
 */
export function PayBar({ totals, stage, method, placing, ready, blockedBecause, onAdvance }: {
    totals: Totals;
    stage: Stage;
    method: PaymentMethod;
    placing: boolean;
    /** False until the server has said what it charges. No figure is shown yet. */
    ready: boolean;
    /** What is still missing on this question. The button is dead until undefined. */
    blockedBecause?: string;
    onAdvance: () => void;
}) {
    const splitPayment = totals.delivery > 0 && method === 'mobile_money' && stage === 'pay';

    return (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface pb-safe lg:hidden">
            {ready && blockedBecause && (
                <p className="page-x border-b border-hairline py-2 text-[13px] font-semibold text-fg-muted">
                    {blockedBecause}
                </p>
            )}

            <div className="page-x flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-none text-fg-muted">{splitPayment ? 'You pay now' : 'Total'}</p>
                    {ready ? (
                        <p className="mt-1 text-lg font-bold leading-none tabular-nums text-fg">
                            {formatPrice(splitPayment ? totals.dueNow : totals.total)}
                        </p>
                    ) : (
                        <span aria-hidden className="mt-1.5 block h-4 w-20 rounded-sm bg-surface-sunken" />
                    )}
                </div>

                <Button
                    stage={stage}
                    method={method}
                    placing={placing}
                    disabled={!ready || Boolean(blockedBecause)}
                    onAdvance={onAdvance}
                    className="shrink-0"
                />
            </div>

            {ready && stage === 'pay' && totals.delivery > 0 && (
                <p className="page-x pb-3 text-[13px] text-fg-muted">
                    {method === 'mobile_money'
                        ? `The rider collects ${formatPrice(totals.delivery)} for delivery at the door.`
                        : `Includes ${formatPrice(totals.delivery)} delivery, all of it paid to the rider.`}
                </p>
            )}
        </div>
    );
}

/**
 * Keeps the last field out from under the bar.
 *
 * Sized for the tallest the bar gets: the row, plus the line naming what is
 * still missing, plus the line about what the rider collects. Scrolling a
 * little further than the content needs costs nothing. Stopping short of it
 * hides a field under a fixed bar, which is the failure worth avoiding.
 */
export function PayBarSpacer() {
    return <div aria-hidden className="h-36 pb-safe lg:hidden" />;
}

/**
 * The same button under the question, on a screen too wide for a pinned bar.
 *
 * It sat at the foot of the order panel until a seven line order pushed it off
 * the bottom of the screen, with the question it belonged to at the top and
 * nothing between them. A button belongs beneath the thing it acts on.
 *
 * The total is already in the panel alongside, so this carries the action and,
 * when it cannot be pressed, the reason.
 */
export function PayAction({ stage, method, placing, ready, blockedBecause, onAdvance }: {
    stage: Stage;
    method: PaymentMethod;
    placing: boolean;
    ready: boolean;
    blockedBecause?: string;
    onAdvance: () => void;
}) {
    return (
        <div className="hidden lg:block">
            <Button
                stage={stage}
                method={method}
                placing={placing}
                disabled={!ready || Boolean(blockedBecause)}
                onAdvance={onAdvance}
                className="min-w-56"
            />
            {ready && blockedBecause && (
                <p className="mt-2.5 text-[13px] font-semibold text-fg-muted">{blockedBecause}</p>
            )}
        </div>
    );
}
