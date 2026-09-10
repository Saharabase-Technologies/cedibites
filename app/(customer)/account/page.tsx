'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    CaretRightIcon, CheckIcon, HouseIcon, MapPinIcon, PencilSimpleIcon,
    PlusIcon, SignOutIcon, SpinnerGapIcon, XIcon,
} from '@phosphor-icons/react';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import type { SavedAddress } from '@/lib/api/services/address.service';
import { disableDevicePush, enableDevicePush, readPushState, type PushState } from '@/lib/push/devicePush';
import { pushNeedsHomeScreen } from '@/lib/orders/orderPush';
import { toast } from '@/lib/utils/toast';

/**
 * The account.
 *
 * This was the last customer screen still on the warm staff tokens —
 * `bg-neutral-light`, `text-text-dark`, `dark:` variants that have been inert
 * since the theme was forced to light — with a centred avatar, a camera badge
 * that did nothing, and five Coming Soon rows under a heading called "More
 * Features". Seven things you could not do, and two you could.
 *
 * What it holds now is what works: your details, the addresses you have saved,
 * and whether this device buzzes. Everything else has gone rather than sat
 * there greyed out. A page whose main content is a list of absent features
 * teaches people not to come back to it.
 */

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, action, children }: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section>
            <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
                <h2 className="font-brand text-xl uppercase leading-none tracking-[0.02em] text-fg">
                    {title}
                </h2>
                {action}
            </div>
            <div className="card-lift rounded-2xl bg-surface">{children}</div>
        </section>
    );
}

// ─── One editable line ────────────────────────────────────────────────────────

function EditableRow({ label, value, placeholder, type = 'text', onSave }: {
    label: string;
    value: string;
    placeholder: string;
    type?: string;
    onSave: (val: string) => Promise<{ success: boolean; error?: string }>;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);

    useEffect(() => { setDraft(value); }, [value]);

    const commit = async () => {
        const next = draft.trim();
        if (next === value.trim()) { setEditing(false); return; }

        setSaving(true);
        const result = await onSave(next);
        setSaving(false);

        if (result.success) {
            setEditing(false);
            toast.success(`${label} saved`);
        } else {
            toast.error(result.error ?? `Could not save your ${label.toLowerCase()}`);
        }
    };

    if (editing) {
        return (
            <div className="p-4">
                <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-muted">{label}</label>
                <div className="mt-2 flex items-center gap-2">
                    <input
                        type={type}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commit();
                            if (e.key === 'Escape') { setDraft(value); setEditing(false); }
                        }}
                        placeholder={placeholder}
                        autoFocus
                        disabled={saving}
                        className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-hairline-strong bg-surface px-3 text-[15px] font-semibold text-fg outline-none transition-colors duration-150 ease-out focus:border-fg placeholder:font-normal placeholder:text-fg-subtle"
                    />
                    <button
                        onClick={commit}
                        disabled={saving}
                        aria-label={`Save ${label.toLowerCase()}`}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-fill text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:opacity-60"
                    >
                        {saving ? <SpinnerGapIcon size={16} className="animate-spin" /> : <CheckIcon size={16} weight="bold" />}
                    </button>
                    <button
                        onClick={() => { setDraft(value); setEditing(false); }}
                        disabled={saving}
                        aria-label="Cancel"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-sunken text-fg-muted transition-colors duration-150 ease-out hover:text-fg"
                    >
                        <XIcon size={16} weight="bold" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => setEditing(true)}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 ease-out hover:bg-surface-sunken"
        >
            <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-fg-muted">{label}</span>
                <span className={`mt-1 block truncate text-[15px] font-semibold ${value ? 'text-fg' : 'text-fg-subtle'}`}>
                    {value || placeholder}
                </span>
            </span>
            <PencilSimpleIcon size={15} weight="bold" className="shrink-0 text-fg-subtle" />
        </button>
    );
}

// ─── Addresses ────────────────────────────────────────────────────────────────

