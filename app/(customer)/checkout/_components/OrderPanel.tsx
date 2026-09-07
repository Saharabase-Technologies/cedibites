'use client';

import { useBranch } from '@/app/components/providers/BranchProvider';
import { useCart, type CartItem } from '@/app/components/providers/CartProvider';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import { CaretDownIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import React, { useState } from 'react';
import { formatPrice } from './pricing';
import type { Totals } from './pricing';

/**
 * What you are buying, once.
 *
 * The cart sheet listed all of it two seconds before this screen opened, so a
 * panel repeating the same lines is the third reading of the same list. On a
 * phone it is one strip: three thumbnails, a count, the total. Open it if you
 * want to check. On a desktop there is room beside the form, so it stays open
 * and carries the pay button at its foot.
 */

// ─── Lines ────────────────────────────────────────────────────────────────────

function Line({ cartItem }: { cartItem: CartItem }) {
    const [broken, setBroken] = useState(false);
    const src = cartItem.item.thumbnail ?? cartItem.item.image ?? photoForMenuItem(cartItem.item.name)?.src;
    const hasPhoto = Boolean(src) && !broken;

    return (
        <li className="flex items-center gap-3 py-3">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-sunken">
                {hasPhoto ? (
                    <Image src={src!} alt="" fill sizes="44px" className="object-cover" onError={() => setBroken(true)} />
                ) : (
                    <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-6 opacity-20" />
                )}
            </span>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-snug text-fg">
                    {getOrderItemLineLabel({ name: cartItem.item.name, sizeLabel: cartItem.sizeLabel })}
                </p>
                <p className="mt-0.5 text-[13px] tabular-nums text-fg-muted">
                    {cartItem.quantity} × {formatPrice(cartItem.price)}
                </p>
            </div>

            <span className="shrink-0 text-sm font-bold tabular-nums text-fg">
                {formatPrice(cartItem.price * cartItem.quantity)}
            </span>
        </li>
    );
}

function Lines({ items }: { items: CartItem[] }) {
    return (
        <ul className="divide-y divide-hairline">
            {items.map(ci => <Line key={ci.cartItemId} cartItem={ci} />)}
        </ul>
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
 * Every charge on the order, itemised.
 *
 * Exported because the payment question needs it too. On a phone the strip at
 * the top of checkout is closed by default, so somebody typing their MoMo
 * number could see a total and no working. A service charge nobody was shown
 * before they were charged it is the kind of thing people ring the branch
 * about.
 */
export function Money({ totals, serviceLabel, ready }: { totals: Totals; serviceLabel: string; ready: boolean }) {
    if (!ready) {
        return (
            <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-baseline justify-between"><span className="text-fg-muted">Subtotal</span><Pending /></div>
                <div className="flex items-baseline justify-between"><Pending w="w-24" /><Pending w="w-12" /></div>
                <div className="mt-1 flex items-baseline justify-between border-t border-hairline pt-3">
                    <span className="text-sm font-bold text-fg">Total</span><Pending w="w-20" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 text-sm">
            <Row label="Subtotal" value={formatPrice(totals.subtotal)} />

            {totals.discount > 0 && (
                <Row label={totals.promoName || 'Discount'} value={`−${formatPrice(totals.discount)}`} tone="good" />
            )}

            {totals.serviceCharge > 0 && <Row label={serviceLabel} value={formatPrice(totals.serviceCharge)} />}

            {totals.delivery > 0 && (
                <Row label="Delivery, paid to the rider" value={formatPrice(totals.delivery)} />
            )}

            <div className="mt-1 flex items-baseline justify-between border-t border-hairline pt-3">
                <span className="text-sm font-bold text-fg">Total</span>
                <span className="text-xl font-bold tabular-nums text-fg">{formatPrice(totals.total)}</span>
            </div>
        </div>
    );
}

// ─── The strip, on a phone ────────────────────────────────────────────────────

/** One stacked thumbnail. Ringed in the page colour so the overlap reads. */
function Thumb({ cartItem, className = '' }: { cartItem: CartItem; className?: string }) {
    const [broken, setBroken] = useState(false);
    const src = cartItem.item.thumbnail ?? cartItem.item.image ?? photoForMenuItem(cartItem.item.name)?.src;
    const hasPhoto = Boolean(src) && !broken;

    return (
        <span className={`relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-sunken ring-2 ring-bg ${className}`}>
            {hasPhoto ? (
                <Image src={src!} alt="" fill sizes="36px" className="object-cover" onError={() => setBroken(true)} />
            ) : (
                <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-5 opacity-20" />
            )}
        </span>
    );
}

export function OrderRecap({ totals, serviceLabel, ready, onChangeBranch }: {
    totals: Totals;
    serviceLabel: string;
    ready: boolean;
    onChangeBranch: () => void;
}) {
    const { displayItems: items } = useCart();
    const { selectedBranch } = useBranch();
    const [open, setOpen] = useState(false);

    const count = items.reduce((n, i) => n + i.quantity, 0);

    return (
        <div className="border-b border-hairline lg:hidden">
            <button
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 py-3.5 text-left"
            >
                <span className="flex shrink-0">
                    {items.slice(0, 3).map((ci, i) => (
                        <Thumb key={ci.cartItemId} cartItem={ci} className={i > 0 ? '-ml-2.5' : ''} />
                    ))}
                </span>

                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
                    {count} {count === 1 ? 'thing' : 'things'}
                    {selectedBranch && <span className="font-normal text-fg-muted"> from {selectedBranch.name}</span>}
                </span>

                {ready
                    ? <span className="shrink-0 text-sm font-bold tabular-nums text-fg">{formatPrice(totals.total)}</span>
                    : <Pending />}
                <CaretDownIcon
                    size={15}
                    weight="bold"
                    className={`shrink-0 text-fg-muted transition-transform duration-150 ease-out ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="pb-4">
                    {/* Which branch is cooking belongs with what they are
                        cooking, not stuck to the delivery question where it had
                        nothing to do with the address being typed above it. */}
                    {selectedBranch && (
                        <div className="flex items-center gap-4 pb-1">
                            <p className="min-w-0 flex-1 truncate text-[13px] text-fg-muted">
                                Cooked at <span className="font-bold text-fg">{selectedBranch.name}</span>
                            </p>
                            <button
                                onClick={onChangeBranch}
                                className="shrink-0 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                            >
                                Change
                            </button>
                        </div>
                    )}

                    <Lines items={items} />
                    <div className="pt-4">
                        <Money totals={totals} serviceLabel={serviceLabel} ready={ready} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── The panel, beside the form ───────────────────────────────────────────────

/**
 * The order, beside the form.
 *
 * It does not carry the button. It used to, and a seven line order pushed the
 * button off the bottom of a 1080px screen while the question it belonged to
 * sat at the top with empty space under it. The action goes under the question
 * it answers; this panel is here to be checked against, not acted on.
 *
 * The list is capped and scrolls inside itself for the same reason: the total
 * has to stay on screen with the question, however much somebody ordered.
 */
export function OrderPanel({ totals, serviceLabel, ready, onChangeBranch }: {
    totals: Totals;
    serviceLabel: string;
    ready: boolean;
    onChangeBranch: () => void;
}) {
    const { displayItems: items } = useCart();
    const { selectedBranch } = useBranch();

    return (
        <div className="hidden lg:sticky lg:top-24 lg:block">
            <div className="rounded-2xl border border-hairline bg-surface p-5">
                <h2 className="font-brand text-[15px] uppercase leading-none tracking-[0.04em] text-fg">
                    Your order
                </h2>
                {selectedBranch && (
                    <div className="mt-1.5 flex items-center gap-3">
                        <p className="min-w-0 flex-1 truncate text-[13px] text-fg-muted">
                            Cooked at <span className="font-bold text-fg">{selectedBranch.name}</span>
                        </p>
                        <button
                            onClick={onChangeBranch}
                            className="shrink-0 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                        >
                            Change
                        </button>
                    </div>
                )}

                <div className="mt-2 max-h-[38vh] overflow-y-auto overscroll-contain">
                    <Lines items={items} />
                </div>

                <div className="mt-4 border-t border-hairline pt-4">
                    <Money totals={totals} serviceLabel={serviceLabel} ready={ready} />
                </div>
            </div>
        </div>
    );
}
