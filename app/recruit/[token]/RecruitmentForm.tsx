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
    emergencyName: string;
    emergencyPhone: string;
    emergencyRelationship: string;
};

type FieldName = keyof FormState;

const EMPTY: FormState = {
    name: '', phone: '', phoneConfirm: '', email: '',
    password: '', passwordConfirm: '',
    dateOfBirth: '', nationality: '', ghanaCard: '',
    emergencyName: '', emergencyPhone: '', emergencyRelationship: '',
};

/**
 * Top-to-bottom order of the fields on screen.
 *
 * Drives which error gets scrolled to: the first one a person would reach, not
 * the first one the validator happened to produce.
 */
const FIELD_ORDER: FieldName[] = [
    'name', 'phone', 'phoneConfirm', 'email',
    'password', 'passwordConfirm',
    'dateOfBirth', 'nationality', 'ghanaCard',
    'emergencyName', 'emergencyPhone', 'emergencyRelationship',
];

/** Server field names → the local ones, so a 422 lands on the right box. */
const SERVER_FIELDS: Record<string, FieldName> = {
    name: 'name',
    phone: 'phone',
    phone_confirmation: 'phoneConfirm',
    email: 'email',
    password: 'password',
    password_confirmation: 'passwordConfirm',
    date_of_birth: 'dateOfBirth',
    nationality: 'nationality',
    ghana_card_id: 'ghanaCard',
    emergency_contact_name: 'emergencyName',
    emergency_contact_phone: 'emergencyPhone',
    emergency_contact_relationship: 'emergencyRelationship',
};

/**
 * DOM id of a field's wrapper.
 *
 * Scrolling is done by id rather than by a ref map: a per-field ref callback has
 * to be built during render, which is exactly what `react-hooks/refs` forbids,
 * and the alternative — twelve `useRef`s — is worse to read than one lookup.
 */
function fieldId(field: FieldName): string {
    return `recruit-field-${field}`;
}

/** Digits only, so 024… and +233… compare equal the way the server compares them. */
function samePhone(a: string, b: string): boolean {
    const digits = (v: string) => v.replace(/\D/g, '').replace(/^233/, '').replace(/^0/, '');
    return digits(a) === digits(b);
}

/**
 * One field's rule, checked on its own.
 *
 * Per-field rather than one big validate(), so the same rule can run the moment
 * someone leaves a box and again on submit, and cannot drift between the two.
 * Returns null when the field is fine.
 */
function checkField(field: FieldName, form: FormState): string | null {
    switch (field) {
        case 'name':
            return form.name.trim() ? null : 'Please tell us your name';

        case 'phone':
            if (!form.phone.trim()) return 'A phone number is required';
            return form.phone.replace(/\D/g, '').length >= 9
                ? null
                : 'That does not look like a full phone number';

        case 'phoneConfirm':
            if (!form.phoneConfirm.trim()) return 'Please type your number again';
            return samePhone(form.phone, form.phoneConfirm) ? null : 'The two numbers do not match';

        case 'email':
            if (!form.email.trim()) return null;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
                ? null
                : 'That does not look like an email address';

        case 'password':
            if (!form.password) return 'Please choose a password';
            return form.password.length >= 8 ? null : 'At least 8 characters';

        case 'passwordConfirm':
            if (!form.passwordConfirm) return 'Please type your password again';
            return form.password === form.passwordConfirm ? null : 'The two passwords do not match';

        case 'dateOfBirth':
            if (!form.dateOfBirth) return null;
            return new Date(form.dateOfBirth) < new Date() ? null : 'Date of birth must be in the past';

        case 'emergencyPhone':
            if (!form.emergencyPhone.trim()) return null;
            return form.emergencyPhone.replace(/\D/g, '').length >= 9
                ? null
                : 'That does not look like a full phone number';

        default:
            return null;
    }
}

