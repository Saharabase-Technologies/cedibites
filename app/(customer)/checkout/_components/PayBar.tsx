'use client';

import { ArrowRightIcon, SpinnerGapIcon } from '@phosphor-icons/react';

/**
 * The one button at the foot of every checkout screen.
 *
 * On a question it moves on, and waits in grey until that question is
 * answered. On the review it takes the money with the amount on its face,
 * "Pay now ₵97.20". When the branch cannot take the order, on any screen, it
 * says why above itself and becomes the way out.
 *
 * It is the same full-width control in the same place on all four screens, so
 * the thumb never has to look for it.
 */

export interface BarAction {
    label: string;
    /** Absent means the button waits. */
    onPress?: () => void;
    /** An amount, set at the right of the button. */
    figure?: string;
    arrow?: boolean;
    busy?: boolean;
    /** Above the button, only when its label alone would leave somebody asking why. */
    reason?: string;
    /** Below the button, for what the rider collects at the door. */
    note?: string;
}

const BASE =
    'flex min-h-13 w-full items-center gap-3 rounded-xl px-5 text-[15px] font-bold ' +
    'transition-[filter] duration-150 ease-out';

function ActionButton({ label, onPress, figure, arrow, busy }: BarAction) {
    const waiting = !onPress;

    // A waiting button is a tint of ink rather than the sunken grey, which is
    // the page colour and made it vanish into the page on a laptop.
    const tone = waiting
        ? 'bg-fg/10 text-fg-muted'
        : 'bg-primary-fill text-white hover:brightness-95 disabled:opacity-80 disabled:hover:brightness-100';

    return (
        <button
            type="button"
            onClick={onPress}
            disabled={waiting || busy}
            className={`${BASE} ${figure ? 'justify-between' : 'justify-center text-center'} ${tone}`}
        >
            <span className="flex items-center gap-2">
                {busy && <SpinnerGapIcon size={17} className="animate-spin" />}
                {label}
                {arrow && <ArrowRightIcon size={16} weight="bold" />}
            </span>
            {figure && <span className="tabular-nums">{figure}</span>}
        </button>
    );
}

function Reason({ reason }: { reason?: string }) {
    if (!reason) return null;
    return <p className="pb-2.5 text-[13px] font-semibold leading-snug text-fg">{reason}</p>;
}

function Note({ note }: { note?: string }) {
    if (!note) return null;
    return <p className="pt-2.5 text-[13px] text-fg-muted">{note}</p>;
}

/** Pinned to the foot of a phone, clear of the home indicator. */
export function PayBar(action: BarAction) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface pb-safe lg:hidden">
            <div className="page-x py-3">
                <Reason reason={action.reason} />
                <ActionButton {...action} />
                <Note note={action.note} />
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

/** The same button on a screen wide enough to put it under the content. */
export function PayAction({ className = '', ...action }: BarAction & { className?: string }) {
    return (
        <div className={`hidden lg:block ${className}`}>
            <Reason reason={action.reason} />
            <ActionButton {...action} />
            <Note note={action.note} />
        </div>
    );
}
