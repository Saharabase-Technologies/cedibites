// app/(customer)/orders/[orderCode]/page.tsx
'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrderByNumber } from '@/lib/api/hooks/useOrders';
import {
    ArrowLeftIcon,
    ShareIcon,
    PhoneIcon,
    MapPinIcon,
    PackageIcon,
    SpinnerGapIcon,
} from '@phosphor-icons/react';
import { timeAgo, buildOrderTimeline } from '@/types/order';
import OrderTimeline from '@/app/components/order/OrderTimeline';
import OrderDetails from '@/app/components/order/OrderDetails';
import Button from '@/app/components/base/Button';
import type { Order as ApiOrder } from '@/types/api';
import type { Order as MockOrder, OrderTimelineEvent, OrderStatus as MockOrderStatus } from '@/types/order';

function deriveSizeKey(item: ApiOrder['items'][0]): string {
    if (item.size_key) return item.size_key;
    const size = item.menu_item_size;
    if (size?.size_key) return size.size_key;
    if (size?.name) return size.name.toLowerCase().replace(/\s+/g, '_');
    return 'default';
}

function mapApiStatusToTimeline(status: string): string {
    return status === 'received' ? 'pending' : status;
}

function buildDeliveryTimeline(status: string, placedAt: number): OrderTimelineEvent[] {
    const steps = [
        { status: 'pending', label: 'Order received', description: 'Confirming your order', offsetMins: 0 },
        { status: 'confirmed', label: 'Confirmed', description: 'Order confirmed', offsetMins: 1 },
        { status: 'preparing', label: 'Preparing', description: 'Kitchen is cooking your food', offsetMins: 2 },
        { status: 'out_for_delivery', label: 'Out for delivery', description: 'Rider is heading to you', offsetMins: 20 },
        { status: 'delivered', label: 'Delivered', description: 'Enjoy your meal', offsetMins: 35 },
    ];
    const currentIndex = steps.findIndex(s => s.status === status);
    return steps.map((step, i) => ({
        status: step.status as MockOrderStatus,
        label: step.label,
        description: step.description,
        timestamp: i <= currentIndex ? placedAt + step.offsetMins * 60_000 : null,
        done: i < currentIndex,
        active: i === currentIndex,
    }));
}

function buildPickupTimeline(status: string, placedAt: number): OrderTimelineEvent[] {
    const steps = [
        { status: 'pending', label: 'Order received', description: 'Confirming your order', offsetMins: 0 },
        { status: 'confirmed', label: 'Confirmed', description: 'Order confirmed', offsetMins: 1 },
        { status: 'preparing', label: 'Preparing', description: 'Kitchen is cooking your food', offsetMins: 2 },
        { status: 'ready_for_pickup', label: 'Ready for pickup', description: 'Come collect at the branch', offsetMins: 15 },
    ];
    const currentIndex = steps.findIndex(s => s.status === status);
    return steps.map((step, i) => ({
        status: step.status as MockOrderStatus,
        label: step.label,
        description: step.description,
        timestamp: i <= currentIndex ? placedAt + step.offsetMins * 60_000 : null,
        done: i < currentIndex,
        active: i === currentIndex,
    }));
}

function transformApiOrderToMock(apiOrder: ApiOrder): MockOrder {
    const placedAt = new Date(apiOrder.created_at).getTime();
    const mappedStatus = mapApiStatusToTimeline(apiOrder.status);
    const timeline: OrderTimelineEvent[] = apiOrder.order_type === 'delivery'
        ? buildDeliveryTimeline(mappedStatus, placedAt)
        : buildPickupTimeline(mappedStatus, placedAt);

    const payment = apiOrder.payment ?? apiOrder.payments?.[0];

    return {
        id: apiOrder.id.toString(),
        orderNumber: apiOrder.order_number,
        status: apiOrder.status as MockOrderStatus,
        source: 'online',
        fulfillmentType: apiOrder.order_type,
        paymentMethod: (payment?.payment_method as MockOrder['paymentMethod']) || 'cash_delivery',
        paymentStatus: (payment?.payment_status as MockOrder['paymentStatus']) || 'pending',
        isPaid: payment?.payment_status === 'paid' || payment?.payment_status === 'completed',
        items: (apiOrder.items || []).map(item => {
            const sizeKey = deriveSizeKey(item);
            const sizeLabel = sizeKey === 'default' ? 'Regular' : sizeKey.replace(/_/g, ' ');
            return {
                id: item.id.toString(),
                menuItemId: String(item.menu_item_id),
                name: item.menu_item?.name || 'Unknown Item',
                unitPrice: Number(item.unit_price) || 0,
                image: item.menu_item?.image_url,
                sizeLabel,
                quantity: item.quantity,
            };
        }),
        subtotal: Number(apiOrder.subtotal) || 0,
        deliveryFee: Number(apiOrder.delivery_fee) ?? 0,
        discount: 0,
        tax: Number(apiOrder.tax_amount ?? apiOrder.tax) || 0,
        total: Number(apiOrder.total_amount ?? apiOrder.total) || 0,
        contact: {
            name: apiOrder.contact_name ?? apiOrder.customer_name ?? '',
            phone: apiOrder.contact_phone ?? apiOrder.customer_phone ?? '',
            address: apiOrder.delivery_address,
            notes: apiOrder.delivery_note ?? apiOrder.special_instructions,
        },
        branch: {
            id: apiOrder.branch_id?.toString() || '0',
            name: apiOrder.branch?.name || 'Branch',
            address: apiOrder.branch?.address || '',
            phone: apiOrder.branch?.phone || '',
            coordinates: {
                latitude: Number(apiOrder.branch?.latitude) || 0,
                longitude: Number(apiOrder.branch?.longitude) || 0,
            },
        },
        placedAt,
        estimatedMinutes: 35,
        timeline,
    };
}

interface PageProps {
    params: Promise<{ orderCode: string }>;
}

export default function OrderTrackingPage({ params }: PageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const resolvedParams = use(params);
    const backPath = searchParams.get('from') === 'order-history' ? '/order-history' : '/orders';
    const { order: apiOrder, isLoading: loading, error } = useOrderByNumber(resolvedParams.orderCode);
    const order = apiOrder ? transformApiOrderToMock(apiOrder) : null;
    const notFound = !loading && (!!error || !order);

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