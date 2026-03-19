// app/(customer)/order-history/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
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
    UserIcon,
} from '@phosphor-icons/react';
import Navbar from '../../components/layout/Navbar';
import type { Order as ApiOrder, OrderStatus as ApiOrderStatus } from '@/types/api';

// Status configuration matching API statuses
const STATUS_CONFIG: Record<ApiOrderStatus, {
    label: string; color: string; bg: string;
}> = {
    pending: { label: 'Pending', color: 'text-info', bg: 'bg-info/8' },
    confirmed: { label: 'Confirmed', color: 'text-info', bg: 'bg-info/8' },
    received: { label: 'Received', color: 'text-info', bg: 'bg-info/8' },
    preparing: { label: 'Preparing', color: 'text-warning', bg: 'bg-warning/8' },
    ready: { label: 'Ready', color: 'text-primary', bg: 'bg-primary/8' },
    ready_for_pickup: { label: 'Ready for pickup', color: 'text-primary', bg: 'bg-primary/8' },
    out_for_delivery: { label: 'On the way', color: 'text-primary', bg: 'bg-primary/8' },
    delivered: { label: 'Delivered', color: 'text-secondary', bg: 'bg-secondary/8' },
    completed: { label: 'Completed', color: 'text-secondary', bg: 'bg-secondary/8' },
    cancelled: { label: 'Cancelled', color: 'text-error', bg: 'bg-error/8' },
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
    const { isLoggedIn } = useAuth();
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
                    menu_item_size_id: undefined,
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

    // Use same layout for loading and content to avoid hydration mismatch
    const showLoading = !mounted || isLoading;

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker">
            <Navbar />

            {/* Main Content - pt-24 accounts for fixed Navbar */}
            <main className="w-[90%] md:w-[80%] lg:w-[70%] mx-auto pt-24 md:pt-28 pb-8 md:pb-12">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-text-dark dark:text-text-light mb-2">
                        Order History
                    </h1>
                </div>

                {showLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-neutral-gray">Loading your orders...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Search */}
                        <div className="mb-8">
                            <div className="relative">
                                <MagnifyingGlassIcon
                                    size={24}
                                    weight="bold"
                                    className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-gray"
                                />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by order number, item, or branch..."
                                    className="w-full pl-16 pr-12 py-4 bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/30 focus:border-primary rounded-full text-text-dark dark:text-text-light placeholder:text-neutral-gray transition-all outline-none"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-gray/10 transition-colors"
                                    >
                                        <XIcon size={16} weight="bold" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Guest Notice */}
                        {!isLoggedIn && (
                            <div className="mb-6 p-4 bg-primary/10 flex items-center justify-between border border-primary/20 rounded-2xl">
                                <p className="text-sm text-text-dark dark:text-text-light">
                                    <span className="font-semibold">Sign in to view your order history.</span> Order history is only available for signed-in customers.
                                </p>
                                <button
                                    onClick={() => openAuth()}
                                    className="mt-2 px-3 py-2 rounded-full group hover:bg-primary/10 text-sm cursor-pointer flex items-center gap-2 font-semibold text-primary hover:underline"
                                >

                                    <span className="inline-flex group-hover:bg-primary group-hover:text-text-light items-center gap-1 cursor-pointer h-12 w-12 px-3 py-3 bg-primary/10  hover:text-white rounded-full transition-all">
                                        <UserIcon size={24} weight="bold" />
                                    </span>
                                    <span className=''>                            sign In
                                    </span>

                                </button>
                            </div>
                        )}

                        {/* Orders List */}
                        {filteredOrders.length === 0 ? (
                            // Empty State
                            <div className="text-center py-16">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-gray/10 mb-6">
                                    <PackageIcon size={40} className="text-neutral-gray/40" />
                                </div>
                                <h2 className="text-xl font-bold text-text-dark dark:text-text-light mb-2">
                                    {searchQuery ? 'No orders found' : 'No orders yet'}
                                </h2>
                                <p className="text-neutral-gray mb-6">
                                    {searchQuery
                                        ? 'Try a different search term'
                                        : 'Your order history will appear here'}
                                </p>
                                {!searchQuery && (
                                    <button
                                        onClick={() => router.push('/')}
                                        className="bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-full transition-all"
                                    >
                                        Start Ordering
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredOrders.map((order) => {
                                    const statusConfig = STATUS_CONFIG[order.status];
                                    const isCompleted = ['delivered', 'completed'].includes(order.status);

                                    return (
                                        <button
                                            key={order.id}
                                            onClick={() => handleOrderClick(order.order_number)}
                                            className="w-full bg-white/50 cursor-pointer dark:bg-brand-dark rounded-2xl p-5 border border-neutral-gray/10 hover:border-primary/30 hover:shadow-md transition-all text-left group"
                                        >
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-text-dark dark:text-text-light">
                                                            {order.order_number}
                                                        </h3>
                                                        <span
                                                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}
                                                        >
                                                            {statusConfig.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-neutral-gray">
                                                        <div className="flex items-center gap-1.5">
                                                            <CalendarIcon size={16} />
                                                            <span>{timeAgo(order.created_at)}</span>
                                                        </div>
                                                        {order.order_type === 'delivery' && order.delivery_address && (
                                                            <>
                                                                <span>•</span>
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <MapPinIcon size={16} />
                                                                    <span className="truncate">
                                                                        {order.delivery_address.split(',')[0]}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <ArrowRightIcon
                                                    size={20}
                                                    className="text-neutral-gray group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0"
                                                />
                                            </div>

                                            {/* Items */}
                                            <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                                                {order.items.slice(0, 3).map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-light dark:bg-brand-darker rounded-full shrink-0"
                                                    >
                                                        <span className="text-sm text-text-dark dark:text-text-light">
                                                            {item.menu_item.name}
                                                        </span>
                                                        {item.quantity > 1 && (
                                                            <span className="text-xs text-neutral-gray">
                                                                ×{item.quantity}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                                {order.items.length > 3 && (
                                                    <span className="text-sm text-neutral-gray shrink-0">
                                                        +{order.items.length - 3} more
                                                    </span>
                                                )}
                                            </div>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between pt-4 border-t border-neutral-gray/10">
                                                <div>
                                                    <p className="text-sm text-neutral-gray mb-1">
                                                        Total Amount
                                                    </p>
                                                    <p className="text-lg font-bold text-primary">
                                                        {formatPrice(order.total_amount ?? order.total)}
                                                    </p>
                                                </div>

                                                {isCompleted && (
                                                    <button
                                                        onClick={(e) => handleReorder(e, order)}
                                                        disabled={reordering === order.id}
                                                        className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary hover:text-white text-primary rounded-full font-semibold transition-all disabled:opacity-60"
                                                    >
                                                        <ArrowsClockwiseIcon size={18} weight="bold" className={reordering === order.id ? 'animate-spin' : ''} />
                                                        <span>{reordering === order.id ? 'Adding...' : 'Reorder'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
