// app/track/[orderCode]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeftIcon,
    ShareIcon,
    PhoneIcon,
    MapPinIcon,
    PackageIcon,
    SpinnerGapIcon,
} from '@phosphor-icons/react';
import Navbar from '@/app/components/layout/Navbar';
import { type Order, timeAgo, buildOrderTimeline } from '@/types/order';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import OrderTimeline from '@/app/components/order/OrderTimeline';
import LiveMap from '@/app/components/order/LiveMap';
import OrderDetails from '@/app/components/order/OrderDetails';
import Button from '@/app/components/base/Button';

interface PageProps {
    params: Promise<{ orderCode: string }>;
}

export default function OrderTrackingPage({ params }: PageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const resolvedParams = use(params);
    const backPath = searchParams.get('from') === 'order-history' ? '/order-history' : '/orders';
    const { getOrderById } = useOrderStore();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        // Fetch order
        const orderData = getOrderById(resolvedParams.orderCode) ?? null;

        if (!orderData) {
            setNotFound(true);
            setLoading(false);
            return;
        }

        setOrder(orderData);
        setLoading(false);

        // TODO: WebSocket connection for real-time updates
        // const ws = new WebSocket(`wss://api.cedibites.com/track/${resolvedParams.orderCode}`);
        // ws.onmessage = (event) => {
        //     const update = JSON.parse(event.data);
        //     setOrder(prev => prev ? { ...prev, ...update } : null);
        // };
        // return () => ws.close();
    }, [resolvedParams.orderCode, getOrderById]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-light dark:bg-brand-darker flex items-center justify-center">
                <div className="text-center">
                    <SpinnerGapIcon size={48} className="animate-spin text-primary mx-auto mb-4" />
                    <p className="text-neutral-gray">Loading order...</p>
                </div>
            </div>
        );
    }

    if (notFound || !order) {
        return (
            <div className="h-screen flex items-center justify-center  bg-neutral-light dark:bg-brand-darker">
                <main className="w-[90%] md:w-[600px] mx-auto py-12 text-center">
                    <div className="bg-white dark:bg-brand-dark rounded-2xl p-8 border border-neutral-gray/10">
                        <PackageIcon size={64} className="text-neutral-gray/40 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-text-dark dark:text-text-light mb-2">
                            Order Not Found
                        </h1>
                        <p className="text-neutral-gray mb-6">
                            We couldn't find order <span className="cursor-pointer font-mono font-semibold">{resolvedParams.orderCode}</span>.
                            Please check the code and try again.
                        </p>
                        <button
                            onClick={() => router.push('/orders')}
                            className="bg-primary cursor-pointer hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-full transition-all"
                        >
                            Try Again
                        </button>
                        <Button
                            variant="neutral"
                            type='button'
                            onClick={() => router.push('/menu')}
                            className="ml-4"
                        >
                            Browse Menu
                        </Button>


                    </div>
                </main>
            </div>
        );
    }

    const isOutForDelivery = order.status === 'out_for_delivery';
    const isDelivery = order.fulfillmentType === 'delivery';
    const timeline = order.timeline ?? buildOrderTimeline(order);

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker">
            {/* <Navbar /> */}

            {/* Header */}
            <header className="bg-brand-dark border-b text-text-neutral-light border-neutral-gray/10 sticky top-0 z-30">
                <div className="w-[90%] md:w-[80%] mx-auto py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(backPath)}
                            className="w-10 h-10 cursor-pointer flex items-center  justify-center rounded-full hover:bg-neutral-gray/10 transition-colors"
                        >
                            <ArrowLeftIcon className='text-neutral-light' size={20} weight="bold" />
                        </button>
                        <div>
                            <h1 className="font-bold text-text-light">
                                Order {order.orderNumber}
                            </h1>
                            <p className="text-sm text-neutral-light">
                                Placed {timeAgo(order.placedAt)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: `Track Order ${order.orderNumber}`,
                                    url: window.location.href,
                                });
                            }
                        }}
                        className="w-10 h-10 text-neutral-light cursor-pointer flex items-center justify-center rounded-full hover:bg-neutral-gray/10 transition-colors"
                    >
                        <ShareIcon size={20} weight="bold" />
                    </button>
                </div>
            </header>

            <main className="w-[90%] lg:w-[80%] mx-auto py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - Map & Details */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Live Status Card */}
                        {isOutForDelivery && isDelivery && (
                            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                                    <span className="text-sm font-bold text-primary uppercase tracking-wide">
                                        Live Tracking
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <h2 className="text-3xl font-bold text-text-dark dark:text-text-light">
                                        {order.estimatedMinutes} mins
                                    </h2>
                                    <span className="text-neutral-gray">estimated arrival</span>
                                </div>
                                <p className="text-sm text-neutral-gray mt-2">
                                    Your rider is on the way with your order
                                </p>
                            </div>
                        )}

                        {/* Map */}
                        {isDelivery && (
                            <div className="bg-white dark:bg-brand-dark rounded-2xl overflow-hidden border border-neutral-gray/10">
                                <LiveMap
                                    branchLocation={order.branch.coordinates}
                                    customerLocation={order.fulfillmentType === 'delivery' ? {
                                        latitude: 5.6372,
                                        longitude: -0.0924,
                                    } : null}
                                    riderLocation={isOutForDelivery ? {
                                        latitude: 5.6000,
                                        longitude: -0.1200,
                                    } : null}
                                    branchName={order.branch.name}
                                />
                            </div>
                        )}

                        {/* Order Items */}
                        <OrderDetails order={order} />
                    </div>

                    {/* Right Column - Timeline & Actions */}
                    <div className="space-y-6">

                        {/* Timeline */}
                        <div className="bg-white dark:bg-brand-dark rounded-2xl p-6 border border-neutral-gray/10">
                            <h2 className="text-lg font-bold text-text-dark dark:text-text-light mb-6">
                                Order Status
                            </h2>
                            <OrderTimeline timeline={timeline} />
                        </div>

                        {/* Delivery Info */}
                        {isDelivery && order.contact.address && (
                            <div className="bg-white dark:bg-brand-dark rounded-2xl p-6 border border-neutral-gray/10">
                                <h3 className="text-sm font-bold text-text-dark dark:text-text-light mb-4">
                                    Delivery Address
                                </h3>
                                <div className="flex items-start gap-3">
                                    <MapPinIcon size={20} className="text-primary mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-text-dark dark:text-text-light">
                                            {order.contact.address}
                                        </p>
                                        {order.contact.notes && (
                                            <p className="text-xs text-neutral-gray mt-2">
                                                Note: {order.contact.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contact Info */}
                        <div className="bg-white dark:bg-brand-dark rounded-2xl p-6 border border-neutral-gray/10">
                            <h3 className="text-sm font-bold text-text-dark dark:text-text-light mb-4">
                                Contact
                            </h3>
                            <div className="space-y-3">

                                <a
                                    href={`tel:${order.branch.phone}`}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-gray/5 hover:bg-primary/10 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                                        <PhoneIcon size={20} className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-text-dark dark:text-text-light">
                                            Call Branch
                                        </p>
                                        <p className="text-xs text-neutral-gray">
                                            {order.branch.name}
                                        </p>
                                    </div>
                                </a>

                                {isOutForDelivery && isDelivery && (
                                    <a
                                        href={`tel:${order.contact.phone}`}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-neutral-gray/5 hover:bg-primary/10 transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center transition-colors">
                                            <PhoneIcon size={20} className="text-secondary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-text-dark dark:text-text-light">
                                                Call Rider
                                            </p>
                                            <p className="text-xs text-neutral-gray">
                                                Track your delivery
                                            </p>
                                        </div>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Branch Info */}
                        <div className="bg-white dark:bg-brand-dark rounded-2xl p-6 border border-neutral-gray/10">
                            <h3 className="text-sm font-bold text-text-dark dark:text-text-light mb-4">
                                From
                            </h3>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <PackageIcon size={20} className="text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-text-dark dark:text-text-light">
                                        {order.branch.name}
                                    </p>
                                    <p className="text-sm text-neutral-gray mt-1">
                                        {order.branch.address}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >
            </main >
        </div >
    );
}