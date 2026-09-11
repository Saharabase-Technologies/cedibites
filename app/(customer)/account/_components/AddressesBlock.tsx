'use client';

import AddressSearchField from '@/app/(customer)/checkout/_components/AddressSearchField';
import { Field, Group, ReviewRow } from '@/app/(customer)/checkout/_components/Field';
import { AttentionBadge, SmallAction } from '@/app/components/ui/QuietControls';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import type { SavedAddress } from '@/lib/api/services/address.service';
import { toast } from '@/lib/utils/toast';
import { CheckIcon } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { FIELD, SaveButton, dangerActionLook } from './parts';

/**
 * Where the food goes. The one part of the account that changes somebody's next
 * order, so it is the biggest block on the page.
 *
 * Each place is a checkout row with one Change. It used to carry three
 * underlined links on every row, Edit, Use by default and Remove, all at one
 * volume. The choices live inside the form Change opens.
 *
 * The form opens in place, not in a sheet. The address box drops its
 * suggestions below itself, and inside a sheet's scrolling body that list is
 * cut off at the bottom edge, which on a phone with the keyboard up is most of
 * it.
 */

interface Draft {
    label: string;
    full_address: string;
    note: string;
    latitude: number | null;
    longitude: number | null;
    makeDefault: boolean;
}

/** The street under a name, and the rider's note under that. */
function placeLines(address: SavedAddress): React.ReactNode {
    // Without a name the street is already the title.
    const street = address.label ? address.full_address : '';
    if (!street && !address.note) return undefined;

    return (
        <>
            {street && <span className="block">{street}</span>}
            {address.note && (
                <span className={street ? 'mt-0.5 block' : 'block'}>For the rider: {address.note}</span>
            )}
        </>
    );
}

