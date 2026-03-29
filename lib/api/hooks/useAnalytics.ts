import { useQuery } from '@tanstack/react-query';
import {
  analyticsService,
  type AnalyticsFilters,
  type SalesAnalytics,
  type OrderAnalytics,
  type CustomerAnalytics,
  type OrderSource,
  type TopItem,
  type BottomItem,
  type CategoryRevenue,
  type BranchPerformance,
  type DeliveryPickupAnalytics,
  type PaymentMethod,
} from '../services/analytics.service';

export type AnalyticsPeriod = 'today' | 'week' | 'month' | '30d' | '90d' | 'custom';

interface CustomRange {
  date_from?: string;
  date_to?: string;
}

function getDateRange(period: AnalyticsPeriod, customRange?: CustomRange): { date_from: string; date_to: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  switch (period) {
    case 'today':
      return { date_from: today, date_to: today };
    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { date_from: weekStart.toISOString().slice(0, 10), date_to: today };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { date_from: monthStart.toISOString().slice(0, 10), date_to: today };
    }
    case '30d': {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      return { date_from: d30.toISOString().slice(0, 10), date_to: today };
    }
    case '90d': {
      const d90 = new Date(now);
      d90.setDate(d90.getDate() - 90);
      return { date_from: d90.toISOString().slice(0, 10), date_to: today };
    }
    case 'custom': {
      return {
        date_from: customRange?.date_from ?? today,
        date_to: customRange?.date_to ?? today,
      };
    }
    default:
      return { date_from: today, date_to: today };
  }
}

export const useAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  const salesQuery = useQuery({
    queryKey: ['analytics', 'sales', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getSalesAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });

  const ordersQuery = useQuery({
    queryKey: ['analytics', 'orders', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getOrderAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });

  const customersQuery = useQuery({
    queryKey: ['analytics', 'customers', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getCustomerAnalytics({ date_from: range.date_from, date_to: range.date_to }),
    staleTime: 2 * 60 * 1000,
  });

  return {
    sales: salesQuery.data,
    orders: ordersQuery.data,
    customers: customersQuery.data,
    isLoading: salesQuery.isLoading || ordersQuery.isLoading || customersQuery.isLoading,
    error: salesQuery.error ?? ordersQuery.error ?? customersQuery.error,
    refetch: () => {
      salesQuery.refetch();
      ordersQuery.refetch();
      customersQuery.refetch();
    },
  };
};

export const useOrderSourceAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'order-sources', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getOrderSourceAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useTopItemsAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, limit = 10, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters & { limit?: number } = { ...range, limit };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'top-items', period, branchId, limit, range.date_from, range.date_to],
    queryFn: () => analyticsService.getTopItemsAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useBottomItemsAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, limit = 5, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters & { limit?: number } = { ...range, limit };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'bottom-items', period, branchId, limit, range.date_from, range.date_to],
    queryFn: () => analyticsService.getBottomItemsAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCategoryRevenueAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'category-revenue', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getCategoryRevenueAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useBranchPerformanceAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'branch-performance', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getBranchPerformanceAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useDeliveryPickupAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'delivery-pickup', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getDeliveryPickupAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const usePaymentMethodAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'payment-methods', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getPaymentMethodAnalytics(filters),
    staleTime: 2 * 60 * 1000,
  });
};
