'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getEcho } from '@/lib/echo';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import { ARRIVAL, useAlertTone } from '@/lib/hooks/useAlertTone';
import { REMOTE_ORDER_SOURCES } from '@/lib/constants/order.constants';
import type { Order } from '@/types/order';

/**
 * The till's ear for orders it did not ring up.
 *
 * An order placed on the website lands in the same branch queue as a walk-in,
 * but nobody is standing over the POS waiting for it, so it needs to announce
 * itself. The board in the kitchen already does this; the counter never did,
 * which is how an online order could sit unclaimed while a cashier worked
 * through the people in front of them.
 *
 * The waiting list is derived from the server, not accumulated from socket
 * frames. That matters: a till that was asleep, reloaded, or offline for two
 * minutes still opens showing every online order nobody has accepted, whereas
 * a list built only from broadcasts would show whatever happened to arrive
 * while this tab was listening. Reverb's job here is to make the answer
 * *prompt* — it triggers a refetch and the chime — not to be the answer.
 *
 * `received` is the whole waiting list: it means nobody, on any screen, has
 * accepted the order yet. The moment the Order Manager takes it the banner
 * clears by itself, with nothing to synchronise.
 */

/** Live statuses that mean nobody has taken the order on yet. */
const AWAITING_STATUSES = ['received'];

/** Dismissals are a today thing — tomorrow's till starts clean. */
function dismissKey(): string {
  return `cedibites-pos-arrivals-dismissed-${new Date().toISOString().slice(0, 10)}`;
}

function readDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(dismissKey());
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(dismissKey(), JSON.stringify(Array.from(ids)));
  } catch {
    // A till with storage disabled simply re-announces after a reload, which is
    // the safe direction to fail in.
  }
}

export interface OnlineArrivals {
  /** Remote orders nobody has accepted, newest first, dismissals removed. */
  arrivals: Order[];
  /** Every remote order awaiting acceptance, dismissed or not — for the badge. */
  awaitingCount: number;
  dismiss: (orderId: string) => void;
  dismissAll: () => void;
  /** True when the browser is holding audio shut, so the UI can say so. */
  isBlocked: boolean;
  /** Sound the arrival bell on demand — the shift-start sound check. */
  test: () => void;
}

export interface OnlineArrivalOptions {
  /** Announce arrivals audibly. Exactly one mount per till should. */
  sound?: boolean;
  /**
   * Hold the Reverb subscription. Also one mount per till: the socket work is
   * shared through React Query's cache, so a second listener only doubles the
   * invalidations. A screen that already subscribes to the branch channel for
   * its own reasons should pass false.
   */
  subscribe?: boolean;
}

export function useOnlineOrderArrivals(
  branchId: string | null | undefined,
  { sound = true, subscribe = true }: OnlineArrivalOptions = {},
): OnlineArrivals {
  const queryClient = useQueryClient();
  const { play, unlock, isBlocked } = useAlertTone(sound);

  const { orders: raw } = useEmployeeOrders(
    branchId
      ? {
          branch_id: Number(branchId),
          order_source: [...REMOTE_ORDER_SOURCES],
          status: AWAITING_STATUSES,
          per_page: 25,
        }
      : undefined,
  );

  const awaiting = useMemo(
    () => raw.map(mapApiOrderToOrder).sort((a, b) => b.placedAt - a.placedAt),
    [raw],
  );

  // ── Dismissals ────────────────────────────────────────────────────────────

  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    // Read after mount, never during render: the server has no localStorage and
    // seeding state from it directly would hydrate a different tree than it sent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(readDismissed());
  }, []);

  const dismiss = useCallback((orderId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      writeDismissed(next);
      return next;
    });
  }, []);

  const awaitingIdsKey = awaiting.map((o) => o.id).join(',');

  const dismissAll = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const id of awaitingIdsKey === '' ? [] : awaitingIdsKey.split(',')) next.add(id);
      writeDismissed(next);
      return next;
    });
  }, [awaitingIdsKey]);

  const arrivals = useMemo(
    () => awaiting.filter((o) => !dismissed.has(o.id)),
    [awaiting, dismissed],
  );

  // ── The bell ──────────────────────────────────────────────────────────────
  // By identity, not by count. If one order is accepted in the same window that
  // another arrives the count does not move, and that is precisely the moment
  // the counter needs telling.

  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    // A branch switch re-seeds rather than announcing the new branch's backlog
    // as a rush of arrivals.
    seenRef.current = null;
  }, [branchId]);

  useEffect(() => {
    const ids = awaitingIdsKey === '' ? [] : awaitingIdsKey.split(',');

    // Null means "not seeded yet". The first list of a session is the standing
    // backlog — it belongs in the banner, but it did not just happen, so it does
    // not ring.
    if (seenRef.current === null) {
      seenRef.current = new Set(ids);
      return;
    }

    const seen = seenRef.current;
    const arrived = ids.filter((id) => !seen.has(id));

    // Forget ids that have left the waiting list, so an order that is accepted
    // and then handed back is announced again.
    const live = new Set(ids);
    for (const id of Array.from(seen)) if (!live.has(id)) seen.delete(id);
    for (const id of ids) seen.add(id);

    if (arrived.length > 0 && sound) play(ARRIVAL);
  }, [awaitingIdsKey, sound, play]);

  // ── Reverb ────────────────────────────────────────────────────────────────
  // Purely a nudge to refetch. The 15s poll behind `useEmployeeOrders` is the
  // floor; this is what makes the till feel immediate.

  useEffect(() => {
    if (!branchId || !subscribe) return;

    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(`orders.branch.${branchId}`);
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    };

    channel.listen('.order.updated', handler);

    return () => {
      channel.stopListening('.order.updated', handler);
    };
  }, [branchId, subscribe, queryClient]);

  const test = useCallback(() => {
    unlock();
    play(ARRIVAL, true);
  }, [play, unlock]);

  return {
    arrivals,
    awaitingCount: awaiting.length,
    dismiss,
    dismissAll,
    isBlocked,
    test,
  };
}
