'use client';

import PaymentRecoveryActions from '@/app/components/order/PaymentRecoveryActions';
import { useAbandonCheckoutSession, useCheckoutSessionStatus } from '@/lib/api/hooks/useCheckoutSession';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

/**
 * Waiting on Hubtel.
 *
 * A state, not a step, which is why there is no back arrow and no progress
 * line. The only two ways out are the payment landing or the customer giving
 * up, and giving up has to cancel the session rather than just navigating away
 * from it.
 */
export default function PaymentWait({ sessionToken, onSuccess, onFail, onAbandon }: {
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
        } catch { /* the session expires on its own soon enough */ }
        onAbandon();
    };

    if (showRecovery && session) {
        const failed = session.status === 'failed';
        return (
            <div className="mx-auto flex max-w-sm flex-col items-center py-12 text-center">
                <h2 className="font-brand text-3xl uppercase leading-none tracking-[0.02em] text-fg">
                    {failed ? 'The payment did not go through' : 'That took too long'}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                    {failed
                        ? 'Nothing has been charged. Try it again, or pay cash instead.'
                        : 'The payment window closed before it was confirmed. Nothing has been charged.'}
                </p>
                <div className="mt-6 w-full">
                    <PaymentRecoveryActions
                        session={session}
                        onOrderCreated={onSuccess}
                        onAbandoned={onAbandon}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
            <SpinnerGapIcon size={30} className="animate-spin text-fg-subtle" />

            <h2 className="mt-6 font-brand text-3xl uppercase leading-none tracking-[0.02em] text-fg">
                Approve it on your phone
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                A prompt is on its way to your Mobile Money number. Enter your PIN there and this page
                will carry on by itself.
            </p>

            <button
                onClick={handleAbandon}
                disabled={abandon.isPending}
                className="mt-8 text-[13px] font-bold text-fg-muted underline underline-offset-4 transition-colors duration-150 ease-out hover:text-fg disabled:opacity-50"
            >
                {abandon.isPending ? 'Cancelling' : 'Cancel and go back'}
            </button>
        </div>
    );
}
