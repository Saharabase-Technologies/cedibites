'use client';

import apiClient from '@/lib/api/client';
import { EMAIL, PHONE_DIAL, PHONE_DISPLAY, WHATSAPP_NUMBER } from '@/lib/constants/contact';
import { EnvelopeIcon, PhoneIcon, WhatsappLogoIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import AccountShell from '../_components/AccountShell';
import LinkRow from '../_components/LinkRow';

/**
 * A person, for when something is wrong with an order or the account.
 *
 * Until this, the footer on the home screen was the only place in the customer
 * app that offered a way to reach the kitchen without an order in flight. The
 * numbers are the footer's, from `lib/constants/contact.ts`.
 */

/** "08:00" as "8:00 am", the way checkout says when a branch opens. */
function clock(time24: string): string {
    const [h, m] = time24.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return time24;
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

export default function ContactPage() {
    /**
     * The hours the kitchen is staffed, from the server's setting.
     *
     * Absent until it answers, and absent if it never does. A time we cannot
     * stand behind is worse than no time.
     */
    const [hours, setHours] = useState<string | null>(null);

    useEffect(() => {
        apiClient.get('/checkout-config').then((res: unknown) => {
            const d = (res as { data?: { global_operating_hours_open?: string; global_operating_hours_close?: string } })?.data;
            if (d?.global_operating_hours_open && d?.global_operating_hours_close) {
                setHours(`${clock(d.global_operating_hours_open)} to ${clock(d.global_operating_hours_close)}`);
            }
        }).catch(() => { /* say nothing about hours */ });
    }, []);

    return (
        <AccountShell title="Contact us" parent="/account">
            <div className="flex flex-col rounded-2xl bg-surface p-2">
                <LinkRow
                    external
                    href={`tel:${PHONE_DIAL}`}
                    icon={<PhoneIcon size={18} weight="fill" />}
                    title="Call the kitchen"
                    sub={PHONE_DISPLAY}
                />
                <LinkRow
                    external
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    icon={<WhatsappLogoIcon size={18} weight="fill" />}
                    title="WhatsApp"
                    sub={PHONE_DISPLAY}
                />
                <LinkRow
                    external
                    href={`mailto:${EMAIL}`}
                    icon={<EnvelopeIcon size={18} weight="fill" />}
                    title="Email"
                    sub={EMAIL}
                />
            </div>

            <div className="mt-4 flex max-w-md flex-col gap-2 text-[13px] leading-relaxed text-fg-muted">
                {hours && <p>Somebody is at the kitchen every day, {hours}.</p>}
                <p>To close your account, call the kitchen and we will do it for you.</p>
            </div>
        </AccountShell>
    );
}
