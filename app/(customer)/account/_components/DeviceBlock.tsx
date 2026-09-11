'use client';

import { Group, ReviewRow } from '@/app/(customer)/checkout/_components/Field';
import { pushNeedsHomeScreen } from '@/lib/orders/orderPush';
import { disableDevicePush, enableDevicePush, readPushState, type PushState } from '@/lib/push/devicePush';
import { toast } from '@/lib/utils/toast';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { dangerActionLook } from './parts';

/**
 * What belongs to the device in hand rather than to the account.
 *
 * A push subscription belongs to a browser, and signing out ends the session on
 * this one. Everything else on the page follows the customer to any phone they
 * sign in on. On a desk this block sits in its own column for that reason.
 *
 * The copy says "this device" on purpose. Do not reword it into an account-wide
 * setting: somebody signed in on a phone and a laptop allows it on each.
 */

export interface DevicePush {
    state: PushState | null;
    busy: boolean;
    needsHomeScreen: boolean;
    toggle: () => void;
}

/** Whether the browser is an iPhone tab cannot change while the page is open. */
const neverChanges = () => () => {};

/**
 * The switch's state, held once for the page.
 *
 * The block is drawn in two places, the left column on a desk and the foot of
 * the page on a phone, and only one is ever shown. Held here, the two cannot
 * disagree about whether this browser is subscribed.
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

    return { state, busy, needsHomeScreen, toggle: () => { void toggle(); } };
}

/** The answer, then the one thing somebody in that state needs to know. */
const COPY: Record<PushState, { value: string; sub: string }> = {
    on: {
        value: 'On for this device',
        sub: 'A phone and a computer are each switched on separately.',
    },
    off: {
        value: 'Off for this device',
        sub: 'Switch on and we tell you when the kitchen starts and when the rider leaves.',
    },
    blocked: {
        value: 'Blocked by this browser',
        sub: 'Allow notifications for this site in your browser settings, then come back.',
    },
    unsupported: {
        value: 'This browser cannot show them',
        sub: 'The SMS still comes to your number on every order.',
    },
};

function NotificationRow({ push }: { push: DevicePush }) {
    // iOS refuses the Push API outside a Home Screen install, so a switch here
    // would be a control that cannot work. Say how to get one instead.
    if (push.needsHomeScreen) {
        return (
            <ReviewRow
                caption="Notifications"
                value="Only from the Home Screen on iPhone"
                placeholder=""
                sub="Tap Share, choose Add to Home Screen, then open CediBites from there."
            />
        );
    }

    if (push.state === null) {
        return (
            <div aria-hidden className="motion-safe:animate-pulse">
                <div className="h-3 w-24 rounded-lg bg-surface-sunken" />
                <div className="mt-2 h-4 w-40 rounded-lg bg-surface-sunken" />
                <div className="mt-2 h-3 w-full max-w-60 rounded-lg bg-surface-sunken" />
            </div>
        );
    }

    const copy = COPY[push.state];
    const on = push.state === 'on';
    const canToggle = on || push.state === 'off';

    return (
        <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
                <ReviewRow caption="Notifications" value={copy.value} placeholder="" sub={copy.sub} />
            </div>

            {canToggle && (
                // The button is the full 44px target. The track drawn inside it
                // is the size a switch should look.
                <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label="Notifications on this device"
                    onClick={push.toggle}
                    disabled={push.busy}
                    className="-mr-1 -mt-1 grid h-11 w-14 shrink-0 place-items-center disabled:opacity-60"
                >
                    <span
                        aria-hidden
                        className={`relative h-7 w-12 rounded-lg transition-colors duration-150 ease-out motion-reduce:transition-none ${
                            on ? 'bg-success' : 'bg-hairline-strong'
                        }`}
                    >
                        <span
                            className={`absolute top-1 h-5 w-5 rounded-md bg-white transition-[left] duration-150 ease-out motion-reduce:transition-none ${
                                on ? 'left-6' : 'left-1'
                            }`}
                        />
                    </span>
                </button>
            )}
        </div>
    );
}

export default function DeviceBlock({ push, onSignOut, className = '' }: {
    push: DevicePush;
    onSignOut: () => void;
    className?: string;
}) {
    return (
        <div className={className}>
            <Group>
                <NotificationRow push={push} />
                <button
                    type="button"
                    onClick={onSignOut}
                    className={`${dangerActionLook} self-start hover:bg-danger-soft`}
                >
                    Sign out
                </button>
            </Group>

            {/* On the ground rather than in the block. It is not a setting, it
                is how to reach a person. The five greyed rows of features that
                are not built became this one line in the version before. */}
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-fg-muted">
                To close your account, ring the kitchen and we will do it for you.
            </p>
        </div>
    );
}
