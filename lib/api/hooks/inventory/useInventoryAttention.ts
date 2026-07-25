'use client';

/**
 * How many things on each inventory screen are waiting on a human.
 *
 * Drives the sidebar counters, so someone can see there is a requisition to
 * approve or a delivery to receive without opening every section to check. The
 * lists it reads are the same queries the pages themselves use, so this shares
 * their cache rather than adding traffic — and because the realtime layer
 * invalidates those keys, the counters move on their own.
 *
 * "Attention" means an item is stalled pending a person, not merely open. A
 * transfer in transit needs receiving; one already received needs nobody.
 */

import { useMemo } from 'react';
import { useRequisitions } from './useRequisitions';
import { useTransfers } from './useTransfers';
import { usePurchaseOrders } from './usePurchaseOrders';

export interface InventoryAttention {
  /** Keyed by the nav href the count belongs to. */
  counts: Record<string, number>;
  total: number;
}

export function useInventoryAttention(): InventoryAttention {
  const { data: requisitions } = useRequisitions();
  const { data: transfers } = useTransfers();
  const { data: purchaseOrders } = usePurchaseOrders();

  return useMemo(() => {
    // Awaiting a decision. Drafts are the author's own unfinished work, not a
    // queue, so they are deliberately excluded.
    const requisitionCount = (requisitions ?? []).filter((r) => r.status === 'submitted').length;

    // In transit (someone must receive it) or disputed (someone must resolve
    // it). The API already scopes these to locations the viewer can see.
    const transferCount = (transfers ?? []).filter(
      (t) => t.status === 'sent' || t.status === 'disputed',
    ).length;

    const poCount = (purchaseOrders ?? []).filter((p) => p.status === 'pending_approval').length;

    const counts: Record<string, number> = {
      '/inventory/requisitions': requisitionCount,
      '/inventory/transfers': transferCount,
      '/inventory/purchase-orders': poCount,
    };

    return {
      counts,
      total: requisitionCount + transferCount + poCount,
    };
  }, [requisitions, transfers, purchaseOrders]);
}
