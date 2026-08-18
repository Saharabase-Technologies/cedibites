/**
 * Saying what a number means.
 *
 * Every figure in the campaign console is either *per person* or *for everyone*,
 * and they differ by a factor of however many thousand people are in the
 * audience. Showing "GHS 0.20" with no label was read as the price for one
 * customer when it was the total for four — a misreading that scales into a
 * four-figure surprise on a real list.
 *
 * So nothing here returns a bare number. Every helper returns the words too.
 */

export const GHS = (amount: number): string =>
    `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface CostBreakdown {
    /** Billed segments for one message. */
    segments: number;
    recipients: number;
    ratePerSegment: number;
    /** What one person costs. */
    perPerson: number;
    /** What the whole send costs. */
    total: number;
    /** "1 text × 4 people × GHS 0.05" — the arithmetic, spelled out. */
    workingOut: string;
}

export function breakDownCost(
    segments: number,
    recipients: number,
    ratePerSegment: number,
): CostBreakdown {
    const perPerson = round(segments * ratePerSegment);
    const total = round(perPerson * recipients);

    return {
        segments,
        recipients,
        ratePerSegment,
        perPerson,
        total,
        workingOut:
            `${segments} text${segments === 1 ? '' : 's'} × ` +
            `${recipients.toLocaleString()} ${recipients === 1 ? 'person' : 'people'} × ` +
            `${GHS(ratePerSegment)}`,
    };
}

/** Cedis carry two decimals; the rate itself can be finer, so round at the end. */
function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}
