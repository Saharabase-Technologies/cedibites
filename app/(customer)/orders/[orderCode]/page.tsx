'use client';

import { photoForMenuItem } from '@/lib/constants/branchPhotos';
import { useOrderByNumber } from '@/lib/api/hooks/useOrders';
import { readLastOrder } from '@/lib/orders/lastOrder';
import { branchTitle } from '@/lib/utils/branchName';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import type { Order as ApiOrder } from '@/types/api';
import { ArrowLeftIcon, PhoneIcon, ShareIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import Timeline from './_components/Timeline';
import { trackOrder } from './_components/trackOrder';

const money = (n: number | string | null | undefined) => {
    const v = typeof n === 'number' ? n : Number(n);
    return Number.isFinite(v) ? `₵${v.toFixed(2)}` : '₵0.00';
};

/**
 * The red block heading from the brand's own artwork.
 *
 * White on #f40002 is 4.33:1, which clears AA for large text and nothing else,
 * so this is display size or it does not exist. That is why it is 22px here and
 * why the 15px version it replaces was set in plain black instead.
 */
function Heading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="inline-block bg-primary px-3 py-2 font-brand text-[22px] uppercase leading-none tracking-[0.03em] text-white">
            {children}
        </h2>
    );
}

function Line({ item }: { item: ApiOrder['items'][number] }) {
    const [broken, setBroken] = useState(false);
    // The snapshot first: it is what the menu said at the moment of the order,
    // and a dish renamed since then must not rewrite somebody's old receipt.
    const name = item.menu_item_snapshot?.name ?? item.menu_item?.name ?? 'Item';
    /**
     * The receipt name, in the same order of preference as everywhere else.
     *
     * The snapshot's `display_name` is the name the till prints. It is null on
     * every order placed before that field was filled in, and this screen used
     * to skip straight from there to `option_label` — a menu pill like
     * "Assorted" or "Fried Rice" — because the payload carried no live option
     * to look at. The live `display_name` sits between the two now, so an old
     * order picks up the proper name the moment the menu has one.
     */
    const label = getOrderItemLineLabel({
        name,
        sizeLabel: item.menu_item_option_snapshot?.display_name
            ?? item.menu_item_option?.display_name
            ?? item.menu_item_option_snapshot?.option_label
            ?? item.menu_item_option?.option_label
            ?? '',
    });
    const src = photoForMenuItem(name)?.src;
    const hasPhoto = Boolean(src) && !broken;

    return (
        <li className="flex items-start gap-3 py-3">
            <span className="relative mt-0.5 grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-sunken">
                {hasPhoto ? (
                    <Image src={src!} alt="" fill sizes="44px" className="object-cover" onError={() => setBroken(true)} />
                ) : (
                    <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-6 opacity-20" />
                )}
            </span>
            <div className="min-w-0 flex-1">
                {/* Wraps. A receipt name is long on purpose and cutting it off
                    is how "Fried Rice, Assorted" became "Fried Rice, Asso…". */}
                <p className="text-sm font-semibold leading-snug text-balance break-words text-fg">{label}</p>
                <p className="mt-0.5 text-[13px] tabular-nums text-fg-muted">
                    {item.quantity} × {money(item.unit_price)}
                </p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums text-fg">{money(item.subtotal)}</span>
        </li>
    );
}

/**
 * One order, and where it has actually got to.
 *
 * Rebuilt for two reasons. The timeline was arithmetic off the placed time
 * rather than the real transitions the server has been sending all along, and
 * the screen was still on the warm staff tokens while the rest of the customer
 * side moved to the brand.
 *
 * Reachable by anybody holding the code. `GET /orders/by-number` is public and
 * throttled, which is right: the person chasing an order usually has not signed
 * in, and half the time they are reading the number off an SMS.
 */
