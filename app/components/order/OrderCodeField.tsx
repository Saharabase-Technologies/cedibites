'use client';

import apiClient from '@/lib/api/client';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Type a code, go to that order.
 *
 * One copy, used by the track page and by the orders page when nobody is signed
 * in. Tracking has never needed an account: `GET /orders/by-number` is public
 * and throttled, so the field goes wherever somebody might be looking for their
 * food rather than behind a link to somewhere else.
 *
 * **The letters are filled in.** The series is on one prefix at a time, A then
 * B and, past Z999, the two-letter cycles, and the server says which. So the
 * customer reads 637 off their SMS and types 637. Anybody chasing an older
 * order from a previous cycle can still type the whole code: the moment a
 * letter is typed the field stops prefixing and takes what it is given.
 *
 * **The pattern used to be wrong and it was breaking prod.** It read
 * `/^[A-Z]\d{3}$/` with a four character limit, which only ever matched a
 * single letter. Prod has been on two letters for a while, and AH637 is a real
 * order number: five characters, so a customer could not finish typing it, and
 * it would have failed the test anyway. Anybody past Z999 could not track their
 * order at all.
 */
export default function OrderCodeField({ autoFocus = false }: { autoFocus?: boolean }) {
    const router = useRouter();
    const [prefix, setPrefix] = useState('');
    const [raw, setRaw] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let live = true;
        apiClient.get('/orders/current-prefix')
            .then(res => {
                const p = (res as { prefix?: string })?.prefix;
                if (live && typeof p === 'string' && /^[A-Z]{1,2}$/.test(p)) setPrefix(p);
            })
            .catch(() => { /* They type the whole code, as before. */ });
        return () => { live = false; };
    }, []);

    // A letter in the box means they are typing a code from another cycle, so
    // the prefix gets out of the way rather than doubling it up.
    const typedLetters = /[A-Za-z]/.test(raw);
    const showPrefix = Boolean(prefix) && !typedLetters;
    const code = (showPrefix ? prefix + raw : raw).toUpperCase();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!raw.trim()) {
            setError('Type the number from your SMS.');
            return;
        }

        // One or two letters, then three digits. AH637 and I404 are both real.
        if (!/^[A-Z]{1,2}\d{3}$/.test(code)) {
            setError(showPrefix
                ? 'An order number is three digits, like 637.'
                : 'That is not an order code. It is a letter or two, then three numbers.');
            return;
        }

        router.push(`/orders/${code}`);
    };

    return (
        <form onSubmit={submit} className="w-full max-w-sm">
            <div className="flex gap-2">
                <div className="flex min-h-13 min-w-0 flex-1 items-center rounded-xl border border-hairline bg-surface transition-colors duration-150 ease-out focus-within:border-fg">
                    {showPrefix && (
                        <span
                            aria-hidden
                            className="pl-4 text-lg font-bold uppercase tracking-[0.15em] text-fg-muted"
                        >
                            {prefix}
                        </span>
                    )}
                    <input
                        type="text"
                        // The number pad, while the code is still just digits.
                        inputMode={showPrefix ? 'numeric' : 'text'}
                        autoCapitalize="characters"
                        autoComplete="off"
                        maxLength={showPrefix ? 3 : 5}
                        autoFocus={autoFocus}
                        value={raw}
                        onChange={e => { setRaw(e.target.value.toUpperCase()); setError(''); }}
                        placeholder={showPrefix ? '637' : 'AH637'}
                        aria-label={showPrefix ? `Order number, after ${prefix}` : 'Order code'}
                        className={`min-w-0 flex-1 bg-transparent py-3 text-lg font-bold uppercase tracking-[0.15em] text-fg outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-fg-subtle ${
                            showPrefix ? 'pl-1 pr-4' : 'px-4 text-center'
                        }`}
                    />
                </div>

                <button
                    type="submit"
                    aria-label="Track this order"
                    className="grid min-h-13 w-13 shrink-0 place-items-center rounded-xl bg-fg text-white transition-opacity duration-150 ease-out hover:opacity-90"
                >
                    <ArrowRightIcon size={18} weight="bold" />
                </button>
            </div>

            {error && (
                <p className="mt-2.5 text-left text-[13px] font-semibold text-danger-ink">{error}</p>
            )}
        </form>
    );
}
