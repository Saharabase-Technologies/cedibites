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
