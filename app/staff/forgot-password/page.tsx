'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { EnvelopeIcon, ArrowLeftIcon, ArrowRightIcon, SpinnerIcon, CheckCircleIcon } from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { staffService } from '@/lib/api/services/staff.service';
import { getErrorMessage } from '@/lib/utils/error-handler';

export default function ForgotPasswordPage() {
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        if (!identifier.trim()) {
            setError('Please enter your email or phone number.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await staffService.forgotPassword(identifier);
            setSent(true);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen bg-neutral-light dark:bg-brand-darker flex flex-col items-center justify-center px-4 py-12">

            <div
                className="fixed inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e49925' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
                }}
                aria-hidden="true"
            />

            <div className="relative w-full max-w-md">

                <div className="flex flex-col items-center mb-10">
                    <Image src="/cblogo.webp" alt="CediBites" width={72} height={72} className="mb-4" priority />
                    <h1 className="text-primary text-3xl font-bold font-body tracking-tight">CediBites</h1>
                    <p className="text-neutral-gray text-sm mt-1 font-body">Staff Portal</p>
                </div>

                <div className="dark:bg-brand-dark bg-white/75 rounded-3xl p-8 shadow border border-brown-light/20">

                    {sent ? (
                        <div className="flex flex-col items-center gap-4 text-center py-4">
                            <CheckCircleIcon size={48} weight="fill" className="text-primary" />
                            <h2 className="text-text-dark dark:text-text-light text-xl font-semibold font-body">Check your phone</h2>
                            <p className="text-neutral-gray text-sm font-body leading-relaxed">
                                If an account exists for <span className="font-medium text-text-dark dark:text-text-light">{identifier}</span>, you will receive a reset link via SMS shortly.
                            </p>
                            <Link
                                href="/staff/login"
                                className="mt-2 text-primary text-sm font-medium font-body hover:underline flex items-center gap-1"
                            >
                                <ArrowLeftIcon size={16} weight="bold" />
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h2 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                                    Forgot your password?
                                </h2>
                                <p className="text-neutral-gray text-sm mt-1 font-body">
                                    Enter your email or phone and we'll send you a reset link.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                                    <p className="text-error text-sm font-body leading-snug">{error}</p>
                                </div>
                            )}

                            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} noValidate className="flex flex-col gap-5">
                                <div>
                                    <label htmlFor="identifier" className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                                        Email or Phone <span className="text-primary" aria-hidden="true">*</span>
                                    </label>
                                    <Input
                                        id="identifier"
                                        name="identifier"
                                        type="text"
                                        placeholder="you@cedibites.com or 024 XXX XXXX"
                                        value={identifier}
                                        onChange={val => { setIdentifier(val); setError(''); }}
                                        onEnter={handleSubmit}
                                        leftIcon={<EnvelopeIcon size={20} weight="bold" />}
                                        autoComplete="username"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-2 w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-brand-darker font-semibold font-body py-4 px-6 rounded-full transition-all duration-150 active:scale-[0.98] text-base cursor-pointer"
                                >
                                    {isLoading ? (
                                        <><SpinnerIcon size={20} weight="bold" className="animate-spin" /> Sending...</>
                                    ) : (
                                        <>Send Reset Link <ArrowRightIcon size={20} weight="bold" /></>
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link href="/staff/login" className="text-neutral-gray text-sm font-body hover:text-primary flex items-center justify-center gap-1">
                                    <ArrowLeftIcon size={14} weight="bold" />
                                    Back to Sign In
                                </Link>
                            </div>
                        </>
                    )}
                </div>

                <p className="text-center text-neutral-gray/40 text-xs mt-6 font-body">
                    CediBites &copy; {new Date().getFullYear()} &mdash; Internal Staff Portal
                </p>
            </div>
        </div>
    );
}
