'use client';

/**
 * The single live-update subscription for the whole inventory portal.
 *
 * Mounted once, in the inventory layout, so every screen is live — including the
 * ones that read balances rather than documents (items, dashboard, daily
 * closing), which previously had nothing to listen to at all.
 *
 * WHY ONE HOOK AND NOT ONE PER PAGE
 * Per-page hooks each invalidated only their own resource, so a change never
 * crossed a boundary: approving a requisition spawned a transfer the transfers
 * screen never heard about, and receiving the last transfer flipped a
 * requisition to `fulfilled` that its own screen never heard about — it sat on
 * "Approved" until a hard refresh. Real actions cascade, so the fan-out below is
 * deliberately wider than the event that triggered it.
 *
 * They also could not safely coexist: two components subscribing to the same
 * channel share one Echo channel object, so the first to unmount called
 * `echo.leave()` and silently killed the other's updates.
 */

import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';

/** Query key prefixes. Invalidation is prefix-matched, so these cover filtered
 *  and by-id variants (`['inventory','items',{...}]`, `['inventory','items',7]`). */
type Key = readonly string[];

/**
 * Anything derived from stock balances rather than from a document. Every
 * ledger movement moves these, whatever caused it.
 */
const STOCK_DERIVED: Key[] = [
  ['inventory', 'items'],
  ['inventory', 'dashboard'],
  ['inventory', 'daily-closings'],
  ['inventory', 'production-runs'],
];

/** Broadcast name → every query prefix that change can invalidate. */
const FANOUT: Record<string, Key[]> = {
  // A transfer moves stock, can complete the requisition that raised it, and —
  // when it is the return leg of a wastage claim, or carries goods refused at
  // the door — advances a wastage too.
  'transfer.updated': [
    ['inventory', 'transfers'],
    ['inventory', 'requisitions'],
    ['inventory', 'wastages'],
    ...STOCK_DERIVED,
  ],
  // Approving a requisition spawns a transfer.
  'requisition.updated': [
    ['inventory', 'requisitions'],
    ['inventory', 'transfers'],
  ],
  // Receiving against a PO writes a purchase and lands stock.
  'purchase-order.updated': [
    ['inventory', 'purchase-orders'],
    ['inventory', 'purchases'],
    ...STOCK_DERIVED,
  ],
  // Posting a cycle writes adjustment movements.
  'reconciliation.updated': [
    ['inventory', 'reconciliations'],
    ...STOCK_DERIVED,
  ],
  // Approving a write-off deducts stock; declaring one over the threshold
  // raises the return transfer that carries the goods back.
  'wastage.updated': [
    ['inventory', 'wastages'],
    ['inventory', 'transfers'],
    ...STOCK_DERIVED,
  ],
  // The ledger itself — fired for every movement, whatever wrote it.
  'stock.updated': STOCK_DERIVED,
};

/** Echo channel → the broadcast names it carries. */
const SUBSCRIPTIONS: Array<{ channel: string; events: string[] }> = [
  { channel: 'inventory.transfers', events: ['transfer.updated'] },
  { channel: 'inventory.requisitions', events: ['requisition.updated'] },
  { channel: 'inventory.purchase-orders', events: ['purchase-order.updated'] },
  { channel: 'inventory.reconciliations', events: ['reconciliation.updated'] },
  { channel: 'inventory.wastages', events: ['wastage.updated'] },
  { channel: 'inventory.stock', events: ['stock.updated'] },
];

/**
 * Coalescing window. One business action can post many ledger movements — a
 * sale deducts every ingredient in the recipe — and each is its own broadcast.
 * Without this, an eight-ingredient sale fires eight identical refetch storms.
 */
const COALESCE_MS = 150;

export function useInventoryRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    // Prefixes seen since the last flush, de-duplicated by their string form.
    const pending = new Map<string, Key>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      const keys = [...pending.values()];
      pending.clear();
      keys.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey: [...queryKey] });
      });
    };

    const schedule = (event: string) => {
      (FANOUT[event] ?? []).forEach((key) => pending.set(key.join('/'), key));
      if (timer === null) timer = setTimeout(flush, COALESCE_MS);
    };

    const joined = SUBSCRIPTIONS.map(({ channel, events }) => {
      const subscription = echo.private(channel);
      // Echo needs the leading dot to treat the name as already-namespaced.
      events.forEach((event) => subscription.listen(`.${event}`, () => schedule(event)));
      return channel;
    });

    return () => {
      if (timer !== null) clearTimeout(timer);
      joined.forEach((channel) => {
        try {
          echo.leave(channel);
        } catch {
          // ignore teardown errors — the socket may already be gone
        }
      });
    };
  }, [queryClient]);
}

/**
 * Invalidate everything inventory. For mutations whose blast radius is wider
 * than their own resource and that need the UI correct before the round trip
 * comes back.
 */
export function invalidateAllInventory(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['inventory'] });
}
