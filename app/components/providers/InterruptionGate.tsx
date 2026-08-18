'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Whether it is a fair moment to take over somebody's screen.
 *
 * A caution that lands mid-sale is worse than the problem it reports: the
 * cashier loses their place, the customer is standing there, and the message
 * gets dismissed unread out of irritation. So nothing interrupts while work is
 * in progress.
 *
 * Modules register a named claim while they are busy — the POS while a cart has
 * lines or a payment sheet is open, the new-order wizard while it is on screen.
 * The gate is open only when every claim has been released.
 *
 * Claims are NAMED rather than counted. A counter drifts: one component
 * unmounting without decrementing leaves the gate shut forever, and the failure
 * is invisible, because "no messages appear" looks identical to "there are no
 * messages". A named claim is idempotent and can be inspected.
 */

interface InterruptionGateValue {
    /** True when nobody is mid-task and an interstitial may show. */
    isIdle: boolean;
    /** What is currently holding the gate shut. Useful when debugging. */
    claims: string[];
    /** Hold the gate shut. Safe to call repeatedly with the same reason. */
    claim: (reason: string) => void;
    release: (reason: string) => void;
}

const InterruptionGateContext = createContext<InterruptionGateValue | null>(null);

export function InterruptionGateProvider({ children }: { children: React.ReactNode }) {
    const [claims, setClaims] = useState<string[]>([]);

    const claim = useCallback((reason: string) => {
        setClaims((current) => (current.includes(reason) ? current : [...current, reason]));
    }, []);

    const release = useCallback((reason: string) => {
        setClaims((current) => current.filter((entry) => entry !== reason));
    }, []);

    const value = useMemo(
        () => ({ isIdle: claims.length === 0, claims, claim, release }),
        [claims, claim, release],
    );

    return (
        <InterruptionGateContext.Provider value={value}>
            {children}
        </InterruptionGateContext.Provider>
    );
}

/**
 * Read the gate.
 *
 * Returns a permanently-open gate when no provider is mounted, so a surface
 * that never registers busy-ness — the admin portal, a profile page — behaves
 * sensibly instead of never showing anything.
 */
export function useInterruptionGate(): InterruptionGateValue {
    const context = useContext(InterruptionGateContext);

    return (
        context ?? {
            isIdle: true,
            claims: [],
            claim: () => {},
            release: () => {},
        }
    );
}

/**
 * Hold the gate shut for as long as `active` is true; release on unmount.
 *
 * The unmount release is the half that matters. Without it, navigating away
 * mid-order — exactly what a busy cashier does — leaves the claim standing and
 * no caution ever appears again for the rest of the session.
 */
export function useHoldsInterruption(reason: string, active: boolean): void {
    const { claim, release } = useInterruptionGate();

    useEffect(() => {
        if (!active) {
            release(reason);
            return;
        }

        claim(reason);

        return () => release(reason);
    }, [reason, active, claim, release]);
}
