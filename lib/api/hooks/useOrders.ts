import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/order.service';
import type { CreateOrderRequest, OrdersParams } from '../services/order.service';

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
  const {
    data: orderData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrder(id),
    enabled: !!id,
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });

  return {
    order: orderData?.data,
    isLoading,
    error,
    refetch,
  };
};

export const useOrderByNumber = (orderNumber: string) => {
  const {
    data: orderData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => orderService.getOrderByNumber(orderNumber),
    enabled: !!orderNumber,
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });

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
