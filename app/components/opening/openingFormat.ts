import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';
import type { OpeningStatus } from '@/types/opening';

/**
 * Times as the wall at the branch shows them.
 *
 * Every time here comes from the server, and Ghana is UTC+0 all year, so the
 * zone is set rather than taken from the device. A till whose own clock or
 * zone is wrong still shows the right time.
 */
export function clock(iso: string | null | undefined): string {
    if (!iso) return '';
    return new Date(iso)
        .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Accra' })
        .replace(/\s?([ap])m$/i, ' $1m')
        .toLowerCase();
}

/** "Friday 25 September" for a business date like "2026-09-25". */
export function dayLabel(businessDate: string): string {
    return new Date(`${businessDate}T12:00:00Z`).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'Africa/Accra',
    });
}

export const STATUS_LABEL: Record<OpeningStatus, string> = {
    not_required: 'No checklist',
    closed_today: 'Closed today',
    not_started: 'Not started',
    in_progress: 'In progress',
    opened_by_head_office: 'Opened by head office',
    open_with_problems: 'Open, problems to fix',
    open: 'Open',
    not_opened: 'Never opened',
};

export function statusTone(status: OpeningStatus, isLate = false): StatusTone {
    if (isLate && (status === 'not_started' || status === 'in_progress')) return TONE.problem;

    switch (status) {
        case 'open':
            return TONE.done;
        case 'open_with_problems':
        case 'opened_by_head_office':
            return TONE.waiting;
        case 'in_progress':
            return TONE.decided;
        case 'not_opened':
            return TONE.problemSettled;
        default:
            return TONE.neutral;
    }
}

/** True once the branch may sell: the till and the kitchen stop waiting. */
export function isTrading(status: OpeningStatus): boolean {
    return status === 'open' || status === 'open_with_problems' || status === 'opened_by_head_office';
}
