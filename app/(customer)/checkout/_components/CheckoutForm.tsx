'use client';

import { useBranch } from '@/app/components/providers/BranchProvider';
import { isValidGhanaPhone } from '@/app/lib/phone';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import React, { useState } from 'react';
import AddressSearchField from './AddressSearchField';
import BranchSelectorSheet from './BranchSelectorSheet';
import { Field, Reveal, StepHeading, controlClass } from './Field';
import type { RecalledDetails } from './recall';
import { STAGES, stageIsBefore } from './types';
import type { ContactDetails, OrderType, PaymentMethod, Stage } from './types';

/**
 * The checkout, one question at a time.
 *
 * Everything used to be on screen at once: the delivery choice, the branch, an
 * address, a name, a number, a payment method and a note, seven answers stacked
 * down a phone. Nothing told you where to start and nothing told you when you
 * were done.
 *
 * Now one question is asked, answered, and folded into a line you can tap to
 * change. The next arrives in its place. Delivery or pickup travels with the
 * address, because choosing pickup changes what "where" means, and asking them
 * apart would let the second answer contradict the first.
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
 * A question already answered.
 *
 * The answer, not the question. "Delivery to Community 25" says what was asked
 * and what was said in one line, where "Where it goes: Community 25" would
 * spend half the row repeating a heading nobody needs twice.
 */
