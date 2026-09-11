/**
 * Validates a Ghanaian phone number in either local (0XXXXXXXXX) or
 * international (+233XXXXXXXXX) format.
 */
export function isValidGhanaPhone(phone: string): boolean {
    return /^(\+233|0)[2-9]\d{8}$/.test(phone.replace(/\s/g, ''));
}

/**
 * Normalises a valid Ghanaian phone number to the +233XXXXXXXXX format.
 * Non-Ghana numbers are returned unchanged.
 */
export function normalizeGhanaPhone(phone: string): string {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('+233')) return cleaned;
    if (cleaned.startsWith('233')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+233${cleaned.slice(1)}`;
    return cleaned;
}

/**
 * A Ghana number the way people read it out: 059 212 3054.
 *
 * +233592123054 is right for an SMS gateway and hard for a person to check at a
 * glance, which is the whole reason it is on the screen. Anything that is not a
 * valid Ghana number comes back exactly as typed, so a half-finished number is
 * never rearranged under somebody's thumb.
 */
export function formatGhanaPhone(phone: string): string {
    if (!isValidGhanaPhone(phone)) return phone;
    const local = `0${normalizeGhanaPhone(phone).slice(4)}`;
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
