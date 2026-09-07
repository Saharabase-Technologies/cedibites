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
/**
 * What went wrong, in words, and what to do about it.
 *
 * The screen used to say "the payment did not go through" and offer a retry,
 * whatever had happened. Hubtel had told us more than that every time: the
 * reason has been written onto the checkout session by the RMP callback since
 * that callback was built. It just never left the server.
 *
 * The difference matters because the next step is not the same. Somebody whose
 * wallet was short should try again once they have topped up. Somebody whose
 * payment failed because our own merchant account cannot take mobile money
 * should be told to pay cash and not to keep pressing a button that will keep
 * failing.
 */
function explain(session: { status?: string; failure_reason?: string | null; failure_kind?: string | null }): {
    heading: string;
    body: string;
} {
    if (session.status === 'expired') {
        return {
            heading: 'The prompt timed out',
            body: 'Nothing has been charged. Send it again, or pay cash instead.',
        };
    }

    switch (session.failure_kind) {
        case 'customer':
            return {
                heading: 'The payment was not approved',
                body: 'That is usually not enough money on the wallet, a wrong PIN, or the prompt sitting '
                    + 'too long before it was answered. Nothing has been charged. Top up and send it again, '
                    + 'or pay cash instead.',
            };

        case 'number':
            return {
                heading: 'That number could not be charged',
                body: 'Nothing has been charged. Check the number and send it to the right one, or pay cash '
                    + 'instead.',
            };

        case 'ours':
            return {
                heading: 'We could not take the payment',
                body: 'This one is on us, not on you or your wallet. Sending it again will hit the same '
                    + 'problem, so pay cash instead and the order goes through as normal.',
            };

        default:
            return {
                heading: 'The payment did not go through',
                body: session.failure_reason
                    ? `${session.failure_reason} Nothing has been charged.`
                    : 'Nothing has been charged. Send it again, or pay cash instead.',
            };
    }
}

export default function PaymentWait({ sessionToken, onSuccess, onFail, onAbandon }: {
    sessionToken: string;
    onSuccess: (orderNumber: string, trackingToken?: string) => void;
    onFail: (message: string) => void;
    onAbandon: () => void;
}) {
    const { session } = useCheckoutSessionStatus(sessionToken);
    const abandon = useAbandonCheckoutSession();
    const [showRecovery, setShowRecovery] = useState(false);

    useEffect(() => {
        if (!session) return;
        if (session.status === 'confirmed' && session.order?.order_number) {
            onSuccess(session.order.order_number, session.tracking_token);
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
        const { heading, body } = explain(session);

        return (
            <div className="mx-auto flex max-w-sm flex-col items-center py-12 text-center">
                <h2 className="font-brand text-3xl uppercase leading-none tracking-[0.02em] text-fg">
                    {heading}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{body}</p>
                <div className="mt-6 w-full">
                    <PaymentRecoveryActions
                        session={session}
                        onOrderCreated={onSuccess}
                        onAbandoned={onAbandon}
                        leadWithCash={session.failure_kind === 'ours'}
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
