'use client';

import AddressSearchField from '@/app/(customer)/checkout/_components/AddressSearchField';
import { Field, Group } from '@/app/(customer)/checkout/_components/Field';
import { SmallAction } from '@/app/components/ui/QuietControls';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import type { SavedAddress } from '@/lib/api/services/address.service';
import { toast } from '@/lib/utils/toast';
import React, { useState } from 'react';
import { useAccount } from './AccountContext';
import AccountShell from './AccountShell';
import { DefaultCheck, FIELD, dangerActionLook } from './parts';

/**
 * One saved place, on a screen of its own.
 *
 * Not in a sheet: the address box drops its suggestions below itself, and a
 * sheet's scrolling body cuts that list off. And no longer opened in place in
 * the list: on a phone the floating tab bar sat over the form's second field,
 * and the next address in the list sat right under its buttons.
 *
 * Save is the red button at the foot. Remove sits at the bottom of the form and
 * asks once more before it goes, because a whole screen now separates a mistap
 * from the list it would come back to.
 */
export default function AddressEditor({ address, onLeaving }: {
    address?: SavedAddress;
    /** Told before the address is removed, so the screen does not flash "not saved" on its way out. */
    onLeaving?: (leaving: boolean) => void;
}) {
    const { goUp } = useAccount();
    const { addresses, saveAddress, updateAddress, removeAddress, saving, removing } = useAddresses();

    const [fullAddress, setFullAddress] = useState(address?.full_address ?? '');
    const [label, setLabel] = useState(address?.label ?? '');
    const [note, setNote] = useState(address?.note ?? '');
    const [makeDefault, setMakeDefault] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

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
        address?.latitude != null && address?.longitude != null
            ? { latitude: address.latitude, longitude: address.longitude }
            : null,
    );

    const valid = fullAddress.trim().length >= 4;
    // Not for the default itself, and not for a first address, which the
    // server makes the default anyway.
    const offerDefault = address ? !address.is_default : addresses.length > 0;

    const save = async () => {
        if (!valid || saving || removing) return;

        const payload = {
            label: label.trim() || null,
            full_address: fullAddress.trim(),
            note: note.trim() || null,
            latitude: position?.latitude ?? null,
            longitude: position?.longitude ?? null,
            /*
             * Only ever true. The update route takes false at its word and
             * promotes nothing in its place, which would leave checkout with no
             * address to fill in.
             */
            ...(makeDefault ? { is_default: true } : {}),
        };

        try {
            if (address) {
                await updateAddress({ id: address.id, ...payload });
                toast.success('Address updated');
            } else {
                await saveAddress(payload);
                toast.success('Address saved');
            }
            goUp('/account/addresses');
        } catch {
            toast.error('Could not save that address');
        }
    };

    const remove = async () => {
        if (!address || removing) return;
        onLeaving?.(true);
        try {
            await removeAddress(address.id);
            toast.info('Address removed');
            goUp('/account/addresses');
        } catch {
            onLeaving?.(false);
            setConfirmRemove(false);
            toast.error('Could not remove that address');
        }
    };

    // Not a <form>. The address box carries buttons of its own, the clear
    // button and every suggestion, with no type on them, and inside a form each
    // one of those would submit it. Enter in the two plain fields saves instead.
    const saveOnEnter = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        void save();
    };

    return (
        <AccountShell
            title={address ? 'Change address' : 'Add an address'}
            parent="/account/addresses"
            foot={{
                label: address ? 'Save changes' : 'Save address',
                onPress: () => { void save(); },
                waiting: !valid,
                busy: saving,
            }}
        >
            <Group className="lg:p-6">
                <Field label="Address">
                    <AddressSearchField
                        value={fullAddress}
                        onChange={setFullAddress}
                        onDeviceFix={setPosition}
                        placeholder="Street, area or landmark"
                    />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
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

                {address && (
                    confirmRemove ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => { void remove(); }}
                                disabled={removing}
                                className={`${dangerActionLook} hover:bg-danger-soft disabled:opacity-50`}
                            >
                                {removing ? 'Removing' : 'Yes, remove it'}
                            </button>
                            <SmallAction onClick={() => setConfirmRemove(false)} disabled={removing}>Keep it</SmallAction>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmRemove(true)}
                            className={`${dangerActionLook} self-start hover:bg-danger-soft`}
                        >
                            Remove this address
                        </button>
                    )
                )}
            </Group>
        </AccountShell>
    );
}
