'use client';

import { useState, useEffect, useRef } from 'react';
import type { Order } from '@/types/order';
import type { Order as ApiOrder } from '@/types/api';
import { apiOrderToUnifiedOrder } from '@/lib/utils/orderAdapter';
import { getEcho } from '@/lib/echo';
import { ApiOrderService } from '@/lib/services/orders/order.service.api';

const TERMINAL_STATUSES = ['completed', 'cancelled', 'delivered'];

export function useOrderChannel(branchId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const serviceRef = useRef(new ApiOrderService());

  // Initial load + polling fallback via REST
  useEffect(() => {
    if (!branchId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    let active = true;

    const fetchOrders = () => {
      serviceRef.current
        .getAll({ branchId })
        .then((data) => {
          if (active) setOrders(data);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    };

    setIsLoading(true);
    fetchOrders();

    // Poll every 1 second as a fallback (covers when Reverb is unavailable)
    const interval = setInterval(fetchOrders, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [branchId]);

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
