'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    EnvelopeIcon,
    LockKeyIcon,
    ArrowRightIcon,
    WarningCircleIcon,
    SpinnerIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import Input from '@/app/components/base/Input';
import { useStaffAuth, permissionsHomeRoute } from '@/app/components/providers/StaffAuthProvider';
import { staffService } from '@/lib/api/services/staff.service';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginField = 'identifier' | 'password';

interface FormState {
    identifier: string;
    password: string;
}

interface FormErrors {
    identifier?: string;
    password?: string;
    global?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormState): FormErrors {
    const errors: FormErrors = {};

    if (!form.identifier.trim()) {
        errors.identifier = 'Email or phone number is required';
    } else {
        const isEmail = form.identifier.includes('@');
        const isPhone = isValidGhanaPhone(form.identifier);
        if (!isEmail && !isPhone) {
            errors.identifier = 'Enter a valid email or Ghanaian phone number';
        }
    }

    if (!form.password) {
        errors.password = 'Password is required';
    } else if (form.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
    }

    return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffLoginPage() {
    const router = useRouter();
    const { login } = useStaffAuth();

    const [form, setForm] = useState<FormState>({ identifier: '', password: '' });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Set<LoginField>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    // ── Field change ──
    const handleChange = useCallback((field: LoginField) => (value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (touched.has(field)) {
            setErrors(prev => ({ ...prev, [field]: undefined, global: undefined }));
        }
    }, [touched]);

    // ── Field blur — validate on leave ──
    const handleBlur = useCallback((field: LoginField) => () => {
        setTouched(prev => new Set(prev).add(field));
        const fieldErrors = validate(form);
        setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }, [form]);

    // ── Submit ──
    const submitForm = async () => {
        setTouched(new Set(['identifier', 'password']));
        const fieldErrors = validate(form);

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const rawIdentifier = form.identifier.trim();
            const identifier = isValidGhanaPhone(rawIdentifier)
                ? normalizeGhanaPhone(rawIdentifier)
                : rawIdentifier;
            const { user } = await staffService.login(identifier, form.password);
            login(user);
            if (user.must_reset_password) {
                router.replace('/staff/change-password');
            } else {
                router.replace(permissionsHomeRoute(user.permissions ?? []));
            }

        } catch (err) {
            setErrors({
                global: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // ── Derived ──
    const showIdentifierError = touched.has('identifier') && !!errors.identifier;
    const showPasswordError = touched.has('password') && !!errors.password;

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="h-screen bg-neutral-light dark:bg-brand-darker flex flex-col items-center justify-center px-4 py-12">

            {/* Subtle background texture */}
            <div
                className="fixed inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e49925' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
                }}
                aria-hidden="true"
            />

            <div className="relative w-full max-w-md">

                {/* Logo block */}
                <div className="flex flex-col items-center mb-10">
                    <Image
                        src="/cblogo.webp"
                        alt="CediBites"
                        width={72}
                        height={72}
                        className="mb-4"
                        priority
                    />
                    <h1 className="text-primary text-3xl font-bold font-body tracking-tight">CediBites</h1>
                    <p className="text-neutral-gray text-sm mt-1 font-body">Staff Portal</p>
                </div>

                {/* Login card */}
                <div className="dark:bg-brand-dark bg-white/75 rounded-3xl p-8 shadow border border-brown-light/20">

                    <div className="mb-8">
                        <h2 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                            Welcome Back
                        </h2>
                        <p className="text-neutral-gray text-sm mt-1 font-body">
                            Sign in with the credentials your admin provided.
                        </p>
                    </div>

                    {/* Global error banner */}
                    {errors.global && (
                        <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                            <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                            <p className="text-error text-sm font-body leading-snug">{errors.global}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={e => { e.preventDefault(); submitForm(); }} noValidate className="flex flex-col gap-5">

                        {/* Email / Phone */}
                        <div>
                            <label
                                htmlFor="identifier"
                                className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body"
                            >
                                Email or Phone <span className="text-primary" aria-hidden="true">*</span>
                            </label>
                            <Input
                                id="identifier"
                                name="identifier"
                                type="text"
                                placeholder="you@cedibites.com or 024 XXX XXXX"
                                value={form.identifier}
                                onChange={handleChange('identifier')}
                                onBlur={handleBlur('identifier')}
                                onEnter={submitForm}
                                leftIcon={<EnvelopeIcon size={20} weight="bold" />}
                                errorText={showIdentifierError ? errors.identifier : undefined}
                                autoComplete="username"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body"
                            >
                                Password <span className="text-primary" aria-hidden="true">*</span>
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange('password')}
                                onBlur={handleBlur('password')}
                                onEnter={submitForm}
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={showPasswordError ? errors.password : undefined}
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {/* Forgot password */}
                        <div className="text-right -mt-1">
                            <Link
                                href="/staff/forgot-password"
                                className="text-neutral-gray text-xs font-body hover:text-primary transition-colors"
                            >
                                Forgot your password?
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="
                mt-2 w-full flex items-center justify-center gap-3
                bg-primary hover:bg-primary-hover
                disabled:opacity-60 disabled:cursor-not-allowed
                text-brand-darker font-semibold font-body
                py-4 px-6 rounded-full
                transition-all duration-150 active:scale-[0.98]
                text-base cursor-pointer
              "
                        >
                            {isLoading ? (
                                <>
                                    <SpinnerIcon size={20} weight="bold" className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRightIcon size={20} weight="bold" />
                                </>
                            )}
                        </button>

                    </form>


                </div>

                {/* Footer stamp */}
                <p className="text-center text-neutral-gray/40 text-xs mt-6 font-body">
                    CediBites &copy; {new Date().getFullYear()} &mdash; Internal Staff Portal
                </p>

            </div>
        </div>
    );
}
