'use client';

import type { Branch } from '@/app/components/providers/BranchProvider';
import { useCart, type CartItem } from '@/app/components/providers/CartProvider';
import { BranchStateBadge } from '@/app/components/ui/QuietControls';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import Image from 'next/image';
import React, { useState } from 'react';
import { Group, ReviewRow } from './Field';
import { formatPrice } from './pricing';
import type { Totals } from './pricing';

/**
 * What you are buying and what it costs, as the last block before the button.
 *
 * On a phone this used to be a strip at the top holding three thumbnails, "2
 * things from Ashaiman" and the total, closed by default. The total then
 * appeared again in the breakdown on the payment step and a third time in the
 * bar at the foot. It is one block now, at the bottom of the page, directly
 * above the button that takes the money. On a laptop it sits beside the answers
 * with the button under it.
 */

function Line({ cartItem }: { cartItem: CartItem }) {
    const [broken, setBroken] = useState(false);
    const src = cartItem.item.thumbnail ?? cartItem.item.image ?? photoForMenuItem(cartItem.item.name)?.src;
    const hasPhoto = Boolean(src) && !broken;

    return (
        <li className="flex items-center gap-3">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-sunken">
                {hasPhoto ? (
                    <Image src={src!} alt="" fill sizes="40px" className="object-cover" onError={() => setBroken(true)} />
                ) : (
                    <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-5 opacity-20" />
                )}
            </span>

            <p className="min-w-0 flex-1 text-sm leading-snug text-fg">
                <span className="font-semibold">
                    {getOrderItemLineLabel({ name: cartItem.item.name, sizeLabel: cartItem.sizeLabel })}
                </span>
                {cartItem.quantity > 1 && (
                    <span className="tabular-nums text-fg-muted"> × {cartItem.quantity}</span>
                )}
            </p>

            <span className="shrink-0 text-sm font-bold tabular-nums text-fg">
                {formatPrice(cartItem.price * cartItem.quantity)}
            </span>
        </li>
    );
}

// ─── Money ────────────────────────────────────────────────────────────────────

function Row({ label, value, tone }: { label: string; value: string; tone?: 'good' }) {
    const colour = tone === 'good' ? 'text-success-ink' : '';
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span className={`min-w-0 truncate ${tone === 'good' ? `font-semibold ${colour}` : 'text-fg-muted'}`}>
                {label}
            </span>
            <span className={`shrink-0 font-semibold tabular-nums ${tone === 'good' ? colour : 'text-fg'}`}>
                {value}
            </span>
        </div>
    );
}

/** A figure that is not known yet reads as a blank, never as a wrong number. */
function Pending({ w = 'w-16' }: { w?: string }) {
    return <span aria-hidden className={`inline-block h-3.5 ${w} rounded-sm bg-surface-sunken align-middle`} />;
}

/**
 * Every charge on the order, itemised, ending on the total.
 *
 * A service charge nobody was shown before they were charged it is the kind of
 * thing people ring the branch about, so it is always listed. It sits on the
 * same screen as the payment row now, which means switching to cash visibly
 * takes it off.
 */
export function Money({ totals, serviceLabel, ready }: { totals: Totals; serviceLabel: string; ready: boolean }) {
    if (!ready) {
        return (
            <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-baseline justify-between"><span className="text-fg-muted">Subtotal</span><Pending /></div>
                <div className="mt-1 flex items-baseline justify-between border-t border-hairline pt-3">
                    <span className="text-[15px] font-bold text-fg">Total</span><Pending w="w-20" />
                </div>
            </div>
        );
    }

    // With nothing added or taken off, a subtotal is the total written twice.
    const adjusted = totals.discount > 0 || totals.serviceCharge > 0 || totals.delivery > 0;

    return (
        <div className="flex flex-col gap-2 text-sm">
            {adjusted && <Row label="Subtotal" value={formatPrice(totals.subtotal)} />}

            {totals.discount > 0 && (
                <Row label={totals.promoName || 'Discount'} value={`−${formatPrice(totals.discount)}`} tone="good" />
            )}

            {totals.serviceCharge > 0 && <Row label={serviceLabel} value={formatPrice(totals.serviceCharge)} />}

            {totals.delivery > 0 && (
                <Row label="Delivery, paid to the rider" value={formatPrice(totals.delivery)} />
            )}

            <div className={`flex items-baseline justify-between border-t border-hairline pt-3 ${adjusted ? 'mt-1' : ''}`}>
                <span className="text-[15px] font-bold text-fg">Total</span>
                <span className="text-xl font-bold tabular-nums text-fg">{formatPrice(totals.total)}</span>
            </div>
        </div>
    );
}

// ─── The block ────────────────────────────────────────────────────────────────

export function OrderSummary({ branch, showBranch, totals, serviceLabel, ready }: {
    branch: Branch | null;
    /** Off for a pickup, whose first row already names the branch. */
    showBranch: boolean;
    totals: Totals;
    serviceLabel: string;
    ready: boolean;
}) {
    const { displayItems: items } = useCart();

    return (
        <Group>
            {/* Which kitchen, and whether it can cook, with no Change button.
                A fourth identical button down the right edge read as a column
                of furniture, and the only time a customer needs another
                kitchen is when this one cannot take the order, which is exactly
                when the pay button turns into "Choose another branch". */}
            {showBranch && (
                <ReviewRow
                    caption="From"
                    value={branch?.name}
                    placeholder="No branch yet"
                    badge={<BranchStateBadge branch={branch} />}
                />
            )}

            {/* Capped on a laptop so the total and the button stay on screen
                however much somebody ordered. */}
            <ul className="flex flex-col gap-3 lg:max-h-[38vh] lg:overflow-y-auto lg:overscroll-contain">
                {items.map(ci => <Line key={ci.cartItemId} cartItem={ci} />)}
            </ul>

            <Money totals={totals} serviceLabel={serviceLabel} ready={ready} />
        </Group>
    );
}
