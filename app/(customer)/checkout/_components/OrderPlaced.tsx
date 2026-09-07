'use client';

import { useAuth } from '@/app/components/providers/AuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { ArrowRightIcon, CheckIcon } from '@phosphor-icons/react';
import { BellIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { pushSupported, subscribeToOrderUpdates } from '@/lib/orders/orderPush';
import { useEffect, useState } from 'react';
import { controlClass } from './Field';
import type { ContactDetails, OrderType } from './types';

/**
 * The receipt.
 *
 * The order number is the biggest thing on the screen, because it is the one
 * thing somebody reads out on the phone when they ring the branch. Everything
 * else on this page used to compete with it: a tick in a green circle with a
 * bag badged onto it, a card of three labelled rows, a tinted SMS box, then a
 * bordered prompt with an icon tile and a preview of the name and number that
 * had just been typed in.
 */
export default function OrderPlaced({ orderNumber, orderType, contact, trackingToken }: {
    orderNumber: string;
    orderType: OrderType;
    contact: ContactDetails;
    /** The secret half of the tracking link, needed to turn on notifications. */
    trackingToken?: string;
}) {
    const { isLoggedIn, requestCheckoutSaveOTP, confirmCheckoutSaveOTP } = useAuth();
    const { selectedBranch } = useBranch();

    // Claiming the account behind this number carries its past orders and
    // addresses with it, so it goes through an OTP rather than trusting that
    // whoever typed the number owns it.
    const [push, setPush] = useState<'offer' | 'asking' | 'on' | 'blocked' | 'failed'>('offer');

    const [state, setState] = useState<'idle' | 'sending' | 'code' | 'verifying' | 'saved'>(
        isLoggedIn ? 'saved' : 'idle',
    );
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [resendIn, setResendIn] = useState(0);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    const sendCode = async () => {
        setState('sending');
        setError(null);
        const result = await requestCheckoutSaveOTP(contact.phone);
        if (!result.success) {
            setError(result.error ?? 'The code did not send. Try again.');
            setState('idle');
            return;
        }
        setCode('');
        setResendIn(30);
        setState('code');
    };

    const submitCode = async () => {
        if (code.length !== 6) return;
        setState('verifying');
        setError(null);
        const result = await confirmCheckoutSaveOTP(contact.name, contact.phone, code);
        if (!result.success) {
            setError(result.error ?? 'That code did not work.');
            setState('code');
            return;
        }
        setState('saved');
    };

    const where = orderType === 'delivery'
        ? contact.address
        : selectedBranch ? `${selectedBranch.name}, ${selectedBranch.address}` : 'the branch';

    return (
        <div className="mx-auto max-w-md py-10">

            {/* The number, first and loudest. */}
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-fg-muted">Order</p>
            <p className="mt-1 font-brand text-6xl uppercase leading-none tracking-[0.01em] text-fg">
                {orderNumber}
            </p>

            <p className="mt-5 text-sm leading-relaxed text-fg">
                {orderType === 'delivery'
                    ? <>The kitchen at {selectedBranch?.name ?? 'the branch'} has it. A rider will bring it to {where}.</>
                    : <>The kitchen at {selectedBranch?.name ?? 'the branch'} has it. Collect it from {where}.</>}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                Updates on your order go to {contact.phone} by SMS.
            </p>

            <div className="mt-8 flex flex-col gap-3">
                <Link
                    href={`/orders/${orderNumber}`}
                    className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-primary-fill px-5 text-[15px] font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                >
                    Track my order <ArrowRightIcon size={16} weight="bold" />
                </Link>
                <Link
                    href="/menu"
                    className="flex min-h-11 items-center justify-center text-[13px] font-bold text-fg-muted underline underline-offset-4 transition-colors duration-150 ease-out hover:text-fg"
                >
                    Back to the menu
                </Link>
            </div>

            {/* ── Being told when it moves ─────────────────────────────────── */}
            {trackingToken && pushSupported() && push !== 'blocked' && (
                <div className="mt-10 border-t border-hairline pt-6">
                    {push === 'on' ? (
                        <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                            <CheckIcon size={14} weight="bold" className="shrink-0 text-success-ink" />
                            Your phone will tell you when this order moves.
                        </p>
                    ) : (
                        <>
                            <h2 className="font-brand text-2xl uppercase leading-none tracking-[0.01em] text-fg">
                                Know the moment it moves
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-fg">
                                A buzz when the kitchen starts, and another when the rider leaves. No app to
                                install.
                            </p>
                            {push === 'failed' && (
                                <p className="mt-2.5 text-[13px] font-semibold text-danger-ink">
                                    That did not take. The SMS still comes either way.
                                </p>
                            )}
                            <button
                                onClick={async () => {
                                    setPush('asking');
                                    const result = await subscribeToOrderUpdates(orderNumber, trackingToken);
                                    setPush(result === 'subscribed' ? 'on'
                                        : result === 'denied' ? 'blocked'
                                            : 'failed');
                                }}
                                disabled={push === 'asking'}
                                className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-fg px-5 text-[15px] font-bold text-white transition-opacity duration-150 ease-out hover:opacity-90 disabled:opacity-60"
                            >
                                <BellIcon size={17} weight="fill" />
                                {push === 'asking' ? 'Just a moment' : 'Notify me on this phone'}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ── Claiming the account ─────────────────────────────────────── */}
            {state === 'idle' && (
                <div className="mt-10 border-t border-hairline pt-6">
                    <h2 className="font-brand text-2xl uppercase leading-none tracking-[0.01em] text-fg">
                        Become a CediBiter
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-fg">
                        Next order takes two taps. Deals, discounts and packages put together for CediBiters.
                    </p>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">
                        We send a code to {contact.phone} to check the number is yours.
                    </p>
                    {error && <p className="mt-2.5 text-[13px] font-semibold text-danger-ink">{error}</p>}
                    <button
                        onClick={sendCode}
                        className="mt-4 flex min-h-13 w-full items-center justify-center rounded-xl bg-surface-sunken px-5 text-[15px] font-bold text-fg transition-opacity duration-150 ease-out hover:opacity-80"
                    >
                        Claim my account
                    </button>
                </div>
            )}

            {state === 'sending' && (
                <p className="mt-10 border-t border-hairline pt-6 text-[13px] text-fg-muted">Sending the code.</p>
            )}

            {(state === 'code' || state === 'verifying') && (
                <div className="mt-10 border-t border-hairline pt-6">
                    <h2 className="font-brand text-[15px] uppercase leading-none tracking-[0.04em] text-fg">
                        The code we sent to {contact.phone}
                    </h2>

                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        disabled={state === 'verifying'}
                        onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') submitCode(); }}
                        placeholder="000000"
                        className={`${controlClass} mt-4 text-center text-lg font-bold tracking-[0.4em] tabular-nums disabled:opacity-60`}
                    />

                    {error && <p className="mt-2.5 text-[13px] font-semibold text-danger-ink">{error}</p>}

                    <div className="mt-4 flex items-center gap-5">
                        <button
                            onClick={submitCode}
                            disabled={code.length !== 6 || state === 'verifying'}
                            className="min-h-11 rounded-xl bg-surface-sunken px-5 text-sm font-bold text-fg transition-opacity duration-150 ease-out hover:opacity-80 disabled:text-fg-subtle disabled:hover:opacity-100"
                        >
                            {state === 'verifying' ? 'Checking' : 'Confirm'}
                        </button>
                        <button
                            onClick={sendCode}
                            disabled={resendIn > 0 || state === 'verifying'}
                            className="text-[13px] font-bold text-fg-muted underline underline-offset-4 transition-colors duration-150 ease-out hover:text-fg disabled:no-underline disabled:hover:text-fg-muted"
                        >
                            {resendIn > 0 ? `Send another in ${resendIn}s` : 'Send another'}
                        </button>
                    </div>
                </div>
            )}

            {state === 'saved' && !isLoggedIn && (
                <p className="mt-10 flex items-center gap-2 border-t border-hairline pt-6 text-[13px] font-semibold text-fg">
                    <CheckIcon size={14} weight="bold" className="shrink-0 text-success-ink" />
                    You are a CediBiter. Every order you place is yours to see.
                </p>
            )}
        </div>
    );
}
