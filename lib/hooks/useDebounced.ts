import { useEffect, useState } from 'react';

/**
 * The value, but only once it has stopped changing for a moment.
 *
 * For inputs whose consequence is expensive. The audience count is a scan of the
 * order history, and firing one per keystroke would run it for "3" and "30"
 * while somebody types thirty.
 */
export function useDebounced<T>(value: T, delayMs = 400): T {
    const [settled, setSettled] = useState(value);

    // Compared by content, not identity: the audience rules are rebuilt as a new
    // object on every edit, so an identity check would never settle.
    const fingerprint = JSON.stringify(value);

    useEffect(() => {
        const timer = setTimeout(() => setSettled(value), delayMs);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fingerprint, delayMs]);

    return settled;
}
