'use client';

import type { Branch } from '@/app/components/providers/BranchProvider';
import { BranchStateBadge } from '@/app/components/ui/QuietControls';
import { formatGhanaPhone } from '@/app/lib/phone';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import React from 'react';
import { methodLabel } from './availability';
import { Group, ReviewRow } from './Field';
import { MomoStatus, type MomoCheck } from './MomoField';
import type { ContactDetails, OrderType, PaymentMethod, Question } from './types';

/**
 * The answers, together, on the page where the customer checks them and pays.
 *
 * Each question had a screen of its own. Here each answer is one row, and
 * Change takes them back to that one question. Continue there comes straight
 * back here rather than on through the questions after it.
 */
export default function CheckoutForm({
    branch, orderType, paymentMethod,
    contact, momoNumber, momoCheck, momoChecking,
    onChange,
}: {
    branch: Branch | null;
    orderType: OrderType;
    paymentMethod: PaymentMethod;
    contact: ContactDetails;
    momoNumber: string;
    momoCheck: MomoCheck;
    momoChecking: boolean;
    onChange: (question: Question) => void;
}) {
    // Cached by react-query, so this costs nothing beyond the account page's
    // own fetch. Empty for a guest.
    const { addresses } = useAddresses();

    const address = contact.address.trim();
    const saved = address ? addresses.find(a => a.full_address.trim() === address) : undefined;

    const name = contact.name.trim();
    const phone = contact.phone.trim();
    const who = [name, phone && formatGhanaPhone(phone)].filter(Boolean).join(', ');
    const kitchenNote = contact.kitchenNote.trim();
    // A rider note written before somebody switched to pickup is not sent, so
    // it is not shown here either.
    const riderNote = orderType === 'delivery' ? contact.riderNote.trim() : '';

    /** Both notes, labelled the way the ticket will carry them. */
    const notes = kitchenNote || riderNote
        ? (
            <>
                {kitchenNote && <span className="block">For the kitchen: {kitchenNote}</span>}
                {riderNote && (
                    <span className={kitchenNote ? 'mt-1 block' : 'block'}>For the rider: {riderNote}</span>
                )}
            </>
        )
        : undefined;

    const momo = momoNumber.trim();

    return (
        <div className="flex flex-col gap-4">
            <Group>
                {orderType === 'delivery' ? (
                    <ReviewRow
                        caption={saved?.label ? `Delivery to ${saved.label}` : 'Delivery to'}
                        value={address}
                        placeholder="No address yet"
                        sub={notes}
                        action={address ? 'Change' : 'Add'}
                        onPress={() => onChange('where')}
                    />
                ) : (
                    <ReviewRow
                        caption="Pickup at"
                        value={branch?.name}
                        placeholder="No branch yet"
                        badge={<BranchStateBadge branch={branch} />}
                        sub={branch?.address || notes
                            ? <>{branch?.address}{notes && <span className="mt-1 block">{notes}</span>}</>
                            : undefined}
                        action="Change"
                        onPress={() => onChange('where')}
                    />
                )}

                <ReviewRow
                    caption="Order for"
                    value={who}
                    placeholder="No name or number yet"
                    action={name && phone ? 'Change' : 'Add'}
                    onPress={() => onChange('who')}
                />
            </Group>

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
                    action="Change"
                    onPress={() => onChange('pay')}
                />
            </Group>
        </div>
    );
}
