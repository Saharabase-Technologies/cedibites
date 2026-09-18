import apiClient from '@/lib/api/client';

/**
 * Turn on browser notifications for one order.
 *
 * Deliberately not `usePushNotifications`. That hook calls `subscribe()` from a
 * `useEffect` on mount, which is right for an admin screen somebody has chosen
 * to open and wrong for a customer: a permission dialog that appears because a
 * page loaded is the one every browser is training people to dismiss. This runs
 * only from a tap.
 *
 * It also does not need an account. The three existing push routes all sit
 * behind `auth:sanctum`, which is why notifications have only ever worked for
 * staff, and most orders are placed by people who never sign in. The tracking
 * token from the link we text stands in for the login.
 */

export type PushResult =
    | 'subscribed'
    | 'denied'
    | 'unsupported'
    | 'failed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
}

export function pushSupported(): boolean {
    return typeof window !== 'undefined'
        && 'Notification' in window
        && 'serviceWorker' in navigator
        && 'PushManager' in window;
}

/**
 * An iPhone that could support push, but only once the site is installed.
 *
 * Safari implements the Push API **only for a site added to the Home Screen**.
 * In a normal Safari tab `Notification` and `PushManager` simply are not on
 * `window`, so `pushSupported()` is false and the whole opt-in disappears. That
 * is why the button shows on a laptop and not on the phone: nothing is broken,
 * Apple gates the API on installation.
 *
 * Detected rather than assumed: iOS if it looks like one, and not already
 * running standalone. `navigator.standalone` is Apple's own flag; the media
 * query catches the installed case on every other platform.
 */
export function pushNeedsHomeScreen(): boolean {
    if (typeof window === 'undefined' || pushSupported()) return false;

    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua)
        || (/macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (!ios) return false;

    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
        || window.matchMedia('(display-mode: standalone)').matches;

    return !standalone;
}

/** Byte-for-byte, so a subscription minted under an older VAPID key is caught. */
function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
    if (!a) return false;
    const seen = new Uint8Array(a);
    if (seen.length !== b.length) return false;
    return seen.every((byte, i) => byte === b[i]);
}

export async function subscribeToOrderUpdates(orderNumber: string, token: string): Promise<PushResult> {
    if (!pushSupported()) return 'unsupported';

    try {
        /**
         * Everything that can fail on its own happens before the dialog.
         *
         * This used to ask for permission first. The server had no VAPID key,
         * so the fetch below returned null and the whole thing failed — after
         * the customer had already said yes. A browser asks once and remembers
         * the answer, so that grant was spent on a request that could never
         * have worked, and there is no way to offer it to that person again.
         *
         * Permission is the one step with a cost to the reader, so it goes last
         * of the things that can go wrong.
         */
        const keyRes = await apiClient.get('/push/public-key') as { public_key?: string };
        const vapid = keyRes?.public_key;
        if (!vapid) return 'failed';

        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        const applicationServerKey = urlBase64ToUint8Array(vapid);

        /**
         * A subscription this browser already holds is only reusable while it
         * was minted under the key the server is signing with now. Rotating
         * VAPID invalidates every outstanding one, and reusing a stale
         * subscription fails silently at the push service: we would report
         * success and the phone would never buzz.
         */
        let existing = await registration.pushManager.getSubscription();
        if (existing && !sameKey(existing.options?.applicationServerKey, applicationServerKey)) {
            await existing.unsubscribe();
            existing = null;
        }

        // Only now, and only if there is nothing to reuse. An existing
        // subscription means permission was granted already.
        if (!existing) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return 'denied';
        }

        const subscription = existing ?? await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });

        const json = subscription.toJSON();
        await apiClient.post(`/orders/${orderNumber}/push-subscribe`, {
            t: token,
            endpoint: subscription.endpoint,
            keys: {
                p256dh: json.keys?.p256dh ?? '',
                auth: json.keys?.auth ?? '',
            },
            content_encoding: (subscription as PushSubscription & { contentEncoding?: string }).contentEncoding ?? 'aesgcm',
        });

        return 'subscribed';
    } catch {
        return 'failed';
    }
}
