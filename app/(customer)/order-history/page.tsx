// app/(customer)/order-history/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useModal } from '../../components/providers/ModalProvider';
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
import {
    getMockOrdersForUser,
    type Order,
    STATUS_CONFIG,
    formatPrice,
    timeAgo,
} from '@/types/order';
import { UserCheckIcon } from '@phosphor-icons/react/dist/ssr';

export default function OrderHistoryPage() {
    const router = useRouter();
    const { openAuth } = useModal();
    const [searchQuery, setSearchQuery] = useState('');
    const [userIP, setUserIP] = useState<string | null>(null);

    // TODO: Replace with actual user check and IP detection
    const isLoggedIn = false; // Change this to your actual auth state

    // Get user IP for guest orders
    useEffect(() => {
        if (!isLoggedIn) {
            // TODO: Fetch actual IP from API
            // For now, mock it
            setUserIP('192.168.1.1');
        }
    }, [isLoggedIn]);

    // Get orders - either by user auth or IP
    const allOrders = useMemo(() => {
        if (isLoggedIn) {
            // TODO: Fetch orders by user ID
            return getMockOrdersForUser();
        } else if (userIP) {
            // TODO: Fetch orders by IP address
            return getMockOrdersForUser(); // Mock for now
        }
        return [];
    }, [isLoggedIn, userIP]);

    // Filter orders by search
    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) return allOrders;

        const query = searchQuery.toLowerCase();
        return allOrders.filter(order =>
            order.orderNumber.toLowerCase().includes(query) ||
            order.items.some(item => item.name.toLowerCase().includes(query)) ||
            order.branch.name.toLowerCase().includes(query)
        );
    }, [allOrders, searchQuery]);

    const handleOrderClick = (orderNumber: string) => {
        router.push(`/orders/${orderNumber}?from=order-history`);
    };

    const handleReorder = (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
        // TODO: Add items to cart and redirect to checkout
        console.log('Reorder:', order);
        router.push('/');
    };

    // Loading state while fetching IP
    if (!isLoggedIn && !userIP) {
        return (
            <div className="min-h-screen bg-neutral-light dark:bg-brand-darker">
                <Navbar />
                <main className="w-[90%] md:w-[600px] mx-auto py-12 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-neutral-gray">Loading your orders...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker">
            <Navbar />

            {/* Main Content */}
            <main className="w-[90%] md:w-[80%] lg:w-[70%] mx-auto py-8 md:py-12">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-text-dark dark:text-text-light mb-2">
                        Order History
                    </h1>
                    <p className="text-neutral-gray">
                        {isLoggedIn
                            ? `${allOrders.length} order${allOrders.length !== 1 ? 's' : ''} total`
                            : `Orders from this device`}
                    </p>
                </div>

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
                            <span className="font-semibold">Viewing guest orders.</span> Sign in to see your complete order history across all devices.
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
                                    onClick={() => handleOrderClick(order.orderNumber)}
                                    className="w-full bg-white/50 cursor-pointer dark:bg-brand-dark rounded-2xl p-5 border border-neutral-gray/10 hover:border-primary/30 hover:shadow-md transition-all text-left group"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-text-dark dark:text-text-light">
                                                    {order.orderNumber}
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
                                                    <span>{timeAgo(order.placedAt)}</span>
                                                </div>
                                                {order.orderType === 'delivery' && order.contact.address && (
                                                    <>
                                                        <span>•</span>
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <MapPinIcon size={16} />
                                                            <span className="truncate">
                                                                {order.contact.address.split(',')[0]}
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
                                                    {item.name}
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
                                                {formatPrice(order.total)}
                                            </p>
                                        </div>

                                        {isCompleted && (
                                            <button
                                                onClick={(e) => handleReorder(e, order)}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary hover:text-white text-primary rounded-full font-semibold transition-all"
                                            >
                                                <ArrowsClockwiseIcon size={18} weight="bold" />
                                                <span>Reorder</span>
                                            </button>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
