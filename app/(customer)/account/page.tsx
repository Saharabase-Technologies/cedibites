'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    UserIcon, PhoneIcon, PencilSimpleIcon,
    CheckIcon, XIcon, SpinnerGapIcon, SignOutIcon,
    PathIcon, CaretRightIcon, MapPinIcon, CreditCardIcon,
    StarIcon, BellIcon, TrashIcon, CameraIcon,
    ClockIcon, ShoppingBagIcon,
    LockIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import { toast } from '@/lib/utils/toast';

// ─── Coming Soon badge ────────────────────────────────────────────────────────
function ComingSoonBadge() {
    return (
        <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
            Coming Soon
        </span>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-brand-darker rounded-2xl border border-neutral-gray/10 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-gray/8">
                <h2 className="text-sm font-bold text-text-dark dark:text-text-light">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

// ─── Coming soon feature row ──────────────────────────────────────────────────
function ComingSoonRow({ icon: IconComponent, label, description }: {
    icon: Icon;
    label: string;
    description: string;
}) {
    return (
        <div className="flex items-center gap-3.5 py-3 opacity-60">
            <div className="w-9 h-9 rounded-xl bg-neutral-gray/8 flex items-center justify-center shrink-0">
                <IconComponent size={16} className="text-neutral-gray" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark dark:text-text-light">{label}</p>
                <p className="text-xs text-neutral-gray">{description}</p>
            </div>
            <ComingSoonBadge />
        </div>
    );
}

// ─── Edit field inline ────────────────────────────────────────────────────────
function EditableField({ label, value, placeholder, onSave, type = 'text' }: {
    label: string;
    value: string;
    placeholder: string;
    onSave: (val: string) => Promise<{ success: boolean; error?: string }>;
    type?: string;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { setDraft(value); }, [value]);

    const handleSave = async () => {
        if (draft.trim() === value) { setEditing(false); return; }
        setSaving(true);
        setError('');
        const result = await onSave(draft.trim());
        setSaving(false);
        if (result.success) {
            setEditing(false);
            toast.success(`${label} updated`);
        } else {
            setError(result.error ?? 'Failed to update');
        }
    };

    const handleCancel = () => { setDraft(value); setEditing(false); setError(''); };

    return (
        <div className="py-3">
            <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-gray">{label}</label>
                {!editing && (
                    <button onClick={() => setEditing(true)} className="text-primary text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                        <PencilSimpleIcon size={11} weight="bold" /> Edit
                    </button>
                )}
            </div>
            {editing ? (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <input
                            type={type}
                            value={draft}
                            onChange={e => { setDraft(e.target.value); setError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                            placeholder={placeholder}
                            autoFocus
                            disabled={saving}
                            className="flex-1 px-3 py-2.5 bg-neutral-light dark:bg-brand-dark border-2 border-primary/40 rounded-xl text-text-dark dark:text-text-light text-sm font-medium outline-none focus:border-primary"
                        />
                        <button onClick={handleSave} disabled={saving} className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50">
                            {saving ? <SpinnerGapIcon size={14} className="animate-spin" /> : <CheckIcon size={14} weight="bold" />}
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-gray/10 text-neutral-gray hover:bg-neutral-gray/20 transition-colors cursor-pointer disabled:opacity-50">
                            <XIcon size={14} weight="bold" />
                        </button>
                    </div>
                    {error && (
                        <p className="flex items-center gap-1 text-xs text-error font-medium">
                            <WarningCircleIcon size={11} weight="fill" /> {error}
                        </p>
                    )}
                </div>
            ) : (
                <p className={`text-sm font-medium ${value ? 'text-text-dark dark:text-text-light' : 'text-neutral-gray/50 italic'}`}>
                    {value || placeholder}
                </p>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AccountPage() {
    const { user, isLoggedIn, logout, updateProfile } = useAuth();
    const { openAuth } = useModal();
    const router = useRouter();

    // Redirect guests to home
    useEffect(() => {
        if (!isLoggedIn) {
            openAuth();
            router.replace('/');
        }
    }, [isLoggedIn, openAuth, router]);

    if (!isLoggedIn || !user) return null;

    const initials = user.name
        ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    const memberSince = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : '';

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-dark pt-28 pb-12">
            <div className="max-w-lg mx-auto px-4 flex flex-col gap-5">

                {/* ── Profile header ──────────────────────────────────────── */}
                <div className="flex flex-col items-center text-center gap-3 mb-2">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                            {initials}
                        </div>
                        {/* Camera overlay — future: profile photo upload */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-neutral-card border-2 border-white dark:border-brand-dark flex items-center justify-center opacity-40 cursor-not-allowed" title="Profile photo coming soon">
                            <CameraIcon size={12} weight="fill" className="text-neutral-gray" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-text-dark dark:text-text-light">{user.name}</h1>
                        <p className="text-sm text-neutral-gray">{user.phone}</p>
                        {memberSince && (
                            <p className="text-xs text-neutral-gray/70 mt-1 flex items-center justify-center gap-1">
                                <ClockIcon size={11} /> Member since {memberSince}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Personal information ────────────────────────────────── */}
                <Section title="Personal Information">
                    <div className="divide-y divide-neutral-gray/8">
                        <EditableField
                            label="Name"
                            value={user.name || ''}
                            placeholder="Enter your name"
                            onSave={async (name) => updateProfile({ name })}
                        />
                        <div className="py-3">
                            <label className="text-xs font-semibold text-neutral-gray mb-1 block">Phone Number</label>
                            <div className="flex items-center gap-2">
                                <PhoneIcon size={14} weight="fill" className="text-neutral-gray/50" />
                                <p className="text-sm font-medium text-text-dark dark:text-text-light">{user.phone}</p>
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary px-2 py-0.5 rounded-full">Verified</span>
                            </div>
                            <p className="text-[10px] text-neutral-gray mt-1">Phone number change will require re-verification</p>
                        </div>
                        <EditableField
                            label="Email"
                            value={user.email || ''}
                            placeholder="Add email for receipts"
                            onSave={async (email) => updateProfile({ email: email || null })}
                            type="email"
                        />
                    </div>
                </Section>

                {/* ── Quick links ─────────────────────────────────────────── */}
                <Section title="My Activity">
                    <div className="flex flex-col gap-1">
                        <Link href="/order-history" className="flex items-center gap-3 px-1 py-3 rounded-xl hover:bg-neutral-light dark:hover:bg-white/5 transition-colors group">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <PathIcon size={16} weight="fill" className="text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-text-dark dark:text-text-light flex-1">Order History</span>
                            <CaretRightIcon size={14} className="text-neutral-gray/40 group-hover:text-primary transition-colors" />
                        </Link>
                        <Link href="/menu" className="flex items-center gap-3 px-1 py-3 rounded-xl hover:bg-neutral-light dark:hover:bg-white/5 transition-colors group">
                            <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                                <ShoppingBagIcon size={16} weight="fill" className="text-secondary" />
                            </div>
                            <span className="text-sm font-semibold text-text-dark dark:text-text-light flex-1">Browse Menu</span>
                            <CaretRightIcon size={14} className="text-neutral-gray/40 group-hover:text-secondary transition-colors" />
                        </Link>
                    </div>
                </Section>

                {/* ── Coming soon features ────────────────────────────────── */}
                <Section title="More Features">
                    <div className="divide-y divide-neutral-gray/8">
                        <ComingSoonRow
                            icon={MapPinIcon}
                            label="Saved Addresses"
                            description="Save delivery addresses for faster checkout"
                        />
                        <ComingSoonRow
                            icon={CreditCardIcon}
                            label="Payment Methods"
                            description="Save mobile money and card details"
                        />
                        <ComingSoonRow
                            icon={StarIcon}
                            label="Loyalty & Rewards"
                            description="Earn points on every order and redeem rewards"
                        />
                        <ComingSoonRow
                            icon={BellIcon}
                            label="Notification Preferences"
                            description="Choose how you receive order updates and offers"
                        />
                        <ComingSoonRow
                            icon={PhoneIcon}
                            label="Change Phone Number"
                            description="Update your phone with OTP re-verification"
                        />
                    </div>
                </Section>

                {/* ── Account actions ─────────────────────────────────────── */}
                <div className="flex flex-col gap-2.5 mt-1">
                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white dark:bg-brand-darker border border-neutral-gray/10 text-error font-semibold text-sm hover:bg-error/5 transition-colors cursor-pointer"
                    >
                        <SignOutIcon size={16} weight="bold" /> Sign Out
                    </button>
                    <button
                        disabled
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-neutral-gray/40 text-xs font-medium cursor-not-allowed"
                        title="Account deletion coming soon"
                    >
                        <TrashIcon size={13} /> Delete Account <ComingSoonBadge />
                    </button>
                </div>

                {/* ── Footer ──────────────────────────────────────────────── */}
                <div className="text-center mt-2 mb-4">
                    <p className="text-[10px] text-neutral-gray/50 flex items-center justify-center gap-1">
                        <LockIcon size={9} /> Your data is safe with CediBites
                    </p>
                </div>
            </div>
        </div>
    );
}
