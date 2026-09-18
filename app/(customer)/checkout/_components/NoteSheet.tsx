'use client';

import BottomSheet from '@/app/components/ui/BottomSheet';
import { XIcon } from '@phosphor-icons/react';
import React, { useEffect, useRef } from 'react';
import { Field, controlClass } from './Field';
import type { ContactDetails, OrderType } from './types';

/**
 * Anything to say about the order, in one place.
 *
 * The address question carried two buttons, "Add a note for the kitchen" and
 * "Add a note for the rider". Two of the same control side by side made the
 * lightest screen in the flow look like a toolbar, and most orders press
 * neither. One button opens this instead.
 *
 * Who each note is for is a label on a field rather than a choice to make
 * before you can type, so somebody with something to say about the food and
 * something to say about the gate writes both without going round twice.
 */
export default function NoteSheet({ open, onClose, orderType, contact, setContact }: {
    open: boolean;
    /**
     * Must keep its identity between renders. BottomSheet re-runs its focus
     * effect when this changes, which pulls focus out of the box being typed in.
     */
    onClose: () => void;
    orderType: OrderType;
    contact: ContactDetails;
    setContact: React.Dispatch<React.SetStateAction<ContactDetails>>;
}) {
    const kitchen = useRef<HTMLTextAreaElement>(null);

    /*
     * BottomSheet takes focus for its own panel in an effect, and a parent's
     * effect runs after its children's, so a plain autoFocus loses that race
     * and the keyboard never comes up. The sign-in sheet waits a beat too.
     */
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => kitchen.current?.focus(), 60);
        return () => clearTimeout(t);
    }, [open]);

    const header = (
        <div className="flex items-center gap-2 px-5 pb-3 pt-1 sm:pt-5">
            <h2 className="flex-1 text-lg font-bold text-fg">Add a note</h2>
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
                onClick={onClose}
                className="flex min-h-15 w-full items-center justify-center rounded-xl bg-primary-fill px-5 text-base font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
            >
                Done
            </button>
        </div>
    );

    return (
        <BottomSheet open={open} onClose={onClose} label="Add a note" header={header} footer={footer}>
            <div className="flex flex-col gap-5 px-5 pb-6 pt-1">
                {/* The kitchen first. An allergy is why this exists, and it is
                    the note that changes what is cooked rather than where it
                    is dropped. */}
                <Field label="For the kitchen">
                    <textarea
                        ref={kitchen}
                        rows={2}
                        placeholder="No pepper, or an allergy we should know about."
                        value={contact.kitchenNote}
                        onChange={e => setContact(c => ({ ...c, kitchenNote: e.target.value }))}
                        className={`${controlClass} resize-none py-3 leading-relaxed`}
                    />
                </Field>

                {orderType === 'delivery' && (
                    <Field label="For the rider">
                        <textarea
                            rows={2}
                            placeholder="Call me when you reach the gate."
                            value={contact.riderNote}
                            onChange={e => setContact(c => ({ ...c, riderNote: e.target.value }))}
                            className={`${controlClass} resize-none py-3 leading-relaxed`}
                        />
                    </Field>
                )}
            </div>
        </BottomSheet>
    );
}
