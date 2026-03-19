'use client';

import { use } from 'react';
import Link from 'next/link';
import { XCircleIcon, ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react';

export default function PaymentCancelledPage({ params }: { params: Promise<{ orderCode: string }> }) {
    const { orderCode } = use(params);

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker flex items-center justify-center px-4 pt-20 pb-12">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-brand-dark rounded-3xl p-8 shadow-sm text-center flex flex-col items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <XCircleIcon weight="fill" size={48} className="text-red-500" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-text-dark dark:text-text-light">Payment Cancelled</h1>
                        <p className="text-neutral-gray text-sm mt-1">Your payment was not completed. Your order has been saved.</p>
                    </div>

                    <div className="w-full bg-neutral-light dark:bg-brown/20 rounded-2xl p-4 text-sm text-center text-neutral-gray">
                        Order <span className="font-bold text-text-dark dark:text-text-light">{orderCode}</span> is awaiting payment.
                        You can retry payment from the order details page.
                    </div>

                    <div className="w-full flex flex-col gap-3">
                        <Link
                            href={`/orders/${orderCode}`}
                            className="w-full flex items-center justify-between bg-brown dark:bg-primary hover:bg-brown-light text-white font-bold px-6 py-4 rounded-2xl transition-all"
                        >
                            <span className="flex items-center gap-2">
                                <ArrowLeftIcon weight="bold" size={18} /> View order &amp; retry
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
