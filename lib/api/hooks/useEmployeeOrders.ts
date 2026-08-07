import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { orderService } from '../services/order.service';
import type { EmployeeOrdersParams } from '../services/order.service';
import type { Order as ApiOrder, OrderPeriodSummary } from '@/types/api';

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
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['employee-orders', params],
    queryFn: () => orderService.getEmployeeOrders(params),
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token'),
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
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
    isFetching,
    error,
    refetch,
  };
};

/**
 * Lightweight period summary for the orders table — counts of valid /
 * cancelled / failed / refunded / no-charge orders matching the same
 * filter scope as the table.
 */
export const useEmployeeOrdersPeriodSummary = (params?: EmployeeOrdersParams) => {
  // Drop pagination keys — the summary is for the whole filtered scope, not the page.
  const summaryParams: EmployeeOrdersParams | undefined = params
    ? { ...params, page: undefined, per_page: undefined }
    : undefined;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-orders-summary', summaryParams],
    queryFn: () => orderService.getEmployeeOrdersPeriodSummary(summaryParams),
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token'),
    staleTime: 30 * 1000,
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });

  const summary = (data?.data ?? null) as OrderPeriodSummary | null;
  return { summary, isLoading, error, refetch };
};