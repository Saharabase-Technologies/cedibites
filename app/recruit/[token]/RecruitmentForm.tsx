'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
    UserIcon,
    PhoneIcon,
    EnvelopeSimpleIcon,
    LockKeyIcon,
    IdentificationCardIcon,
    WarningCircleIcon,
    CheckCircleIcon,
    SpinnerIcon,
} from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { recruitmentService } from '@/lib/api/services/recruitment.service';
import type { ApplicationFormPayload, RecruitmentPosting } from '@/types/recruitment';

type FormState = {
    name: string;
    phone: string;
    phoneConfirm: string;
    email: string;
    password: string;
    passwordConfirm: string;
    dateOfBirth: string;
    nationality: string;
    ghanaCard: string;
    ssnit: string;
    tin: string;
    emergencyName: string;
    emergencyPhone: string;
    emergencyRelationship: string;
};

const EMPTY: FormState = {
    name: '', phone: '', phoneConfirm: '', email: '',
    password: '', passwordConfirm: '',
    dateOfBirth: '', nationality: '', ghanaCard: '', ssnit: '', tin: '',
    emergencyName: '', emergencyPhone: '', emergencyRelationship: '',
};

/** Digits only, so 024… and +233… compare equal the way the server compares them. */
function samePhone(a: string, b: string): boolean {
    const digits = (v: string) => v.replace(/\D/g, '').replace(/^233/, '').replace(/^0/, '');
    return digits(a) === digits(b);
}

