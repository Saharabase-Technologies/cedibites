'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowRightIcon, CheckIcon, PencilSimpleIcon, PlusIcon,
    SignOutIcon, SpinnerGapIcon, XIcon,
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
 * Built as one column on the page ground rather than a stack of cards.
 *
 * The version before this was four identical `card-lift` panels — details,
 * addresses, notifications, orders — each under a heading set in American
 * Captain. Two things were wrong with that. Four containers at the same weight
 * say every section matters equally, and they do not: the addresses are the
 * only part that changes somebody's next order, the rest is set once and left.
 * And a condensed all-caps display face on a 20px section label is the wrong
 * job for it; that face carries the wordmark and the block headings, not the
 * furniture of a settings screen.
 *
 * So: containers have no borders, controls do. Sections are separated by air
 * and a hairline, labelled quietly in the body face. The page's one display
 * moment is the customer's own name, and the initials sit in a hard red square
 * because that is the brand's device — a round avatar is every other app.
 */

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ label, action, children, className = '' }: {
    label: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`border-t border-hairline pt-7 ${className}`}>
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">
                    {label}
                </h2>
                {action}
            </div>
            <div className="mt-4">{children}</div>
        </section>
    );
}

/** The one control style on this page. Every input here looks like this. */
const FIELD = 'min-h-12 w-full rounded-xl border-2 border-hairline-strong bg-surface px-3.5 text-[15px] text-fg outline-none transition-colors duration-150 ease-out focus:border-fg placeholder:text-fg-subtle';

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
            <div className="py-3.5">
                <p className="text-[13px] font-semibold text-fg-muted">{label}</p>
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
                        className={`${FIELD} font-semibold disabled:opacity-60`}
                    />
                    <button
                        onClick={commit}
                        disabled={saving}
                        aria-label={`Save ${label.toLowerCase()}`}
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-fill text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:opacity-60"
                    >
                        {saving ? <SpinnerGapIcon size={17} className="animate-spin" /> : <CheckIcon size={17} weight="bold" />}
                    </button>
                    <button
                        onClick={() => { setDraft(value); setEditing(false); }}
                        disabled={saving}
                        aria-label="Cancel"
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
                    >
                        <XIcon size={17} weight="bold" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => setEditing(true)}
            className="group flex w-full items-baseline gap-4 py-3.5 text-left"
        >
            <span className="w-20 shrink-0 text-[13px] font-semibold text-fg-muted">{label}</span>
            <span className={`min-w-0 flex-1 truncate text-[15px] font-semibold ${value ? 'text-fg' : 'text-fg-subtle'}`}>
                {value || placeholder}
            </span>
            <PencilSimpleIcon
                size={14}
                weight="bold"
                className="shrink-0 self-center text-fg-subtle transition-colors duration-150 ease-out group-hover:text-fg"
            />
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

    return (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-surface-sunken p-3.5">
            <input
                value={fullAddress}
                onChange={e => setFullAddress(e.target.value)}
                placeholder="The address a rider can find"
                autoFocus
                className={`${FIELD} font-semibold`}
            />
            <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Call it something. Home, Mum's, the office"
                className={FIELD}
            />
            <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Anything the rider needs. Blue gate, second floor"
                className={FIELD}
            />

            <div className="mt-0.5 flex gap-2.5">
                <button
                    onClick={submit}
                    disabled={!valid || busy}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-fill px-4 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:bg-hairline disabled:text-fg-subtle"
                >
                    {busy ? <SpinnerGapIcon size={15} className="animate-spin" /> : initial ? 'Save changes' : 'Save address'}
                </button>
                <button
                    onClick={onCancel}
                    disabled={busy}
                    className="min-h-12 rounded-xl px-4 text-sm font-bold text-fg-muted transition-colors duration-150 ease-out hover:text-fg"
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
        <div className="py-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <p className="text-[15px] font-bold text-fg">{address.label || 'Saved address'}</p>
                {address.is_default && (
                    /* Yellow is attention, and which address we will use is the
                       one thing worth pointing at in this list. */
                    <span className="rounded-lg bg-accent px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-on-accent">
                        Default
                    </span>
                )}
            </div>

            <p className="mt-1 text-sm leading-relaxed break-words text-fg-muted">{address.full_address}</p>
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
    );
}

