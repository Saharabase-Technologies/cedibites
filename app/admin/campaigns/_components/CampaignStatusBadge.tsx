'use client';

import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';
import type { CampaignStatus } from '@/types/marketing';

/**
 * Campaign status, on the inventory portal's status tones.
 *
 * `failed` is `problem` rather than `problemSettled`: a campaign that reached
 * nobody is not a closed matter, it is money not spent and a message not
 * delivered, and it should keep drawing the eye until somebody deals with it.
 *
 * `paused` is `waiting`, because that is exactly what it is: held until a
 * person tops up or fixes the cause and presses resume. `partly_sent` is
 * `partial`, the same tone a part-received delivery wears in the inventory
 * portal. Neither is green. Green is for a campaign that reached its whole list.
 */
const STATUS_STYLES: Record<CampaignStatus, { label: string } & StatusTone> = {
    draft: { label: 'Draft', ...TONE.neutral },
    scheduled: { label: 'Scheduled', ...TONE.waiting },
    sending: { label: 'Sending', ...TONE.moving },
    paused: { label: 'Paused', ...TONE.waiting },
    sent: { label: 'Sent', ...TONE.done },
    partly_sent: { label: 'Partly sent', ...TONE.partial },
    failed: { label: 'Failed', ...TONE.problem },
    cancelled: { label: 'Cancelled', ...TONE.settled },
};

export function CampaignStatusBadge({
    status,
    className = '',
}: {
    status: CampaignStatus;
    className?: string;
}) {
    const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body whitespace-nowrap ${style.bg} ${style.text} ${className}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
            {style.label}
        </span>
    );
}
