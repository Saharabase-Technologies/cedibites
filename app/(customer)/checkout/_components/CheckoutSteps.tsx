'use client';

import type { Branch } from '@/app/components/providers/BranchProvider';
import { BranchStateBadge, SmallAction } from '@/app/components/ui/QuietControls';
import { isValidGhanaPhone } from '@/app/lib/phone';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import { ArrowCounterClockwiseIcon, CheckIcon, MapPinIcon } from '@phosphor-icons/react';
import React, { useState } from 'react';
import AddressSearchField from './AddressSearchField';
import { methodLabel } from './availability';
import { Field, Group, ReviewRow, controlClass } from './Field';
import { MomoNumberField, type MomoCheck } from './MomoField';
import type { ContactDetails, OrderType, PaymentMethod } from './types';

/**
 * The three questions, one screen each.
 *
 * Each is a single white block and nothing else: no order strip, no running
 * total, no recap of earlier answers. Those wait for the review, where they are
 * read together at the moment they matter. The question is the title in the bar
 * at the top, so the block needs no heading of its own.
 */

type SetContact = React.Dispatch<React.SetStateAction<ContactDetails>>;

/**
 * Two mutually exclusive answers.
 *
 * The chip is white and the label is black. Red is the action colour on the
 * customer side and it is spent on the button at the foot, so which of two
 * options you picked is carried by contrast instead.
 */
