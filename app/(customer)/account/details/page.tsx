'use client';

import { Field, Group } from '@/app/(customer)/checkout/_components/Field';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { formatGhanaPhone } from '@/app/lib/phone';
import { toast } from '@/lib/utils/toast';
import React, { useState } from 'react';
import { useAccount } from '../_components/AccountContext';
import AccountShell from '../_components/AccountShell';
import { FIELD } from '../_components/parts';

/**
 * Name, email and the number the account belongs to, on one screen with one
 * Save.
 *
 * The number is shown the way a field that cannot be typed into looks: sunken,
 * with no border. It is the account. The sign-in code goes to it, and moving it
 * needs a code sent to the new one, which is not built.
 */
function DetailsForm({ name, email, phone }: { name: string; email: string; phone: string }) {
    const { updateProfile } = useAuth();
    const { goUp } = useAccount();

    const [draftName, setDraftName] = useState(name);
    const [draftEmail, setDraftEmail] = useState(email);
    const [saving, setSaving] = useState(false);

    const changed = draftName.trim() !== name.trim() || draftEmail.trim() !== email.trim();
    const valid = draftName.trim().length > 0;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!changed || !valid || saving) return;

        setSaving(true);
        const result = await updateProfile({ name: draftName.trim(), email: draftEmail.trim() || null });
        setSaving(false);

        if (result.success) {
            toast.success('Details saved');
            goUp('/account');
        } else {
            toast.error(result.error ?? 'Could not save your details');
        }
    };

    return (
        <AccountShell
            title="Your details"
            parent="/account"
            foot={{ label: 'Save', form: 'account-details', waiting: !changed || !valid, busy: saving }}
        >
            <form id="account-details" onSubmit={submit}>
                <Group className="lg:p-6">
                    <Field label="Name">
                        <input
                            type="text"
                            autoComplete="name"
                            aria-label="Name"
                            value={draftName}
                            onChange={e => setDraftName(e.target.value)}
                            placeholder="Kwame Mensah"
                            disabled={saving}
                            className={`${FIELD} disabled:opacity-60`}
                        />
                    </Field>

                    <Field label="Email">
                        <input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            aria-label="Email"
                            value={draftEmail}
                            onChange={e => setDraftEmail(e.target.value)}
                            placeholder="name@example.com"
                            disabled={saving}
                            className={`${FIELD} disabled:opacity-60`}
                        />
                    </Field>

                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-fg-muted">Phone</p>
                        <p className="flex min-h-12 items-center rounded-xl bg-surface-sunken px-4 text-[15px] font-semibold tabular-nums text-fg">
                            {formatGhanaPhone(phone)}
                        </p>
                        <p className="text-[13px] text-fg-muted">You sign in with this number.</p>
                    </div>
                </Group>
            </form>
        </AccountShell>
    );
}

export default function DetailsPage() {
    const { user } = useAuth();
    if (!user) return null;

    // Keyed on what is saved, so the fields start again from the server's copy
    // whenever it changes, including just after a save.
    return (
        <DetailsForm
            key={`${user.name}|${user.email ?? ''}`}
            name={user.name}
            email={user.email ?? ''}
            phone={user.phone}
        />
    );
}