/** Two rows of the shape the real list takes, so the page does not jump. */
function AddressSkeleton() {
    return (
        <div aria-hidden className="flex flex-col divide-y divide-hairline">
            {[0, 1].map(i => (
                <div key={i} className="animate-pulse py-4">
                    <div className="h-4 w-24 rounded-lg bg-surface-sunken" />
                    <div className="mt-2 h-3.5 w-full max-w-64 rounded-lg bg-surface-sunken" />
                </div>
            ))}
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
            <div>
                <p className="text-[15px] font-bold text-fg">Add CediBites to your Home Screen first</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                    Your iPhone only lets a site send notifications once it is kept on the Home
                    Screen. Tap the share button, choose Add to Home Screen, then open it from there.
                </p>
            </div>
        );
    }

    if (state === null) {
        return (
            <div aria-hidden className="animate-pulse">
                <div className="h-4 w-40 rounded-lg bg-surface-sunken" />
                <div className="mt-2.5 h-3.5 w-full max-w-72 rounded-lg bg-surface-sunken" />
            </div>
        );
    }

    const copy = PUSH_COPY[state];
    const canToggle = state === 'on' || state === 'off';

    return (
        <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-fg">{copy.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{copy.line}</p>
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
            <div className="page-x mx-auto flex min-h-[60svh] max-w-xl items-center justify-center">
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
        <div className="page-x mx-auto max-w-xl pb-16 pt-7">

            {/* ── Who you are ──────────────────────────────────────────────
              *
              * The page's one display moment. A hard red square holding the
              * initials in the brand face, rather than the round tinted avatar
              * every other app opens with. White on #f40002 is 4.33:1, which
              * clears AA at this size and would not at label size.
              */}
            <div className="flex items-center gap-4">
                <span className="grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center bg-primary font-brand text-[30px] leading-none text-white">
                    {initials}
                </span>
                <div className="min-w-0">
                    <h1 className="font-brand text-[34px] uppercase leading-[0.95] tracking-[0.01em] text-balance text-fg">
                        {user.name || 'Your account'}
                    </h1>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-fg-muted">{user.phone}</p>
                </div>
            </div>

            {memberSince && (
                <p className="mt-4 text-[13px] text-fg-subtle">Ordering with us since {memberSince}</p>
            )}

            <div className="mt-8 flex flex-col gap-7">

                {/* ── Details ──────────────────────────────────────────── */}
                <Section label="Your details" className="border-t-0 pt-0">
                    <div className="divide-y divide-hairline">
                        <EditableRow
                            label="Name"
                            value={user.name || ''}
                            placeholder="What should we call you?"
                            onSave={name => updateProfile({ name })}
                        />
                        <div className="flex items-baseline gap-4 py-3.5">
                            <span className="w-20 shrink-0 text-[13px] font-semibold text-fg-muted">Phone</span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="text-[15px] font-semibold tabular-nums text-fg">{user.phone}</span>
                                    <span className="rounded-lg bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success-ink">
                                        Verified
                                    </span>
                                </span>
                                <span className="mt-1 block text-[13px] leading-relaxed text-fg-subtle">
                                    This is the account. Changing it needs a new code, which is not built yet.
                                </span>
                            </span>
                        </div>
                        <EditableRow
                            label="Email"
                            value={user.email || ''}
                            placeholder="For receipts. Optional."
                            type="email"
                            onSave={email => updateProfile({ email: email || null })}
                        />
                    </div>
                </Section>

                {/* ── Addresses ────────────────────────────────────────────
                  *
                  * The loudest section on the page, and the only one that
                  * changes somebody's next order. Everything else here is set
                  * once and left alone.
                  */}
                <Section
                    label="Where your food goes"
                    action={!adding && (
                        <button
                            onClick={() => { setAdding(true); setEditingId(null); }}
                            className="flex items-center gap-1.5 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                        >
                            <PlusIcon size={13} weight="bold" /> Add an address
                        </button>
                    )}
                >
                    {addressesLoading ? (
                        <AddressSkeleton />
                    ) : addresses.length === 0 && !adding ? (
                        <div className="rounded-2xl bg-surface-sunken p-4">
                            <p className="text-[15px] font-bold text-fg">Nothing saved yet</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                                Save the places you order to and checkout fills the address in for you, on
                                any phone you sign in from.
                            </p>
                            <button
                                onClick={() => setAdding(true)}
                                className="mt-3.5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-fill px-4 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                            >
                                <PlusIcon size={14} weight="bold" /> Add your first
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-hairline">
                            {addresses.map(address => (
                                editingId === address.id ? (
                                    <div key={address.id} className="py-3">
                                        <AddressForm
                                            initial={address}
                                            onDone={submitAddress}
                                            onCancel={() => setEditingId(null)}
                                        />
                                    </div>
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
                            ))}
                        </div>
                    )}

                    {adding && (
                        <div className={addresses.length > 0 ? 'mt-3' : ''}>
                            <AddressForm onDone={submitAddress} onCancel={() => setAdding(false)} />
                        </div>
                    )}
                </Section>

                {/* ── Notifications ────────────────────────────────────── */}
                <Section label="Being told">
                    <NotificationCard />
                </Section>

                {/* ── Orders ───────────────────────────────────────────── */}
                <Section label="Your orders">
                    <Link
                        href="/orders"
                        className="group flex items-center gap-3 text-left"
                    >
                        <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold text-fg">Every order you have placed</span>
                            <span className="mt-1 block text-sm leading-relaxed text-fg-muted">
                                Follow one that is out, or put a past one back in the cart
                            </span>
                        </span>
                        <ArrowRightIcon
                            size={16}
                            weight="bold"
                            className="shrink-0 text-fg-subtle transition-colors duration-150 ease-out group-hover:text-fg"
                        />
                    </Link>
                </Section>

                {/* ── The end of the page ──────────────────────────────── */}
                <div className="border-t border-hairline pt-7">
                    <button
                        onClick={logout}
                        className="flex min-h-12 items-center gap-2 text-sm font-bold text-danger-ink transition-opacity duration-150 ease-out hover:opacity-70"
                    >
                        <SignOutIcon size={16} weight="bold" /> Sign out
                    </button>

                    {/*
                      * One honest line, rather than five greyed rows.
                      *
                      * Saved cards, loyalty points and closing an account are
                      * all real work nobody has started. Listing them as
                      * features with a badge on them made the page mostly a
                      * catalogue of things it could not do.
                      */}
                    <p className="mt-4 max-w-md text-[13px] leading-relaxed text-fg-subtle">
                        Saved payment details, loyalty points and closing your account are not built yet.
                        To close an account today, ring the kitchen and we will do it for you.
                    </p>
                </div>
            </div>
        </div>
    );
}