function Answered({ text, onChange }: { text: string; onChange: () => void }) {
    return (
        <div className="flex items-center gap-4 border-b border-hairline py-3.5">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{text}</p>
            <TextButton onClick={onChange} className="shrink-0">Change</TextButton>
        </div>
    );
}

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
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(o.value)}
                        className={`min-h-12 rounded-lg text-[15px] font-bold transition-colors duration-150 ease-out ${
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
            className="flex w-full items-center gap-4 py-4 text-left"
        >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150 ease-out ${
                on ? 'border-fg' : 'border-hairline-strong'
            }`}>
                {on && <span className="h-2.5 w-2.5 rounded-full bg-fg" />}
            </span>
            <span className="min-w-0">
                <span className="block text-[15px] font-bold text-fg">{title}</span>
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
    stage, onJumpTo,
    orderType, setOrderType, orderTypes,
    paymentMethod, setPaymentMethod, methods,
    contact, setContact, recalled,
}: {
    stage: Stage;
    onJumpTo: (s: Stage) => void;
    orderType: OrderType;
    setOrderType: (t: OrderType) => void;
    orderTypes: OrderType[];
    paymentMethod: PaymentMethod;
    setPaymentMethod: (m: PaymentMethod) => void;
    methods: PaymentMethod[];
    contact: ContactDetails;
    setContact: React.Dispatch<React.SetStateAction<ContactDetails>>;
    recalled: RecalledDetails;
}) {
    const { selectedBranch } = useBranch();
    const [branchSheet, setBranchSheet] = useState(false);
    const [noteOpen, setNoteOpen] = useState(Boolean(contact.note));
    const [phoneTouched, setPhoneTouched] = useState(false);

    const set = (field: keyof ContactDetails) => (v: string) =>
        setContact(c => ({ ...c, [field]: v }));

    const phoneError = phoneTouched && contact.phone.trim() && !isValidGhanaPhone(contact.phone)
        ? 'A Ghana number, like 0241234567.'
        : '';

    const branchShut = Boolean(selectedBranch && (!selectedBranch.isActive || !selectedBranch.isOpen));
    const canRecallAddress = orderType === 'delivery'
        && Boolean(recalled.address)
        && recalled.address !== contact.address;

    /** What a finished question reads as once it is folded away. */
    const answerFor = (s: Stage): string => {
        if (s === 'where') {
            return orderType === 'delivery'
                ? `Delivery to ${contact.address || 'an address'}`
                : `Pickup at ${selectedBranch?.name ?? 'the branch'}`;
        }
        if (s === 'who') return [contact.name, contact.phone].filter(Boolean).join(', ');
        return paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Cash';
    };

    return (
        <>
            <div className="flex flex-col">

                {branchShut && selectedBranch && (
                    <div className="mb-7">
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
                    </div>
                )}

                {/* Everything already settled, folded into a line each. */}
                {STAGES.filter(s => stageIsBefore(s, stage)).map(s => (
                    <Answered key={s} text={answerFor(s)} onChange={() => onJumpTo(s)} />
                ))}

                {/* The question being asked. */}
                <div className="pt-7">
                    <Reveal key={stage}>
                        {stage === 'where' && (
                            <div className="flex flex-col gap-6">
                                <StepHeading>How you want it</StepHeading>

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

                                {orderType === 'delivery' ? (
                                    <>
                                        <Field label="Where it goes">
                                            <AddressSearchField
                                                value={contact.address}
                                                onChange={set('address')}
                                                placeholder="Street, area or landmark"
                                            />
                                        </Field>

                                        {canRecallAddress && (
                                            <button
                                                onClick={() => set('address')(recalled.address)}
                                                className="-mt-2 flex min-w-0 items-center gap-2 self-start rounded-lg bg-surface-sunken px-3 py-2 text-left transition-opacity duration-150 ease-out hover:opacity-80"
                                            >
                                                <ArrowCounterClockwiseIcon size={13} weight="bold" className="shrink-0 text-fg-muted" />
                                                <span className="truncate text-[13px] font-semibold text-fg">{recalled.address}</span>
                                            </button>
                                        )}

                                        {selectedBranch && (
                                            <div className="flex items-center gap-4 border-t border-hairline pt-4">
                                                <p className="min-w-0 flex-1 text-sm text-fg-muted">
                                                    Cooked at <span className="font-bold text-fg">{selectedBranch.name}</span>
                                                </p>
                                                <TextButton onClick={() => setBranchSheet(true)} className="shrink-0">Change</TextButton>
                                            </div>
                                        )}
                                    </>
                                ) : selectedBranch ? (
                                    <div className="flex items-start gap-4 border-t border-hairline pt-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[15px] font-bold text-fg">{selectedBranch.name}</p>
                                            <p className="mt-1 text-sm leading-relaxed text-fg-muted">{selectedBranch.address}</p>
                                            <p className="mt-0.5 text-sm tabular-nums text-fg-muted">{selectedBranch.phone}</p>
                                        </div>
                                        <TextButton onClick={() => setBranchSheet(true)} className="shrink-0">Change</TextButton>
                                    </div>
                                ) : (
                                    <TextButton onClick={() => setBranchSheet(true)}>Pick a branch</TextButton>
                                )}
                            </div>
                        )}

                        {stage === 'who' && (
                            <div className="flex flex-col gap-6">
                                <StepHeading>Who it is for</StepHeading>

                                <div className="flex flex-col gap-5 sm:flex-row">
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

                                <p className="text-sm leading-relaxed text-fg-muted">
                                    The tracking link is sent to this number by SMS.
                                </p>
                            </div>
                        )}

                        {stage === 'pay' && (
                            <div className="flex flex-col gap-6">
                                <StepHeading>How you pay</StepHeading>

                                {methods.length > 0 && (
                                    <div role="radiogroup" className="divide-y divide-hairline border-y border-hairline">
                                        {methods.map(m => (
                                            <ChoiceRow
                                                key={m}
                                                on={paymentMethod === m}
                                                onSelect={() => setPaymentMethod(m)}
                                                title={m === 'mobile_money' ? 'Mobile Money' : 'Cash'}
                                                sub={m === 'mobile_money'
                                                    ? 'MTN, Telecel or AirtelTigo'
                                                    : orderType === 'delivery' ? 'Pay the rider at the door' : 'Pay at the counter'}
                                            />
                                        ))}
                                    </div>
                                )}

                                {noteOpen ? (
                                    <Field label={orderType === 'delivery' ? 'Note for the rider' : 'Note for the kitchen'}>
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
                                    <TextButton onClick={() => setNoteOpen(true)} className="self-start">
                                        {orderType === 'delivery' ? 'Add a note for the rider' : 'Add a note for the kitchen'}
                                    </TextButton>
                                )}
                            </div>
                        )}
                    </Reveal>
                </div>
            </div>

            <BranchSelectorSheet isOpen={branchSheet} onClose={() => setBranchSheet(false)} />
        </>
    );
}
