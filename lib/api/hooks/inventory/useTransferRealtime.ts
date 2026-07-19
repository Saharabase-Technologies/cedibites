'use client';

/**
 * Subscribes to live stock-transfer updates over Reverb and invalidates the
 * transfer queries so the list/detail reflect status changes (e.g. approved →
 * sent → received) made on any screen — including the receiving branch — without
 * a manual refresh.
 *
 * Requires the backend broadcasting driver set to `reverb` and the Reverb server
 * running. Falls back silently (no-op) when Echo isn't available.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';

const CHANNEL = 'inventory.transfers';
const EVENT = '.transfer.updated';

export function useTransferRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(CHANNEL);
    channel.listen(EVENT, () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
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
