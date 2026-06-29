'use client';

/**
 * Subscribes to live Purchase Order updates over Reverb and invalidates the PO
 * queries so the list/detail reflect status changes (e.g. pending_approval →
 * sent) made on any screen, without a manual refresh.
 *
 * Requires the backend broadcasting driver set to `reverb` and the Reverb server
 * running. Falls back silently (no-op) when Echo isn't available.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';

const CHANNEL = 'inventory.purchase-orders';
const EVENT = '.purchase-order.updated';

export function usePurchaseOrderRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(CHANNEL);
    channel.listen(EVENT, () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] });
    });

    return () => {
      try {
        echo.leave(CHANNEL);
      } catch {
        // ignore teardown errors
      }
    };
  }, [queryClient]);
}