export default function TrackOrderPage({ params }: { params: Promise<{ orderCode: string }> }) {
    const { orderCode } = use(params);
    const router = useRouter();

    const code = decodeURIComponent(orderCode).toUpperCase();

    /**
     * The secret half of the link we texted.
     *
     * Present when they arrived from the SMS, absent when they typed the code
     * into the tracking box. The order shows either way; only the address it is
     * going to depends on this.
     */
    const linkToken = useSearchParams().get('t') ?? undefined;

    /**
     * Or the copy this phone kept when it placed the order.
     *
     * Read after mount, because localStorage during render makes the server
     * pass and the first client pass disagree. Somebody looking at the order on
     * the device that placed it is not a stranger who guessed the code, and
     * telling them the address is only on their SMS — while they hold the phone
     * that typed it — is the app refusing to recognise its own customer.
     *
     * Only for this exact order. A stored token belongs to one order number and
     * is worthless against any other.
     */
    const [deviceToken, setDeviceToken] = useState<string | undefined>(undefined);
    useEffect(() => {
        if (linkToken) return;
        const last = readLastOrder();
        if (last?.number?.toUpperCase() === code) setDeviceToken(last.token);
    }, [linkToken, code]);

    const token = linkToken ?? deviceToken;
    const { order, isLoading, error } = useOrderByNumber(code, token);

    if (isLoading) {
        return (
            <div className="page-x mx-auto flex min-h-[60svh] max-w-3xl items-center justify-center">
                <SpinnerGapIcon size={26} className="animate-spin text-fg-subtle" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="page-x mx-auto flex min-h-[60svh] max-w-3xl flex-col items-center justify-center text-center">
                <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-16 opacity-15" />
                <h1 className="mt-5 font-brand text-3xl uppercase leading-none tracking-[0.01em] text-fg">
                    No order under that code
                </h1>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">
                    Check the code on your SMS. It is a letter or two followed by three numbers.
                </p>
                <Link
                    href="/track"
                    className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary-fill px-5 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                >
                    Try another code
                </Link>
            </div>
        );
    }

    const tracked = trackOrder(order);
    const delivery = order.order_type === 'delivery';

    return (
        <div className="page-x mx-auto max-w-3xl pb-16">

            <div className="flex items-center gap-2 py-4">
                <button
                    onClick={() => router.back()}
                    aria-label="Go back"
                    className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                >
                    <ArrowLeftIcon size={19} weight="bold" />
                </button>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-fg-muted">Order</p>
                    <p className="font-brand text-3xl uppercase leading-none tracking-[0.01em] text-fg">
                        {order.order_number}
                    </p>
                </div>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                        onClick={() => navigator.share?.({ title: `Order ${order.order_number}`, url: window.location.href })}
                        aria-label="Share this order"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
                    >
                        <ShareIcon size={18} weight="bold" />
                    </button>
                )}
            </div>

            {/* ── Where it is, in one line ─────────────────────────────────── */}
            {tracked.cancelled ? (
                <div className="rounded-xl bg-surface-sunken px-4 py-4">
                    <p className="text-sm font-bold text-fg">This order was cancelled</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                        Nothing is being cooked. Call {branchTitle(order.branch?.name)} on{' '}
                        {order.branch?.phone ?? 'the branch line'} if that is a surprise.
                    </p>
                </div>
            ) : (
                <div className="border-y border-hairline py-5">
                    <p className="font-brand text-4xl uppercase leading-none tracking-[0.01em] text-fg">
                        {tracked.current?.label ?? 'Order received'}
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed text-fg">{tracked.current?.note}</p>
                </div>
            )}

            {/* ── The stages, with the times they actually happened ────────── */}
            {!tracked.cancelled && (
                <section className="pt-8">
                    <Heading>Progress</Heading>
                    <div className="mt-6">
                        <Timeline stages={tracked.stages} />
                    </div>
                </section>
            )}

            {/* ── What is in it ───────────────────────────────────────────── */}
            <section className="pt-8">
                <Heading>What you ordered</Heading>
                <ul className="mt-4 divide-y divide-hairline">
                    {(order.items ?? []).map(item => <Line key={item.id} item={item} />)}
                </ul>

                <div className="mt-4 flex flex-col gap-2 border-t border-hairline pt-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-fg-muted">Subtotal</span>
                        <span className="font-semibold tabular-nums text-fg">{money(order.subtotal)}</span>
                    </div>
                    {Number(order.discount) > 0 && (
                        <div className="flex justify-between">
                            <span className="font-semibold text-success-ink">{order.promo_name || 'Discount'}</span>
                            <span className="font-semibold tabular-nums text-success-ink">−{money(order.discount)}</span>
                        </div>
                    )}
                    {Number(order.delivery_fee) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-fg-muted">Delivery, paid to the rider</span>
                            <span className="font-semibold tabular-nums text-fg">{money(order.delivery_fee)}</span>
                        </div>
                    )}
                    <div className="mt-1 flex items-baseline justify-between border-t border-hairline pt-3">
                        <span className="font-bold text-fg">Total</span>
                        <span className="text-xl font-bold tabular-nums text-fg">{money(order.total_amount)}</span>
                    </div>
                </div>
            </section>

            {/* ── Where it is going, and who to ring ────────────────────────
              *
              * Pickup says the shop, in full. "Cooked at Ashaiman" named a town
              * of a quarter of a million people and left the collector to work
              * out which building; the branch name and its street are the whole
              * answer to the only question this section exists for.
              *
              * Delivery leads with the destination, and the kitchen is the
              * quieter second line. The address shows for whoever holds the
              * tracking link, whoever is signed in to the account that placed
              * the order, and whoever is on the device that placed it. A
              * forwarded link without the token shows the stage and the money
              * and never says whose door this is.
              */}
            <section className="pt-8">
                <Heading>{delivery ? 'Where it goes' : 'Where you collect it'}</Heading>

                {delivery ? (
                    <div className="mt-4 flex flex-col gap-4">
                        {order.delivery_address ? (
                            <p className="text-base font-semibold leading-relaxed text-fg">
                                {order.delivery_address}
                            </p>
                        ) : (
                            <p className="text-sm leading-relaxed text-fg-muted">
                                The address is on the tracking link we texted, and on the phone
                                that placed the order. Sign in to see it here.
                            </p>
                        )}
                        {/* Which kitchen, and nothing more. Its street is of no
                            use to somebody waiting at their own door, and the
                            call button below is the reason they would want it. */}
                        <p className="text-sm text-fg-muted">
                            From <span className="font-bold text-fg">{branchTitle(order.branch?.name)}</span>
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 flex flex-col gap-1">
                        <p className="font-brand text-[26px] uppercase leading-none tracking-[0.01em] text-fg">
                            {branchTitle(order.branch?.name)}
                        </p>
                        {order.branch?.address && (
                            <p className="text-sm leading-relaxed text-fg-muted">{order.branch.address}</p>
                        )}
                    </div>
                )}

                {order.branch?.phone && (
                    <a
                        href={`tel:${order.branch.phone}`}
                        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface-sunken px-4 text-sm font-bold text-fg transition-opacity duration-150 ease-out hover:opacity-80"
                    >
                        <PhoneIcon size={15} weight="fill" />
                        Call {branchTitle(order.branch.name)}
                    </a>
                )}
            </section>
        </div>
    );
}
