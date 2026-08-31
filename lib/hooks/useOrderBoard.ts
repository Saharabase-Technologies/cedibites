'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '@/lib/api/client';
import { useOrderStream, type ConnectionState, type OrderStreamEvent } from '@/lib/hooks/useOrderStream';
import { apiOrderToUnifiedOrder } from '@/lib/utils/orderAdapter';
import type { Order as ApiOrder } from '@/types/api';
import type { Order, OrderStatus } from '@/types/order';

/**
 * The Order Manager's data layer.
 *
 * Replaces `useOrderChannel` on this screen. Three things were wrong with that
 * one, and all three are what the kitchen felt as lag:
 *
 *  1. It refetched every 1000ms, with no status filter, so the API returned the
 *     200 most recent orders at the branch — every one of them carrying its
 *     full `status_history` and the user record behind each history row — and
 *     the board then discarded everything that was not one of five live
 *     statuses. On kitchen wifi a single one of those requests routinely took
 *     longer than the interval, so they overlapped and landed out of order.
 *
 *  2. The board rendered from that hook's state but wrote through the order
 *     store's, which are separate. Tapping Accept optimistically updated an
 *     array this screen never read, so nothing at all happened on screen until
 *     a poll or a socket frame arrived. That is the delay staff were tapping
 *     through — and the second tap landed on whichever ticket had slid into the
 *     gap by then.
 *
 *  3. Polling ran flat out whether or not the socket was healthy, and whether
 *     or not anybody was looking at the tab.
 *
 * So: ask only for live statuses, let Reverb be the primary path and poll only
 * as a safety net whose rate follows the socket's health, and hold an optimistic
 * overlay in front of the server so a tap is visible on the next frame.
 */

/** The only statuses this board ever shows. Everything else is somebody else's screen. */
export const BOARD_STATUSES: OrderStatus[] = [
  'received',
  'accepted',
  'preparing',
  'ready',
  'cancel_requested',
];

const BOARD_STATUS_SET = new Set<OrderStatus>(BOARD_STATUSES);

/** Safety-net poll while the socket is up. Reverb is doing the real work. */
const POLL_HEALTHY_MS = 20_000;
/** Safety-net poll while the socket is down. This is now the only live path. */
const POLL_DEGRADED_MS = 4_000;

/**
 * How long an optimistic status is trusted over the server's.
 *
 * Long enough to cover a slow write plus the round trip that confirms it, short
 * enough that a write which genuinely failed cannot leave a lie on the board.
 * On expiry the server wins and the ticket snaps back — visibly, which is the
 * correct outcome: the kitchen needs to know the tap did not take.
 */
const OPTIMISTIC_TTL_MS = 12_000;

export type { ConnectionState } from '@/lib/hooks/useOrderStream';

interface PendingWrite {
  status: OrderStatus;
  at: number;
}

/**
 * Everything the board holds, stamped with the branch it belongs to.
 *
 * Bundled into one object on purpose. Held as five separate `useState`s, a
 * branch switch needed an effect to blank them all, which left one render in
 * which the previous branch's tickets were still on screen under the new
 * branch's name. Stamping the state means a mismatched branch simply reads as
 * empty, with no reset step to get wrong.
 */
interface BoardState {
  branch: string | null;
  orders: Order[];
  /** Optimistic statuses, by order id. */
  pending: Record<string, PendingWrite>;
  /** Locally dropped (cancel approved), held until the server agrees. */
  dismissed: Record<string, number>;
  /** When each order entered its current stage, from this device's own actions. */
  stageEnteredAt: Record<string, number>;
  /** False until the first response for this branch has landed. */
  loaded: boolean;
}

const EMPTY_STATE: BoardState = {
  branch: null,
  orders: [],
  pending: {},
  dismissed: {},
  stageEnteredAt: {},
  loaded: false,
};

export interface OrderBoard {
  /** Live orders, optimistic overlay already applied, oldest first. */
  orders: Order[];
  isLoading: boolean;
  connection: ConnectionState;
  /** Ids with a write in flight — the card shows as busy and refuses taps. */
  pendingIds: Set<string>;
  /**
   * When each order entered its current stage, epoch ms — the best answer
   * available, resolved in `stageSinceFor` below.
   */
  stageEnteredAt: Record<string, number>;
  /** The stage clock for one order. Always prefer this over reading a field. */
  stageSinceFor: (order: Order) => number;
  /** Optimistically move an order. Resolves false if the write was rejected. */
  moveOrder: (orderId: string, to: OrderStatus) => Promise<boolean>;
  /** Drop an order off the board without a status write (cancel approval). */
  removeOrder: (orderId: string) => void;
  refresh: () => void;
}

