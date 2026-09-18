import type { Promo } from '@/lib/services/promos/promo.service';
import { formatGHS } from '@/lib/utils/currency';
import { serverNow } from '@/lib/utils/serverClock';

/**
 * The words the promo screens use about a promo, in one place.
 *
 * The list, the badge and the form's read-back all describe the same promo, so
 * they draw from these rather than each phrasing it their own way.
 */

export type PromoState = 'live' | 'scheduled' | 'ended' | 'off';

/** Today in Ghana, on the server's clock. Ghana is UTC+0 all year. */
export function todayIso(): string {
    return serverNow().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function promoState(promo: Pick<Promo, 'isActive' | 'startDate' | 'endDate'>, today = todayIso()): PromoState {
    if (!promo.isActive) return 'off';
    if (promo.endDate < today) return 'ended';
    if (promo.startDate > today) return 'scheduled';
    return 'live';
}

// Spelled out rather than left to the browser, which says "Sept" in some
// versions and "Sep" in others.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 18 Sep 2026 */
export function formatDay(iso: string | null | undefined): string {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : '';
}

/** 18 Sep, or 18 Sep 2027 when it is not this year. */
function shortDay(iso: string, thisYear: string): string {
    const withYear = formatDay(iso);
    return iso.slice(0, 4) === thisYear ? withYear.replace(/ \d{4}$/, '') : withYear;
}

export function runs(promo: Pick<Promo, 'startDate' | 'endDate'>, today = todayIso()): string {
    const year = today.slice(0, 4);
    return `${shortDay(promo.startDate, year)} to ${shortDay(promo.endDate, year)}`;
}

/** 20% off, up to ₵30 · ₵10 off */
export function takesOff(promo: Pick<Promo, 'type' | 'value' | 'maxDiscount'>): string {
    if (promo.type === 'percentage') {
        const cap = promo.maxDiscount != null && promo.maxDiscount > 0 ? `, up to ${formatGHS(promo.maxDiscount)}` : '';
        return `${Number(promo.value)}% off${cap}`;
    }
    return `${formatGHS(promo.value)} off`;
}

/** By itself · Code CEDI20 · 250 one-off codes */
export function reachesBy(promo: Pick<Promo, 'redemption' | 'code' | 'codesCount'>): string {
    if (promo.redemption === 'shared_code') return promo.code ? `Code ${promo.code}` : 'One code';
    if (promo.redemption === 'single_use') {
        const n = promo.codesCount ?? 0;
        return n === 0 ? 'One-off codes, none made yet' : `${n.toLocaleString('en-GB')} one-off code${n === 1 ? '' : 's'}`;
    }
    return 'By itself';
}

/**
 * The promo said the way a cashier would explain it to a customer.
 *
 * Shown beside the form while it is filled in, so whoever sets it up reads
 * back exactly what they have made before they save it. A rule nobody meant
 * is easier to catch in a sentence than across twelve fields.
 */
export function readBack(
    promo: Omit<Promo, 'id'>,
    names: { branches: (id: string) => string | undefined; dishes: (id: string) => string | undefined },
): string[] {
    const lines: string[] = [];

    const value = Number(promo.value) || 0;
    lines.push(value > 0 ? `${takesOff(promo)}.` : 'Nothing off yet.');

    if (promo.redemption === 'shared_code') {
        lines.push(promo.code ? `Customers type ${promo.code} at checkout, or tell the cashier.` : 'Customers type a code, once you give it one.');
    } else if (promo.redemption === 'single_use') {
        lines.push('Each person gets their own code, and each code works once.');
    } else {
        lines.push('Every order that meets the rules gets it, without a code.');
    }

    const where: string[] = [];
    if (promo.scope === 'branch' && (promo.branchIds?.length ?? 0) > 0) {
        const named = (promo.branchIds ?? []).map(names.branches).filter(Boolean) as string[];
        where.push(named.length ? `At ${joinOr(named)}` : 'At the chosen branches');
    } else {
        where.push('At every branch');
    }
    if (promo.appliesTo === 'items' && promo.itemIds.length > 0) {
        const named = promo.itemIds.map(names.dishes).filter(Boolean) as string[];
        where.push(named.length && named.length <= 3 ? `on ${joinOr(named)} only` : `on ${promo.itemIds.length} chosen dishes only`);
    } else {
        where.push('on the whole order');
    }
    if (promo.minOrderValue != null && promo.maxOrderValue != null) {
        where.push(`for orders of ${formatGHS(promo.minOrderValue)} to ${formatGHS(promo.maxOrderValue)}`);
    } else if (promo.minOrderValue != null) {
        where.push(`for orders of ${formatGHS(promo.minOrderValue)} or more`);
    } else if (promo.maxOrderValue != null) {
        where.push(`for orders up to ${formatGHS(promo.maxOrderValue)}`);
    }
    lines.push(`${where.join(', ')}.`);

    const limits: string[] = [];
    if (promo.firstOrderOnly) limits.push('First orders only');
    if (promo.maxUsesPerCustomer != null) {
        limits.push(promo.maxUsesPerCustomer === 1 ? 'once per phone number' : `${promo.maxUsesPerCustomer} times per phone number`);
    }
    if (promo.maxUses != null) limits.push(`${promo.maxUses.toLocaleString('en-GB')} orders in all`);
    if (limits.length) {
        const [first, ...rest] = limits;
        lines.push(`${first.charAt(0).toUpperCase()}${first.slice(1)}${rest.length ? `, ${rest.join(', ')}` : ''}.`);
    }

    if (promo.startDate && promo.endDate) lines.push(`Runs ${formatDay(promo.startDate)} to ${formatDay(promo.endDate)}.`);
    if (!promo.isActive) lines.push('Switched off, so nobody gets it until it is switched on.');

    return lines;
}

function joinOr(names: string[]): string {
    if (names.length <= 1) return names[0] ?? '';
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
