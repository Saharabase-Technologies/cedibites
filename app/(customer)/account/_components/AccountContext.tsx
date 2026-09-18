'use client';

import { pushNeedsHomeScreen } from '@/lib/orders/orderPush';
import { disableDevicePush, enableDevicePush, readPushState, type PushState } from '@/lib/push/devicePush';
import { toast } from '@/lib/utils/toast';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

/**
 * What every account screen shares, held once in the account layout.
 *
 * The hub's Notifications row and the Notifications screen both read the same
 * switch, so the two can never disagree about whether this browser is
 * subscribed. The back arrow and Sign out live here for the same reason.
 */

export interface DevicePush {
    state: PushState | null;
    busy: boolean;
    needsHomeScreen: boolean;
    toggle: () => void;
}

export interface AccountValue {
    push: DevicePush;
    signOut: () => void;
    /** Back to `parent`, by the browser's own Back when that is where we came from. */
    goUp: (parent: string) => void;
}

export const AccountContext = createContext<AccountValue | null>(null);

export function useAccount(): AccountValue {
    const value = useContext(AccountContext);
    if (!value) throw new Error('useAccount is only for screens inside the account layout');
    return value;
}

/** Whether the browser is an iPhone tab cannot change while the page is open. */
const neverChanges = () => () => {};

/**
 * Notifications for this browser.
 *
 * A push subscription belongs to a browser, not to a person. Somebody signed in
 * on a phone and a laptop allows it on each, and turning it off turns off the
 * device in hand and no other. The copy says "this device" for that reason. Do
 * not reword it into an account-wide setting.
 */
export function useDevicePush(): DevicePush {
    const [state, setState] = useState<PushState | null>(null);
    const [busy, setBusy] = useState(false);

    // Asked of the browser, never of the server, which has no user agent to
    // read. The server answer is no, and the first client render corrects it.
    const needsHomeScreen = useSyncExternalStore(neverChanges, pushNeedsHomeScreen, () => false);

    useEffect(() => {
        readPushState().then(setState);
    }, []);

    const toggle = useCallback(async () => {
        if (!state || busy) return;
        setBusy(true);
        const next = state === 'on' ? await disableDevicePush() : await enableDevicePush();
        setState(next);
        setBusy(false);

        if (next === 'on') toast.success('This device will tell you when your order moves');
        else if (next === 'blocked') toast.error('Your browser is blocking notifications');
        else if (state === 'on') toast.info('Notifications off for this device');
        else toast.error('That did not take. The SMS still comes either way.');
    }, [state, busy]);

    return useMemo(
        () => ({ state, busy, needsHomeScreen, toggle: () => { void toggle(); } }),
        [state, busy, needsHomeScreen, toggle],
    );
}

/** The state in a few words, for the hub's row. Nothing while it is still being read. */
export function pushLabel(push: DevicePush): string | undefined {
    if (push.needsHomeScreen) return 'Only from the Home Screen';
    switch (push.state) {
        case 'on': return 'On for this device';
        case 'off': return 'Off for this device';
        case 'blocked': return 'Blocked by this browser';
        case 'unsupported': return 'Not in this browser';
        default: return undefined;
    }
}