function Segmented<T extends string>({ value, onChange, options }: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
}) {
    return (
        <div
            role="radiogroup"
            className="grid gap-1 rounded-xl bg-surface-sunken p-1"
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
            {options.map(o => {
                const on = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(o.value)}
                        className={`min-h-11 rounded-lg text-[15px] font-bold transition-colors duration-150 ease-out ${
                            on ? 'bg-surface text-fg' : 'text-fg-muted hover:text-fg'
                        }`}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * A place to send it, as a row in one list with "Use where I am now".
 *
 * Saved places were grey chips under a link. Two looks for one kind of choice,
 * and a chip truncates the address it stands for.
 */
function PlaceRow({ icon, title, line, chosen, onPick }: {
    icon: React.ReactNode;
    title: string;
    line: string;
    chosen: boolean;
    onPick: () => void;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onPick}
                aria-pressed={chosen}
                className="flex min-h-12 w-full items-center gap-3 py-2 text-left transition-opacity duration-150 ease-out hover:opacity-80"
            >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-fg/5 text-fg">{icon}</span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-snug text-fg">{title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug break-words text-fg-muted">{line}</span>
                </span>
                {chosen && <CheckIcon size={18} weight="bold" className="shrink-0 text-fg" />}
            </button>
        </li>
    );
}

// ─── Where it goes ────────────────────────────────────────────────────────────

export function WhereStep({
    orderType, setOrderType, orderTypes,
    branch, onChangeBranch,
    contact, setContact, recalledAddress,
}: {
    orderType: OrderType;
    setOrderType: (t: OrderType) => void;
    orderTypes: OrderType[];
    branch: Branch | null;
    onChangeBranch: () => void;
    contact: ContactDetails;
    setContact: SetContact;
    recalledAddress: string;
}) {
    // Cached by react-query. Empty for a guest: the query only runs with a
    // customer token.
    const { addresses } = useAddresses();
    const address = contact.address.trim();
    const setAddress = (v: string) => setContact(c => ({ ...c, address: v }));
    const forRider = orderType === 'delivery';

    /*
     * The account list first, because it follows them between devices and they
     * named these themselves. This device's last address is the fallback, for a
     * guest and for anybody who has not saved one. Showing both would offer the
     * same street twice.
     */
    const recall = addresses.length === 0 && recalledAddress.trim() && recalledAddress.trim() !== address
        ? recalledAddress.trim()
        : '';

    /*
     * Both notes are a tap away rather than boxes on the screen. Most orders
     * carry neither, and two empty text areas make a light question look like a
     * form to fill in.
     *
     * The kitchen one is offered on a delivery as well as a pickup. Somebody
     * allergic to shrimp has to be able to say so whoever brings the food, and
     * before this they could only write to the rider.
     */
    const [kitchenOpen, setKitchenOpen] = useState(() => Boolean(contact.kitchenNote.trim()));
    const [riderOpen, setRiderOpen] = useState(() => Boolean(contact.riderNote.trim()));

    return (
        <Group>
            {orderTypes.length > 1 && (
                <Segmented
                    value={orderType}
                    onChange={setOrderType}
                    options={orderTypes.map(t => ({
                        value: t,
                        label: t === 'delivery' ? 'Delivery' : 'Pickup',
                    }))}
                />
            )}

            {forRider ? (
                <div>
                    <AddressSearchField
                        value={contact.address}
                        onChange={setAddress}
                        placeholder="Street, area or landmark"
                    />

                    {(addresses.length > 0 || recall) && (
                        <ul className="flex flex-col">
                            {addresses.map(a => (
                                <PlaceRow
                                    key={a.id}
                                    icon={<MapPinIcon size={16} weight="fill" />}
                                    title={a.label || 'Saved address'}
                                    line={a.full_address}
                                    chosen={address === a.full_address.trim()}
                                    onPick={() => setAddress(a.full_address)}
                                />
                            ))}
                            {recall && (
                                <PlaceRow
                                    icon={<ArrowCounterClockwiseIcon size={16} weight="bold" />}
                                    title="Last time"
                                    line={recall}
                                    chosen={false}
                                    onPick={() => setAddress(recall)}
                                />
                            )}
                        </ul>
                    )}
                </div>
            ) : (
                <ReviewRow
                    caption="Pickup at"
                    value={branch?.name}
                    placeholder="No branch yet"
                    badge={<BranchStateBadge branch={branch} />}
                    sub={branch?.address}
                    action={branch ? 'Change' : 'Choose'}
                    onPress={onChangeBranch}
                />
            )}

            {kitchenOpen && (
                <Field label="Note for the kitchen">
                    <textarea
                        rows={2}
                        autoFocus={!contact.kitchenNote.trim()}
                        placeholder="No pepper, or an allergy we should know about."
                        value={contact.kitchenNote}
                        onChange={e => setContact(c => ({ ...c, kitchenNote: e.target.value }))}
                        className={`${controlClass} resize-none py-3 leading-relaxed`}
                    />
                </Field>
            )}

            {forRider && riderOpen && (
                <Field label="Note for the rider">
                    <textarea
                        rows={2}
                        autoFocus={!contact.riderNote.trim()}
                        placeholder="Call me when you reach the gate."
                        value={contact.riderNote}
                        onChange={e => setContact(c => ({ ...c, riderNote: e.target.value }))}
                        className={`${controlClass} resize-none py-3 leading-relaxed`}
                    />
                </Field>
            )}

            {(!kitchenOpen || (forRider && !riderOpen)) && (
                <div className="flex flex-wrap gap-2">
                    {!kitchenOpen && (
                        <SmallAction onClick={() => setKitchenOpen(true)}>Add a note for the kitchen</SmallAction>
                    )}
                    {forRider && !riderOpen && (
                        <SmallAction onClick={() => setRiderOpen(true)}>Add a note for the rider</SmallAction>
                    )}
                </div>
            )}
        </Group>
    );
}

// ─── Who it is for ────────────────────────────────────────────────────────────

export function WhoStep({ contact, setContact }: {
    contact: ContactDetails;
    setContact: SetContact;
}) {
    const [phoneTouched, setPhoneTouched] = useState(false);

    // Straight into the name when there is none yet. Somebody with a name
    // already filled in is here to check it, not to retype it.
    const [startedEmpty] = useState(() => !contact.name.trim());

    const phoneError = phoneTouched && contact.phone.trim() && !isValidGhanaPhone(contact.phone)
        ? 'A Ghana number, like 0241234567.'
        : '';

    return (
        <Group>
            <Field label="Name">
                <input
                    type="text"
                    autoComplete="name"
                    autoFocus={startedEmpty}
                    placeholder="Kwame Mensah"
                    value={contact.name}
                    onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
                    className={controlClass}
                />
            </Field>

            <Field label="Phone" error={phoneError}>
                <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0241234567"
                    value={contact.phone}
                    onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
                    onBlur={() => setPhoneTouched(true)}
                    className={`${controlClass} tabular-nums`}
                />
            </Field>
        </Group>
    );
}

// ─── How you pay ──────────────────────────────────────────────────────────────

export function PayStep({ methods, paymentMethod, setPaymentMethod, orderType, momoNumber, setMomoNumber, momoCheck, momoChecking }: {
    methods: PaymentMethod[];
    paymentMethod: PaymentMethod;
    setPaymentMethod: (m: PaymentMethod) => void;
    orderType: OrderType;
    momoNumber: string;
    setMomoNumber: (v: string) => void;
    momoCheck: MomoCheck;
    momoChecking: boolean;
}) {
    return (
        <Group>
            <div role="radiogroup" aria-label="How you pay" className="flex flex-col gap-2">
                {methods.map(m => {
                    const on = paymentMethod === m;
                    return (
                        <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setPaymentMethod(m)}
                            className={`flex min-h-14 w-full items-center gap-3.5 rounded-xl border-2 px-4 text-left transition-colors duration-150 ease-out ${
                                on ? 'border-fg bg-surface' : 'border-transparent bg-surface-sunken'
                            }`}
                        >
                            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150 ease-out ${
                                on ? 'border-fg' : 'border-hairline-strong'
                            }`}>
                                {on && <span className="h-2.5 w-2.5 rounded-full bg-fg" />}
                            </span>
                            <span className="text-[15px] font-bold text-fg">{methodLabel(m, orderType)}</span>
                        </button>
                    );
                })}
            </div>

            {paymentMethod === 'mobile_money' && (
                <MomoNumberField
                    value={momoNumber}
                    onChange={setMomoNumber}
                    check={momoCheck}
                    checking={momoChecking}
                />
            )}
        </Group>
    );
}
