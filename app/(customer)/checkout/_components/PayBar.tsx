'use client';

import { ArrowRightIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { formatPrice } from './pricing';
import type { Totals } from './pricing';
import type { PaymentMethod } from './types';

/**
 * The total, and the one button that acts on it.
 *
 * The old step two had a Back button, a Place Order button carrying a second
 * copy of the price, and two footnotes underneath explaining the split between
 * what Hubtel takes and what the rider takes. Four things, one decision.
 *
 * The number lives on the left and the action lives on the right, so neither
 * says what the other already said. The button never carries a figure.
 */

/** What the button says. Never a figure: the figure is beside it. */
function label(method: PaymentMethod, placing: boolean): string {
    if (placing) return 'Sending it through';
    return method === 'mobile_money' ? 'Pay with Mobile Money' : 'Place the order';
}

function Button({ method, placing, disabled, onPlace, className = '' }: {
    method: PaymentMethod;
    placing: boolean;
    disabled: boolean;
    onPlace: () => void;
    className?: string;
}) {
    return (
        <button
            onClick={onPlace}
            disabled={disabled || placing}
            className={
                'flex min-h-13 items-center justify-center gap-2 rounded-xl bg-primary-fill px-5 text-[15px] font-bold text-white ' +
                'transition-[filter] duration-150 ease-out hover:brightness-95 ' +
                'disabled:bg-surface-sunken disabled:text-fg-subtle disabled:hover:brightness-100 ' +
                className
            }
        >
            {placing
                ? <SpinnerGapIcon size={17} className="animate-spin" />
                : null}
            {label(method, placing)}
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
export function PayBar({ totals, method, placing, ready, blockedBecause, onPlace }: {
    totals: Totals;
    method: PaymentMethod;
    placing: boolean;
    /** False until the server has said what it charges. No figure is shown yet. */
    ready: boolean;
    /** What is still missing. The button is dead until this is undefined. */
    blockedBecause?: string;
    onPlace: () => void;
}) {
    const splitPayment = totals.delivery > 0 && method === 'mobile_money';

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
                    method={method}
                    placing={placing}
                    disabled={!ready || Boolean(blockedBecause)}
                    onPlace={onPlace}
                    className="shrink-0"
                />
            </div>

            {ready && totals.delivery > 0 && (
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
 * The same button at the foot of the desktop panel, where there is no bar.
 *
 * The figure is directly above it in the panel's own Total row, so this one
 * carries the reason it cannot be pressed instead.
 */
export function PayAction({ method, placing, ready, blockedBecause, onPlace }: {
    method: PaymentMethod;
    placing: boolean;
    ready: boolean;
    blockedBecause?: string;
    onPlace: () => void;
}) {
    return (
        <div>
            <Button
                method={method}
                placing={placing}
                disabled={!ready || Boolean(blockedBecause)}
                onPlace={onPlace}
                className="w-full"
            />
            {ready && blockedBecause && (
                <p className="mt-2.5 text-center text-[13px] font-semibold text-fg-muted">{blockedBecause}</p>
            )}
        </div>
    );
}
