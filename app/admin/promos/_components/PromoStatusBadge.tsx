'use client';

import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';
import type { PromoState } from './promoFacts';

/**
 * Whether a promo is reaching orders today, on the inventory portal's tones.
 *
 * Live is `done`, the green of something working. Starting soon is `waiting`,
 * because somebody set it up and it has not begun. Ended and switched off are
 * both quiet: neither needs anybody to do anything.
 */
const STYLES: Record<PromoState, { label: string } & StatusTone> = {
    live: { label: 'Live', ...TONE.done },
    scheduled: { label: 'Starts soon', ...TONE.waiting },
    ended: { label: 'Ended', ...TONE.settled },
    off: { label: 'Switched off', ...TONE.neutral },
};

export function PromoStatusBadge({ state }: { state: PromoState }) {
    const style = STYLES[state];
    return (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold font-body ${style.bg} ${style.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
            {style.label}
        </span>
    );
}
