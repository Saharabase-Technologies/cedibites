'use client';

import BottomSheet from '@/app/components/ui/BottomSheet';
import { isValidGhanaPhone } from '@/app/lib/phone';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import { ArrowCounterClockwiseIcon, CheckIcon, MapPinIcon, XIcon } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';
import AddressSearchField from './AddressSearchField';
import { methodLabel } from './availability';
import { Field, controlClass } from './Field';
import { MomoNumberField, type MomoCheck } from './MomoField';
import type { ContactDetails, OrderType, PaymentMethod, SheetName } from './types';

/**
 * Changing one answer on the review screen.
 *
 * One sheet with three possible insides, rather than three sheets. When the pay
 * button walks a guest through what is missing, finishing the address swaps the
 * inside for the name and number without the sheet dropping and rising again,
 * and without a second sheet's closing animation handing focus back to the page
 * while the keyboard is up for the first.
 */

const TITLES: Record<SheetName, string> = {
    where: 'Where it goes',
    who: 'Who it is for',
    pay: 'How you pay',
};

type SetContact = React.Dispatch<React.SetStateAction<ContactDetails>>;

export default function CheckoutSheet({
    sheet, onClose, onDone, doneLabel,
    orderType, contact, setContact, recalledAddress,
    methods, paymentMethod, setPaymentMethod,
    momoNumber, setMomoNumber, momoCheck, momoChecking,
}: {
    sheet: SheetName | null;
    /**
     * Must keep its identity between renders. BottomSheet re-runs its focus
     * effect when this changes, and on a sheet with fields in it that pulls
     * focus out of the box somebody is typing into.
     */
    onClose: () => void;
    onDone: () => void;
    doneLabel: string;
    orderType: OrderType;
    contact: ContactDetails;
    setContact: SetContact;
    recalledAddress: string;
    methods: PaymentMethod[];
    paymentMethod: PaymentMethod;
    setPaymentMethod: (m: PaymentMethod) => void;
    momoNumber: string;
    setMomoNumber: (v: string) => void;
    momoCheck: MomoCheck;
    momoChecking: boolean;
}) {
    // What was last on screen, so the sheet keeps its insides while it slides away.
    const [shown, setShown] = useState<SheetName>(sheet ?? 'where');
    if (sheet && sheet !== shown) setShown(sheet);

    const header = (
        <div className="flex items-center gap-2 px-5 pb-3 pt-1 sm:pt-5">
            <h2 className="flex-1 text-lg font-bold text-fg">{TITLES[shown]}</h2>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
            >
                <XIcon size={18} weight="bold" />
            </button>
        </div>
    );

    const footer = (
        <div className="px-5 pb-5 pt-3">
            <button
                type="button"
                onClick={onDone}
                className="flex min-h-13 w-full items-center justify-center rounded-xl bg-primary-fill px-5 text-[15px] font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
            >
                {doneLabel}
            </button>
        </div>
    );

    return (
        <BottomSheet open={sheet !== null} onClose={onClose} label={TITLES[shown]} header={header} footer={footer}>
            <div key={shown} className="px-5 pb-6 pt-1">
                {shown === 'where' && (
                    <WherePanel contact={contact} setContact={setContact} recalledAddress={recalledAddress} />
                )}
                {shown === 'who' && (
                    <WhoPanel contact={contact} setContact={setContact} orderType={orderType} />
                )}
                {shown === 'pay' && (
                    <PayPanel
                        methods={methods}
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        orderType={orderType}
                        momoNumber={momoNumber}
                        setMomoNumber={setMomoNumber}
                        momoCheck={momoCheck}
                        momoChecking={momoChecking}
                    />
                )}
            </div>
        </BottomSheet>
    );
}

// ─── Where it goes ────────────────────────────────────────────────────────────

/**
 * A place to send it, as a row in one list with "Use where I am now".
 *
 * Saved places were grey chips with a link above them. Two looks for one kind of
 * choice, and a chip truncates the address it stands for.
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

function WherePanel({ contact, setContact, recalledAddress }: {
    contact: ContactDetails;
    setContact: SetContact;
    recalledAddress: string;
}) {
    // Cached by react-query. Empty for a guest: the query only runs with a
    // customer token.
    const { addresses } = useAddresses();
    const address = contact.address.trim();
    const setAddress = (v: string) => setContact(c => ({ ...c, address: v }));

    /*
     * The account list first, because it follows them between devices and they
     * named these themselves. This device's last address is the fallback, for a
     * guest and for anybody who has not saved one. Showing both would offer the
     * same street twice.
     */
    const recall = addresses.length === 0 && recalledAddress.trim() && recalledAddress.trim() !== address
        ? recalledAddress.trim()
        : '';

    return (
        <div className="flex flex-col gap-5">
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

            <Field label="Note for the rider">
                <textarea
                    rows={2}
                    placeholder="Call me when you reach the gate."
                    value={contact.note}
                    onChange={e => setContact(c => ({ ...c, note: e.target.value }))}
                    className={`${controlClass} resize-none py-3 leading-relaxed`}
                />
            </Field>
        </div>
    );
}

// ─── Who it is for ────────────────────────────────────────────────────────────

function WhoPanel({ contact, setContact, orderType }: {
    contact: ContactDetails;
    setContact: SetContact;
    orderType: OrderType;
}) {
    const [phoneTouched, setPhoneTouched] = useState(false);
    const nameField = useRef<HTMLInputElement>(null);

    /*
     * Straight into the name when there is none. BottomSheet takes focus for
     * its panel in an effect, and a parent's effect runs after its children's,
     * so a plain autoFocus loses that race and the keyboard never comes up. The
     * sign-in sheet waits a beat for the same reason.
     */
    const [startedEmpty] = useState(() => !contact.name.trim());
    useEffect(() => {
        if (!startedEmpty) return;
        const t = setTimeout(() => nameField.current?.focus(), 60);
        return () => clearTimeout(t);
    }, [startedEmpty]);

    const phoneError = phoneTouched && contact.phone.trim() && !isValidGhanaPhone(contact.phone)
        ? 'A Ghana number, like 0241234567.'
        : '';

    return (
        <div className="flex flex-col gap-5">
            <Field label="Name">
                <input
                    ref={nameField}
                    type="text"
                    autoComplete="name"
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

            {/* A pickup has no address sheet, so its note lives with the person
                collecting it. */}
            {orderType === 'pickup' && (
                <Field label="Note for the kitchen">
                    <textarea
                        rows={2}
                        placeholder="I will collect it myself."
                        value={contact.note}
                        onChange={e => setContact(c => ({ ...c, note: e.target.value }))}
                        className={`${controlClass} resize-none py-3 leading-relaxed`}
                    />
                </Field>
            )}
        </div>
    );
}

// ─── How you pay ──────────────────────────────────────────────────────────────

function PayPanel({ methods, paymentMethod, setPaymentMethod, orderType, momoNumber, setMomoNumber, momoCheck, momoChecking }: {
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
        <div className="flex flex-col gap-5">
            {methods.length > 1 && (
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
                                className={`flex min-h-14 w-full items-center gap-3.5 rounded-xl border-2 bg-surface px-4 text-left transition-colors duration-150 ease-out ${
                                    on ? 'border-fg' : 'border-transparent'
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
            )}

            {paymentMethod === 'mobile_money' && (
                <MomoNumberField
                    value={momoNumber}
                    onChange={setMomoNumber}
                    check={momoCheck}
                    checking={momoChecking}
                />
            )}
        </div>
    );
}
