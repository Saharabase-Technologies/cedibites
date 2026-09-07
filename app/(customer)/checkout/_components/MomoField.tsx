'use client';

import apiClient from '@/lib/api/client';
import { isValidGhanaPhone } from '@/app/lib/phone';
import { CheckIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Field, controlClass } from './Field';

/**
 * The number the prompt goes to, and whose name is on it.
 *
 * Checkout used to hand the customer to a Hubtel page that asked for this
 * number all over again, on a screen that looks nothing like ours, and a good
 * share of them never came back. The number is asked for here now and the
 * prompt goes straight to the handset.
 *
 * Which is exactly why the name is read back. A mistyped number is money asked
 * of a stranger and a customer sitting there waiting to approve something that
 * will never arrive. The till has done this since it was built.
 */

/** What Hubtel calls the networks, and what everybody else calls them. */
const NETWORK: Record<string, string> = {
    'mtn-gh': 'MTN',
    'vodafone-gh': 'Telecel',
    'tigo-gh': 'AirtelTigo',
};

export interface MomoCheck {
    /** True, false, or null when Hubtel could not be reached. */
    registered: boolean | null;
    name: string | null;
    network: string | null;
}

export const UNCHECKED: MomoCheck = { registered: null, name: null, network: null };

export default function MomoField({ value, onChange, onChecked }: {
    value: string;
    onChange: (v: string) => void;
    onChecked: (c: MomoCheck) => void;
}) {
    const [checking, setChecking] = useState(false);
    const [check, setCheck] = useState<MomoCheck>(UNCHECKED);

    const usable = isValidGhanaPhone(value);

    useEffect(() => {
        if (!usable) {
            setCheck(UNCHECKED);
            onChecked(UNCHECKED);
            return;
        }

        // Nobody wants a lookup fired at every digit, and every call that
        // reaches Hubtel is a paid one.
        let live = true;
        const t = setTimeout(async () => {
            setChecking(true);
            try {
                const res = await apiClient.post('/momo/verify', { momo_number: value }) as {
                    isRegistered?: boolean | null; name?: string | null; channel?: string | null;
                };
                if (!live) return;
                const next: MomoCheck = {
                    registered: res?.isRegistered ?? null,
                    name: res?.name ?? null,
                    network: res?.channel ? NETWORK[res.channel] ?? null : null,
                };
                setCheck(next);
                onChecked(next);
            } catch {
                // Not being able to check is not a reason to stop somebody
                // ordering. The prompt still goes out.
                if (!live) return;
                setCheck(UNCHECKED);
                onChecked(UNCHECKED);
            } finally {
                if (live) setChecking(false);
            }
        }, 600);

        return () => { live = false; clearTimeout(t); };
    }, [value, usable, onChecked]);

    return (
        <Field label="The number to charge">
            <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0241234567"
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`${controlClass} tabular-nums`}
            />

            {checking && (
                <p className="flex items-center gap-2 text-[13px] text-fg-muted">
                    <SpinnerGapIcon size={13} className="animate-spin" />
                    Checking the number
                </p>
            )}

            {!checking && check.registered === true && check.name && (
                <p className="flex items-center gap-2 text-[13px] text-fg">
                    <CheckIcon size={13} weight="bold" className="shrink-0 text-success-ink" />
                    <span className="font-bold">{check.name}</span>
                    {check.network && <span className="text-fg-muted">on {check.network}</span>}
                </p>
            )}

            {!checking && check.registered === false && (
                <p className="flex items-center gap-2 text-[13px] font-semibold text-danger-ink">
                    <WarningCircleIcon size={13} weight="fill" className="shrink-0" />
                    No mobile money account on that number.
                </p>
            )}
        </Field>
    );
}
