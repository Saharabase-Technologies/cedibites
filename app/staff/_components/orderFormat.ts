import type { Order, OrderStatus, PaymentPart } from '@/types/order';
import { formatGHS } from '@/lib/utils/currency';
import { formatGhanaPhone } from '@/app/lib/phone';

// How the sales staff screens write an order: its times, its day, its money
// and how it was paid. My Sales, Orders and the Dashboard share these, so the
// three say the same thing about the same order. Plan:
// docs/STAFF_PORTAL_BUILD.md, Section 6.

/** "2:48 pm", in Ghana's time, from a time the server sent. */
export function timeOf(ms: number): string {
    return new Date(ms).toLocaleTimeString('en-GH', {
        timeZone: 'Africa/Accra',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/** "Friday 16 October 2026", for a YYYY-MM-DD day. */
export function dayLabel(date: string): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).formatToParts(new Date(`${date}T12:00:00Z`));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '';
    return `${part('weekday')} ${part('day')} ${part('month')} ${part('year')}`;
}

/** "Kofi" from "Kofi Asante". */
export function firstName(name?: string | null): string | undefined {
    const first = name?.trim().split(/\s+/)[0];
    return first || undefined;
}

/** "024 787 9103". */
export function phoneOf(order: Order): string {
    return order.contact.phone ? formatGhanaPhone(order.contact.phone) : '';
}

/** The food on an order. Delivery is the rider's money, never the restaurant's. */
export function goodsOf(order: Order): number {
    return Math.round((order.total - (order.deliveryFee ?? 0)) * 100) / 100;
}

export function isNoCharge(order: Order): boolean {
    return order.paymentMethod === 'no_charge'
        || (order.paymentParts ?? []).some(p => p.method === 'no_charge');
}

/** How money is named on every end (staff portal D15). */
export function methodLabel(part: Pick<PaymentPart, 'method' | 'via'>): string {
    switch (part.method) {
        case 'cash': return 'Cash';
        case 'mobile_money': return part.via === 'ussd' ? 'USSD' : 'MoMo';
        case 'manual_momo': return 'Direct MoMo';
        case 'card': return 'Card';
        case 'no_charge': return 'No Charge';
        default: return 'Other';
    }
}

/** The payments that brought money in, in the order they came. */
export function moneyIn(order: Order): PaymentPart[] {
    return (order.paymentParts ?? []).filter(p => p.status === 'completed' && p.amount > 0);
}

/** "Cash", "Cash and USSD", "Cash, MoMo and USSD". */
function joinAnd(words: string[]): string {
    if (words.length <= 1) return words[0] ?? '';
    return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** What is still owed on the food. Zero on a cancelled order. */
export function owedOn(order: Order): number {
    if (order.status === 'cancelled') return 0;
    return Math.max(0, order.balanceDue ?? 0);
}

export type PaidBy = {
    label: string;
    /** A second line: the amounts of a split, or what is due. */
    sub?: string;
    /** Amber: money is still owed. */
    owes: boolean;
};

/**
 * How an order was paid, for the Paid by column.
 *
 * "Cash". "Cash and USSD" over "₵185.00 + ₵90.00". "Part paid" over
 * "₵50.00 due". "Not paid". "No Charge".
 */
export function paidBy(order: Order): PaidBy {
    if (isNoCharge(order)) return { label: 'No Charge', owes: false };

    const parts = moneyIn(order);
    const due = owedOn(order);

    if (due > 0) {
        return parts.length === 0
            ? { label: 'Not paid', owes: true }
            : { label: 'Part paid', sub: `${formatGHS(due)} due`, owes: true };
    }

    // Each method once, in the order it first came, with what it brought.
    const byMethod = new Map<string, number>();
    for (const part of parts) {
        const label = methodLabel(part);
        byMethod.set(label, (byMethod.get(label) ?? 0) + part.amount);
    }

    if (byMethod.size === 0) {
        // An older payload with no parts: the method the order was placed with.
        return { label: methodLabel({ method: order.paymentMethod }), owes: false };
    }

    const labels = [...byMethod.keys()];
    if (labels.length === 1) return { label: labels[0], owes: false };

    return {
        label: joinAnd(labels),
        sub: [...byMethod.values()].map(formatGHS).join(' + '),
        owes: false,
    };
}

/** Waiting on the admin to decide a cancel. */
export function isCancelAsked(order: Order): boolean {
    return order.status === 'cancel_requested';
}

/** May sales staff ask to cancel it? The same rule the Orders page has always used. */
export function canAskToCancel(order: Order): boolean {
    return !(['cancelled', 'delivered', 'completed', 'cancel_requested'] as OrderStatus[]).includes(order.status);
}
