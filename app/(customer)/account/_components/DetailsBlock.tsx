'use client';

import { Field, Group, ReviewRow } from '@/app/(customer)/checkout/_components/Field';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { SmallAction } from '@/app/components/ui/QuietControls';
import { formatGhanaPhone } from '@/app/lib/phone';
import { toast } from '@/lib/utils/toast';
import React, { useState } from 'react';
import { FIELD, SaveButton } from './parts';

/**
 * Who the account belongs to: name, phone and email.
 *
 * Each is a checkout row, and Change opens the field in the same place rather
 * than in a sheet. There is one thing to type, and the page it sits on is
 * already about the thing being changed.
 *
 * The rows used to be a fixed-width label beside the value with a pencil at the
 * end, under an 11px uppercase heading, with a hairline between each. The
 * captions name themselves, so the block needs no heading.
 */

type Saved = { success: boolean; error?: string };

function EditableRow({ caption, value, empty, placeholder, type = 'text', autoComplete, required, onSave }: {
    caption: string;
    value: string;
    /** Said in place of the value when there is none. */
    empty: string;
    placeholder: string;
    type?: 'text' | 'email';
    autoComplete: string;
    /** Whether it has to have something in it. An email can be taken off; a name cannot. */
    required?: boolean;
    onSave: (next: string) => Promise<Saved>;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);

    // The draft is taken from the saved value at the moment the field opens,
    // so a name changed on another device is what somebody starts from.
    const open = () => { setDraft(value); setEditing(true); };
    const close = () => setEditing(false);

    const commit = async (e: React.FormEvent) => {
        e.preventDefault();
        const next = draft.trim();
        if (next === value.trim()) { close(); return; }

        setSaving(true);
        const result = await onSave(next);
        setSaving(false);

        if (result.success) {
            close();
            toast.success(`${caption} saved`);
        } else {
            toast.error(result.error ?? `Could not save your ${caption.toLowerCase()}`);
        }
    };

    if (!editing) {
        return (
            <ReviewRow
                caption={caption}
                value={value}
                placeholder={empty}
                action={value ? 'Change' : 'Add'}
                onPress={open}
            />
        );
    }

    return (
        <form
            onSubmit={commit}
            onKeyDown={e => { if (e.key === 'Escape' && !saving) close(); }}
            className="flex flex-col gap-3"
        >
            <Field label={caption}>
                <input
                    type={type}
                    inputMode={type === 'email' ? 'email' : undefined}
                    autoComplete={autoComplete}
                    aria-label={caption}
                    autoFocus
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={placeholder}
                    disabled={saving}
                    className={`${FIELD} disabled:opacity-60`}
                />
            </Field>

            <div className="flex items-center gap-2">
                <SaveButton busy={saving} disabled={required && !draft.trim()}>Save</SaveButton>
                <SmallAction onClick={close} disabled={saving}>Cancel</SmallAction>
            </div>
        </form>
    );
}

export default function DetailsBlock({ className }: { className?: string }) {
    const { user, updateProfile } = useAuth();
    if (!user) return null;

    return (
        <Group className={className}>
            <EditableRow
                caption="Name"
                value={user.name || ''}
                empty="No name yet"
                placeholder="Kwame Mensah"
                autoComplete="name"
                required
                onSave={name => updateProfile({ name })}
            />

            {/* No Change here. The number is the account: the sign-in code goes
                to it, and moving it needs a code sent to the new one, which is
                not built. The line under it says why, once. */}
            <ReviewRow
                caption="Phone"
                value={formatGhanaPhone(user.phone)}
                placeholder=""
                sub="You sign in with this number."
            />

            <EditableRow
                caption="Email"
                value={user.email || ''}
                empty="None yet"
                placeholder="name@example.com"
                type="email"
                autoComplete="email"
                onSave={email => updateProfile({ email: email || null })}
            />
        </Group>
    );
}
