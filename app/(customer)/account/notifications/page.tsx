'use client';

import { Group, ReviewRow } from '@/app/(customer)/checkout/_components/Field';
import { SmallAction } from '@/app/components/ui/QuietControls';
import type { PushState } from '@/lib/push/devicePush';
import { useAccount } from '../_components/AccountContext';
import AccountShell from '../_components/AccountShell';

/**
 * Notifications, for the device in hand.
 *
 * Turning them on is the red button at the foot, because it is the thing this
 * screen is for. Turning them off is a small grey button in the block, because
 * nobody should do it by accident.
 */

const VALUE: Record<PushState, string> = {
    on: 'On',
    off: 'Off',
    blocked: 'Blocked by this browser',
    unsupported: 'Not available in this browser',
};

const EXPLAIN: Record<PushState, string> = {
    on: 'This device gets a notification when the kitchen starts your order and when the rider leaves.',
    off: 'Turn them on and this device gets a notification when the kitchen starts your order and when the rider leaves.',
    blocked: 'Allow notifications for this site in the browser settings, then come back to this screen.',
    unsupported: 'This browser cannot show notifications from a website.',
};

// iOS refuses the Push API outside a Home Screen install, so a button here
// would be a control that cannot work. Say how to get one instead.
const HOME_SCREEN_STEPS = [
    'Tap Share at the bottom of Safari.',
    'Choose Add to Home Screen.',
    'Open CediBites from your Home Screen and come back here.',
];

export default function NotificationsPage() {
    const { push } = useAccount();
    const canTurnOn = !push.needsHomeScreen && push.state === 'off';

    return (
        <AccountShell
            title="Notifications"
            parent="/account"
            foot={canTurnOn ? { label: 'Turn on for this device', onPress: push.toggle, busy: push.busy } : undefined}
        >
            <Group className="lg:p-6">
                {push.needsHomeScreen ? (
                    <>
                        <ReviewRow caption="On this iPhone" value="Only from the Home Screen" placeholder="" />
                        <ol className="flex flex-col gap-3">
                            {HOME_SCREEN_STEPS.map((step, i) => (
                                <li key={step} className="flex items-start gap-3 text-[15px] leading-snug text-fg">
                                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-fg text-[12px] font-bold tabular-nums text-surface">
                                        {i + 1}
                                    </span>
                                    <span className="pt-0.5">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </>
                ) : push.state === null ? (
                    <div aria-hidden className="motion-safe:animate-pulse">
                        <div className="h-3 w-24 rounded-lg bg-surface-sunken" />
                        <div className="mt-2 h-4 w-16 rounded-lg bg-surface-sunken" />
                        <div className="mt-2.5 h-3 w-full max-w-72 rounded-lg bg-surface-sunken" />
                    </div>
                ) : (
                    <>
                        <ReviewRow
                            caption="On this device"
                            value={VALUE[push.state]}
                            placeholder=""
                            sub={EXPLAIN[push.state]}
                        />
                        {push.state === 'on' && (
                            <SmallAction onClick={push.toggle} disabled={push.busy} className="self-start">
                                Turn off for this device
                            </SmallAction>
                        )}
                    </>
                )}
            </Group>

            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-fg-muted">
                Each phone and computer is switched on separately. The SMS comes to your number on every order either way.
            </p>
        </AccountShell>
    );
}
