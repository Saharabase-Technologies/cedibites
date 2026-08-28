'use client';

import { useState, useEffect, useRef } from 'react';
import type { Order } from '@/types/order';
import type { Order as ApiOrder } from '@/types/api';
import { apiOrderToUnifiedOrder } from '@/lib/utils/orderAdapter';
import { getEcho } from '@/lib/echo';
import { ApiOrderService } from '@/lib/services/orders/order.service.api';

const TERMINAL_STATUSES = ['completed', 'cancelled', 'delivered'];

/**
 * Safety-net poll while the socket is up. Reverb is doing the real work.
 *
 * This was a flat 1000ms, which on the Kitchen Display meant a full REST fetch
 * of the branch's live orders every second, forever, on a screen that is left
 * running all day. Worse, it beat the websocket: the board would find a new
 * order by polling before the broadcast arrived, so the Kitchen Display
 * announced orders the Order Manager had not yet been told about.
 */
const POLL_HEALTHY_MS = 20_000;
/** Safety-net poll while the socket is down. Now the only live path. */
const POLL_DEGRADED_MS = 4_000;

export function useOrderChannel(branchId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSocketLive, setIsSocketLive] = useState(false);
  const serviceRef = useRef(new ApiOrderService());
  const inFlightRef = useRef(false);

  // Initial load + polling fallback via REST
  useEffect(() => {
    if (!branchId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    let active = true;

    const fetchOrders = () => {
      // Never let two fetches overlap. At a one-second interval on a slow
      // connection these stacked up and applied out of order.
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      serviceRef.current
        .getAll({ branchId })
        .then((data) => {
          if (active) setOrders(data);
        })
        .finally(() => {
          inFlightRef.current = false;
          if (active) setIsLoading(false);
        });
    };

    setIsLoading(true);
    fetchOrders();

    const interval = setInterval(() => {
      // A backgrounded screen does not need the order book; it gets a fresh one
      // the moment somebody looks at it again.
      if (document.visibilityState === 'visible') fetchOrders();
    }, isSocketLive ? POLL_HEALTHY_MS : POLL_DEGRADED_MS);

    const onWake = () => {
      if (document.visibilityState === 'visible') fetchOrders();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [branchId, isSocketLive]);

  // Real-time updates via Reverb
  useEffect(() => {
    if (!branchId) return;

    function subscribe() {
      const echo = getEcho();
      if (!echo) return false;

      const channel = echo.private(`orders.branch.${branchId}`);

      channel.listen('.order.updated', (event: { type: string; order: ApiOrder }) => {
        const order = apiOrderToUnifiedOrder(event.order);

        setOrders((prev) => {
          const rest = prev.filter((o) => o.id !== order.id);
          if (TERMINAL_STATUSES.includes(order.status)) {
            return rest;
          }
          return [...rest, order];
        });
      });

      // Follow the socket's health so the safety-net poll can back off while it
      // is up and take over the moment it is not.
      try {
        const conn = (
          echo as unknown as {
            connector?: {
              pusher?: {
                connection?: {
                  state?: string;
                  bind: (e: string, cb: (p: { current: string }) => void) => void;
                };
              };
            };
          }
        ).connector?.pusher?.connection;
        if (conn) {
          setIsSocketLive((conn.state ?? '') === 'connected');
          conn.bind('state_change', (p: { current: string }) =>
            setIsSocketLive(p.current === 'connected'),
          );
        }
      } catch {
        setIsSocketLive(false);
      }

      return true;
    }

    // Attempt subscription immediately
    const subscribed = subscribe();

    // If token wasn't available yet, retry when staff-login fires
    if (!subscribed) {
      const handler = () => subscribe();
      window.addEventListener('staff-login', handler);
      return () => {
        window.removeEventListener('staff-login', handler);
      };
    }

    return () => {
      getEcho()?.leave(`orders.branch.${branchId}`);
    };
  }, [branchId]);

  return { orders, isLoading };
}
