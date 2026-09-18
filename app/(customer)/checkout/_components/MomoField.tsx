'use client';

import apiClient from '@/lib/api/client';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';
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

/**
 * Answers Hubtel has already given, for as long as the tab is open.
 *
 * Every call that reaches Hubtel is a paid one. Going back from the review to
 * the payment question, or switching to cash and back, should not buy the same
 * answer twice. Only a definite yes or no is kept. "Could not ask" is asked
 * again.
 */
const answers = new Map<string, MomoCheck>();

export function useMomoCheck(number: string, enabled: boolean): { check: MomoCheck; checking: boolean } {
    const key = enabled && isValidGhanaPhone(number) ? normalizeGhanaPhone(number) : '';
    const [asked, setAsked] = useState<{ key: string; check: MomoCheck; checking: boolean }>({
        key: '', check: UNCHECKED, checking: false,
    });

    useEffect(() => {
        if (!key || answers.has(key)) return;

        // Nobody wants a lookup fired at every digit.
        let live = true;
        const t = setTimeout(async () => {
            setAsked({ key, check: UNCHECKED, checking: true });
            try {
                const res = await apiClient.post('/momo/verify', { momo_number: number }) as {
                    isRegistered?: boolean | null; name?: string | null; channel?: string | null;
                };
                if (!live) return;
                const next: MomoCheck = {
                    registered: res?.isRegistered ?? null,
                    name: res?.name ?? null,
                    network: res?.channel ? NETWORK[res.channel] ?? null : null,
                };
                if (next.registered !== null) answers.set(key, next);
                setAsked({ key, check: next, checking: false });
            } catch {
                // Not being able to check is not a reason to stop somebody
                // ordering. The prompt still goes out.
                if (live) setAsked({ key, check: UNCHECKED, checking: false });
            }
        }, 600);

        return () => { live = false; clearTimeout(t); };
    }, [key, number]);

    if (!key) return { check: UNCHECKED, checking: false };

    const known = answers.get(key);
    if (known) return { check: known, checking: false };

    // An answer about a number that is no longer in the box is not an answer
    // about this one. Until the new one lands, it is being checked.
    if (asked.key !== key) return { check: UNCHECKED, checking: true };
    return { check: asked.check, checking: asked.checking };
}

/**
 * The account holder's name in ordinary case.
 *
 * Hubtel returns it the way the network registered it, which is usually
 * capitals. "WILFRED DEBETERFAA SOMEH" on a line of 13px text reads as shouting.
 * A name that already has lower case in it is left exactly as it came.
 */
export function holderName(name: string): string {
    if (name !== name.toUpperCase()) return name;
    return name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** What we know about the number, in one line. Spans, so it can sit inside a row that is a button. */
export function MomoStatus({ check, checking }: { check: MomoCheck; checking: boolean }) {
    if (checking) {
        return (
            <span className="flex items-center gap-2 text-[13px] text-fg-muted">
                <SpinnerGapIcon size={13} className="shrink-0 animate-spin" />
                Checking the number
            </span>
        );
    }

    if (check.registered === true && check.name) {
        return (
            <span className="flex items-start gap-2 text-[13px] leading-snug text-fg">
                <CheckIcon size={13} weight="bold" className="mt-0.5 shrink-0 text-success-ink" />
                <span className="min-w-0 break-words">
                    {holderName(check.name)}
                    {check.network && <span className="text-fg-muted">, {check.network}</span>}
                </span>
            </span>
        );
    }

    if (check.registered === false) {
        return (
            <span className="flex items-start gap-2 text-[13px] font-semibold leading-snug text-danger-ink">
                <WarningCircleIcon size={13} weight="fill" className="mt-0.5 shrink-0" />
                No mobile money account on that number.
            </span>
        );
    }

    return null;
}

export function MomoNumberField({ value, onChange, check, checking }: {
    value: string;
    onChange: (v: string) => void;
    check: MomoCheck;
    checking: boolean;
}) {
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
            <MomoStatus check={check} checking={checking} />
        </Field>
    );
}