export function RecruitmentForm({ token }: { token: string }) {
    const [posting, setPosting] = useState<RecruitmentPosting | null>(null);
    const [loading, setLoading] = useState(true);
    const [closed, setClosed] = useState(false);

    const [form, setForm] = useState<FormState>(EMPTY);
    const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
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

    /** Put the first bad field on screen and in focus. */
    function revealFirstError(found: Partial<Record<FieldName, string>>) {
        const first = FIELD_ORDER.find((field) => found[field]);
        if (!first) return;

        // After the render that painted the errors, or the box scrolled to is
        // the one that has not been marked yet.
        requestAnimationFrame(() => {
            const node = document.getElementById(fieldId(first));
            node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            node?.querySelector<HTMLElement>('input, select')?.focus({ preventScroll: true });
        });
    }

    function set(field: FieldName) {
        return (value: string) => {
            const next = { ...form, [field]: value };
            setForm(next);

            // Only correct someone once they have finished with the box. Marking
            // a half-typed phone number wrong on the third keystroke is noise.
            if (touched[field]) {
                setErrors((e) => ({ ...e, [field]: checkField(field, next) ?? undefined }));
            }

            // The confirm boxes are about a pair, so editing either one can fix
            // or break the other.
            if (field === 'phone' && touched.phoneConfirm) {
                setErrors((e) => ({ ...e, phoneConfirm: checkField('phoneConfirm', next) ?? undefined }));
            }
            if (field === 'password' && touched.passwordConfirm) {
                setErrors((e) => ({ ...e, passwordConfirm: checkField('passwordConfirm', next) ?? undefined }));
            }
        };
    }

    function blur(field: FieldName) {
        return () => {
            setTouched((t) => ({ ...t, [field]: true }));
            setErrors((e) => ({ ...e, [field]: checkField(field, form) ?? undefined }));
        };
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const found: Partial<Record<FieldName, string>> = {};
        for (const field of FIELD_ORDER) {
            const problem = checkField(field, form);
            if (problem) found[field] = problem;
        }

        setTouched(Object.fromEntries(FIELD_ORDER.map((f) => [f, true])));
        setErrors(found);
        setGlobalError(null);

        if (Object.keys(found).length > 0) {
            revealFirstError(found);
            return;
        }

        setSubmitting(true);

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
                const mapped: Partial<Record<FieldName, string>> = {};
                for (const [serverField, messages] of Object.entries(fieldErrors)) {
                    const local = SERVER_FIELDS[serverField];
                    if (local) mapped[local] = messages[0];
                }

                setErrors(mapped);

                // A rule only the server knows — a phone already on staff, a
                // second application to the same posting. It has to land on the
                // box, not just at the top of a long form.
                if (Object.keys(mapped).length > 0) revealFirstError(mapped);
                else setGlobalError(Object.values(fieldErrors)[0]?.[0] ?? 'Please check the form.');
            } else {
                setGlobalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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

    /** Gives a field its scroll anchor and its current error. */
    const bind = (field: FieldName) => ({
        id: fieldId(field),
        error: errors[field],
    });

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
                {globalError && (
                    <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                        <p className="text-error text-sm font-body leading-snug">{globalError}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
                    <Section title="Your details">
                        <Field label="Full name" required {...bind('name')}>
                            <Input
                                value={form.name}
                                onChange={set('name')}
                                onBlur={blur('name')}
                                placeholder="Your full name"
                                leftIcon={<UserIcon size={20} weight="bold" />}
                                errorText={errors.name}
                                autoComplete="name"
                            />
                        </Field>

                        <Field
                            label="Phone number"
                            required
                            /* There is no verification code by decision, so this
                               sentence is what stands in for one. */
                            hint="Use a number you can actually answer. This is how we reach you about the job, and how you reset your password."
                            {...bind('phone')}
                        >
                            <Input
                                type="tel"
                                value={form.phone}
                                onChange={set('phone')}
                                onBlur={blur('phone')}
                                placeholder="024 123 4567"
                                leftIcon={<PhoneIcon size={20} weight="bold" />}
                                errorText={errors.phone}
                                autoComplete="tel"
                            />
                        </Field>

                        <Field label="Confirm phone number" required {...bind('phoneConfirm')}>
                            <Input
                                type="tel"
                                value={form.phoneConfirm}
                                onChange={set('phoneConfirm')}
                                onBlur={blur('phoneConfirm')}
                                placeholder="Type it again"
                                leftIcon={<PhoneIcon size={20} weight="bold" />}
                                errorText={errors.phoneConfirm}
                            />
                        </Field>

                        <Field label="Email" hint="Optional, but useful as a backup." {...bind('email')}>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={set('email')}
                                onBlur={blur('email')}
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
                        <Field label="Password" required {...bind('password')}>
                            <Input
                                type="password"
                                value={form.password}
                                onChange={set('password')}
                                onBlur={blur('password')}
                                placeholder="At least 8 characters"
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={errors.password}
                                autoComplete="new-password"
                            />
                        </Field>

                        <Field label="Confirm password" required {...bind('passwordConfirm')}>
                            <Input
                                type="password"
                                value={form.passwordConfirm}
                                onChange={set('passwordConfirm')}
                                onBlur={blur('passwordConfirm')}
                                placeholder="Type it again"
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={errors.passwordConfirm}
                                autoComplete="new-password"
                            />
                        </Field>
                    </Section>

                    <Section title="About you" note="All optional — leave anything blank if you don't have it to hand.">
                        <Field label="Date of birth" {...bind('dateOfBirth')}>
                            <input
                                type="date"
                                value={form.dateOfBirth}
                                onChange={(e) => set('dateOfBirth')(e.target.value)}
                                onBlur={blur('dateOfBirth')}
                                max={new Date().toISOString().slice(0, 10)}
                                className={`w-full rounded-2xl border bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none ${
                                    errors.dateOfBirth ? 'border-error' : 'border-brown-light/25 focus:border-primary'
                                }`}
                            />
                            {errors.dateOfBirth && (
                                <p className="text-error text-xs mt-1.5 font-body">{errors.dateOfBirth}</p>
                            )}
                        </Field>

                        <Field label="Nationality" {...bind('nationality')}>
                            <Input
                                value={form.nationality}
                                onChange={set('nationality')}
                                onBlur={blur('nationality')}
                                placeholder="Ghanaian"
                                errorText={errors.nationality}
                            />
                        </Field>

                        <Field label="Ghana Card number" {...bind('ghanaCard')}>
                            <Input
                                value={form.ghanaCard}
                                onChange={set('ghanaCard')}
                                onBlur={blur('ghanaCard')}
                                placeholder="GHA-000000000-0"
                                leftIcon={<IdentificationCardIcon size={20} weight="bold" />}
                                errorText={errors.ghanaCard}
                            />
                        </Field>
                    </Section>

                    <Section title="Emergency contact" note="Someone we can call if something happens at work.">
                        <Field label="Name" {...bind('emergencyName')}>
                            <Input
                                value={form.emergencyName}
                                onChange={set('emergencyName')}
                                onBlur={blur('emergencyName')}
                                placeholder="Full name"
                                leftIcon={<UserIcon size={20} weight="bold" />}
                                errorText={errors.emergencyName}
                            />
                        </Field>

                        <Field label="Their phone number" {...bind('emergencyPhone')}>
                            <Input
                                type="tel"
                                value={form.emergencyPhone}
                                onChange={set('emergencyPhone')}
                                onBlur={blur('emergencyPhone')}
                                placeholder="024 123 4567"
                                leftIcon={<PhoneIcon size={20} weight="bold" />}
                                errorText={errors.emergencyPhone}
                            />
                        </Field>

                        <Field label="Relationship to you" {...bind('emergencyRelationship')}>
                            <Input
                                value={form.emergencyRelationship}
                                onChange={set('emergencyRelationship')}
                                onBlur={blur('emergencyRelationship')}
                                placeholder="Sister, father, friend…"
                                errorText={errors.emergencyRelationship}
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
    error,
    id,
    children,
}: {
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    id?: string;
    children: React.ReactNode;
}) {
    return (
        <div id={id} className="scroll-mt-24">
            <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                {label} {required && <span className="text-primary">*</span>}
            </label>
            {children}
            {/* The hint stands down once there is something wrong to say instead. */}
            {hint && !error && (
                <p className="text-neutral-gray text-xs mt-1.5 font-body leading-relaxed">{hint}</p>
            )}
        </div>
    );
}
