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
  type DiscountUsageAnalytics,
  type CancellationReasonsAnalytics,
  type AdminStaffSalesRow,
} from '../services/analytics.service';

export type AnalyticsPeriod = 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | '30d' | '90d' | 'lifetime' | 'custom';

interface CustomRange {
  date_from?: string;
  date_to?: string;
}

export function getDateRange(period: AnalyticsPeriod, customRange?: CustomRange): { date_from: string; date_to: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  switch (period) {
    case 'today':
      return { date_from: today, date_to: today };
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const y = yesterday.toISOString().slice(0, 10);
      return { date_from: y, date_to: y };
    }
    case 'week': {
      const weekStart = new Date(now);
      const daysSinceMonday = (weekStart.getDay() + 6) % 7;
      weekStart.setDate(weekStart.getDate() - daysSinceMonday);
      return { date_from: weekStart.toISOString().slice(0, 10), date_to: today };
    }
    case 'last_week': {
      const end = new Date(now);
      end.setDate(end.getDate() - ((end.getDay() + 6) % 7) - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { date_from: start.toISOString().slice(0, 10), date_to: end.toISOString().slice(0, 10) };
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
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { date_from: lastMonth.toISOString().slice(0, 10), date_to: lastMonthEnd.toISOString().slice(0, 10) };
    }
    case 'lifetime': {
      return { date_from: '2024-01-01', date_to: today };
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
    staleTime: 60 * 1000,
  });

  const ordersQuery = useQuery({
    queryKey: ['analytics', 'orders', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getOrderAnalytics(filters),
    staleTime: 60 * 1000,
  });

  const customersQuery = useQuery({
    queryKey: ['analytics', 'customers', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getCustomerAnalytics(filters),
    staleTime: 60 * 1000,
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
    staleTime: 60 * 1000,
  });
};

export const useTopItemsAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, limit = 10, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters & { limit?: number } = { ...range, limit };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'top-items', period, branchId, limit, range.date_from, range.date_to],
    queryFn: () => analyticsService.getTopItemsAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useBottomItemsAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, limit = 5, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters & { limit?: number } = { ...range, limit };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'bottom-items', period, branchId, limit, range.date_from, range.date_to],
    queryFn: () => analyticsService.getBottomItemsAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useCategoryRevenueAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'category-revenue', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getCategoryRevenueAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useBranchPerformanceAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'branch-performance', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getBranchPerformanceAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useDeliveryPickupAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'delivery-pickup', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getDeliveryPickupAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const usePaymentMethodAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'payment-methods', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getPaymentMethodAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useDiscountUsageAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'discount-usage', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getDiscountUsageAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useCancellationReasonsAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'cancellation-reasons', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getCancellationReasonsAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useAdminStaffSales = (period: AnalyticsPeriod = 'today', branchId?: number, customRange?: CustomRange) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters = { ...range };
  if (branchId) filters.branch_id = branchId;

  return useQuery({
    queryKey: ['analytics', 'admin-staff-sales', period, branchId, range.date_from, range.date_to],
    queryFn: () => analyticsService.getAdminStaffSales(filters),
    staleTime: 60 * 1000,
  });
};
