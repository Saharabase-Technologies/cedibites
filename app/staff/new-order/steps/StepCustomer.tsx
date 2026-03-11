'use client';

import { useState } from 'react';
import {
    CaretLeftIcon,
    CaretRightIcon,
    UserIcon,
    DeviceMobileIcon,
    EnvelopeIcon,
    NoteIcon,
    PlusIcon,
} from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import AddressSearchField from '@/app/components/base/AddressSearchField';
import type { FulfillmentType } from '@/types/order';
import type { CustomerDetails } from '../types';
import { useNewOrder } from '../context';
import { formatPhone } from '../utils';

// ─── Step 3: Customer details ─────────────────────────────────────────────────

export default function StepCustomer() {
    const { customer, orderType, patchCustomer, setOrderType, setStep } = useNewOrder();
    const [showEmail, setShowEmail] = useState(!!customer.email);
    const [showNotes, setShowNotes] = useState(!!customer.notes);
    const [errors, setErrors] = useState<Partial<CustomerDetails>>({});

    const validate = () => {
        const e: Partial<CustomerDetails> = {};
        if (!customer.name.trim()) e.name = 'Customer name is required';
        if (!customer.phone.trim()) e.phone = 'Phone number is required';
        else {
            const digits = customer.phone.replace(/\D/g, '');
            if (digits.length < 10) e.phone = 'Enter a valid phone number';
        }
        if (orderType === 'delivery' && !customer.address.trim()) {
            e.address = 'Delivery address is required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validate()) setStep(4);
    };

    return (
        <div className="flex flex-col h-full">

            {/* Scrollable form fields */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-6 pb-2">

            {/* Delivery / Pickup toggle */}
            <div>
                <h2 className="text-text-dark dark:text-text-light text-sm font-semibold font-body mb-3">Order type</h2>
                <div className="flex gap-2 p-1 bg-brown rounded-2xl">
                    {(['delivery', 'pickup'] as FulfillmentType[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setOrderType(t)}
                            className={`
                flex-1 py-2.5 rounded-xl text-sm font-semibold font-body capitalize
                transition-all duration-150 cursor-pointer
                ${orderType === t
                                    ? 'bg-primary text-brand-darker shadow-sm'
                                    : 'text-neutral-gray hover:text-text-light'
                                }
              `}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Name */}
            <Input
                label="Customer Name"
                placeholder="Full name"
                value={customer.name}
                onChange={v => { patchCustomer({ name: v }); setErrors(e => ({ ...e, name: undefined })); }}
                leftIcon={<UserIcon size={20} weight="bold" />}
                errorText={errors.name}
                required
                autoComplete="off"
            />

            {/* Phone */}
            <div>
                <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="024 XXX XXXX"
                    value={customer.phone}
                    onChange={v => {
                        patchCustomer({ phone: formatPhone(v) });
                        setErrors(e => ({ ...e, phone: undefined }));
                    }}
                    leftIcon={<DeviceMobileIcon size={20} weight="bold" />}
                    errorText={errors.phone}
                    required
                    autoComplete="off"
                />
                <p className="text-neutral-gray text-xs font-body mt-1.5 px-1">
                    Customer will receive SMS updates on this number.
                </p>
            </div>

            {/* Address — delivery only */}
            {orderType === 'delivery' && (
                <AddressSearchField
                    label="Delivery Address"
                    placeholder="Search customer delivery address..."
                    value={customer.address}
                    onChange={v => { patchCustomer({ address: v }); setErrors(e => ({ ...e, address: undefined })); }}
                    errorText={errors.address}
                    required
                />
            )}

            {/* Email — optional, collapsed */}
            {showEmail ? (
                <Input
                    label="Email Address"
                    type="email"
                    placeholder="customer@email.com"
                    value={customer.email}
                    onChange={v => patchCustomer({ email: v })}
                    leftIcon={<EnvelopeIcon size={20} weight="bold" />}
                    helperText="Optional — for order confirmation"
                    autoComplete="off"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setShowEmail(true)}
                    className="flex items-center gap-2 text-neutral-gray hover:text-primary text-sm font-body transition-colors cursor-pointer w-fit"
                >
                    <PlusIcon size={16} weight="bold" />
                    Add email address (optional)
                </button>
            )}

            {/* Notes — optional, collapsed */}
            {showNotes ? (
                <div>
                    <label className="block text-sm font-medium text-text-dark dark:text-text-light font-body mb-1.5">
                        Order Notes
                    </label>
                    <div className="relative">
                        <NoteIcon size={20} weight="bold" className="absolute left-4 top-3.5 text-neutral-gray pointer-events-none" />
                        <textarea
                            value={customer.notes}
                            onChange={e => patchCustomer({ notes: e.target.value })}
                            placeholder="Special instructions from customer..."
                            maxLength={200}
                            rows={3}
                            className="
                w-full pl-12 pr-4 py-3
                bg-neutral-light dark:bg-brand-dark
                border-2 border-neutral-gray/50 focus:border-primary
                rounded-2xl text-text-dark dark:text-text-light
                placeholder:text-neutral-gray
                text-sm font-body
                outline-none resize-none transition-colors duration-150
              "
                        />
                        <span className="absolute bottom-2.5 right-3 text-xs text-neutral-gray font-body">
                            {customer.notes.length}/200
                        </span>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowNotes(true)}
                    className="flex items-center gap-2 text-neutral-gray hover:text-primary text-sm font-body transition-colors cursor-pointer w-fit"
                >
                    <PlusIcon size={16} weight="bold" />
                    Add order notes (optional)
                </button>
            )}

            </div>{/* end scrollable fields */}

            {/* Nav buttons — pinned at bottom */}
            <div className="shrink-0 flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 px-5 py-3.5 rounded-full border border-brown-light/30 text-neutral-gray text-sm font-body hover:text-text-light transition-colors cursor-pointer"
                >
                    <CaretLeftIcon size={14} weight="bold" /> Back
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-brand-darker font-semibold font-body py-3.5 rounded-full transition-colors cursor-pointer text-sm"
                >
                    Review & Pay <CaretRightIcon size={14} weight="bold" />
                </button>
            </div>
        </div>
    );
}
