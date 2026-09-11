'use client';

import { controlClass } from '@/app/(customer)/checkout/_components/Field';
import { smallActionLook } from '@/app/components/ui/QuietControls';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import React from 'react';

/**
 * The pieces the account blocks share.
 *
 * Rows, blocks and the small grey buttons come from checkout. What checkout
 * never needed is a way to save something where it sits, and that lives here.
 */

/**
 * The checkout field, 4px shorter.
 *
 * The address box in the same form is 48px tall and takes no class. Two fields
 * of different heights in one form read as two different controls.
 */
export const FIELD = controlClass.replace('min-h-13', 'min-h-12');

/**
 * The small grey button with the danger ink on its label, for Remove and Sign
 * out. Danger is red-700 and never the brand red, so neither reads as the button
 * that places an order.
 */
export const dangerActionLook = smallActionLook.replace('text-fg', 'text-danger-ink');

/**
 * Save, while something is being changed in place.
 *
 * The one red button, at the foot of whatever is being edited. Full width on a
 * phone, where the thumb reaches for it. Its own width from the small
 * breakpoint up, where a bar of red the width of the column would outshout the
 * page it sits on.
 *
 * Grey while there is nothing valid to save, the same tint of ink the checkout
 * button waits in. Red with a spinner while it saves.
 */
export function SaveButton({ busy, disabled, onClick, children }: {
    busy: boolean;
    disabled?: boolean;
    /** Left off inside a form, where the button submits it. */
    onClick?: () => void;
    children: React.ReactNode;
}) {
    const waiting = disabled && !busy;

    return (
        <button
            type={onClick ? 'button' : 'submit'}
            onClick={onClick}
            disabled={disabled || busy}
            className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-bold whitespace-nowrap transition-[filter] duration-150 ease-out sm:flex-none ${
                waiting
                    ? 'bg-fg/10 text-fg-muted'
                    : 'bg-primary-fill text-white hover:brightness-95 disabled:opacity-80 disabled:hover:brightness-100'
            }`}
        >
            {busy && <SpinnerGapIcon size={16} className="animate-spin" />}
            {children}
        </button>
    );
}
