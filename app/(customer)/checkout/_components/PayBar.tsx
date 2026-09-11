'use client';

import { SpinnerGapIcon } from '@phosphor-icons/react';
import type { Blocker } from './availability';
import { formatPrice } from './pricing';
import type { Totals } from './pricing';
import type { PaymentMethod, SheetName } from './types';

/**
 * The one button, and what it does next.
 *
 * With everything answered it takes the money and says how much on its face:
 * "Pay now ₵121.20". With something missing it says what, "Add where it goes",
 * and opens the sheet that fixes it. It is never a dead grey button with the
 * reason printed somewhere else.
 *
 * The figure used to sit at the left of the bar with the button beside it,
 * which was right while the total was not otherwise on screen. The order and
 * its money are a block on the page now, so the bar holds one full-width
 * control, and the amount goes on it so nobody taps without seeing it.
 */

interface PayProps {
    totals: Totals;
    method: PaymentMethod;
    placing: boolean;
    /** False until the server has said what it charges. No figure is shown yet. */
    ready: boolean;
    blocker?: Blocker;
    onPay: () => void;
    onFix: (target: SheetName | 'branch') => void;
}

const BUTTON =
    'flex min-h-13 w-full items-center gap-3 rounded-xl px-5 text-[15px] font-bold ' +
    'transition-[filter] duration-150 ease-out';

function PayButton({ totals, method, placing, ready, blocker, onPay, onFix }: PayProps) {
    const verb = method === 'mobile_money' ? 'Pay now' : 'Place order';

    if (!ready) {
        return (
            // A tint of ink rather than the sunken grey, which is the page
            // colour on a laptop and made the waiting button vanish into it.
            <button type="button" disabled className={`${BUTTON} justify-center bg-fg/10 text-fg-muted`}>
                {verb}
            </button>
        );
    }

    if (blocker) {
        return (
            <button
                type="button"
                onClick={() => onFix(blocker.opens)}
                className={`${BUTTON} justify-center bg-primary-fill text-center text-white hover:brightness-95`}
            >
                {blocker.action}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onPay}
            disabled={placing}
            className={`${BUTTON} justify-between bg-primary-fill text-white hover:brightness-95 disabled:opacity-80 disabled:hover:brightness-100`}
        >
            <span className="flex items-center gap-2">
                {placing && <SpinnerGapIcon size={17} className="animate-spin" />}
                {placing ? 'Sending it through' : verb}
            </span>
            {/* A delivery fee the rider collects at the door never reaches
                Hubtel, so a MoMo button shows what leaves the wallet now. */}
            <span className="tabular-nums">{formatPrice(totals.dueNow)}</span>
        </button>
    );
}

function Reason({ ready, blocker }: Pick<PayProps, 'ready' | 'blocker'>) {
    if (!ready || !blocker?.reason) return null;
    return <p className="pb-2.5 text-[13px] font-semibold leading-snug text-fg">{blocker.reason}</p>;
}

function RiderNote({ ready, blocker, totals, method }: Pick<PayProps, 'ready' | 'blocker' | 'totals' | 'method'>) {
    if (!ready || blocker || totals.delivery <= 0) return null;
    return (
        <p className="pt-2.5 text-[13px] text-fg-muted">
            {method === 'mobile_money'
                ? `The rider collects ${formatPrice(totals.delivery)} for delivery at the door.`
                : `Includes ${formatPrice(totals.delivery)} delivery, all of it paid to the rider.`}
        </p>
    );
}

/** Pinned to the foot of a phone, clear of the home indicator. */
export function PayBar(props: PayProps) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface pb-safe lg:hidden">
            <div className="page-x py-3">
                <Reason ready={props.ready} blocker={props.blocker} />
                <PayButton {...props} />
                <RiderNote ready={props.ready} blocker={props.blocker} totals={props.totals} method={props.method} />
            </div>
        </div>
    );
}

/**
 * Keeps the last block out from under the bar.
 *
 * Sized for the tallest the bar gets: the button, plus the reason line above it
 * or the rider line below. Scrolling a little further than the content needs
 * costs nothing. Stopping short of it hides the total under a fixed bar.
 */
export function PayBarSpacer() {
    return <div aria-hidden className="h-32 pb-safe lg:hidden" />;
}

/** The same button on a screen wide enough to put it under the order. */
export function PayAction(props: PayProps) {
    return (
        <div className="hidden lg:block">
            <Reason ready={props.ready} blocker={props.blocker} />
            <PayButton {...props} />
            <RiderNote ready={props.ready} blocker={props.blocker} totals={props.totals} method={props.method} />
        </div>
    );
}
