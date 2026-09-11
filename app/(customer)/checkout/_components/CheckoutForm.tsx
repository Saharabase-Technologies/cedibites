'use client';

import type { Branch } from '@/app/components/providers/BranchProvider';
import { BranchStateBadge } from '@/app/components/ui/QuietControls';
import { formatGhanaPhone } from '@/app/lib/phone';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import React from 'react';
import { methodLabel } from './availability';
import { Group, ReviewRow } from './Field';
import { MomoStatus, type MomoCheck } from './MomoField';
import type { ContactDetails, OrderType, PaymentMethod, SheetName } from './types';

/**
 * The checkout, as one screen you read down and then pay.
 *
 * It was seven answers stacked down a phone, then three questions asked one at
 * a time. The stepped version fixed "where do I start", but every answer folded
 * into a line above the next question, so by the payment step three recap rows
 * sat on top of it, and a signed-in customer walked three screens to confirm
 * things we already knew.
 *
 * Now every answer is on the screen at once, each one a row that opens a sheet.
 * A returning customer checks three rows and pays. Somebody with nothing saved
 * presses the button, which says what is missing and opens that sheet, and is
 * walked down the rows one sheet at a time.
 */

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

export default function CheckoutForm({
    branch,
    orderType, setOrderType, orderTypes,
    paymentMethod, methods,
    contact, momoNumber, momoCheck, momoChecking,
    onOpen,
}: {
    branch: Branch | null;
    orderType: OrderType;
    setOrderType: (t: OrderType) => void;
    orderTypes: OrderType[];
    paymentMethod: PaymentMethod;
    methods: PaymentMethod[];
    contact: ContactDetails;
    momoNumber: string;
    momoCheck: MomoCheck;
    momoChecking: boolean;
    onOpen: (target: SheetName | 'branch') => void;
}) {
    // Cached by react-query, so this costs nothing beyond the account page's
    // own fetch. Empty for a guest.
    const { addresses } = useAddresses();

    const address = contact.address.trim();
    const saved = address ? addresses.find(a => a.full_address.trim() === address) : undefined;

    const name = contact.name.trim();
    const phone = contact.phone.trim();
    const who = [name, phone && formatGhanaPhone(phone)].filter(Boolean).join(', ');
    const note = contact.note.trim();

    const momo = momoNumber.trim();
    const canChangePayment = methods.length > 1 || paymentMethod === 'mobile_money';

    return (
        <div className="flex flex-col gap-4">
            <Group>
                {/* Delivery or pickup sits with the address, because choosing
                    pickup changes what "where" means. */}
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
                    <ReviewRow
                        caption={saved?.label ? `Delivery to ${saved.label}` : 'Delivery to'}
                        value={address}
                        placeholder="No address yet"
                        sub={note ? `“${note}”` : undefined}
                        action={address ? 'Change' : 'Add'}
                        onPress={() => onOpen('where')}
                    />
                ) : (
                    <ReviewRow
                        caption="Pickup at"
                        value={branch?.name}
                        placeholder="No branch yet"
                        badge={<BranchStateBadge branch={branch} />}
                        sub={branch?.address}
                        action={branch ? 'Change' : 'Choose'}
                        onPress={() => onOpen('branch')}
                    />
                )}

                <ReviewRow
                    caption="Order for"
                    value={who}
                    placeholder="No name or number yet"
                    sub={orderType === 'pickup' && note ? `“${note}”` : undefined}
                    action={name && phone ? 'Change' : 'Add'}
                    onPress={() => onOpen('who')}
                />
            </Group>

            {methods.length > 0 && (
                <Group>
                    <ReviewRow
                        caption="Pay with"
                        value={paymentMethod === 'mobile_money' && momo
                            ? `Mobile Money, ${formatGhanaPhone(momo)}`
                            : methodLabel(paymentMethod, orderType)}
                        placeholder=""
                        sub={paymentMethod === 'mobile_money'
                            ? (momo ? <MomoStatus check={momoCheck} checking={momoChecking} /> : 'No number to charge yet')
                            : undefined}
                        action={canChangePayment ? 'Change' : undefined}
                        onPress={canChangePayment ? () => onOpen('pay') : undefined}
                    />
                </Group>
            )}
        </div>
    );
}
