'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, SpinnerGapIcon, ReceiptIcon, ArrowRightIcon } from '@phosphor-icons/react';
import apiClient from '@/lib/api/client';

interface Order {
    id: number;
    order_number: string;
    status: string;
    total_amount: string | number;
    contact_name: string;
    payments?: { payment_status: string }[];
}

export default function PaymentSuccessPage({ params }: { params: Promise<{ orderCode: string }> }) {
    const { orderCode } = use(params);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient
            .get(`/orders/by-number/${encodeURIComponent(orderCode)}`)
            .then((res: unknown) => {
                const r = res as { data?: Order };
                setOrder(r?.data ?? null);
            })
            .catch(() => setOrder(null))
            .finally(() => setLoading(false));
    }, [orderCode]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-light dark:bg-brand-darker flex items-center justify-center">
                <SpinnerGapIcon size={40} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker flex items-center justify-center px-4 pt-20 pb-12">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-brand-dark rounded-3xl p-8 shadow-sm text-center flex flex-col items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center">
                        <CheckCircleIcon weight="fill" size={48} className="text-secondary" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-text-dark dark:text-text-light">Payment Confirmed!</h1>
                        <p className="text-neutral-gray text-sm mt-1">Your order has been placed and payment received.</p>
                    </div>

                    {order && (
                        <div className="w-full bg-neutral-light dark:bg-brown/20 rounded-2xl p-4 flex flex-col gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-gray">Order number</span>
                                <span className="font-bold text-text-dark dark:text-text-light">{order.order_number}</span>
                            </div>
                            {order.contact_name && (
                                <div className="flex justify-between">
                                    <span className="text-neutral-gray">Name</span>
                                    <span className="font-semibold text-text-dark dark:text-text-light">{order.contact_name}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-neutral-gray">Amount paid</span>
                                <span className="font-bold text-primary">₵{Number(order.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="w-full flex flex-col gap-3">
                        <Link
                            href={`/orders/${orderCode}`}
                            className="w-full flex items-center justify-between bg-brown dark:bg-primary hover:bg-brown-light text-white font-bold px-6 py-4 rounded-2xl transition-all"
                        >
                            <span className="flex items-center gap-2">
                                <ReceiptIcon weight="fill" size={18} /> Track your order
                            </span>
                            <ArrowRightIcon weight="bold" size={18} />
                        </Link>
                        <Link
                            href="/"
                            className="w-full text-center text-sm text-neutral-gray hover:text-primary transition-colors py-2"
                        >
                            Back to home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
