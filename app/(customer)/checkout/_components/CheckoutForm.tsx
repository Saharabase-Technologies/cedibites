'use client';

import { useBranch } from '@/app/components/providers/BranchProvider';
import { isValidGhanaPhone } from '@/app/lib/phone';
import { ArrowCounterClockwiseIcon, LockSimpleIcon } from '@phosphor-icons/react';
import React, { useState } from 'react';
import AddressSearchField from './AddressSearchField';
import BranchSelectorSheet from './BranchSelectorSheet';
import { Field, Section, controlClass } from './Field';
import type { RecalledDetails } from './recall';
import type { ContactDetails, OrderType, PaymentMethod } from './types';

/**
 * The whole checkout, on one screen.
 *
 * It used to be two. The second one asked a single question, mobile money or
 * cash, and wrapped it in three cards, two of which repeated the address and
 * the branch from the first. Nobody needs a Continue button to get to one
 * radio group.
 *
 * There are no cards here at all. Four headings, the space above each one, and
 * hairlines where two rows sit together. That is the same construction the cart
 * sheet was rebuilt on, and this screen opens directly out of it.
 */

// ─── Small parts ──────────────────────────────────────────────────────────────

/** A quiet text button. The one link style this side of the product uses. */
function TextButton({ onClick, children, className = '' }: {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70 ${className}`}
        >
            {children}
        </button>
    );
}

/**
 * Two mutually exclusive answers.
 *
 * The chip is white and the label is black. Red is the action colour on the
 * customer side and it is spent on the pay button, so which of two options you
 * picked is carried by contrast instead.
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
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(o.value)}
                        className={`min-h-11 rounded-lg text-sm font-bold transition-colors duration-150 ease-out ${
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

/** One choice in a list of them. A dot, a name, and what it means. */
function ChoiceRow({ on, title, sub, onSelect }: {
    on: boolean;
    title: string;
    sub: string;
    onSelect: () => void;
}) {
    return (
        <button
            role="radio"
            aria-checked={on}
            onClick={onSelect}
            className="flex w-full items-center gap-3.5 py-3.5 text-left"
        >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150 ease-out ${
                on ? 'border-fg' : 'border-hairline-strong'
            }`}>
                {on && <span className="h-2.5 w-2.5 rounded-full bg-fg" />}
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-bold text-fg">{title}</span>
                <span className="mt-0.5 block text-[13px] text-fg-muted">{sub}</span>
            </span>
        </button>
    );
}

/**
 * Something worth stopping for, without a coloured box around it.
 *
 * Same shape as the cart sheet's, deliberately. A closed branch reads the same
 * on both screens because it is the same problem with the same way out.
 */
function Notice({ title, body, action, onAction }: {
    title: string;
    body: string;
    action: string;
    onAction: () => void;
}) {
    return (
        <div className="rounded-xl bg-surface-sunken px-4 py-3.5">
            <p className="text-sm font-bold text-fg">{title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{body}</p>
            <TextButton onClick={onAction} className="mt-2.5 inline-block">{action}</TextButton>
        </div>
    );
}

// ─── The form ─────────────────────────────────────────────────────────────────

export default function CheckoutForm({
    orderType, setOrderType, orderTypes,
    paymentMethod, setPaymentMethod, methods,
    contact, setContact, recalled, knownContact,
}: {
    orderType: OrderType;
    setOrderType: (t: OrderType) => void;
    orderTypes: OrderType[];
    paymentMethod: PaymentMethod;
    setPaymentMethod: (m: PaymentMethod) => void;
    methods: PaymentMethod[];
    contact: ContactDetails;
    setContact: React.Dispatch<React.SetStateAction<ContactDetails>>;
    recalled: RecalledDetails;
    /** True when the name and number were filled in for them. */
    knownContact: boolean;
}) {
    const { selectedBranch } = useBranch();
    const [branchSheet, setBranchSheet] = useState(false);
    const [noteOpen, setNoteOpen] = useState(Boolean(contact.note));
    const [phoneTouched, setPhoneTouched] = useState(false);

    /**
     * Null until somebody presses Change, and until then this follows whether
     * the details were filled in for them.
     *
     * It cannot be plain state seeded from `knownContact`. The name and number
     * are read out of localStorage in an effect, so the first render always has
     * empty fields and any state seeded there would be stuck open even once the
     * details arrived a tick later.
     */
    const [editOverride, setEditOverride] = useState<boolean | null>(null);
    const editingContact = editOverride ?? !knownContact;

    const set = (field: keyof ContactDetails) => (v: string) =>
        setContact(c => ({ ...c, [field]: v }));

    const phoneError = phoneTouched && contact.phone.trim() && !isValidGhanaPhone(contact.phone)
        ? 'A Ghana number, like 0241234567.'
        : '';

    const branchShut = Boolean(selectedBranch && (!selectedBranch.isActive || !selectedBranch.isOpen));
    const canRecallAddress = orderType === 'delivery'
        && Boolean(recalled.address)
        && recalled.address !== contact.address;

    return (
        <>
            <div className="flex flex-col gap-8">

                {branchShut && selectedBranch && (
                    <Notice
                        title={selectedBranch.isActive === false
                            ? `${selectedBranch.name} is not taking orders`
                            : `${selectedBranch.name} is closed`}
                        body={selectedBranch.isActive === false
                            ? 'Nothing can be sent from here at the moment.'
                            : 'Nothing leaves the kitchen until it opens again.'}
                        action="Order from another branch"
                        onAction={() => setBranchSheet(true)}
                    />
                )}

                {/* ── How you want it ─────────────────────────────────────── */}
                {orderTypes.length > 1 && (
                    <Section title="How you want it">
                        <Segmented
                            value={orderType}
                            onChange={setOrderType}
                            options={orderTypes.map(t => ({
                                value: t,
                                label: t === 'delivery' ? 'Delivery' : 'Pickup',
                            }))}
                        />
                    </Section>
                )}

                {/* ── Where it goes ───────────────────────────────────────── */}
                <Section title={orderType === 'delivery' ? 'Where it goes' : 'Where you collect it'}>
                    {orderType === 'delivery' ? (
                        <div className="flex flex-col gap-3">
                            <AddressSearchField
                                value={contact.address}
                                onChange={set('address')}
                                placeholder="Street, area or landmark"
                            />

                            {canRecallAddress && (
                                <button
                                    onClick={() => set('address')(recalled.address)}
                                    className="flex min-w-0 items-center gap-2 self-start rounded-lg bg-surface-sunken px-3 py-2 text-left transition-opacity duration-150 ease-out hover:opacity-80"
                                >
                                    <ArrowCounterClockwiseIcon size={13} weight="bold" className="shrink-0 text-fg-muted" />
                                    <span className="truncate text-[13px] font-semibold text-fg">{recalled.address}</span>
                                </button>
                            )}

                            {selectedBranch && (
                                <div className="flex items-center gap-3 border-t border-hairline pt-3">
                                    <p className="min-w-0 flex-1 text-[13px] text-fg-muted">
                                        Cooked at <span className="font-bold text-fg">{selectedBranch.name}</span>, about 25 to 40 minutes.
                                    </p>
                                    <TextButton onClick={() => setBranchSheet(true)} className="shrink-0">Change</TextButton>
                                </div>
                            )}
                        </div>
                    ) : selectedBranch ? (
                        <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-fg">{selectedBranch.name}</p>
                                <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{selectedBranch.address}</p>
                                <p className="mt-0.5 text-[13px] tabular-nums text-fg-muted">{selectedBranch.phone}</p>
                                <p className="mt-2 text-[13px] text-fg-muted">Ready in about 15 to 20 minutes.</p>
                            </div>
                            <TextButton onClick={() => setBranchSheet(true)} className="shrink-0">Change</TextButton>
                        </div>
                    ) : (
                        <TextButton onClick={() => setBranchSheet(true)}>Pick a branch</TextButton>
                    )}
                </Section>

                {/* ── Who it is for ───────────────────────────────────────── */}
                <Section title="Who it is for">
                    {editingContact ? (
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <div className="flex-1">
                                <Field label="Name">
                                    <input
                                        type="text"
                                        autoComplete="name"
                                        placeholder="Kwame Mensah"
                                        value={contact.name}
                                        onChange={e => set('name')(e.target.value)}
                                        className={controlClass}
                                    />
                                </Field>
                            </div>
                            <div className="flex-1">
                                <Field label="Phone" error={phoneError}>
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        autoComplete="tel"
                                        placeholder="0241234567"
                                        value={contact.phone}
                                        onChange={e => set('phone')(e.target.value)}
                                        onBlur={() => setPhoneTouched(true)}
                                        className={`${controlClass} tabular-nums`}
                                    />
                                </Field>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-fg">{contact.name}</p>
                                <p className="mt-0.5 text-[13px] tabular-nums text-fg-muted">{contact.phone}</p>
                            </div>
                            <TextButton onClick={() => setEditOverride(true)} className="shrink-0">Change</TextButton>
                        </div>
                    )}

                    <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
                        The tracking link is sent to this number by SMS.
                    </p>
                </Section>

                {/* ── How you pay ─────────────────────────────────────────── */}
                {methods.length > 0 && (
                    <Section title="How you pay">
                        <div role="radiogroup" className="divide-y divide-hairline border-y border-hairline">
                            {methods.map(m => (
                                <ChoiceRow
                                    key={m}
                                    on={paymentMethod === m}
                                    onSelect={() => setPaymentMethod(m)}
                                    title={m === 'mobile_money' ? 'Mobile Money' : 'Cash'}
                                    sub={m === 'mobile_money'
                                        ? 'MTN, Telecel or AirtelTigo, through Hubtel'
                                        : orderType === 'delivery' ? 'Pay the rider at the door' : 'Pay at the counter'}
                                />
                            ))}
                        </div>
                    </Section>
                )}

                {/* ── The note ────────────────────────────────────────────── */}
                <div>
                    {noteOpen ? (
                        <Field
                            label={orderType === 'delivery' ? 'Note for the rider' : 'Note for the kitchen'}
                        >
                            <textarea
                                rows={3}
                                autoFocus
                                placeholder={orderType === 'delivery'
                                    ? 'Call me when you reach the gate.'
                                    : 'I will collect it myself.'}
                                value={contact.note}
                                onChange={e => set('note')(e.target.value)}
                                className={`${controlClass} resize-none py-3 leading-relaxed`}
                            />
                        </Field>
                    ) : (
                        <TextButton onClick={() => setNoteOpen(true)}>
                            {orderType === 'delivery' ? 'Add a note for the rider' : 'Add a note for the kitchen'}
                        </TextButton>
                    )}
                </div>

                <p className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                    <LockSimpleIcon size={12} weight="bold" className="shrink-0" />
                    Mobile Money goes through Hubtel. CediBites never sees your PIN.
                </p>
            </div>

            <BranchSelectorSheet isOpen={branchSheet} onClose={() => setBranchSheet(false)} />
        </>
    );
}
