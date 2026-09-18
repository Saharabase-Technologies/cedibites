import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/order.service';
import type { CreateOrderRequest, OrdersParams } from '../services/order.service';
import { getPublicEcho } from '@/lib/echo';
import type { Order } from '@/types/api';
import type { ReceiptPrintSource } from '@/types/order';

export const useOrders = (params?: OrdersParams) => {
  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => orderService.getOrders(params),
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_auth_token'),
  });

  return {
    orders: ordersData?.data || [],
    meta: ordersData?.meta,
    links: ordersData?.links,
    isLoading,
    error,
    refetch,
  };
};

export const useOrder = (id: number) => {
  const queryClient = useQueryClient();

  const {
    data: orderData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrder(id),
    enabled: !!id,
  });

  // Subscribe to the public Reverb channel once we know the order number
  useEffect(() => {
    const orderNumber = orderData?.data?.order_number;
    if (!orderNumber) return;

    const echo = getPublicEcho();
    if (!echo) return;

    const channel = echo.channel(`orders.${orderNumber}`);

    channel.listen('.order.updated', (event: { type: string; order: Order }) => {
      queryClient.setQueryData(
        ['order', id],
        (old: Record<string, unknown> | undefined) => old ? { ...old, data: event.order } : old,
      );
    });

    return () => {
      echo.leave(`orders.${orderNumber}`);
    };
  }, [orderData?.data?.order_number, id, queryClient]);

  return {
    order: orderData?.data,
    isLoading,
    error,
    refetch,
  };
};

export const useOrderByNumber = (orderNumber: string, token?: string) => {
  const queryClient = useQueryClient();

  const {
    data: orderData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    /**
     * The link holder and the passer-by get different answers, so they get
     * different cache entries.
     *
     * `orders/by-number` returns the delivery address and the contact name only
     * to a caller holding the tracking token. Keyed on the number alone, the
     * home screen chip (which holds the token) and the tracking page opened
     * from a typed-in code shared one slot, and whichever landed first decided
     * whether the address was on screen. The token itself stays out of the key.
     */
    queryKey: ['order', orderNumber, token ? 'linked' : 'public'],
    queryFn: () => orderService.getOrderByNumber(orderNumber, token),
    enabled: !!orderNumber,
  });

  // Subscribe to the public Reverb channel for real-time status updates
  useEffect(() => {
    if (!orderNumber) return;

    const echo = getPublicEcho();
    if (!echo) return;

    const channel = echo.channel(`orders.${orderNumber}`);

    /**
     * The broadcast moves the status and nothing else.
     *
     * `OrderBroadcastEvent` carries an `OrderResource`, and this query reads
     * `orders/by-number`, which is deliberately a different and much smaller
     * payload. Writing one over the other swapped the shape underneath the
     * page: the item option arrives as `option_snapshot` on the resource and as
     * `menu_item_option_snapshot` here, so every line on the tracking screen
     * quietly lost the part of its name that says which one you ordered, and
     * `status_history` — the whole timeline — vanished, because the resource has
     * no such field.
     *
     * So the event is trusted for the one field both shapes agree on, and the
     * refetch behind it brings back the authoritative rest.
     */
    channel.listen('.order.updated', (event: { type: string; order: Order }) => {
      queryClient.setQueriesData(
        { queryKey: ['order', orderNumber] },
        (old: { data?: Record<string, unknown> } | undefined) => (
          old?.data ? { ...old, data: { ...old.data, status: event.order.status } } : old
        ),
      );
      queryClient.invalidateQueries({ queryKey: ['order', orderNumber] });
    });

    return () => {
      echo.leave(`orders.${orderNumber}`);
    };
  }, [orderNumber, queryClient]);

  return {
    order: orderData?.data,
    isLoading,
    error,
    refetch,
  };
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderRequest) => orderService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  return {
    createOrder: createOrderMutation.mutateAsync,
    isLoading: createOrderMutation.isPending,
    error: createOrderMutation.error,
  };
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  const cancelOrderMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      orderService.cancelOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    },
  });

  return {
    cancelOrder: cancelOrderMutation.mutateAsync,
    isLoading: cancelOrderMutation.isPending,
    error: cancelOrderMutation.error,
  };
};

export const useMarkReceiptPrinted = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, source }: { id: number; source?: ReceiptPrintSource }) =>
      orderService.markReceiptPrinted(id, source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    },
  });

  return {
    markPrinted: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};

export const useUpdateEmployeeOrderStatus = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      orderService.updateEmployeeOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
      queryClient.invalidateQueries({ queryKey: ['employee-orders-summary'] });
    },
  });

  return {
    updateStatus: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};

export const useRequestCancel = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      orderService.requestCancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    },
  });

  return {
    requestCancel: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};
