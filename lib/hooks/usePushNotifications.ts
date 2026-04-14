'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import apiClient from '@/lib/api/client';

/**
 * Manages Web Push subscription lifecycle.
 * - Registers the service worker
 * - Requests notification permission
 * - Subscribes to push and sends the subscription to the backend
 */
export function usePushNotifications() {
  const subscribedRef = useRef(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const subscribe = useCallback(async () => {
    if (subscribedRef.current) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      // 2. Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 3. Get VAPID public key from backend
      const vapidResponse = await apiClient.get('/push/vapid-key');
      const vapidPublicKey = (vapidResponse as { data?: { public_key?: string } })?.data?.public_key;
      if (!vapidPublicKey) {
        console.warn('Push: No VAPID public key from server');
        return;
      }

      // 4. Subscribe to push
      const existingSub = await registration.pushManager.getSubscription();
      let subscription = existingSub;

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // 5. Send subscription to backend
      const subJson = subscription.toJSON();
      await apiClient.post('/push/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh ?? '',
          auth: subJson.keys?.auth ?? '',
        },
        content_encoding: (subscription as PushSubscription & { contentEncoding?: string }).contentEncoding ?? 'aesgcm',
      });

      subscribedRef.current = true;
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  }, []);

  // Auto-subscribe on mount (for admin pages)
  useEffect(() => {
    subscribe();
  }, [subscribe]);

  return { permission, subscribe };
}

/**
 * Convert a base64url-encoded string to a Uint8Array (for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
