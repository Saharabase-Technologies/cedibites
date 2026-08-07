'use client';

import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';
import type { CampaignStatus } from '@/types/marketing';

/**
 * Campaign status, on the inventory portal's status tones.
 *
 * `failed` is `problem` rather than `problemSettled`: a campaign that reached
 * nobody is not a closed matter, it is money not spent and a message not
 * delivered, and it should keep drawing the eye until somebody deals with it.
 */
const STATUS_STYLES: Record<CampaignStatus, { label: string } & StatusTone> = {
    draft: { label: 'Draft', ...TONE.neutral },
    scheduled: { label: 'Scheduled', ...TONE.waiting },
    sending: { label: 'Sending', ...TONE.moving },
    sent: { label: 'Sent', ...TONE.done },
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
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body ${style.bg} ${style.text} ${className}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
            {style.label}
        </span>
    );
}
