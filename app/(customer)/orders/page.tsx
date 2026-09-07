// app/(customer)/order-history/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import OrderCodeField from '@/app/components/order/OrderCodeField';
import { useRouter } from 'next/navigation';
import { useModal } from '../../components/providers/ModalProvider';
import { useAuth } from '../../components/providers/AuthProvider';
import { useOrders } from '@/lib/api/hooks/useOrders';
import { useCart } from '@/lib/api/hooks/useCart';
import { toast } from '@/lib/utils/toast';
import {
    MagnifyingGlassIcon,
    XIcon,
    PackageIcon,
    CalendarIcon,
    MapPinIcon,
    ArrowRightIcon,
    ArrowsClockwiseIcon,
    SpinnerGapIcon,
} from '@phosphor-icons/react';
import type { Order as ApiOrder, OrderStatus as ApiOrderStatus } from '@/types/api';

/**
 * What somebody signed out sees on this page.
 *
 * It used to be a red banner sitting above a search box that searched nothing
 * and an empty list, so a guest got two empty states stacked, and the banner
 * said the same sentence twice: "Sign in to view your order history. Order
 * history is only available for signed-in customers."
 *
 * Red is the action colour on this side of the product and it is spent on
 * paying. Nothing has gone wrong here, so nothing is tinted. The page is simply
 * about something else until you sign in.
 *
 * The code box is here rather than behind a link to it. `GET /orders/by-number`
 * is public and always has been, so an account has never been needed to follow
 * an order. Somebody who opens this page while their food is out is looking for
 * that one order, and sending them to another screen to type five characters is
 * a step for nothing. The account buys them the list, not the tracking.
 */
function SignedOut({ onSignIn }: { onSignIn: () => void }) {
    return (
        <div className="flex flex-col items-center px-5 py-16 text-center">
            <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-16 opacity-15" />

            <h2 className="mt-6 font-brand text-3xl uppercase leading-none tracking-[0.01em] text-fg">
                Your orders live here
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">
                Put in the code from your SMS to follow that order. Sign in and every order you have placed
                shows up on this page instead.
            </p>

            <div className="mt-6 flex w-full justify-center">
                <OrderCodeField />
            </div>

            <button
                onClick={onSignIn}
                className="mt-5 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
            >
                Sign in for the full list
            </button>
        </div>
    );
}

/**
 * How each status reads in the list.
 *
 * Four tones, not nine. The old map painted `received`, `confirmed` and
 * `pending` three different shades of the same blue and put the live states in
 * red, which is the action colour on this side and belongs on buttons. What a
 * customer needs from a pill is whether the order is finished, still moving, or
 * dead, and every one of these clears contrast on the page ground.
 */
const STATUS_CONFIG: Record<ApiOrderStatus, { label: string; tone: 'live' | 'done' | 'dead' }> = {
    pending: { label: 'Pending', tone: 'live' },
    confirmed: { label: 'Confirmed', tone: 'live' },
    received: { label: 'Received', tone: 'live' },
    accepted: { label: 'Accepted', tone: 'live' },
    preparing: { label: 'Being cooked', tone: 'live' },
    ready: { label: 'Ready', tone: 'live' },
    ready_for_pickup: { label: 'Ready to collect', tone: 'live' },
    out_for_delivery: { label: 'On the way', tone: 'live' },
    delivered: { label: 'Delivered', tone: 'done' },
    completed: { label: 'Completed', tone: 'done' },
    cancel_requested: { label: 'Cancelling', tone: 'dead' },
    cancelled: { label: 'Cancelled', tone: 'dead' },
};

const TONE_CLASS: Record<'live' | 'done' | 'dead', string> = {
    live: 'bg-fg text-white',
    done: 'bg-success-soft text-success-ink',
    dead: 'bg-surface-sunken text-fg-muted',
};

const formatPrice = (p: number | string | null | undefined): string => {
    const n = typeof p === 'number' ? p : Number(p);
    if (Number.isNaN(n)) return 'GHS 0.00';
    return `GHS ${n.toFixed(2)}`;
};

function timeAgo(dateString: string): string {
    const d = Date.now() - new Date(dateString).getTime();
    const m = Math.floor(d / 60_000);
    const h = Math.floor(m / 60);
    const dy = Math.floor(h / 24);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (dy === 1) return 'Yesterday';
    return `${dy}d ago`;
}