function AddressForm({ initial, onDone, onCancel }: {
    initial?: SavedAddress;
    onDone: (payload: { id?: number; label: string; full_address: string; note: string }) => Promise<void>;
    onCancel: () => void;
}) {
    const [label, setLabel] = useState(initial?.label ?? '');
    const [fullAddress, setFullAddress] = useState(initial?.full_address ?? '');
    const [note, setNote] = useState(initial?.note ?? '');
    const [busy, setBusy] = useState(false);

    const valid = fullAddress.trim().length >= 4;

    const submit = async () => {
        if (!valid || busy) return;
        setBusy(true);
        try {
            await onDone({
                id: initial?.id,
                label: label.trim(),
                full_address: fullAddress.trim(),
                note: note.trim(),
            });
        } finally {
            setBusy(false);
        }
    };

    const field = 'min-h-11 w-full rounded-xl border-2 border-hairline-strong bg-surface px-3 text-[15px] text-fg outline-none transition-colors duration-150 ease-out focus:border-fg placeholder:text-fg-subtle';

    return (
        <div className="flex flex-col gap-2.5 border-t border-hairline p-4">
            <input
                value={fullAddress}
                onChange={e => setFullAddress(e.target.value)}
                placeholder="The address a rider can find"
                autoFocus
                className={`${field} font-semibold`}
            />
            <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Call it something. Home, Mum's, the office"
                className={field}
            />
            <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Anything the rider needs. Blue gate, second floor"
                className={field}
            />

            <div className="mt-1 flex gap-2.5">
                <button
                    onClick={submit}
                    disabled={!valid || busy}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-fill px-4 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:bg-surface-sunken disabled:text-fg-subtle"
                >
                    {busy ? <SpinnerGapIcon size={15} className="animate-spin" /> : initial ? 'Save changes' : 'Save address'}
                </button>
                <button
                    onClick={onCancel}
                    disabled={busy}
                    className="min-h-11 rounded-xl border border-hairline-strong px-4 text-sm font-bold text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

function AddressRow({ address, onEdit, onMakeDefault, onDelete, busy }: {
    address: SavedAddress;
    onEdit: () => void;
    onMakeDefault: () => void;
    onDelete: () => void;
    busy: boolean;
}) {
    return (
        <div className="flex items-start gap-3 border-t border-hairline p-4 first:border-t-0">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-sunken text-fg-muted">
                {address.is_default ? <HouseIcon size={16} weight="fill" /> : <MapPinIcon size={16} weight="fill" />}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-bold text-fg">{address.label || 'Saved address'}</p>
                    {address.is_default && (
                        <span className="rounded-lg bg-accent px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] text-on-accent">
                            Default
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed break-words text-fg-muted">{address.full_address}</p>
                {address.note && (
                    <p className="mt-0.5 text-[13px] leading-relaxed break-words text-fg-subtle">{address.note}</p>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <button
                        onClick={onEdit}
                        className="text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                    >
                        Edit
                    </button>
                    {!address.is_default && (
                        <button
                            onClick={onMakeDefault}
                            disabled={busy}
                            className="text-[13px] font-bold text-fg-muted underline underline-offset-4 transition-colors duration-150 ease-out hover:text-fg disabled:opacity-50"
                        >
                            Use by default
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        disabled={busy}
                        className="text-[13px] font-bold text-danger-ink underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70 disabled:opacity-50"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Notifications ────────────────────────────────────────────────────────────

const PUSH_COPY: Record<PushState, { title: string; line: string }> = {
    on: {
        title: 'This device buzzes',
        line: 'You get a notification when the kitchen starts and when the rider leaves. It is set per device, so a phone and a laptop are asked separately.',
    },
    off: {
        title: 'Notifications are off here',
        line: 'Turn them on and this device tells you when the kitchen starts and when the rider leaves. The SMS comes either way.',
    },
    blocked: {
        title: 'This browser is blocking them',
        line: 'Nothing on this page can undo that. Allow notifications for the site in your browser settings, then come back.',
    },
    unsupported: {
        title: 'This browser cannot do notifications',
        line: 'The SMS still comes to your number on every order.',
    },
};

function NotificationCard() {
    const [state, setState] = useState<PushState | null>(null);
    const [busy, setBusy] = useState(false);
    const [needsHomeScreen, setNeedsHomeScreen] = useState(false);

    useEffect(() => {
        setNeedsHomeScreen(pushNeedsHomeScreen());
        readPushState().then(setState);
    }, []);

    const toggle = useCallback(async () => {
        if (!state || busy) return;
        setBusy(true);
        const next = state === 'on' ? await disableDevicePush() : await enableDevicePush();
        setState(next);
        setBusy(false);

        if (next === 'on') toast.success('This device will tell you when your order moves');
        else if (next === 'blocked') toast.error('Your browser is blocking notifications');
        else if (state === 'on') toast.info('Notifications off for this device');
        else toast.error('That did not take. The SMS still comes either way.');
    }, [state, busy]);

    // iOS refuses the Push API entirely outside a home-screen install, so the
    // toggle would be a control that cannot work. Say why instead.
    if (needsHomeScreen) {
        return (
            <div className="p-4">
                <p className="text-sm font-bold text-fg">Add CediBites to your Home Screen first</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                    Your iPhone only lets a site send notifications once it is kept on the Home
                    Screen. Tap the share button, choose Add to Home Screen, then open it from there.
                </p>
            </div>
        );
    }

    if (state === null) {
        return (
            <div className="flex items-center gap-2 p-4 text-[13px] text-fg-muted">
                <SpinnerGapIcon size={14} className="animate-spin" /> Checking
            </div>
        );
    }

    const copy = PUSH_COPY[state];
    const canToggle = state === 'on' || state === 'off';

    return (
        <div className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-fg">{copy.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{copy.line}</p>
            </div>

            {canToggle && (
                <button
                    onClick={toggle}
                    disabled={busy}
                    role="switch"
                    aria-checked={state === 'on'}
                    aria-label="Notifications on this device"
                    className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-lg transition-colors duration-150 ease-out disabled:opacity-60 ${
                        state === 'on' ? 'bg-success' : 'bg-hairline-strong'
                    }`}
                >
                    <span
                        aria-hidden
                        className={`absolute top-1 h-5 w-5 rounded-md bg-white transition-[left] duration-150 ease-out ${
                            state === 'on' ? 'left-6' : 'left-1'
                        }`}
                    />
                </button>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
    const { user, isLoggedIn, isRestoring, logout, updateProfile } = useAuth();
    const { openAuth } = useModal();
    const router = useRouter();

    const {
        addresses, isLoading: addressesLoading,
        saveAddress, updateAddress, removeAddress, saving, removing,
    } = useAddresses();

    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    /**
     * Guests go home. Signed-in customers do not.
     *
     * Nothing is decided until the restore is finished: `isLoggedIn` is false
     * for everybody on the first render, and acting on that threw a signed-in
     * customer to the home screen on every visit.
     */
    useEffect(() => {
        if (isRestoring || isLoggedIn) return;
        openAuth();
        router.replace('/');
    }, [isRestoring, isLoggedIn, openAuth, router]);

    if (isRestoring) {
        return (
            <div className="page-x mx-auto flex min-h-[60svh] max-w-2xl items-center justify-center">
                <SpinnerGapIcon size={26} className="animate-spin text-fg-subtle" />
            </div>
        );
    }

    if (!isLoggedIn || !user) return null;

    const initials = user.name
        ? user.name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    const memberSince = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : '';

    const submitAddress = async ({ id, label, full_address, note }: {
        id?: number; label: string; full_address: string; note: string;
    }) => {
        try {
            if (id) {
                await updateAddress({ id, label: label || null, full_address, note: note || null });
                toast.success('Address updated');
            } else {
                await saveAddress({ label: label || null, full_address, note: note || null });
                toast.success('Address saved');
            }
            setAdding(false);
            setEditingId(null);
        } catch {
            toast.error('Could not save that address');
        }
    };

    return (
        <div className="page-x mx-auto max-w-2xl pb-16 pt-6">

            {/* ── Who you are ──────────────────────────────────────────────
              *
              * Left aligned, not a centred avatar over a centred name over a
              * centred line. The camera badge that opened nothing is gone.
              */}
            <div className="flex items-center gap-4">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-fill font-brand text-2xl text-white">
                    {initials}
                </span>
                <div className="min-w-0">
                    <h1 className="font-brand text-3xl uppercase leading-none tracking-[0.01em] text-fg">
                        {user.name || 'Your account'}
                    </h1>
                    <p className="mt-1.5 text-sm tabular-nums text-fg-muted">{user.phone}</p>
                    {memberSince && (
                        <p className="text-[13px] text-fg-subtle">Ordering since {memberSince}</p>
                    )}
                </div>
            </div>

            <div className="mt-9 flex flex-col gap-8">

                {/* ── Details ──────────────────────────────────────────── */}
                <Section title="Your details">
                    <EditableRow
                        label="Name"
                        value={user.name || ''}
                        placeholder="What should we call you?"
                        onSave={name => updateProfile({ name })}
                    />
                    <div className="border-t border-hairline p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-muted">Phone</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-[15px] font-semibold tabular-nums text-fg">{user.phone}</p>
                            <span className="rounded-lg bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success-ink">
                                Verified
                            </span>
                        </div>
                        <p className="mt-1 text-[13px] text-fg-muted">
                            This is the account. Changing it needs a new code, which we have not built yet.
                        </p>
                    </div>
                    <EditableRow
                        label="Email"
                        value={user.email || ''}
                        placeholder="For receipts. Optional."
                        type="email"
                        onSave={email => updateProfile({ email: email || null })}
                    />
                </Section>

                {/* ── Addresses ────────────────────────────────────────── */}
                <Section
                    title="Delivery addresses"
                    action={!adding && (
                        <button
                            onClick={() => { setAdding(true); setEditingId(null); }}
                            className="flex items-center gap-1.5 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                        >
                            <PlusIcon size={13} weight="bold" /> Add one
                        </button>
                    )}
                >
                    {addressesLoading ? (
                        <div className="flex items-center gap-2 p-4 text-[13px] text-fg-muted">
                            <SpinnerGapIcon size={14} className="animate-spin" /> Loading
                        </div>
                    ) : addresses.length === 0 && !adding ? (
                        <div className="p-4">
                            <p className="text-sm font-bold text-fg">Nothing saved yet</p>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                                Save the places you order to and checkout fills the address in for you, on
                                any phone you sign in from.
                            </p>
                        </div>
                    ) : (
                        addresses.map(address => (
                            editingId === address.id ? (
                                <AddressForm
                                    key={address.id}
                                    initial={address}
                                    onDone={submitAddress}
                                    onCancel={() => setEditingId(null)}
                                />
                            ) : (
                                <AddressRow
                                    key={address.id}
                                    address={address}
                                    busy={saving || removing}
                                    onEdit={() => { setEditingId(address.id); setAdding(false); }}
                                    onMakeDefault={async () => {
                                        try {
                                            await updateAddress({ id: address.id, is_default: true });
                                            toast.success(`${address.label || 'That address'} is your default now`);
                                        } catch {
                                            toast.error('Could not change your default');
                                        }
                                    }}
                                    onDelete={async () => {
                                        try {
                                            await removeAddress(address.id);
                                            toast.info('Address removed');
                                        } catch {
                                            toast.error('Could not remove that address');
                                        }
                                    }}
                                />
                            )
                        ))
                    )}

                    {adding && (
                        <AddressForm onDone={submitAddress} onCancel={() => setAdding(false)} />
                    )}
                </Section>

                {/* ── Notifications ────────────────────────────────────── */}
                <Section title="Notifications">
                    <NotificationCard />
                </Section>

                {/* ── Orders ───────────────────────────────────────────── */}
                <Section title="Your orders">
                    <Link
                        href="/orders"
                        className="flex items-center gap-3 p-4 transition-colors duration-150 ease-out hover:bg-surface-sunken"
                    >
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-fg">Every order you have placed</span>
                            <span className="mt-0.5 block text-[13px] text-fg-muted">
                                Follow one that is out, or put a past one back in the cart
                            </span>
                        </span>
                        <CaretRightIcon size={15} weight="bold" className="shrink-0 text-fg-subtle" />
                    </Link>
                </Section>

                <button
                    onClick={logout}
                    className="flex min-h-13 items-center justify-center gap-2 rounded-xl border border-hairline-strong text-sm font-bold text-danger-ink transition-colors duration-150 ease-out hover:bg-surface-sunken"
                >
                    <SignOutIcon size={16} weight="bold" /> Sign out
                </button>

                {/*
                  * One honest line, rather than five greyed rows.
                  *
                  * Saved cards, loyalty points and closing an account are all
                  * real work nobody has started. Listing them as features with a
                  * badge on them made the page mostly a catalogue of things it
                  * could not do.
                  */}
                <p className="px-1 pb-2 text-[13px] leading-relaxed text-fg-subtle">
                    Saved payment details, loyalty points and closing your account are not built yet.
                    To close an account today, ring the kitchen and we will do it for you.
                </p>
            </div>
        </div>
    );
}
