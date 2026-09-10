'use client';

import apiClient from '@/lib/api/client';
import { pushSupported } from '@/lib/orders/orderPush';

/**
 * Notifications for the account, on this device.
 *
 * `orderPush.ts` turns them on for one order using the tracking token, because
 * most orders are placed by people who never sign in. This is the other half:
 * a signed-in customer switching them on for good, from the account page, using
 * the authenticated `/push/subscribe` route that has existed all along.
 *
 * **A subscription belongs to a browser, not to a person.** Somebody signed in
 * on a phone and a laptop has to allow it on each, and switching it off here
 * switches it off for the device in hand and no other. The screen says so
 * rather than implying an account-wide setting.
 */

export type PushState =
    /** No Push API here at all. On iOS that means a Safari tab, not a failure. */
    | 'unsupported'
    /** The browser has refused, and only its own settings can undo that. */
    | 'blocked'
    /** Supported, permitted or not yet asked, but nothing subscribed. */
    | 'off'
    | 'on';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
}

/** What this browser is currently doing, without asking it for anything. */
export async function readPushState(): Promise<PushState> {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'blocked';

    try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const existing = await registration?.pushManager.getSubscription();
        return existing ? 'on' : 'off';
    } catch {
        return 'off';
    }
}

/**
 * Turn them on for this browser.
 *
 * The key is fetched before permission is asked, for the reason written up in
 * `orderPush.ts`: a browser asks once and remembers, so a grant spent on a
 * request that could not have worked is a grant you never get back.
 */
export async function enableDevicePush(): Promise<PushState> {
    if (!pushSupported()) return 'unsupported';

    try {
        const keyRes = await apiClient.get('/push/vapid-key') as { public_key?: string };
        const vapid = keyRes?.public_key;
        if (!vapid) return 'off';

        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        const applicationServerKey = urlBase64ToUint8Array(vapid);

        let existing = await registration.pushManager.getSubscription();
        // Minted under an older VAPID key, which fails silently at the push
        // service rather than here. Drop it and take a fresh one.
        if (existing) {
            const held = existing.options?.applicationServerKey;
            const same = held
                && new Uint8Array(held).length === applicationServerKey.length
                && new Uint8Array(held).every((b, i) => b === applicationServerKey[i]);
            if (!same) { await existing.unsubscribe(); existing = null; }
        }

        if (!existing) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return 'blocked';
        }

        const subscription = existing ?? await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });

        const json = subscription.toJSON();
        await apiClient.post('/push/subscribe', {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: json.keys?.p256dh ?? '',
                auth: json.keys?.auth ?? '',
            },
            content_encoding: (subscription as PushSubscription & { contentEncoding?: string }).contentEncoding ?? 'aesgcm',
        });

        return 'on';
    } catch {
        return 'off';
    }
}

/**
 * Turn them off for this browser.
 *
 * The server row goes first. If the browser-side unsubscribe fails we would
 * rather have stopped sending than have a switch that reads off while messages
 * keep arriving.
 */
export async function disableDevicePush(): Promise<PushState> {
    if (!pushSupported()) return 'unsupported';

    try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const existing = await registration?.pushManager.getSubscription();

        if (existing) {
            await apiClient.post('/push/unsubscribe', { endpoint: existing.endpoint });
            await existing.unsubscribe();
        }

        return 'off';
    } catch {
        return 'on';
    }
}
