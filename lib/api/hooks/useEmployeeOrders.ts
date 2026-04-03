import { useQuery } from '@tanstack/react-query';
import { orderService } from '../services/order.service';
import type { EmployeeOrdersParams } from '../services/order.service';
import type { Order as ApiOrder } from '@/types/api';

export const useEmployeeOrderStats = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-order-stats'],
    queryFn: () => orderService.getEmployeeOrderStats(),
    staleTime: 60 * 1000,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token'),
  });
  return { stats: data, isLoading, error, refetch };
};

export const useEmployeePendingOrders = (perPage?: number) => {
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['employee-pending-orders', perPage],
    queryFn: () => orderService.getEmployeePendingOrders(perPage),
    staleTime: 30 * 1000,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token'),
  });
  const rawData = response?.data;
  const ordersArray = Array.isArray(rawData) ? rawData : (rawData as { data?: unknown[] } | undefined)?.data ?? [];
  const orders = ordersArray as ApiOrder[];
  const meta = (rawData as { meta?: unknown } | undefined)?.meta ?? response?.meta;
  const links = (rawData as { links?: unknown } | undefined)?.links ?? response?.links;
  return { orders, meta, links, isLoading, error, refetch };
};

export const useEmployeeOrders = (params?: EmployeeOrdersParams) => {
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['employee-orders', params],
    queryFn: () => orderService.getEmployeeOrders(params),
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token'),
    refetchInterval: 1000,
  });

  const rawData = response?.data;
  const ordersArray = Array.isArray(rawData) ? rawData : (rawData as { data?: unknown[] } | undefined)?.data ?? [];
  const orders = ordersArray as ApiOrder[];
  const meta = (rawData as { meta?: unknown } | undefined)?.meta ?? response?.meta;
  const links = (rawData as { links?: unknown } | undefined)?.links ?? response?.links;

  return {
    orders,
    meta,
    links,
    isLoading,
    error,
    refetch,
  };
};