export function RecruitmentForm({ token }: { token: string }) {
    const [posting, setPosting] = useState<RecruitmentPosting | null>(null);
    const [loading, setLoading] = useState(true);
    const [closed, setClosed] = useState(false);

    const [form, setForm] = useState<FormState>(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        let cancelled = false;

        recruitmentService
            .getPosting(token)
            .then((p) => { if (!cancelled) setPosting(p); })
            // Expired and never-existed answer identically by design; there is
            // nothing to tell apart, so there is one screen for both.
            .catch(() => { if (!cancelled) setClosed(true); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [token]);

    function set<K extends keyof FormState>(key: K) {
        return (value: string) => setForm((f) => ({ ...f, [key]: value }));
    }

    function validate(): boolean {
        const e: Record<string, string> = {};

        if (!form.name.trim()) e.name = 'Please tell us your name';

        if (!form.phone.trim()) e.phone = 'A phone number is required';
        else if (form.phone.replace(/\D/g, '').length < 9) e.phone = 'That does not look like a full phone number';

        if (!samePhone(form.phone, form.phoneConfirm)) e.phoneConfirm = 'The two numbers do not match';

        if (!form.password) e.password = 'Please choose a password';
        else if (form.password.length < 8) e.password = 'At least 8 characters';

        if (form.password !== form.passwordConfirm) e.passwordConfirm = 'The two passwords do not match';

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setErrors({});

        const payload: ApplicationFormPayload = {
            name: form.name.trim(),
            phone: form.phone.trim(),
            phone_confirmation: form.phoneConfirm.trim(),
            password: form.password,
            password_confirmation: form.passwordConfirm,
            ...(form.email.trim() ? { email: form.email.trim() } : {}),
            ...(form.dateOfBirth ? { date_of_birth: form.dateOfBirth } : {}),
            ...(form.nationality.trim() ? { nationality: form.nationality.trim() } : {}),
            ...(form.ghanaCard.trim() ? { ghana_card_id: form.ghanaCard.trim() } : {}),
            ...(form.ssnit.trim() ? { ssnit_number: form.ssnit.trim() } : {}),
            ...(form.tin.trim() ? { tin_number: form.tin.trim() } : {}),
            ...(form.emergencyName.trim() ? { emergency_contact_name: form.emergencyName.trim() } : {}),
            ...(form.emergencyPhone.trim() ? { emergency_contact_phone: form.emergencyPhone.trim() } : {}),
            ...(form.emergencyRelationship.trim()
                ? { emergency_contact_relationship: form.emergencyRelationship.trim() }
                : {}),
        };

        try {
            await recruitmentService.submitApplication(token, payload);
            setSubmitted(true);
        } catch (err) {
            const fieldErrors = (err as { errors?: Record<string, string[]> })?.errors;

            if (fieldErrors) {
                setErrors(
                    Object.fromEntries(
                        Object.entries(fieldErrors).map(([field, messages]) => [
                            field === 'phone_confirmation' ? 'phoneConfirm' : field,
                            messages[0],
                        ]),
                    ),
                );
            } else {
                setErrors({
                    global: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
                });
            }
        } finally {
            setSubmitting(false);
        }
    }

    // ─── States ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <Shell>
                <div className="flex items-center justify-center gap-3 py-16 text-neutral-gray font-body">
                    <SpinnerIcon size={22} className="animate-spin" />
                    Loading…
                </div>
            </Shell>
        );
    }

    if (closed || !posting) {
        return (
            <Shell>
                <Card>
                    <div className="flex flex-col items-center text-center py-6">
                        <WarningCircleIcon size={44} weight="fill" className="text-neutral-gray mb-4" />
                        <h2 className="text-text-dark dark:text-text-light text-xl font-semibold font-body">
                            This link is no longer open
                        </h2>
                        <p className="text-neutral-gray text-sm mt-2 font-body max-w-sm">
                            Recruitment for this position has closed. If you think this is a mistake, get back in
                            touch with whoever sent you the link.
                        </p>
                    </div>
                </Card>
            </Shell>
        );
    }

    if (submitted) {
        return (
            <Shell>
                <Card>
                    <div className="flex flex-col items-center text-center py-6">
                        <CheckCircleIcon size={44} weight="fill" className="text-secondary mb-4" />
                        <h2 className="text-text-dark dark:text-text-light text-xl font-semibold font-body">
                            Thanks — we&rsquo;ve got your details
                        </h2>
                        {/* No status, no timeline, no way to check back. Nothing exists
                            yet and the page must not imply otherwise. */}
                        <p className="text-neutral-gray text-sm mt-2 font-body max-w-sm">
                            We&rsquo;ll be in touch on the number you gave us.
                        </p>
                    </div>
                </Card>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="mb-6 text-center">
                <p className="text-neutral-gray text-sm font-body">Applying to</p>
                <h2 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                    {posting.posting}
                </h2>
                {posting.label && (
                    <p className="text-neutral-gray text-sm mt-1 font-body">{posting.label}</p>
                )}
            </div>

            <Card>
                {errors.global && (
                    <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                        <p className="text-error text-sm font-body leading-snug">{errors.global}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
                    <Section title="Your details">
                        <Field label="Full name" required error={errors.name}>
                            <Input
                                value={form.name}
                                onChange={set('name')}
                                placeholder="As it appears on your Ghana Card"
                                leftIcon={<UserIcon size={20} weight="bold" />}
                                errorText={errors.name}
                                autoComplete="name"
                            />
                        </Field>

                        <Field
                            label="Phone number"
                            required
                            error={errors.phone}
                            /* There is no verification code by decision, so this
                               sentence is what stands in for one. */
                            hint="Use a number you can actually answer. This is how we reach you about the job, and how you reset your password."
                        >
                            <Input
                                type="tel"
                                value={form.phone}
                                onChange={set('phone')}
                                placeholder="024 123 4567"
                                leftIcon={<PhoneIcon size={20} weight="bold" />}
                                errorText={errors.phone}
                                autoComplete="tel"
                            />
                        </Field>

                        <Field label="Confirm phone number" required error={errors.phoneConfirm}>
                            <Input
                                type="tel"
                                value={form.phoneConfirm}
                                onChange={set('phoneConfirm')}
                                placeholder="Type it again"
                                leftIcon={<PhoneIcon size={20} weight="bold" />}
                                errorText={errors.phoneConfirm}
                            />
                        </Field>

                        <Field label="Email" error={errors.email} hint="Optional, but useful as a backup.">
                            <Input
                                type="email"
                                value={form.email}
                                onChange={set('email')}
                                placeholder="you@example.com"
                                leftIcon={<EnvelopeSimpleIcon size={20} weight="bold" />}
                                errorText={errors.email}
                                autoComplete="email"
                            />
                        </Field>
                    </Section>

                    <Section
                        title="Choose a password"
                        note="If you're taken on, this is the password you'll sign in with. Nobody here can read it back to you, so pick something you'll remember."
                    >
                        <Field label="Password" required error={errors.password}>
                            <Input
                                type="password"
                                value={form.password}
                                onChange={set('password')}
                                placeholder="At least 8 characters"
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={errors.password}
                                autoComplete="new-password"
                            />
                        </Field>

                        <Field label="Confirm password" required error={errors.passwordConfirm}>
                            <Input
                                type="password"
                                value={form.passwordConfirm}
                                onChange={set('passwordConfirm')}
                                placeholder="Type it again"
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={errors.passwordConfirm}
                                autoComplete="new-password"
                            />
                        </Field>
                    </Section>

                    <Section title="About you" note="All optional — leave anything blank if you don't have it to hand.">
                        <Field label="Date of birth" error={errors.date_of_birth}>
                            <input
                                type="date"
                                value={form.dateOfBirth}
                                onChange={(e) => set('dateOfBirth')(e.target.value)}
                                max={new Date().toISOString().slice(0, 10)}
                                className="w-full rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary"
                            />
                        </Field>

                        <Field label="Nationality" error={errors.nationality}>
                            <Input
                                value={form.nationality}
                                onChange={set('nationality')}
                                placeholder="Ghanaian"
                                errorText={errors.nationality}
                            />
                        </Field>

                        <Field label="Ghana Card number" error={errors.ghana_card_id}>
                            <Input
                                value={form.ghanaCard}
                                onChange={set('ghanaCard')}
                                placeholder="GHA-000000000-0"
                                leftIcon={<IdentificationCardIcon size={20} weight="bold" />}
                                errorText={errors.ghana_card_id}
                            />
                        </Field>

                        <Field label="SSNIT number" error={errors.ssnit_number}>
                            <Input value={form.ssnit} onChange={set('ssnit')} placeholder="Optional" errorText={errors.ssnit_number} />
                        </Field>

                        <Field label="TIN" error={errors.tin_number}>
                            <Input value={form.tin} onChange={set('tin')} placeholder="Optional" errorText={errors.tin_number} />
                        </Field>
                    </Section>

                    <Section title="Emergency contact" note="Someone we can call if something happens at work.">
                        <Field label="Name" error={errors.emergency_contact_name}>
                            <Input
                                value={form.emergencyName}
                                onChange={set('emergencyName')}
                                placeholder="Full name"
                                leftIcon={<UserIcon size={20} weight="bold" />}
                                errorText={errors.emergency_contact_name}
                            />
                        </Field>

                        <Field label="Their phone number" error={errors.emergency_contact_phone}>
                            <Input
                                type="tel"
                                value={form.emergencyPhone}
                                onChange={set('emergencyPhone')}
                                placeholder="024 123 4567"
                                leftIcon={<PhoneIcon size={20} weight="bold" />}
                                errorText={errors.emergency_contact_phone}
                            />
                        </Field>

                        <Field label="Relationship to you" error={errors.emergency_contact_relationship}>
                            <Input
                                value={form.emergencyRelationship}
                                onChange={set('emergencyRelationship')}
                                placeholder="Sister, father, friend…"
                                errorText={errors.emergency_contact_relationship}
                            />
                        </Field>
                    </Section>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold font-body py-3.5 transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting && <SpinnerIcon size={18} className="animate-spin" />}
                        {submitting ? 'Sending…' : 'Submit application'}
                    </button>

                    <p className="text-neutral-gray text-xs font-body text-center -mt-4">
                        Sending this does not create an account. Someone will review it first.
                    </p>
                </form>
            </Card>
        </Shell>
    );
}

// ─── Layout bits ──────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker flex flex-col items-center px-4 py-12">
            <div className="w-full max-w-lg">
                <div className="flex flex-col items-center mb-8">
                    <Image src="/cblogo.webp" alt="CediBites" width={64} height={64} className="mb-3" priority />
                    <h1 className="text-primary text-2xl font-bold font-body tracking-tight">CediBites</h1>
                </div>
                {children}
            </div>
        </div>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="dark:bg-brand-dark bg-white/75 rounded-3xl p-6 md:p-8 shadow border border-brown-light/20">
            {children}
        </div>
    );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="text-text-dark dark:text-text-light text-base font-semibold font-body">{title}</h3>
                {note && <p className="text-neutral-gray text-xs mt-1 font-body leading-relaxed">{note}</p>}
            </div>
            {children}
        </div>
    );
}

function Field({
    label,
    required,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                {label} {required && <span className="text-primary">*</span>}
            </label>
            {children}
            {hint && <p className="text-neutral-gray text-xs mt-1.5 font-body leading-relaxed">{hint}</p>}
        </div>
    );
}
