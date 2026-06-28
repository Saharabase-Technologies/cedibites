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
  type FulfillmentAnalytics,
  type AdminStaffSalesRow,
  type SalesComparison,
  type RevenueTrend,
  type TrendBucket,
  type MenuCatalogItem,
  type MenuComparison,
  type ComparisonSubjectInput,
  type RepeatCustomerMetrics,
  type WeekdayHourMetrics,
  type CustomerLifecycleMetrics,
  type BasketAffinityAnalytics,
  type TargetsVsActualResponse,
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
      // Sunday-start week (Sun..Sat). 0=Sun … 6=Sat.
      const weekStart = new Date(now);
      const daysSinceSunday = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - daysSinceSunday);
      return { date_from: weekStart.toISOString().slice(0, 10), date_to: today };
    }
    case 'last_week': {
      // Last Sun..Sat (the full prior calendar week).
      const lastSat = new Date(now);
      lastSat.setDate(lastSat.getDate() - lastSat.getDay() - 1);
      const lastSun = new Date(lastSat);
      lastSun.setDate(lastSun.getDate() - 6);
      return { date_from: lastSun.toISOString().slice(0, 10), date_to: lastSat.toISOString().slice(0, 10) };
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

/**
 * Build the analytics filter set, scoping to a single branch (branchId) or a
 * set of branches (branchIds — the partner portal's "all assigned branches").
 * branchIds takes precedence when non-empty.
 */
function buildFilters(
  period: AnalyticsPeriod,
  customRange?: CustomRange,
  branchId?: number,
  branchIds?: number[],
): AnalyticsFilters {
  const filters: AnalyticsFilters = { ...getDateRange(period, customRange) };
  if (branchIds && branchIds.length > 0) filters.branch_ids = branchIds;
  else if (branchId) filters.branch_id = branchId;
  return filters;
}

/** Stable query-key fragment for the current branch scope. */
function branchKey(branchId?: number, branchIds?: number[]): string | number | undefined {
  if (branchIds && branchIds.length > 0) return branchIds.join(',');
  return branchId;
}

export const useAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);
  const bKey = branchKey(branchId, branchIds);

  const salesQuery = useQuery({
    queryKey: ['analytics', 'sales', period, bKey, range.date_from, range.date_to],
    queryFn: () => analyticsService.getSalesAnalytics(filters),
    staleTime: 60 * 1000,
  });

  const ordersQuery = useQuery({
    queryKey: ['analytics', 'orders', period, bKey, range.date_from, range.date_to],
    queryFn: () => analyticsService.getOrderAnalytics(filters),
    staleTime: 60 * 1000,
  });

  const customersQuery = useQuery({
    queryKey: ['analytics', 'customers', period, bKey, range.date_from, range.date_to],
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

/** Period-over-period comparison (revenue / orders / AOV with % deltas). */
export const useSalesComparison = (period: AnalyticsPeriod = 'month', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery<SalesComparison>({
    queryKey: ['analytics', 'sales-comparison', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getSalesComparison(filters),
    staleTime: 60 * 1000,
  });
};

/** Bucketed revenue trend (day / week / month, auto-selected by range length). */
export const useRevenueTrend = (period: AnalyticsPeriod = 'month', branchId?: number, bucket?: TrendBucket, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters & { bucket?: TrendBucket } = { ...buildFilters(period, customRange, branchId, branchIds) };
  if (bucket) filters.bucket = bucket;

  return useQuery<RevenueTrend>({
    queryKey: ['analytics', 'revenue-trend', period, branchKey(branchId, branchIds), bucket ?? 'auto', range.date_from, range.date_to],
    queryFn: () => analyticsService.getRevenueTrend(filters),
    staleTime: 60 * 1000,
  });
};

export const useOrderSourceAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery({
    queryKey: ['analytics', 'order-sources', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getOrderSourceAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useTopItemsAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, limit = 10, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters & { limit?: number } = { ...buildFilters(period, customRange, branchId, branchIds), limit };

  return useQuery({
    queryKey: ['analytics', 'top-items', period, branchKey(branchId, branchIds), limit, range.date_from, range.date_to],
    queryFn: () => analyticsService.getTopItemsAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useBottomItemsAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, limit = 5, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters: AnalyticsFilters & { limit?: number } = { ...buildFilters(period, customRange, branchId, branchIds), limit };

  return useQuery({
    queryKey: ['analytics', 'bottom-items', period, branchKey(branchId, branchIds), limit, range.date_from, range.date_to],
    queryFn: () => analyticsService.getBottomItemsAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useCategoryRevenueAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery({
    queryKey: ['analytics', 'category-revenue', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getCategoryRevenueAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useBranchPerformanceAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery({
    queryKey: ['analytics', 'branch-performance', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getBranchPerformanceAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useDeliveryPickupAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery({
    queryKey: ['analytics', 'delivery-pickup', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getDeliveryPickupAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const usePaymentMethodAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery({
    queryKey: ['analytics', 'payment-methods', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getPaymentMethodAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useDiscountUsageAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery({
    queryKey: ['analytics', 'discount-usage', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getDiscountUsageAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useCancellationReasonsAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery({
    queryKey: ['analytics', 'cancellation-reasons', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getCancellationReasonsAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useFulfillmentAnalytics = (period: AnalyticsPeriod = 'week', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery<FulfillmentAnalytics>({
    queryKey: ['analytics', 'fulfillment', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getFulfillmentAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useAdminStaffSales = (period: AnalyticsPeriod = 'today', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery({
    queryKey: ['analytics', 'admin-staff-sales', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getAdminStaffSales(filters),
    staleTime: 60 * 1000,
  });
};

/** Menu catalog (items + options) for the comparison picker. */
export const useMenuCatalog = () =>
  useQuery<MenuCatalogItem[]>({
    queryKey: ['analytics', 'menu-catalog'],
    queryFn: () => analyticsService.getMenuCatalog(),
    staleTime: 10 * 60 * 1000,
  });

/** Menu comparison — aggregate sales for assembled subjects (item/option selectors). */
export const useMenuComparison = (
  subjects: ComparisonSubjectInput[],
  period: AnalyticsPeriod = 'month',
  branchId?: number,
  customRange?: CustomRange,
  branchIds?: number[],
) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);
  const hasSelectors = subjects.some(s => s.item_ids.length > 0 || s.option_ids.length > 0);

  return useQuery<MenuComparison>({
    queryKey: ['analytics', 'menu-comparison', period, branchKey(branchId, branchIds), range.date_from, range.date_to, JSON.stringify(subjects)],
    queryFn: () => analyticsService.getMenuComparison(filters, subjects),
    enabled: hasSelectors,
    staleTime: 60 * 1000,
  });
};

export const useRepeatCustomerAnalytics = (period: AnalyticsPeriod = 'month', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery<RepeatCustomerMetrics>({
    queryKey: ['analytics', 'repeat-customers', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getRepeatCustomerAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useCustomerLifecycleAnalytics = (period: AnalyticsPeriod = 'month', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery<CustomerLifecycleMetrics>({
    queryKey: ['analytics', 'customer-lifecycle', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getCustomerLifecycleAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

export const useBasketAffinityAnalytics = (period: AnalyticsPeriod = 'month', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery<BasketAffinityAnalytics>({
    queryKey: ['analytics', 'basket-affinity', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getBasketAffinityAnalytics(filters),
    staleTime: 60 * 1000,
  });
};

/** Per-branch monthly revenue targets vs actual (defaults to current month). */
export const useTargetsVsActual = (year?: number, month?: number) =>
  useQuery<TargetsVsActualResponse>({
    queryKey: ['analytics', 'targets-vs-actual', year ?? 'cur', month ?? 'cur'],
    queryFn: () => analyticsService.getTargetsVsActual(year && month ? { year, month } : undefined),
    staleTime: 60 * 1000,
  });

export const useWeekdayHourAnalytics = (period: AnalyticsPeriod = 'month', branchId?: number, customRange?: CustomRange, branchIds?: number[]) => {
  const range = getDateRange(period, customRange);
  const filters = buildFilters(period, customRange, branchId, branchIds);

  return useQuery<WeekdayHourMetrics>({
    queryKey: ['analytics', 'weekday-hour', period, branchKey(branchId, branchIds), range.date_from, range.date_to],
    queryFn: () => analyticsService.getWeekdayHourAnalytics(filters),
    staleTime: 60 * 1000,
  });
};