function DefaultCheck({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex min-h-11 items-center gap-3 self-start text-left"
        >
            {/* Square, like the payment choice's ring is round: a box is what a
                tick goes in, and nothing in the brand is a pill. */}
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors duration-150 ease-out ${
                checked ? 'border-fg bg-fg text-surface' : 'border-hairline-strong bg-surface'
            }`}>
                {checked && <CheckIcon size={12} weight="bold" />}
            </span>
            <span className="text-[15px] font-semibold text-fg">Make this the default</span>
        </button>
    );
}

function AddressForm({ initial, offerDefault, saving, busy, onSave, onRemove, onCancel, className = '' }: {
    initial?: SavedAddress;
    /** Off for the default itself, and for a first address, which the server makes the default anyway. */
    offerDefault: boolean;
    saving: boolean;
    /** Saving or removing. Nothing else is pressable while either runs. */
    busy: boolean;
    onSave: (draft: Draft) => void;
    onRemove?: () => void;
    onCancel: () => void;
    /** The hairlines that mark where the form starts and ends among the rows. */
    className?: string;
}) {
    const [fullAddress, setFullAddress] = useState(initial?.full_address ?? '');
    const [label, setLabel] = useState(initial?.label ?? '');
    const [note, setNote] = useState(initial?.note ?? '');
    const [makeDefault, setMakeDefault] = useState(false);

    /**
     * Only ever a position we actually measured.
     *
     * `AddressSearchField` reports one when the box was filled from the phone's
     * own fix, and null the moment anything else edits it. We do not look up a
     * typed address, so storing a coordinate for one would be inventing a pin,
     * and a rider following a wrong pin is worse off than one following only
     * the text.
     */
    const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(
        initial?.latitude != null && initial?.longitude != null
            ? { latitude: initial.latitude, longitude: initial.longitude }
            : null,
    );

    const valid = fullAddress.trim().length >= 4;

    const submit = () => {
        if (!valid || busy) return;
        onSave({
            label: label.trim(),
            full_address: fullAddress.trim(),
            note: note.trim(),
            latitude: position?.latitude ?? null,
            longitude: position?.longitude ?? null,
            makeDefault,
        });
    };

    // Not a <form>. The address box carries buttons of its own, the clear
    // button and every suggestion, with no type on them, and inside a form each
    // one of those would submit it. Enter in the two plain fields saves instead.
    const saveOnEnter = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        submit();
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            <Field label="Address">
                <AddressSearchField
                    value={fullAddress}
                    onChange={setFullAddress}
                    onDeviceFix={setPosition}
                    placeholder="Street, area or landmark"
                />
            </Field>

            {/* Side by side once there is room. Stacked on a desk, two short
                fields made the form taller than the list it opened from. */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                    <input
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        onKeyDown={saveOnEnter}
                        aria-label="Name for this address"
                        placeholder="Home, Mum's, the office"
                        className={FIELD}
                    />
                </Field>
                <Field label="For the rider">
                    <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        onKeyDown={saveOnEnter}
                        aria-label="Note for the rider"
                        placeholder="Blue gate, second floor"
                        className={FIELD}
                    />
                </Field>
            </div>

            {offerDefault && <DefaultCheck checked={makeDefault} onChange={setMakeDefault} />}

            {/* Save and Cancel stay together. Remove sits apart: on its own line
                on a phone, at the far end of the row on anything wider. Beside
                them on a phone it squeezed "Save changes" onto two lines. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <SaveButton busy={saving} disabled={!valid || (busy && !saving)} onClick={submit}>
                        {initial ? 'Save changes' : 'Save address'}
                    </SaveButton>
                    <SmallAction onClick={onCancel} disabled={busy}>Cancel</SmallAction>
                </div>
                {onRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={busy}
                        className={`${dangerActionLook} self-start hover:bg-danger-soft disabled:opacity-50 sm:ml-auto sm:self-auto`}
                    >
                        Remove
                    </button>
                )}
            </div>
        </div>
    );
}

/** Two rows the shape of the real ones, so the block does not jump when the list lands. */
function AddressSkeleton() {
    return (
        <div aria-hidden className="flex flex-col gap-5">
            {[0, 1].map(i => (
                <div key={i} className="flex items-start gap-3 motion-safe:animate-pulse">
                    <div className="min-w-0 flex-1">
                        <div className="h-4 w-28 rounded-lg bg-surface-sunken" />
                        <div className="mt-2 h-3 w-full max-w-72 rounded-lg bg-surface-sunken" />
                    </div>
                    <div className="h-10 w-18 shrink-0 rounded-lg bg-surface-sunken" />
                </div>
            ))}
        </div>
    );
}

export default function AddressesBlock({ className }: { className?: string }) {
    const {
        addresses, isLoading, error, refetch,
        saveAddress, updateAddress, removeAddress, saving, removing,
    } = useAddresses();

    /** The place open for changing, or 'new' for the form at the foot. One at a time. */
    const [open, setOpen] = useState<number | 'new' | null>(null);

    const save = async (draft: Draft, id?: number) => {
        const payload = {
            label: draft.label || null,
            full_address: draft.full_address,
            note: draft.note || null,
            latitude: draft.latitude,
            longitude: draft.longitude,
            /*
             * Only ever true. The update route takes false at its word and
             * promotes nothing in its place, which would leave checkout with no
             * address to fill in.
             */
            ...(draft.makeDefault ? { is_default: true } : {}),
        };

        try {
            if (id) {
                await updateAddress({ id, ...payload });
                toast.success('Address updated');
            } else {
                await saveAddress(payload);
                toast.success('Address saved');
            }
            setOpen(null);
        } catch {
            toast.error('Could not save that address');
        }
    };

    const remove = async (address: SavedAddress) => {
        try {
            await removeAddress(address.id);
            setOpen(null);
            toast.info('Address removed');
        } catch {
            toast.error('Could not remove that address');
        }
    };

    return (
        <Group className={className}>
            <h2 className="-mb-1 text-lg font-bold leading-tight text-fg">Where your food goes</h2>

            {isLoading ? (
                <AddressSkeleton />
            ) : error ? (
                // Said plainly. Falling through to the empty state would tell
                // somebody with three saved places that they have none.
                <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 text-[15px] leading-snug text-fg-muted">Your addresses did not load.</p>
                    <SmallAction onClick={() => { void refetch(); }}>Try again</SmallAction>
                </div>
            ) : (
                <>
                    {addresses.length === 0 && open !== 'new' && (
                        <p className="-mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
                            Save a place once and checkout fills it in for you, on any phone you sign in on.
                        </p>
                    )}

                    {addresses.map(address => (
                        open === address.id ? (
                            <AddressForm
                                key={address.id}
                                initial={address}
                                offerDefault={!address.is_default}
                                saving={saving}
                                busy={saving || removing}
                                onSave={draft => save(draft, address.id)}
                                onRemove={() => remove(address)}
                                onCancel={() => setOpen(null)}
                                className="border-y border-hairline py-5"
                            />
                        ) : (
                            /* A name only when they gave one. An address saved on
                               its own at the end of an order has none, and the
                               street is its title. */
                            <ReviewRow
                                key={address.id}
                                value={address.label || address.full_address}
                                placeholder=""
                                badge={address.is_default ? <AttentionBadge>Default</AttentionBadge> : undefined}
                                sub={placeLines(address)}
                                action="Change"
                                onPress={() => setOpen(address.id)}
                            />
                        )
                    ))}

                    {/* The form takes the place of the button that opened it. */}
                    {open === 'new' ? (
                        <AddressForm
                            offerDefault={addresses.length > 0}
                            saving={saving}
                            busy={saving || removing}
                            onSave={draft => save(draft)}
                            onCancel={() => setOpen(null)}
                            className={addresses.length > 0 ? 'border-t border-hairline pt-5' : ''}
                        />
                    ) : (
                        <SmallAction onClick={() => setOpen('new')} className="self-start">
                            Add an address
                        </SmallAction>
                    )}
                </>
            )}
        </Group>
    );
}
