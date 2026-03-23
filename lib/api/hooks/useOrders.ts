import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/order.service';
import type { CreateOrderRequest, OrdersParams } from '../services/order.service';
import { getPublicEcho } from '@/lib/echo';
import type { Order } from '@/types/api';

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

export const useOrderByNumber = (orderNumber: string) => {
  const queryClient = useQueryClient();

  const {
    data: orderData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => orderService.getOrderByNumber(orderNumber),
    enabled: !!orderNumber,
  });

  // Subscribe to the public Reverb channel for real-time status updates
  useEffect(() => {
    if (!orderNumber) return;

    const echo = getPublicEcho();
    if (!echo) return;

    const channel = echo.channel(`orders.${orderNumber}`);

    channel.listen('.order.updated', (event: { type: string; order: Order }) => {
      queryClient.setQueryData(
        ['order', orderNumber],
        (old: Record<string, unknown> | undefined) => old ? { ...old, data: event.order } : old,
      );
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
    mutationFn: (id: number) => orderService.cancelOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });

  return {
    cancelOrder: cancelOrderMutation.mutateAsync,
    isLoading: cancelOrderMutation.isPending,
    error: cancelOrderMutation.error,
  };
};
