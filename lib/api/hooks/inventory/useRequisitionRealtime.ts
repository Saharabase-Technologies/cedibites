'use client';

/**
 * Subscribes to live requisition updates over Reverb and invalidates the
 * requisition queries so the list/detail reflect status changes (submitted →
 * approved/rejected → fulfilled) made on any screen — the requesting branch and
 * the approving warehouse manager stay in sync without a manual refresh.
 *
 * Falls back silently (no-op) when Echo isn't available.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';

const CHANNEL = 'inventory.requisitions';
const EVENT = '.requisition.updated';

export function useRequisitionRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(CHANNEL);
    channel.listen(EVENT, () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'requisitions'] });
      // An approval flips a linked transfer into existence.
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
