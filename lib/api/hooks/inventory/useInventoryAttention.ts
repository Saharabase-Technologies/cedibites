'use client';

/**
 * How many things on each inventory screen are waiting on THIS person.
 *
 * Drives the sidebar counters. The distinction that matters: a badge means
 * "you have something to do", not "something is open somewhere". A branch
 * manager who raises a requisition has finished their part — the count belongs
 * to whoever must approve it, and showing it to the requester is just a number
 * they cannot clear.
 *
 * So every count below is filtered by whether this user is the one who acts
 * next, using the same rules the API enforces.
 *
 * Reads the same queries the pages use, so it shares their cache rather than
 * adding traffic — and because the realtime layer invalidates those keys, the
 * counters move on their own.
 */

import { useMemo } from 'react';
import { useRequisitions } from './useRequisitions';
import { useTransfers } from './useTransfers';
import { usePurchaseOrders } from './usePurchaseOrders';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

export interface InventoryAttention {
  /** Keyed by the nav href the count belongs to. */
  counts: Record<string, number>;
  total: number;
}

export function useInventoryAttention(): InventoryAttention {
  const { staffUser, can } = useStaffAuth();
  const { data: requisitions } = useRequisitions();
  const { data: transfers } = useTransfers();
  const { data: purchaseOrders } = usePurchaseOrders();

  const myUserId = staffUser?.user_id;
  const operating = staffUser?.operating_location_ids;
  const canApproveRequisitions = can('inventory.requisition.approve');
  const canReceive = can('inventory.transfer.receive');
  const canResolve = can('inventory.transfer.resolve_dispute');

  return useMemo(() => {
    // null/undefined = acts anywhere (admins).
    const actsAt = (locationId: number | null | undefined) =>
      operating === null || operating === undefined
        ? true
        : locationId !== null && locationId !== undefined && operating.includes(locationId);

    // Awaiting a decision that is MINE to make. Not my own requests — I cannot
    // approve those — and not drafts, which are unfinished work, not a queue.
    const requisitionCount = canApproveRequisitions
      ? (requisitions ?? []).filter(
          (r) => r.status === 'submitted' && r.requested_by_id !== myUserId,
        ).length
      : 0;

    const transferCount = (transfers ?? []).filter((t) => {
      // In transit: whoever is at the destination must sign for it. Never the
      // sender, and never a warehouse manager watching a branch delivery.
      if (t.status === 'sent') {
        return (
          canReceive && t.sent_by_id !== myUserId && actsAt(t.destination_location?.id ?? null)
        );
      }
      // Disputed: needs resolving by someone who can, at either end.
      if (t.status === 'disputed') {
        return (
          canResolve &&
          (actsAt(t.source_location?.id ?? null) || actsAt(t.destination_location?.id ?? null))
        );
      }
      return false;
    }).length;

    const poCount = can('inventory.purchase_order.approve')
      ? (purchaseOrders ?? []).filter((p) => p.status === 'pending_approval').length
      : 0;

    const counts: Record<string, number> = {
      '/inventory/requisitions': requisitionCount,
      '/inventory/transfers': transferCount,
      '/inventory/purchase-orders': poCount,
    };

    return { counts, total: requisitionCount + transferCount + poCount };
  }, [
    requisitions,
    transfers,
    purchaseOrders,
    myUserId,
    operating,
    canApproveRequisitions,
    canReceive,
    canResolve,
    can,
  ]);
}
