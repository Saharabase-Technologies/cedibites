'use client';

/**
 * Subscribes to live reconciliation-cycle updates over Reverb and invalidates the
 * reconciliation queries so open/count/post changes reflect across screens without
 * a manual refresh. Falls back silently (no-op) when Echo isn't available.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';

const CHANNEL = 'inventory.reconciliations';
const EVENT = '.reconciliation.updated';

export function useReconciliationRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(CHANNEL);
    channel.listen(EVENT, () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'reconciliations'] });
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
