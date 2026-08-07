'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';
import { toast } from '@/lib/utils/toast';

/**
 * Plays a soft two-tone ascending chime using the Web Audio API.
 */
function playNotificationSound(): void {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First tone (D5 — 587 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 587;
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain1.gain.linearRampToValueAtTime(0, now + 0.3);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second tone (G5 — 784 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 784;
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.2);
    gain2.gain.linearRampToValueAtTime(0, now + 0.5);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);

    // Cleanup
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Audio not available — silent fail
  }
}

interface CancelRequestEvent {
  type: string;
  order: {
    id: number;
    order_number: string;
    status: string;
    contact_name?: string;
    cancel_request_reason?: string;
    cancel_requested_by_user?: { name?: string };
  };
}

/**
 * Listens to ALL branch channels for cancel_requested events via Echo.
 * When one arrives: plays a sound, shows a toast, and shows a browser notification.
 *
 * @param branchIds - Array of branch IDs to monitor (admin monitors all)
 */
export function useCancelRequestAlerts(branchIds: (string | number)[]) {
  const queryClient = useQueryClient();
  const processedRef = useRef<Set<string>>(new Set());

  const handleCancelRequest = useCallback(
    (event: CancelRequestEvent) => {
      if (event.order.status !== 'cancel_requested') return;

      // Deduplicate (same order could arrive on multiple channels)
      const key = `cancel-${event.order.id}`;
      if (processedRef.current.has(key)) return;
      processedRef.current.add(key);
      // Prevent memory leak — remove after 60s
      setTimeout(() => processedRef.current.delete(key), 60_000);

      // 1. Play sound
      playNotificationSound();

      // 2. In-app toast
      const orderNum = event.order.order_number;
      const requester = event.order.cancel_requested_by_user?.name ?? 'Staff';
      toast.warning(`Cancel Request — #${orderNum} by ${requester}`);

      // 3. Browser notification (if permitted, for when tab is backgrounded)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(`Cancel Request — #${orderNum}`, {
            body: `${requester} wants to cancel ${event.order.contact_name ?? 'customer'}'s order`,
            icon: '/cblogo.webp',
            tag: `cancel-request-${event.order.id}`,
          });
        } catch {
          // Notification API not available
        }
      }

      // 4. Invalidate queries so the bell and order list refresh
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
      queryClient.invalidateQueries({ queryKey: ['cancel-requests'] });
    },
    [queryClient],
  );

  useEffect(() => {
    if (!branchIds.length) return;

    const echo = getEcho();
    if (!echo) return;

    const channels: string[] = [];

    for (const branchId of branchIds) {
      const channelName = `orders.branch.${branchId}`;
      channels.push(channelName);
      echo.private(channelName).listen('.order.updated', handleCancelRequest);
    }

    return () => {
      for (const channelName of channels) {
        echo.private(channelName).stopListening('.order.updated', handleCancelRequest);
      }
    };
  }, [branchIds, handleCancelRequest]);
}
