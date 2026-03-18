'use client';

import { useState, Fragment } from 'react';
import {
    CaretLeftIcon,
    UserIcon,
    DeviceMobileIcon,
    MapPinIcon,
    NoteIcon,
    MoneyIcon,
    HandCoinsIcon,
    SpinnerIcon,
    WarningCircleIcon,
    LockSimpleIcon,
    ProhibitIcon,
    TagIcon,
} from '@phosphor-icons/react';
import { useBranch } from '@/app/components/providers/BranchProvider';
import type { PaymentMethod } from '@/types/order';
import { useNewOrder } from '../context';
import { formatGHS, ORDER_SOURCES } from '../utils';

// ─── Step 4: Review & Pay ─────────────────────────────────────────────────────

const PAYMENT_OPTIONS: {
    id: PaymentMethod;
    label: string;
    sub: string;
    icon: React.ElementType;
    only?: 'delivery' | 'pickup';
}[] = [
        { id: 'mobile_money',      label: 'Mobile Money',     sub: 'MTN, Telecel, AirtelTigo',   icon: DeviceMobileIcon },
        { id: 'cash',      label: 'Cash on Delivery', sub: 'Paid when delivered',         icon: MoneyIcon,    only: 'delivery' },
        { id: 'cash',      label: 'Cash at Pickup',   sub: 'Paid at branch',              icon: HandCoinsIcon, only: 'pickup' },
        { id: 'no_charge', label: 'No Charge',        sub: 'Staff meal — not billed',     icon: ProhibitIcon },
    ];

