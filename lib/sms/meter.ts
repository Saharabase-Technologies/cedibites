import type { MessageMeasurement } from '@/types/marketing';

/**
 * How much a message costs to say — the browser's copy.
 *
 * A mirror of App\Services\Campaigns\MessageMeter, which is the authority. This
 * exists so the counter can move as the operator types; the confirm step reads
 * its numbers from the server, so the two cannot quietly disagree about what a
 * campaign costs.
 *
 * SMS billing is a step function, not a slope. One segment is 160 GSM-7
 * characters; the moment a message needs two, the parts shrink to 153 each — so
 * 161 characters buys 306, not 320. Trimming saves nothing at 100 characters and
 * saves half the bill at 161. That is the entire case for the shortener.
 */

/**
 * The GSM 03.38 basic set — one unit each.
 *
 * The escape character (0x1B) is deliberately absent: it is not text, it is the
 * prefix that makes the extended characters below cost two.
 */
const GSM_BASIC =
    '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

/** Sent as an escape plus the character, so two units each. */
const GSM_EXTENDED = '^{}\\[~]|€';

const GSM_SINGLE = 160;
const GSM_MULTIPART = 153;
const UCS2_SINGLE = 70;
const UCS2_MULTIPART = 67;

const GSM_BASIC_SET = new Set(Array.from(GSM_BASIC));
const GSM_EXTENDED_SET = new Set(Array.from(GSM_EXTENDED));

export function measureMessage(message: string): MessageMeasurement {
    const nonGsm = nonGsmCharacters(message);
    const isUnicode = nonGsm.length > 0;

    // UCS-2 bills UTF-16 code units, so an astral emoji costs two. `message.length`
    // is already in code units; Array.from splits by code point, which is not
    // the same thing and would undercount.
    const characters = isUnicode ? message.length : gsmUnits(message);

    const [single, multipart] = isUnicode
        ? [UCS2_SINGLE, UCS2_MULTIPART]
        : [GSM_SINGLE, GSM_MULTIPART];

    const segments =
        characters === 0 ? 0 : characters <= single ? 1 : Math.ceil(characters / multipart);

    const capacity = segments <= 1 ? single : segments * multipart;

    return {
        characters,
        segments,
        encoding: isUnicode ? 'UCS_2' : 'GSM_7BIT',
        remaining_in_segment: capacity - characters,
        non_gsm_characters: nonGsm,
    };
}

/**
 * What sending this to this many people is projected to cost, in GHS.
 *
 * A projection, not a price — the real rate comes back from Hubtel on the send.
 */
export function estimateCost(message: string, recipients: number, ratePerSegment: number): number {
    return Math.round(measureMessage(message).segments * recipients * ratePerSegment * 10000) / 10000;
}

/**
 * The characters that would force the whole message into UCS-2, deduplicated and
 * in the order they first appear.
 *
 * Named rather than counted, because the fix is to replace the character and you
 * cannot replace what you cannot see. One curly quote pasted out of Word drops
 * the limit from 160 to 70 and triples the bill for the entire list.
 */
function nonGsmCharacters(message: string): string[] {
    const found: string[] = [];

    for (const char of Array.from(message)) {
        if (GSM_BASIC_SET.has(char) || GSM_EXTENDED_SET.has(char)) continue;
        if (!found.includes(char)) found.push(char);
    }

    return found;
}

function gsmUnits(message: string): number {
    let units = 0;

    for (const char of Array.from(message)) {
        units += GSM_EXTENDED_SET.has(char) ? 2 : 1;
    }

    return units;
}

/**
 * The straight-quote equivalent of the characters people actually paste in.
 *
 * Offered as a one-click fix rather than applied silently — it is the operator's
 * copy, and quietly rewriting what they typed is worse than telling them what it
 * costs.
 */
const GSM_SUBSTITUTIONS: Record<string, string> = {
    '‘': "'", '’': "'",   // curly single quotes
    '“': '"', '”': '"',   // curly double quotes
    '–': '-', '—': '-',   // en and em dash
    '…': '...',                // ellipsis
    ' ': ' ',                  // non-breaking space
    '•': '-',                  // bullet
    '₵': 'GHS',                // cedi sign
};

/** Whether the offending characters can be swapped out automatically. */
export function canPlainify(message: string): boolean {
    const offenders = measureMessage(message).non_gsm_characters;

    return offenders.length > 0 && offenders.every((c) => c in GSM_SUBSTITUTIONS);
}

export function plainify(message: string): string {
    return Array.from(message)
        .map((char) => GSM_SUBSTITUTIONS[char] ?? char)
        .join('');
}