export default function OrderHistoryPage() {
    const router = useRouter();
    const { openAuth } = useModal();
    const { isLoggedIn, isRestoring } = useAuth();
    const { addItem } = useCart();
    const [reordering, setReordering] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ApiOrderStatus | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch orders from API (only when mounted + logged in to avoid hydration mismatch)
    const { orders, meta, isLoading, error } = useOrders({
        status: statusFilter,
        page,
        per_page: 20,
    });

    // Filter orders by search
    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) return orders;

        const query = searchQuery.toLowerCase();
        return orders.filter(order =>
            order.order_number.toLowerCase().includes(query) ||
            order.items.some(item => item.menu_item.name.toLowerCase().includes(query)) ||
            order.branch?.name.toLowerCase().includes(query)
        );
    }, [orders, searchQuery]);

    const handleOrderClick = (orderNumber: string) => {
        router.push(`/orders/${orderNumber}?from=order-history`);
    };

    const handleReorder = async (e: React.MouseEvent, order: ApiOrder) => {
        e.stopPropagation();
        setReordering(order.id);
        try {
            for (const item of order.items) {
                await addItem({
                    branch_id: order.branch_id,
                    menu_item_id: item.menu_item_id,
                    menu_item_option_id: item.menu_item_option_id ?? undefined,
                    quantity: item.quantity,
                    unit_price: Number(item.unit_price),
                });
            }
            toast.success('Items added to cart');
            router.push('/checkout');
        } catch {
            toast.error('Failed to add items to cart. Please try again.');
        } finally {
            setReordering(null);
        }
    };

    /**
     * Same layout for loading and content, to avoid a hydration mismatch — and
     * the restore window counts as loading. Without it a signed-in customer
     * whose `/orders` call answered before `/auth/user` did was shown the
     * "you are not signed in" panel over a list that had already arrived.
     */
    const showLoading = !mounted || isRestoring || isLoading;

    return (
        <div className="min-h-dvh bg-bg">
            <main className="page-x mx-auto max-w-3xl pb-16 pt-8">

                <h1 className="mb-7 font-brand text-4xl uppercase leading-none tracking-[0.01em] text-fg">
                    My orders
                </h1>

                {showLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <SpinnerGapIcon size={26} className="animate-spin text-fg-subtle" />
                    </div>
                ) : !isLoggedIn ? (
                    <SignedOut onSignIn={openAuth} />
                ) : (
                    <>
                        {/* Search */}
                        <div className="mb-7 flex min-h-13 items-center rounded-xl border border-hairline bg-surface transition-colors duration-150 ease-out focus-within:border-fg">
                            <MagnifyingGlassIcon size={16} weight="bold" className="ml-3.5 shrink-0 text-fg-subtle" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="An order number, a dish, a branch"
                                className="min-w-0 flex-1 bg-transparent px-3 text-fg outline-none placeholder:text-fg-subtle"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear the search"
                                    className="grid h-11 w-11 shrink-0 place-items-center text-fg-subtle transition-colors duration-150 ease-out hover:text-fg"
                                >
                                    <XIcon size={15} weight="bold" />
                                </button>
                            )}
                        </div>

                        {/* Orders List */}
                        {filteredOrders.length === 0 ? (
                            // Empty State
                            <div className="flex flex-col items-center py-16 text-center">
                                <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-16 opacity-15" />
                                <p className="mt-5 text-base font-bold text-fg">
                                    {searchQuery ? 'Nothing matches that' : 'Nothing here yet'}
                                </p>
                                <p className="mt-1 max-w-64 text-sm leading-relaxed text-fg-muted">
                                    {searchQuery
                                        ? 'Try the order number, or the name of a dish.'
                                        : 'Jollof, wraps, drumsticks and the rest are one tap away.'}
                                </p>
                                {!searchQuery && (
                                    <Link
                                        href="/menu"
                                        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary-fill px-5 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                                    >
                                        Open the menu
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <ul className="divide-y divide-hairline border-y border-hairline">
                                {filteredOrders.map((order) => {
                                    const cfg = STATUS_CONFIG[order.status];
                                    const isCompleted = ['delivered', 'completed'].includes(order.status);
                                    const where = order.order_type === 'delivery'
                                        ? order.delivery_address?.split(',')[0]
                                        : order.branch?.name;

                                    return (
                                        <li key={order.id} className="py-4">
                                            {/* The row is a link and the reorder is a
                                                button beside it. They used to be a
                                                button inside a button, which no browser
                                                is obliged to make sense of. */}
                                            <Link
                                                href={`/orders/${order.order_number}`}
                                                className="group flex items-start gap-4"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                                        <span className="font-brand text-xl uppercase leading-none tracking-[0.01em] text-fg">
                                                            {order.order_number}
                                                        </span>
                                                        <span className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.04em] ${TONE_CLASS[cfg.tone]}`}>
                                                            {cfg.label}
                                                        </span>
                                                    </div>

                                                    <p className="mt-2 truncate text-sm text-fg-muted">
                                                        {timeAgo(order.created_at)}
                                                        {where ? ` \u00b7 ${where}` : ''}
                                                    </p>

                                                    {/* Wraps rather than cuts. The receipt name
                                                        is the whole point of the line. */}
                                                    <p className="mt-1 text-sm leading-snug break-words text-fg">
                                                        {order.items
                                                            .map(i => (i.quantity > 1 ? `${i.quantity} \u00d7 ` : '') + (i.menu_item_snapshot?.name ?? i.menu_item?.name ?? 'Item'))
                                                            .join(', ')}
                                                    </p>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-3">
                                                    <span className="text-base font-bold tabular-nums text-fg">
                                                        {formatPrice(order.total_amount ?? order.total)}
                                                    </span>
                                                    <ArrowRightIcon
                                                        size={16}
                                                        weight="bold"
                                                        className="text-fg-subtle transition-colors duration-150 ease-out group-hover:text-fg"
                                                    />
                                                </div>
                                            </Link>

                                            {isCompleted && (
                                                <button
                                                    onClick={(e) => handleReorder(e, order)}
                                                    disabled={reordering === order.id}
                                                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface-sunken px-4 text-sm font-bold text-fg transition-opacity duration-150 ease-out hover:opacity-80 disabled:opacity-60"
                                                >
                                                    <ArrowsClockwiseIcon
                                                        size={15}
                                                        weight="bold"
                                                        className={reordering === order.id ? 'animate-spin' : ''}
                                                    />
                                                    {reordering === order.id ? 'Adding it back' : 'Order this again'}
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}
            </main>

        </div>
    );
}
