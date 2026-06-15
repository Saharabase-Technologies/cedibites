'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EnvelopeIcon, PhoneIcon, ArrowLeftIcon, ArrowRightIcon, SpinnerIcon } from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import StaffAuthShell, { authCardClass } from '@/app/components/auth/StaffAuthShell';
import { staffService } from '@/lib/api/services/staff.service';
import { getErrorMessage } from '@/lib/utils/error-handler';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const isEmail = identifier.includes('@');

    const handleSubmit = async () => {
        if (!identifier.trim()) {
            setError('Please enter your email or phone number.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await staffService.forgotPassword(identifier);
            // Hand off to the reset screen in OTP mode — the link in the
            // email/SMS still works independently for those who prefer it.
            router.push(`/staff/reset-password?identifier=${encodeURIComponent(identifier.trim())}&sent=1`);
        } catch (err) {
            setError(getErrorMessage(err));
            setIsLoading(false);
        }
    };

    return (
        <StaffAuthShell tagline={'Forgot your password?\nWe’ll get you back in.'}>
            <div className={`${authCardClass} animate-scale-in`}>
                <div className="mb-7">
                    <h2 className="text-2xl font-semibold tracking-tight text-text-dark dark:text-text-light">
                        Forgot your password?
                    </h2>
                    <p className="mt-1 text-sm text-neutral-gray">
                        Enter your email or phone and we&apos;ll send you a reset code and link.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 animate-fade-in-down">
                        <p className="text-sm leading-snug text-error">{error}</p>
                    </div>
                )}

                <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} noValidate className="flex flex-col gap-5">
                    <div>
                        <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-text-dark dark:text-neutral-light">
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
                            leftIcon={isEmail
                                ? <EnvelopeIcon size={20} weight="bold" />
                                : <PhoneIcon size={20} weight="bold" />}
                            autoComplete="username"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-1 flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-base font-semibold text-brand-darker transition-all duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isLoading ? (
                            <><SpinnerIcon size={20} weight="bold" className="animate-spin" /> Sending…</>
                        ) : (
                            <>Send Reset Code <ArrowRightIcon size={20} weight="bold" /></>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/staff/login" className="flex items-center justify-center gap-1 text-sm text-neutral-gray transition-colors hover:text-primary">
                        <ArrowLeftIcon size={14} weight="bold" /> Back to Sign In
                    </Link>
                </div>
            </div>
        </StaffAuthShell>
    );
}
