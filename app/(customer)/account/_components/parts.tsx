'use client';

import { controlClass } from '@/app/(customer)/checkout/_components/Field';
import { smallActionLook } from '@/app/components/ui/QuietControls';
import type { SavedAddress } from '@/lib/api/services/address.service';
import { CheckIcon } from '@phosphor-icons/react';
import React from 'react';

/**
 * Small pieces more than one account screen uses.
 */

/**
 * The checkout field, 4px shorter.
 *
 * The address box in the same form is 48px tall and takes no class. Two fields
 * of different heights in one form read as two different controls.
 */
export const FIELD = controlClass.replace('min-h-13', 'min-h-12');

/**
 * The small grey button with the danger ink on its label, for removing things.
 * Danger is red-700 and never the brand red, so it never reads as the button
 * that places an order.
 */
export const dangerActionLook = smallActionLook.replace('text-fg', 'text-danger-ink');

/** The street under a name, and the rider's note under that. */
export function placeLines(address: SavedAddress): React.ReactNode {
    // Without a name the street is already the title.
    const street = address.label ? address.full_address : '';
    if (!street && !address.note) return undefined;

    return (
        <>
            {street && <span className="block">{street}</span>}
            {address.note && (
                <span className={street ? 'mt-0.5 block' : 'block'}>For the rider: {address.note}</span>
            )}
        </>
    );
}

export function DefaultCheck({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex min-h-11 items-center gap-3 self-start text-left"
        >
            {/* Square, like the payment choice's ring is round: a box is what a
                tick goes in, and nothing in the brand is a pill. */}
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors duration-150 ease-out ${
                checked ? 'border-fg bg-fg text-surface' : 'border-hairline-strong bg-surface'
            }`}>
                {checked && <CheckIcon size={12} weight="bold" />}
            </span>
            <span className="text-[15px] font-semibold text-fg">Make this the default</span>
        </button>
    );
}
