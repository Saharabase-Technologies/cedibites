'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    SpinnerGapIcon, CheckCircleIcon, XCircleIcon,
    ReceiptIcon, ArrowRightIcon,
    DeviceMobileIcon,
} from '@phosphor-icons/react';
import { useCheckoutSessionStatus } from '@/lib/api/hooks/useCheckoutSession';
import PaymentRecoveryActions from '@/app/components/order/PaymentRecoveryActions';

function ReturnContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionToken = searchParams.get('session');
    const { session } = useCheckoutSessionStatus(sessionToken);

    if (!sessionToken) {
        return (
            <div className="w-full max-w-md bg-white dark:bg-brand-dark rounded-3xl p-8 shadow-sm text-center flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircleIcon weight="fill" size={48} className="text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-text-dark dark:text-text-light">Invalid Session</h1>
                <p className="text-neutral-gray text-sm">No checkout session found.</p>
                <Link href="/" className="w-full text-center bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl transition-all">
                    Browse Menu
                </Link>
            </div>
        );
    }

    // Confirmed — order created
    if (session?.status === 'confirmed' && session.order?.order_number) {
        return (
            <div className="w-full max-w-md bg-white dark:bg-brand-dark rounded-3xl p-8 shadow-sm text-center flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center">
                    <CheckCircleIcon weight="fill" size={48} className="text-secondary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-dark dark:text-text-light">Payment Confirmed!</h1>
                    <p className="text-neutral-gray text-sm mt-1">Your order has been placed and payment received.</p>
                </div>
                <div className="w-full bg-neutral-light dark:bg-brown/20 rounded-2xl p-4 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-neutral-gray">Order number</span>
                        <span className="font-bold text-text-dark dark:text-text-light">{session.order.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-gray">Amount paid</span>
                        <span className="font-bold text-primary">&#8373;{Number(session.total_amount).toFixed(2)}</span>
                    </div>
                </div>
                <div className="w-full flex flex-col gap-3">
                    <Link href={`/orders/${session.order.order_number}`}
                        className="w-full flex items-center justify-between bg-brown dark:bg-primary hover:bg-brown-light text-white font-bold px-6 py-4 rounded-2xl transition-all">
                        <span className="flex items-center gap-2"><ReceiptIcon weight="fill" size={18} /> Track your order</span>
                        <ArrowRightIcon weight="bold" size={18} />
                    </Link>
                    <Link href="/" className="w-full text-center text-sm text-neutral-gray hover:text-primary transition-colors py-2">
                        Back to home
                    </Link>
                </div>
            </div>
        );
    }

    // Failed
    if (session?.status === 'failed') {
        return (
            <div className="w-full max-w-md bg-white dark:bg-brand-dark rounded-3xl p-8 shadow-sm text-center flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircleIcon weight="fill" size={48} className="text-red-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-dark dark:text-text-light">Payment Failed</h1>
                    <p className="text-neutral-gray text-sm mt-1">Your payment could not be completed. Your cart items are still saved.</p>
                </div>
                <PaymentRecoveryActions
                    session={session}
                    onOrderCreated={(orderNumber) => router.push(`/orders/${orderNumber}`)}
                    onAbandoned={() => router.push('/checkout')}
                />
            </div>
        );
    }

    // Expired
    if (session?.status === 'expired' || session?.status === 'abandoned') {
        return (
            <div className="w-full max-w-md bg-white dark:bg-brand-dark rounded-3xl p-8 shadow-sm text-center flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircleIcon weight="fill" size={48} className="text-red-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-dark dark:text-text-light">Session Expired</h1>
                    <p className="text-neutral-gray text-sm mt-1">This payment session has expired. You can retry or start over.</p>
                </div>
                <PaymentRecoveryActions
                    session={session}
                    onOrderCreated={(orderNumber) => router.push(`/orders/${orderNumber}`)}
                    onAbandoned={() => router.push('/checkout')}
                />
            </div>
        );
    }

    // Pending / payment_initiated — still waiting for callback
    return (
        <div className="w-full max-w-md bg-white dark:bg-brand-dark rounded-3xl p-8 shadow-sm text-center flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
                <SpinnerGapIcon size={40} className="text-primary animate-spin" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-text-dark dark:text-text-light">Confirming Payment</h1>
                <p className="text-neutral-gray text-sm mt-2">
                    We&apos;re verifying your payment with Hubtel.<br />
                    This usually takes a few seconds.
                </p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 w-full text-sm text-text-dark dark:text-text-light text-left flex items-start gap-3">
                <DeviceMobileIcon weight="fill" size={18} className="text-primary shrink-0 mt-0.5" />
                <span>If you completed payment, please wait while we confirm it.</span>
            </div>
        </div>
    );
}

export default function CheckoutReturnPage() {
    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker flex items-center justify-center px-4 pt-20 pb-12">
            <Suspense fallback={
                <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
                    <SpinnerGapIcon size={40} className="text-primary animate-spin" />
                </div>
            }>
                <ReturnContent />
            </Suspense>
        </div>
    );
}