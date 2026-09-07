'use client';

import PaymentRecoveryActions from '@/app/components/order/PaymentRecoveryActions';
import { useAbandonCheckoutSession, useCheckoutSessionStatus } from '@/lib/api/hooks/useCheckoutSession';
import { DeviceMobileIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { Step } from './types';

// ─── Step 3: Payment Processing (polls checkout session) ──────────────────────
export default function StepProcessing({ sessionToken, onSuccess, onFail, onAbandon }: {
    sessionToken: string;
    onSuccess: (orderNumber: string) => void;
    onFail: (message: string) => void;
    onAbandon: () => void;
}) {
    const { session } = useCheckoutSessionStatus(sessionToken);
    const abandon = useAbandonCheckoutSession();
    const [showRecovery, setShowRecovery] = useState(false);

    useEffect(() => {
        if (!session) return;
        if (session.status === 'confirmed' && session.order?.order_number) {
            onSuccess(session.order.order_number);
        } else if (session.status === 'failed' || session.status === 'expired') {
            setShowRecovery(true);
        }
    }, [session, onSuccess, onFail]);

    const handleAbandon = async () => {
        try {
            await abandon.mutateAsync(sessionToken);
        } catch { /* ignore */ }
        onAbandon();
    };

    // Show recovery UI when payment fails or expires
    if (showRecovery && session) {
        const isFailed = session.status === 'failed';
        return (
            <div className="flex flex-col items-center gap-5 py-10 text-center max-w-sm mx-auto">
                <div className={`w-20 h-20 rounded-lg flex items-center justify-center ${isFailed ? 'bg-red-100 dark:bg-red-900/20' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
                    <WarningCircleIcon weight="fill" size={40} className={isFailed ? 'text-red-500' : 'text-amber-500'} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-text-dark dark:text-text-light">
                        {isFailed ? 'Payment Failed' : 'Session Expired'}
                    </h2>
                    <p className="text-sm text-neutral-gray mt-2">
                        {isFailed
                            ? 'Your payment could not be completed. Choose an option below to try again.'
                            : 'Your payment session has expired. You can retry or switch to cash.'}
                    </p>
                </div>

                <PaymentRecoveryActions
                    session={session}
                    onOrderCreated={onSuccess}
                    onAbandoned={onAbandon}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="w-20 h-20 rounded-lg bg-primary/15 flex items-center justify-center">
                <SpinnerGapIcon size={40} className="text-primary animate-spin" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-text-dark dark:text-text-light">Awaiting Payment</h2>
                <p className="text-sm text-neutral-gray mt-2">
                    Complete the payment on the Hubtel page.<br />
                    This page will update automatically once confirmed.
                </p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 w-full max-w-sm text-sm text-text-dark dark:text-text-light text-left flex items-start gap-3">
                <DeviceMobileIcon weight="fill" size={18} className="text-primary shrink-0 mt-0.5" />
                <span>If prompted on your phone, approve the Mobile Money payment to continue.</span>
            </div>
            <button onClick={handleAbandon} disabled={abandon.isPending}
                className="text-sm font-semibold text-neutral-gray hover:text-error transition-colors cursor-pointer mt-2">
                {abandon.isPending ? 'Cancelling...' : 'Cancel & go back'}
            </button>
        </div>
    );
}
