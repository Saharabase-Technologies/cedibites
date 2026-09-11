'use client';

import { useAuth } from '@/app/components/providers/AuthProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AccountContext, useDevicePush } from './_components/AccountContext';

/**
 * Everything the account screens share: the guard, the grey ground, the
 * notification state, Sign out, and a back arrow that goes back.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const { isLoggedIn, isRestoring, logout } = useAuth();
    const { openAuth } = useModal();
    const router = useRouter();
    const pathname = usePathname();
    const push = useDevicePush();

    /** Set on the way out, so signing out lands on home without the sign-in sheet over it. */
    const signingOut = useRef(false);

    /**
     * Guests go home. Signed-in customers do not.
     *
     * Nothing is decided until the restore is finished: `isLoggedIn` is false
     * for everybody on the first render, and acting on that threw a signed-in
     * customer to the home screen on every visit.
     */
    useEffect(() => {
        if (isRestoring || isLoggedIn) return;
        if (!signingOut.current) openAuth();
        router.replace('/');
    }, [isRestoring, isLoggedIn, openAuth, router]);

    const signOut = useCallback(() => {
        signingOut.current = true;
        logout();
    }, [logout]);

    /**
     * The account screens this tab has shown, most recent last.
     *
     * When the screen behind this one is the one the arrow points at, the arrow
     * is the browser's Back, so the arrow and the phone's own back gesture agree
     * afterwards. A screen opened straight from a link has nothing behind it, so
     * the arrow goes to its parent instead. Always pushing the parent stacked
     * the hub, the list and the hub again, and the back gesture then walked
     * somebody through screens they had already left.
     */
    const trail = useRef<string[]>([]);
    useEffect(() => {
        const t = trail.current;
        if (t[t.length - 1] !== pathname) t.push(pathname);
    }, [pathname]);

    const goUp = useCallback((parent: string) => {
        const t = trail.current;
        if (t.length >= 2 && t[t.length - 2] === parent) {
            t.pop();
            router.back();
        } else {
            router.push(parent);
        }
    }, [router]);

    const value = useMemo(() => ({ push, signOut, goUp }), [push, signOut, goUp]);

    // The grey is down before anything else, so reading the session back does
    // not flash the lighter ground first.
    if (isRestoring || !isLoggedIn) {
        return <div data-ground="sunken" aria-hidden className="min-h-[60svh]" />;
    }

    return (
        <AccountContext.Provider value={value}>
            <div data-ground="sunken">{children}</div>
        </AccountContext.Provider>
    );
}