export default function StepReview() {
    const {
        cart, customer, orderType, source, branchId,
        payment, isSubmitting, promo, discount,
        setPayment, submit, setStep,
    } = useNewOrder();
    const { branches } = useBranch();

    const [momoNetwork, setMomoNetwork] = useState<'mtn' | 'telecel' | 'airteltigo' | null>(null);
    const [momoPhone, setMomoPhone] = useState('');

    const branch = branches.find(b => b.id === branchId);
    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = orderType === 'delivery' ? (branch?.deliveryFee ?? 0) : 0;
    const total = cartTotal + deliveryFee - discount;

    const availablePayments = PAYMENT_OPTIONS.filter(p => !p.only || p.only === orderType);
    const sourceLabel = ORDER_SOURCES.find(s => s.id === source)?.label ?? source ?? '';

    return (
        <div className="flex flex-col overflow-y-auto custom-scrollbar2 pr-2 gap-6">

            {/* Order summary */}
            <div className="bg-brown border border-brown-light/15 rounded-2xl  ">
                <div className="px-4 py-3 border-b border-brown-light/15 flex items-center justify-between">
                    <p className="text-text-light text-sm font-semibold font-body">Order Summary</p>
                    <span className="text-[10px] font-medium text-neutral-gray bg-brown-light/10 border border-brown-light/20 px-2 py-0.5 rounded-full font-body">
                        via {sourceLabel}
                    </span>
                </div>

                {/* Items */}
                <div className="px-4 py-3 flex flex-col gap-2 border-b border-brown-light/15">
                    {cart.map(item => (
                        <div key={item.cartKey} className="flex items-center justify-between">
                            <span className="text-text-light text-sm font-body">
                                {item.quantity}× {item.name}
                                {item.variantLabel && (
                                    <span className="text-neutral-gray"> ({item.variantLabel})</span>
                                )}
                            </span>
                            <span className="text-neutral-gray text-sm font-body">
                                {formatGHS(item.price * item.quantity)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm font-body">
                        <span className="text-neutral-gray">Subtotal</span>
                        <span className="text-text-light">{formatGHS(cartTotal)}</span>
                    </div>
                    {orderType === 'delivery' && (
                        <div className="flex justify-between text-sm font-body">
                            <span className="text-neutral-gray">Delivery ({branch?.name})</span>
                            <span className="text-text-light">{formatGHS(deliveryFee)}</span>
                        </div>
                    )}
                    {promo && discount > 0 && (
                        <div className="flex justify-between text-sm font-body">
                            <span className="flex items-center gap-1.5 text-secondary">
                                <TagIcon size={12} weight="fill" />
                                {promo.name}
                            </span>
                            <span className="text-secondary">-{formatGHS(discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-semibold font-body pt-1 border-t border-brown-light/15 mt-1">
                        <span className="text-text-light">Total</span>
                        <span className="text-primary">{formatGHS(Math.max(0, total))}</span>
                    </div>
                </div>
            </div>

            {/* Customer summary */}
            <div className="bg-brown border border-brown-light/15 rounded-2xl px-4 py-4 flex flex-col gap-2">
                <p className="text-text-light text-sm font-semibold font-body mb-1">Customer</p>
                <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-neutral-gray shrink-0" />
                    <span className="text-text-light text-sm font-body">{customer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <DeviceMobileIcon size={14} className="text-neutral-gray shrink-0" />
                    <span className="text-text-light text-sm font-body">{customer.phone}</span>
                </div>
                {orderType === 'delivery' && (
                    <div className="flex items-start gap-2">
                        <MapPinIcon size={14} className="text-neutral-gray shrink-0 mt-0.5" />
                        <span className="text-text-light text-sm font-body">{customer.address}</span>
                    </div>
                )}
                {orderType === 'pickup' && (
                    <div className="flex items-center gap-2">
                        <MapPinIcon size={14} className="text-neutral-gray shrink-0" />
                        <span className="text-text-light text-sm font-body">Pickup at {branch?.name}</span>
                    </div>
                )}
                {customer.notes && (
                    <div className="flex items-start gap-2 mt-1 pt-2 border-t border-brown-light/15">
                        <NoteIcon size={14} className="text-neutral-gray shrink-0 mt-0.5" />
                        <span className="text-neutral-gray text-xs font-body italic">{customer.notes}</span>
                    </div>
                )}
            </div>

            {/* Payment method */}
            <div>
                <h2 className="text-text-dark dark:text-text-light text-sm font-semibold font-body mb-3">Payment Method</h2>
                <div className="flex flex-col gap-2">
                    {availablePayments.map(({ id, label, sub, icon: Icon }, idx) => (
                        <Fragment key={`${id}-${label}`}>
                            <button
                                type="button"
                                onClick={() => setPayment(id)}
                                className={`
                                    flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left
                                    transition-all duration-150 cursor-pointer
                                    ${payment === id
                                        ? 'border-primary bg-primary/10'
                                        : 'border-brown-light/20 hover:border-brown-light/40'
                                    }
                                `}
                            >
                                <Icon
                                    size={22}
                                    weight={payment === id ? 'fill' : 'regular'}
                                    className={payment === id ? 'text-primary shrink-0' : 'text-neutral-gray shrink-0'}
                                />
                                <div>
                                    <p className={`text-sm font-semibold font-body ${payment === id ? 'text-text-dark dark:text-primary' : 'text-text-dark dark:text-text-light'}`}>
                                        {label}
                                    </p>
                                    <p className="text-neutral-gray text-xs font-body">{sub}</p>
                                </div>
                            </button>

                            {id === 'mobile_money' && payment === 'mobile_money' && idx === 0 && (
                                <div className="flex flex-col gap-3 px-4 py-3.5 rounded-2xl border-2 border-brown-light/20">
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-gray mb-1.5 block">Mobile Network</label>
                                        <div className="flex gap-2">
                                            {(['mtn', 'telecel', 'airteltigo'] as const).map(net => (
                                                <button
                                                    key={net}
                                                    type="button"
                                                    onClick={() => setMomoNetwork(net)}
                                                    className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all duration-150 cursor-pointer ${momoNetwork === net ? 'border-primary bg-primary/10 text-primary' : 'border-brown-light/20 text-neutral-gray hover:border-brown-light/40'}`}
                                                >
                                                    {net === 'airteltigo' ? 'AirtelTigo' : net.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-gray mb-1.5 block">MoMo Number</label>
                                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-brown-light/20">
                                            <DeviceMobileIcon size={16} className="text-neutral-gray shrink-0" />
                                            <input
                                                type="tel"
                                                placeholder="+233 24 000 0000"
                                                value={momoPhone}
                                                onChange={e => setMomoPhone(e.target.value)}
                                                className="w-full bg-transparent outline-none placeholder:text-neutral-gray/50 text-text-dark dark:text-text-light text-sm font-body"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-gray flex items-center gap-1.5">
                                        <LockSimpleIcon size={11} /> Customer will receive a prompt on their phone to confirm payment
                                    </p>
                                </div>
                            )}
                        </Fragment>
                    ))}
                </div>
            </div>

            {/* Missing payment warning */}
            {!payment && (
                <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl px-4 py-2.5">
                    <WarningCircleIcon size={16} weight="fill" className="text-warning shrink-0" />
                    <p className="text-warning text-xs font-body">Select a payment method to place the order.</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-3.5 rounded-full border border-brown-light/30 text-neutral-gray text-sm font-body hover:text-text-light disabled:opacity-40 transition-colors cursor-pointer"
                >
                    <CaretLeftIcon size={14} weight="bold" /> Back
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={!payment || (payment === 'mobile_money' && !momoNetwork) || isSubmitting}
                    className="
            flex-1 flex items-center justify-center gap-2
            bg-primary hover:bg-primary-hover
            disabled:opacity-40 disabled:cursor-not-allowed
            text-brand-darker font-semibold font-body py-3.5 rounded-full
            transition-all duration-150 cursor-pointer text-sm
          "
                >
                    {isSubmitting ? (
                        <><SpinnerIcon size={18} weight="bold" className="animate-spin" /> Placing Order...</>
                    ) : (
                        <>Place Order &mdash; {formatGHS(Math.max(0, total))}</>
                    )}
                </button>
            </div>
        </div>
    );
}