export function useOrderBoard(branchId: string | null): OrderBoard {
  const [state, setState] = useState<BoardState>(EMPTY_STATE);

  // Anything stamped with another branch is not this board's data.
  const active = state.branch === branchId ? state : EMPTY_STATE;

  /** Apply an update only if the branch it was computed for is still current. */
  const updateBranch = useCallback(
    (branch: string, fn: (prev: BoardState) => BoardState) => {
      setState((prev) => {
        const base = prev.branch === branch ? prev : { ...EMPTY_STATE, branch };
        return fn(base);
      });
    },
    [],
  );

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const inFlightRef = useRef(false);
  const branchRef = useRef(branchId);

  useEffect(() => {
    branchRef.current = branchId;
  }, [branchId]);

  const fetchOrders = useCallback(async () => {
    const branch = branchRef.current;
    if (!branch) return;
    // Never let two fetches overlap. The old hook could stack a dozen deep on a
    // slow connection and then apply their responses in whatever order they
    // landed, which on its own made the board jump backwards.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const response = await apiClient.get('/employee/orders', {
        params: { branch_id: branch, status: BOARD_STATUSES, per_page: 100 },
      });
      const body = (response as { data?: { data?: ApiOrder[] } })?.data ?? response;
      const list = ((body as { data?: ApiOrder[] })?.data ?? []) as ApiOrder[];

      updateBranch(branch, (prev) => ({
        ...prev,
        orders: list.map(apiOrderToUnifiedOrder),
        loaded: true,
      }));
    } catch {
      // Swallow. The connection indicator already tells the kitchen what is
      // going on, and a toast per failed poll would be its own outage.
      updateBranch(branch, (prev) => ({ ...prev, loaded: true }));
    } finally {
      inFlightRef.current = false;
    }
  }, [updateBranch]);

  useEffect(() => {
    if (!branchId) return;
    void fetchOrders();
  }, [branchId, fetchOrders]);

  // ── Reverb ────────────────────────────────────────────────────────────────
  // The socket itself lives in `useOrderStream`, shared with the till. This
  // hook's own job is only what to do with a frame once it arrives.

  const connection = useOrderStream(
    branchId,
    useCallback(
      (event: OrderStreamEvent) => {
        if (!branchId) return;
        const order = apiOrderToUnifiedOrder(event.order);
        updateBranch(branchId, (prev) => {
          const orders = prev.orders.filter((o) => o.id !== order.id);
          if (BOARD_STATUS_SET.has(order.status)) orders.push(order);

          // A frame from the server is the authority. If it agrees with what we
          // optimistically drew, the write is confirmed and the overlay can go.
          const p = prev.pending[order.id];
          if (!p || p.status !== order.status) return { ...prev, orders };
          const pending = { ...prev.pending };
          delete pending[order.id];
          return { ...prev, orders, pending };
        });
      },
      [branchId, updateBranch],
    ),
  );

  // ── Adaptive polling ──────────────────────────────────────────────────────
  // `connection` is a dependency rather than a ref: when the socket's health
  // changes the timer is simply rebuilt at the new cadence.

  useEffect(() => {
    if (!branchId) return;

    const period = connection === 'live' ? POLL_HEALTHY_MS : POLL_DEGRADED_MS;

    const id = setInterval(() => {
      // A backgrounded tablet does not need the order book. It gets a fresh one
      // the instant somebody looks at it again.
      if (document.visibilityState === 'visible') void fetchOrders();
    }, period);

    const onWake = () => {
      if (document.visibilityState === 'visible') void fetchOrders();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [branchId, connection, fetchOrders]);

  // ── Expiry sweeper ────────────────────────────────────────────────────────
  // Optimistic entries and local dismissals both have to age out, or a write
  // that failed silently would leave the board showing something untrue.

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setState((prev) => {
        const stalePending = Object.keys(prev.pending).filter(
          (k) => now - prev.pending[k].at > OPTIMISTIC_TTL_MS,
        );
        const staleDismissed = Object.keys(prev.dismissed).filter(
          (k) => now - prev.dismissed[k] > OPTIMISTIC_TTL_MS,
        );
        if (stalePending.length === 0 && staleDismissed.length === 0) return prev;

        const pending = { ...prev.pending };
        for (const k of stalePending) delete pending[k];
        const dismissed = { ...prev.dismissed };
        for (const k of staleDismissed) delete dismissed[k];
        return { ...prev, pending, dismissed };
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // ── Merge ─────────────────────────────────────────────────────────────────

  const orders = useMemo(() => {
    const merged: Order[] = [];

    for (const order of active.orders) {
      if (order.id in active.dismissed) continue;

      const p = active.pending[order.id];
      // A pending entry the server has already caught up with is simply not
      // applied. Resolving it here rather than by writing state back means no
      // extra render, and no window where the two disagree.
      const status = p && p.status !== order.status ? p.status : order.status;

      if (!BOARD_STATUS_SET.has(status)) continue; // completed, cancelled: off the board
      merged.push(status === order.status ? order : { ...order, status });
    }

    // Oldest first. Position within a column is by the clock and nothing else,
    // so a ticket never overtakes one that was placed before it.
    return merged.sort((a, b) => a.placedAt - b.placedAt);
  }, [active]);

  // ── Writes ────────────────────────────────────────────────────────────────

  const moveOrder = useCallback(
    async (orderId: string, to: OrderStatus): Promise<boolean> => {
      const branch = branchRef.current;
      if (!branch) return false;

      // Draw it first. This is the whole point — the tap has to land on screen
      // in the same frame it was made, not one round trip later.
      updateBranch(branch, (prev) => ({
        ...prev,
        pending: { ...prev.pending, [orderId]: { status: to, at: Date.now() } },
        stageEnteredAt: { ...prev.stageEnteredAt, [orderId]: Date.now() },
      }));

      try {
        const response = await apiClient.patch(`/employee/orders/${orderId}/status`, { status: to });
        const body = (response as { data?: ApiOrder })?.data ?? response;
        const updated = apiOrderToUnifiedOrder(body as ApiOrder);

        updateBranch(branch, (prev) => {
          const orders = prev.orders.filter((o) => o.id !== orderId);
          if (BOARD_STATUS_SET.has(updated.status)) orders.push(updated);
          const pending = { ...prev.pending };
          delete pending[orderId];
          return { ...prev, orders, pending };
        });
        return true;
      } catch {
        // Roll back at once rather than waiting for the TTL — a rejected write
        // must not leave the kitchen believing the ticket moved.
        updateBranch(branch, (prev) => {
          const pending = { ...prev.pending };
          delete pending[orderId];
          const stageEnteredAt = { ...prev.stageEnteredAt };
          delete stageEnteredAt[orderId];
          return { ...prev, pending, stageEnteredAt };
        });
        return false;
      }
    },
    [updateBranch],
  );

  const removeOrder = useCallback(
    (orderId: string) => {
      const branch = branchRef.current;
      if (!branch) return;
      updateBranch(branch, (prev) => ({
        ...prev,
        dismissed: { ...prev.dismissed, [orderId]: Date.now() },
      }));
    },
    [updateBranch],
  );

  const refresh = useCallback(() => {
    void fetchOrders();
  }, [fetchOrders]);

  /**
   * How long this order has been in the stage it is showing.
   *
   * Three sources, in this order, and the order matters:
   *
   *  1. **While a move of ours is in flight**, the local timestamp. The server
   *     still describes the stage the ticket just left, so trusting it here
   *     would show the new stage carrying the old stage's clock — briefly
   *     reintroducing the exact bug this fixes.
   *  2. **Otherwise the server's `stageChangedAt`**, from order_status_history.
   *     It is the same on every screen and survives a reload, which the local
   *     map cannot: that only ever knew about moves made in this browser, so a
   *     refresh — or a ticket bumped on the kitchen tablet — left every stage
   *     reading as the order's total age.
   *  3. **Failing both, when it was placed.** Correct for a new order, and for
   *     anything else it errs towards looking older rather than younger, which
   *     is the safe direction for something driving an alarm.
   */
  const stageSinceFor = useCallback(
    (order: Order): number => {
      const local = active.stageEnteredAt[order.id];
      if (active.pending[order.id] && local) return local;
      return order.stageChangedAt ?? local ?? order.placedAt;
    },
    [active],
  );

  const pendingIds = useMemo(() => new Set(Object.keys(active.pending)), [active.pending]);

  return {
    orders,
    isLoading: Boolean(branchId) && !active.loaded,
    connection,
    pendingIds,
    stageEnteredAt: active.stageEnteredAt,
    stageSinceFor,
    moveOrder,
    removeOrder,
    refresh,
  };
}
