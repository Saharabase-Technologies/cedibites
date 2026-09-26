'use client';

import type { StatusTone } from '@/app/inventory/_components/status-tokens';
import { TONE } from '@/app/inventory/_components/status-tokens';
import type { BranchOpening } from '@/types/opening';
import { openingBadge } from './describe';

/** A pill in the inventory shape: tone from `TONE`, a dot, the words. */
export function Pill({ label, tone, className = '' }: { label: string; tone: StatusTone; className?: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${tone.bg} ${tone.text} ${className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
            {label}
        </span>
    );
}

/**
 * Where a branch's morning stands, with "Opened late" beside it when it did.
 * Late and not yet open is the status itself, so it is never said twice.
 */
export function OpeningStatusBadge({ opening }: { opening: BranchOpening }) {
    const { label, tone } = openingBadge(opening);
    return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
            <Pill label={label} tone={tone} />
            {opening.is_late && opening.opened_at && <Pill label="Opened late" tone={TONE.problemSettled} />}
        </span>
    );
}
