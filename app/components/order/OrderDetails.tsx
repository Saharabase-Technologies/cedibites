// app/components/order/OrderDetails.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CaretDownIcon, CaretUpIcon, ReceiptIcon } from '@phosphor-icons/react';
import type { Order } from '@/types/order';
import { formatPrice, getPaymentLabel } from '@/types/order';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';

interface OrderDetailsProps {
    order: Order;
}

export default function OrderDetails({ order }: OrderDetailsProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-white dark:bg-brand-dark rounded-2xl border border-neutral-gray/10 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-gray/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ReceiptIcon size={20} className="text-primary" />
                    </div>
                    <div className="text-left">
                        <h2 className="font-bold text-text-dark dark:text-text-light">
                            Your Order
                        </h2>
                        <p className="text-sm text-neutral-gray">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                {isExpanded ? (
                    <CaretUpIcon size={20} className="text-neutral-gray" />
                ) : (
                    <CaretDownIcon size={20} className="text-neutral-gray" />
                )}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-6 pb-6">
                    {/* Items */}
                    <div className="space-y-4 mb-6">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                    {item.image ? (
                                        <Image
                                            src={item.image}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className="text-xl">{item.icon || '🍽️'}</span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-text-dark dark:text-text-light truncate">
                                                {getOrderItemLineLabel(item)}
                                            </h3>
                                            <p className="text-sm text-neutral-gray">
                                                × {item.quantity}
                                            </p>
                                        </div>
                                        <span className="font-semibold text-text-dark dark:text-text-light shrink-0">
                                            {formatPrice(item.unitPrice * item.quantity)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pricing Summary */}
                    <div className="space-y-2 pt-4 border-t border-neutral-gray/10">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-gray">Subtotal</span>
                            <span className="text-text-dark dark:text-text-light">
                                {formatPrice(order.subtotal)}
                            </span>
                        </div>

                        {order.deliveryFee > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-gray">Delivery Fee</span>
                                <span className="text-text-dark dark:text-text-light">
                                    {formatPrice(order.deliveryFee)}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-gray/10">
                            <span className="font-bold text-text-dark dark:text-text-light">
                                Total
                            </span>
                            <span className="font-bold text-lg text-primary">
                                {formatPrice(order.total)}
                            </span>
                        </div>

                        {/* Payment Status */}
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-neutral-gray">
                                {getPaymentLabel(order.paymentMethod, order.fulfillmentType)}
                            </span>
                            {order.isPaid && (
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-secondary/15 text-secondary">
                                    ✓ Paid
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
