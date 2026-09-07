'use client';

import { useAuth } from '@/app/components/providers/AuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { ArrowRightIcon, CheckCircleIcon, ShoppingBagIcon, SparkleIcon, UserCircleIcon, XIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ContactDetails, OrderType, Step } from './types';

// ─── Step 4 ───────────────────────────────────────────────────────────────────
export default function StepDone({ orderNumber, orderType, contact }: {
    orderNumber: string; orderType: OrderType; contact: ContactDetails;
}) {
    const { isLoggedIn, requestCheckoutSaveOTP, confirmCheckoutSaveOTP } = useAuth();
    const { selectedBranch } = useBranch();
    // Saving the details means claiming the account behind this number, which
    // carries its past orders and addresses — so it goes through an OTP rather
    // than trusting that whoever typed the number owns it.
    const [promptState, setPromptState] = useState<'idle' | 'sending' | 'code' | 'verifying' | 'saved' | 'dismissed'>(
        isLoggedIn ? 'saved' : 'idle'
    );
    const [code, setCode] = useState('');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [resendIn, setResendIn] = useState(0);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    const sendCode = async () => {
        setPromptState('sending');
        setSaveError(null);
        const result = await requestCheckoutSaveOTP(contact.phone);
        if (!result.success) {
            setSaveError(result.error ?? 'Could not send the code. Please try again.');
            setPromptState('idle');
            return;
        }
        setCode('');
        setResendIn(30);
        setPromptState('code');
    };

    const submitCode = async () => {
        if (code.length !== 6) return;
        setPromptState('verifying');
        setSaveError(null);
        const result = await confirmCheckoutSaveOTP(contact.name, contact.phone, code);
        if (!result.success) {
            setSaveError(result.error ?? 'That code did not work. Please try again.');
            setPromptState('code');
            return;
        }
        setPromptState('saved');
    };

    return (
        <div className="flex flex-col items-center gap-6 py-8 text-center">
            {/* Success icon */}
            <div className="relative">
                <div className="w-24 h-24 rounded-lg bg-secondary/15 flex items-center justify-center">
                    <CheckCircleIcon weight="fill" size={52} className="text-secondary" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <ShoppingBagIcon weight="fill" size={16} className="text-white" />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-text-dark dark:text-text-light">Order Placed!</h2>
                <p className="text-neutral-gray mt-1">Your delicious food is being prepared</p>
            </div>

            {/* Order details card */}
            <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 w-full shadow-sm flex flex-col gap-3 text-left">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-gray">Order Number</span>
                    <span className="text-base font-bold text-primary font-mono">#{orderNumber}</span>
                </div>
                <div className="h-px bg-neutral-gray/10" />
                <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-gray shrink-0">{orderType === 'delivery' ? 'Delivering to' : 'Pickup at'}</span>
                    <span className="text-sm font-semibold text-text-dark dark:text-text-light text-right truncate">
                        {orderType === 'delivery' ? contact.address || 'Delivery address' : selectedBranch ? `${selectedBranch.name} Branch` : 'Branch'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-gray">Estimated Time</span>
                    <span className="text-sm font-semibold text-text-dark dark:text-text-light">
                        {orderType === 'delivery' ? '25-40 mins' : '15-20 mins'}
                    </span>
                </div>
            </div>

            {/* SMS confirmation */}
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 w-full text-sm text-text-dark dark:text-text-light text-left">
                Confirmation SMS sent to <strong>{contact.phone}</strong> with your tracking link.
            </div>

            {/* ── Post-order save prompt ── */}
            {promptState === 'idle' && (
                <div className="w-full bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm border border-primary/15 relative">
                    <button onClick={() => setPromptState('dismissed')}
                        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-neutral-gray/10 transition-colors cursor-pointer">
                        <XIcon size={13} weight="bold" className="text-neutral-gray" />
                    </button>
                    <div className="flex items-start gap-3 mb-4 text-left">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                            <SparkleIcon weight="fill" size={18} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-text-dark dark:text-text-light">Save your info for next time?</p>
                            <p className="text-xs text-neutral-gray mt-0.5">Faster checkout. Your name and number are filled in automatically.</p>
                        </div>
                    </div>
                    {/* Pre-filled preview */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-light dark:bg-brown/30 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                            <UserCircleIcon weight="fill" size={22} className="text-primary" />
                        </div>
                        <div className="text-left min-w-0">
                            <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{contact.name}</p>
                            <p className="text-xs text-neutral-gray">{contact.phone}</p>
                        </div>
                    </div>
                    {saveError && (
                        <p className="text-xs text-error mb-3 text-left">{saveError}</p>
                    )}
                    <button onClick={sendCode}
                        className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold text-sm transition-all active:scale-[0.98] cursor-pointer">
                        Yes, save my info
                    </button>
                </div>
            )}

            {promptState === 'sending' && (
                <div className="w-full bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm flex items-center justify-center gap-2 text-sm text-neutral-gray">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Sending your code...
                </div>
            )}

            {/* ── Code entry ── */}
            {(promptState === 'code' || promptState === 'verifying') && (
                <div className="w-full bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm border border-primary/15 relative">
                    <button onClick={() => setPromptState('dismissed')}
                        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-neutral-gray/10 transition-colors cursor-pointer">
                        <XIcon size={13} weight="bold" className="text-neutral-gray" />
                    </button>
                    <div className="text-left mb-4">
                        <p className="text-sm font-bold text-text-dark dark:text-text-light">Enter the code we sent</p>
                        <p className="text-xs text-neutral-gray mt-0.5">
                            Sent to <strong>{contact.phone}</strong>. This confirms the number is yours.
                        </p>
                    </div>

                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        disabled={promptState === 'verifying'}
                        onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setSaveError(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') submitCode(); }}
                        placeholder="------"
                        className="w-full h-12 text-center tracking-[0.5em] font-mono text-lg rounded-xl bg-neutral-light dark:bg-brown/30 text-text-dark dark:text-text-light border border-neutral-gray/20 focus:border-primary/50 outline-none transition-colors disabled:opacity-60"
                    />

                    {saveError && (
                        <p className="text-xs text-error mt-2 text-left">{saveError}</p>
                    )}

                    <button
                        onClick={submitCode}
                        disabled={code.length !== 6 || promptState === 'verifying'}
                        className="w-full mt-4 py-3 rounded-xl bg-secondary hover:bg-secondary/90 disabled:bg-neutral-gray/30 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                    >
                        {promptState === 'verifying' && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {promptState === 'verifying' ? 'Confirming...' : 'Confirm'}
                    </button>

                    <button
                        onClick={sendCode}
                        disabled={resendIn > 0 || promptState === 'verifying'}
                        className="w-full mt-2 py-2 text-xs font-semibold text-neutral-gray hover:text-primary disabled:hover:text-neutral-gray disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                    </button>
                </div>
            )}

            {(promptState === 'saved' || promptState === 'dismissed') && promptState === 'saved' && (
                <div className="w-full bg-secondary/10 border border-secondary/20 rounded-2xl p-4 flex items-center gap-3 text-left">
                    <CheckCircleIcon weight="fill" size={20} className="text-secondary shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-text-dark dark:text-text-light">
                            {isLoggedIn ? "You're already signed in" : "Saved, you're signed in"}
                        </p>
                        <p className="text-xs text-neutral-gray">
                            {isLoggedIn ? 'Your info is pre-filled on every order.' : 'Your next checkout will be instant, and your order history is now yours.'}
                        </p>
                    </div>
                </div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-col gap-3 w-full">
                <Link href={`/orders/${orderNumber}`}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]">
                    Track My Order <ArrowRightIcon weight="bold" size={16} />
                </Link>
                <Link href="/"
                    className="flex items-center justify-center text-sm font-semibold text-neutral-gray hover:text-primary transition-colors py-2">
                    Back to Menu
                </Link>
            </div>
        </div>
    );
}
