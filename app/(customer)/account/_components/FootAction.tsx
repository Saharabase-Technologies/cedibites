'use client';

import { SpinnerGapIcon } from '@phosphor-icons/react';

/**
 * The one button at the foot of an account screen.
 *
 * The checkout's pay button, for a screen that saves instead of paying: the
 * same 60px red control in the same place, so a thumb already knows where it
 * is. Below lg it is pinned to the bottom of the screen, clear of the home
 * indicator. From lg up it sits under the screen at its own width, because a
 * bar of red the width of the pane would outshout everything in it.
 *
 * Grey while there is nothing to save, the tint of ink the checkout button
 * waits in. It does not explain itself: the field it waits for is on the same
 * screen.
 */
export interface Foot {
    label: string;
    /** Left off when the button submits `form` instead. */
    onPress?: () => void;
    /** The id of the form this button submits. */
    form?: string;
    /** Nothing to save yet. */
    waiting?: boolean;
    busy?: boolean;
}

function FootButton({ label, onPress, form, waiting, busy, className = '' }: Foot & { className?: string }) {
    const grey = waiting && !busy;

    return (
        <button
            type={form ? 'submit' : 'button'}
            form={form}
            onClick={onPress}
            disabled={waiting || busy}
            className={`inline-flex min-h-15 items-center justify-center gap-2 rounded-xl px-8 text-base font-bold whitespace-nowrap transition-[filter] duration-150 ease-out ${
                grey
                    ? 'bg-fg/10 text-fg-muted'
                    : 'bg-primary-fill text-white hover:brightness-95 disabled:opacity-80 disabled:hover:brightness-100'
            } ${className}`}
        >
            {busy && <SpinnerGapIcon size={17} className="animate-spin" />}
            {label}
        </button>
    );
}

export default function FootAction({ pinned = true, ...foot }: Foot & {
    /** Off on the hub's own route, whose screen only shows from lg up. */
    pinned?: boolean;
}) {
    return (
        <>
            {pinned && (
                <>
                    {/* Keeps the last field out from under the bar. */}
                    <div aria-hidden className="h-28 pb-safe lg:hidden" />
                    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface pb-safe lg:hidden">
                        <div className="page-x py-3">
                            <div className="mx-auto max-w-xl">
                                <FootButton {...foot} className="w-full" />
                            </div>
                        </div>
                    </div>
                </>
            )}
            {/* Its own width here. A bar of red the width of the pane outshouted
                everything in it. */}
            <div className="mt-6 hidden lg:block">
                <FootButton {...foot} className="min-w-52" />
            </div>
        </>
    );
}
