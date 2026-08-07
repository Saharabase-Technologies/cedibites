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

/** A total, in the two decimals cedis are actually charged in. */
export const GHS = (amount: number): string =>
    `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * A per-message rate, at the precision it is actually quoted in.
 *
 * Two decimals is wrong here. Hubtel charges GHS 0.0243 a text; rounded to 0.02
 * the figures stop agreeing with each other — "GHS 0.02 each × 4 people = GHS
 * 0.10" is arithmetic that does not work, and a total that cannot be checked
 * against its own parts is a total nobody should trust.
 */
export const GHSRate = (amount: number): string => {
    const decimals = Number.isInteger(amount * 100) ? 2 : 4;

    return `GHS ${amount.toLocaleString('en-GH', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}`;
};

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
        // Ends with the total, so the line is a complete equation the reader can
        // check rather than three factors sitting next to an unrelated number.
        workingOut:
            `${segments} text${segments === 1 ? '' : 's'} × ` +
            `${recipients.toLocaleString()} ${recipients === 1 ? 'person' : 'people'} × ` +
            `${GHSRate(ratePerSegment)} = ${GHS(total)}`,
    };
}

/** Cedis carry two decimals; the rate itself can be finer, so round at the end. */
function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}
