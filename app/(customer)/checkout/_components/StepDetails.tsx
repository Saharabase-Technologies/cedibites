'use client';

import React from 'react';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { isValidGhanaPhone } from '@/app/lib/phone';
import { ArrowRightIcon, BagIcon, NoteIcon, PencilSimpleIcon, PhoneIcon, StorefrontIcon, TruckIcon, UserIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import AddressSearchField from './AddressSearchField';
import BranchSelectorSheet from './BranchSelectorSheet';
import InputField from './InputField';
import type { ContactDetails, OrderType, Step } from './types';

// ─── Step 1 ───────────────────────────────────────────────────────────────────
export default function StepDetails({ orderType, setOrderType, contact, setContact, onNext }: {
    orderType: OrderType; setOrderType: (t: OrderType) => void;
    contact: ContactDetails; setContact: (c: ContactDetails) => void; onNext: () => void;
}) {
    const { selectedBranch } = useBranch();
    const [branchSheetOpen, setBranchSheetOpen] = useState(false);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const update = (f: keyof ContactDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setContact({ ...contact, [f]: e.target.value });
    const phoneError = phoneTouched && contact.phone.trim() && !isValidGhanaPhone(contact.phone) ? 'Enter a valid Ghana number (e.g. 0241234567 or +233241234567)' : '';

    // Filter order types by branch settings
    const allOrderTypes = [
        { type: 'delivery' as const, icon: <TruckIcon weight="fill" size={22} />, label: 'Delivery', sub: 'Delivered to you' },
        { type: 'pickup' as const, icon: <BagIcon weight="fill" size={22} />, label: 'Pickup', sub: 'Pick up at branch' },
    ];
    const enabledOrderTypes = selectedBranch
        ? allOrderTypes.filter(ot => selectedBranch.orderTypes[ot.type]?.is_enabled !== false)
        : allOrderTypes;

    // Auto-select order type if only one is available
    useEffect(() => {
        if (enabledOrderTypes.length === 1 && orderType !== enabledOrderTypes[0].type) {
            setOrderType(enabledOrderTypes[0].type);
        }
    }, [enabledOrderTypes.length]);

    const branchUnavailable = selectedBranch && (!selectedBranch.isActive || !selectedBranch.isOpen);
    const canProceed = !branchUnavailable && enabledOrderTypes.length > 0 && contact.name.trim() && contact.phone.trim() && isValidGhanaPhone(contact.phone) && (orderType === 'pickup' || contact.address.trim());

    return (
        <>
            <div className="flex flex-col gap-5">
                <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                    <h2 className="font-bold text-text-dark dark:text-text-light">How do you want your order?</h2>
                    {enabledOrderTypes.length === 0 ? (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-error/5 border border-error/20">
                            <WarningCircleIcon weight="fill" size={20} className="text-error shrink-0" />
                            <p className="text-sm text-error">No order types are currently available at this branch.</p>
                        </div>
                    ) : (
                        <div className={`grid gap-3 ${enabledOrderTypes.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2'}`}>
                            {enabledOrderTypes.map(({ type, icon, label, sub }) => (
                                <button key={type} onClick={() => setOrderType(type)}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 cursor-pointer
                                        ${orderType === type ? 'border-primary bg-primary/8 text-primary' : 'border-neutral-gray/15 text-neutral-gray hover:border-primary/30'}`}>
                                    <span className={orderType === type ? 'text-primary' : 'text-neutral-gray'}>{icon}</span>
                                    <span className="text-sm font-bold">{label}</span>
                                    <span className="text-xs opacity-70">{sub}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedBranch && (
                    <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between cursor-pointer">
                            <h2 className="font-bold text-text-dark dark:text-text-light">{orderType === 'delivery' ? 'Delivering From' : 'Pickup Location'}</h2>
                            <button onClick={() => setBranchSheetOpen(true)} className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer">
                                <PencilSimpleIcon size={12} /> Change Branch
                            </button>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-light dark:bg-brown/30">
                            <StorefrontIcon weight="fill" size={18} className="text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-text-dark dark:text-text-light">{selectedBranch.name} Branch</p>
                                <p className="text-xs text-neutral-gray mt-0.5">{selectedBranch.address}</p>
                                <p className="text-xs text-neutral-gray mt-0.5">{selectedBranch.phone}</p>
                            </div>
                        </div>
                        {orderType === 'delivery' && (
                            <div className="flex items-center gap-2 text-sm text-neutral-gray">
                                <span>Estimated: <strong className="text-text-dark dark:text-text-light">25-40 mins</strong></span>
                                <span className="ml-auto text-xs font-semibold text-text-dark dark:text-text-light">₵{selectedBranch.deliveryFee} delivery fee</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    <h2 className="font-bold text-text-dark dark:text-text-light">Your Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField icon={<UserIcon weight="fill" size={15} />} label="Full Name" required>
                            <input type="text" placeholder="e.g. Kwame Mensah" value={contact.name} onChange={update('name')} className="w-full bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60" />
                        </InputField>
                        <div className="flex flex-col gap-1">
                            <InputField icon={<PhoneIcon weight="fill" size={15} />} label="Phone Number" required>
                                <input type="tel" placeholder="0241234567" value={contact.phone} onChange={update('phone')} onBlur={() => setPhoneTouched(true)} className="w-full bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60" />
                            </InputField>
                            {phoneError && <p className="text-xs text-red-500 px-1">{phoneError}</p>}
                        </div>
                    </div>
                    {orderType === 'delivery' && (
                        <AddressSearchField value={contact.address} onChange={addr => setContact({ ...contact, address: addr })} placeholder="Search your delivery address..." />
                    )}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5"><NoteIcon weight="fill" size={13} /> Note to Rider (Optional)</label>
                        <div className="bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus-within:border-primary rounded-xl transition-all overflow-hidden">
                            <textarea rows={2} placeholder="e.g. Call me when you reach the gate..." value={contact.note} onChange={update('note')}
                                className="w-full px-3.5 py-3 text-sm bg-transparent outline-none resize-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60" />
                        </div>
                    </div>
                </div>

                <button onClick={onNext} disabled={!canProceed}
                    className={`flex cursor-pointer items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]
                        ${canProceed ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-neutral-gray/20 text-neutral-gray cursor-not-allowed'}`}>
                    Continue to Payment <ArrowRightIcon weight="bold" size={18} />
                </button>
            </div>
            <BranchSelectorSheet isOpen={branchSheetOpen} onClose={() => setBranchSheetOpen(false)} />
        </>
    );
}
