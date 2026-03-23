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

  // Initial load via REST, server-side filtered by branchId
  useEffect(() => {
    if (!branchId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    serviceRef.current
      .getAll({ branchId })
      .then((data) => {
        setOrders(data);
      })
      .finally(() => setIsLoading(false));
  }, [branchId]);

  // Real-time updates via Reverb
  useEffect(() => {
    if (!branchId) {
      return;
    }

    const echo = getEcho();
    if (!echo) {
      return;
    }

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

    return () => {
      echo.leave(`orders.branch.${branchId}`);
    };
  }, [branchId]);

  return { orders, isLoading };
}
