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

export async function subscribeToOrderUpdates(orderNumber: string, token: string): Promise<PushResult> {
    if (!pushSupported()) return 'unsupported';

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return 'denied';

        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        const keyRes = await apiClient.get('/push/public-key') as { public_key?: string };
        const vapid = keyRes?.public_key;
        if (!vapid) return 'failed';

        const existing = await registration.pushManager.getSubscription();
        const subscription = existing ?? await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid).buffer as ArrayBuffer,
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
