// app/(customer)/orders/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    MagnifyingGlassIcon,
    ClockIcon,
    CheckCircleIcon,
    TruckIcon,
    PackageIcon,
    ArrowRightIcon,
    ReceiptIcon,
    CaretRightIcon,
} from '@phosphor-icons/react';
import Image from 'next/image';
import Navbar from '../../components/layout/Navbar';

export default function TrackOrderPage() {
    const router = useRouter();
    const [orderCode, setOrderCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        // Validate order code format
        const cleanCode = orderCode.trim().toUpperCase();

        if (!cleanCode) {
            setError('Please enter an order code');
            return;
        }

        if (!/^[A-Z]\d{3}$/.test(cleanCode)) {
            setError('Enter a valid order code (e.g., A042)');
            return;
        }

        setIsLoading(true);

        // Navigate to tracking page
        router.push(`/orders/${cleanCode}`);
    };

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker">
            {/* Header */}
            <Navbar />   <header className="border-b border-neutral-gray/20 bg-white dark:bg-brand-dark">
                <div className="w-[90%] md:w-[80%] mx-auto py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-text-dark dark:text-text-light hover:text-primary transition-colors"
                    >
                        <Image
                            src="/images/logo.png"
                            alt="CediBites"
                            width={32}
                            height={32}
                            className="w-8 h-8"
                        />
                        <span className="font-bold text-lg">CediBites</span>
                    </button>

                </div>
            </header>

            {/* Main Content */}
            <main className="w-[90%] md:w-[600px] mx-auto py-12 md:py-20">


                <div className='w-full flex justify-end mb-8'>
                    <button
                        onClick={() => router.push('/order-history')}
                        className="text-base flex items-center cursor-pointer font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
                    >
                        View Order History
                        <span><CaretRightIcon /></span>
                    </button>
                </div>
                {/* Hero Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                        <PackageIcon size={40} weight="duotone" className="text-primary" />
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-text-dark dark:text-text-light mb-3">
                        Track Your Order
                    </h1>

                    <p className="text-base md:text-lg text-neutral-gray max-w-md mx-auto">
                        Enter your order code to see real-time updates on your delivery
                    </p>
                </div>

                {/* Search Form */}
                <form onSubmit={handleSubmit} className="mb-12">
                    <div className="relative">
                        <MagnifyingGlassIcon
                            size={24}
                            weight="bold"
                            className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-gray"
                        />
                        <input
                            type="text"
                            value={orderCode}
                            onChange={(e) => {
                                setOrderCode(e.target.value.toUpperCase());
                                setError('');
                            }}
                            placeholder="Enter order code (e.g., A042)"
                            className="w-full pl-16 pr-6 py-5 bg-neutral-light  dark:bg-brand-dark border-2 border-neutral-gray/30 focus:border-primary rounded-full text-text-dark dark:text-text-light placeholder:text-neutral-gray transition-all outline-none text-lg font-medium"
                            maxLength={4}
                        />
                    </div>

                    {error && (
                        <div className="mt-3 px-4 py-3 bg-error/10 border border-error/20 rounded-xl">
                            <p className="text-sm font-medium text-error">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !orderCode.trim()}
                        className="w-full mt-4 bg-primary hover:bg-primary-hover text-white font-bold py-4 px-6 rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Tracking...
                            </>
                        ) : (
                            <>
                                Track Order
                                <ArrowRightIcon size={20} weight="bold" />
                            </>
                        )}
                    </button>

                </form>

                {/* How It Works */}
                <div className="bg-white dark:bg-brand-dark rounded-2xl p-6 md:p-8 border border-neutral-gray/10">
                    <h2 className="text-xl font-bold text-text-dark dark:text-text-light mb-6">
                        How to Find Your Order Code
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                <ReceiptIcon size={24} weight="fill" className="text-neutral-gray" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-dark dark:text-text-light mb-1">
                                    Check Your SMS
                                </h3>
                                <p className="text-sm text-neutral-gray">
                                    We sent your order code via text message when you placed your order
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                <ReceiptIcon size={24} weight="fill" className="text-neutral-gray" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-dark dark:text-text-light mb-1">
                                    Check Your Email
                                </h3>
                                <p className="text-sm text-neutral-gray">
                                    Your order confirmation email contains your tracking code
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                <ReceiptIcon size={24} weight="fill" className="text-neutral-gray" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-dark dark:text-text-light mb-1">
                                    On Your Receipt
                                </h3>
                                <p className="text-sm text-neutral-gray">
                                    Walk-in orders have the code printed on your receipt
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* What You'll See */}
                <div className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6 md:p-8 border border-primary/10">
                    <h2 className="text-xl font-bold text-text-dark dark:text-text-light mb-6">
                        Track Every Step
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                <CheckCircleIcon size={24} weight="fill" className="text-neutral-gray" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-dark dark:text-text-light">
                                    Order Confirmed
                                </h3>
                                <p className="text-sm text-neutral-gray">
                                    We've received your order
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                <ClockIcon size={24} weight="fill" className="text-neutral-gray" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-dark dark:text-text-light">
                                    Preparing
                                </h3>
                                <p className="text-sm text-neutral-gray">
                                    Our kitchen is cooking your food
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                <TruckIcon size={24} weight="fill" className="text-neutral-gray" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-dark dark:text-text-light">
                                    Out for Delivery
                                </h3>
                                <p className="text-sm text-neutral-gray">
                                    Live tracking with real-time location
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                <CheckCircleIcon size={24} weight="fill" className="text-neutral-gray" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-dark dark:text-text-light">
                                    Delivered
                                </h3>
                                <p className="text-sm text-neutral-gray">
                                    Enjoy your meal!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Help Section */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-neutral-gray mb-3">
                        Can't find your order code?
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">

                        <a
                            href="tel:+233501234567"
                            className="text-primary hover:text-primary-hover font-semibold text-sm hover:underline"
                        >
                            Call Support: +233 50 123 4567
                        </a>
                        <span className="hidden sm:inline text-neutral-gray">•</span>

                    </div>
                </div>
            </main >
        </div >
    );
}
