import apiClient from '../client';

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  branch_id?: number;
  /** Aggregate across multiple branches (partner portal "all assigned branches"). */
  branch_ids?: number[];
}

export type TrendBucket = 'hour' | 'day' | 'week' | 'month';

export interface SalesComparisonMetrics {
  revenue: number;
  orders: number;
  aov: number;
}

export interface SalesComparison {
  current: SalesComparisonMetrics;
  previous: SalesComparisonMetrics | null;
  delta: { revenue: number | null; orders: number | null; aov: number | null } | null;
  previous_range: { date_from: string; date_to: string } | null;
}

export interface RevenueTrendPoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface RevenueTrend {
  bucket: TrendBucket;
  series: RevenueTrendPoint[];
}

export interface SalesByDay {
  date: string;
  total: number;
  orders: number;
}

export interface SalesByType {
  order_type: string;
  total: number;
  orders: number;
}

export interface SalesAnalytics {
  total_sales: number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  cancelled_revenue: number;
  average_order_value: number;
  sales_by_day: SalesByDay[];
  sales_by_type: SalesByType[];
  no_charge_count: number;
  no_charge_amount: number;
  avg_items_per_order: number;
  single_item_orders_pct: number;
  multi_item_orders: number;
  max_items_in_order: number;
}

export interface OrdersByHour {
  hour: number;
  count: number;
  revenue?: number;
}

export interface OrderAnalytics {
  orders_by_status: Record<string, number>;
  orders_by_hour: OrdersByHour[];
  active_orders: number;
  average_prep_time: number | null;
  total_orders: number;
}

export interface TopCustomer {
  id: number;
  name?: string;
  orders_count?: number;
  total_spend?: number;
  last_order_date?: string;
  user?: { name: string; phone: string };
}

export interface CustomerAnalytics {
  total_customers: number;
  new_customers_30_days: number;
  new_customers_in_period: number;
  top_customers_by_orders: TopCustomer[];
  top_customers_by_spending: TopCustomer[];
}

export interface OrderSource {
  name: string;
  count: number;
  pct: number;
  avgValue: number;
  total_revenue: number;
}

export interface TopItem {
  id?: number;
  name: string;
  size_label?: string;
  units: number;
  rev: number;
  trend: number;
}

export interface BottomItem {
  id?: number;
  name: string;
  size_label?: string;
  units: number;
  rev: number;
}

export interface CategoryRevenue {
  cat: string;
  rev: number;
  pct: number;
}

export interface BranchPerformance {
  id: number;
  name: string;
  rev: number;
  orders: number;
  avg: number;
  fulfilment: number;
  cancelled: number;
}

export interface OrderTypeSplit {
  type: string;
  label: string;
  pct: number;
  revenue: number;
}

export interface DeliveryPickupAnalytics {
  delivery_pct: number;
  pickup_pct: number;
  delivery_revenue: number;
  pickup_revenue: number;
  types?: OrderTypeSplit[];
}

export interface PaymentMethod {
  label: string;
  pct: number;
  amount?: number;
  count?: number;
}

export interface PromoMetric {
  promo_id: number;
  promo_name: string;
  usage_count: number;
  total_discount: number;
  revenue_generated: number;
}

export interface DiscountUsageAnalytics {
  total_orders: number;
  discounted_orders: number;
  discount_rate: number;
  total_discount_given: number;
  avg_discount_per_order: number;
  promos: PromoMetric[];
}

export interface FulfillmentAnalytics {
  avg_time_to_accept: number | null;   // minutes
  avg_prep_time: number | null;        // minutes
  avg_fulfillment_time: number | null; // minutes
}

export interface CancellationReason {
  reason: string;
  count: number;
  pct: number;
}

export interface CancellationReasonsAnalytics {
  total_cancelled: number;
  reasons: CancellationReason[];
}

export interface AdminStaffSalesRow {
  employee_id: number;
  staff_name: string;
  total_orders: number;
  momo_total: number;
  momo_count: number;
  cash_total: number;
  cash_count: number;
  manual_momo_total: number;
  manual_momo_count: number;
  no_charge_total: number;
  no_charge_count: number;
  card_total: number;
  card_count: number;
  total_revenue: number;
}

// ─── Menu comparison ────────────────────────────────────────────────────────

export interface MenuCatalogOption {
  id: number;
  label: string;
}

export interface MenuCatalogItem {
  id: number;
  name: string;
  options: MenuCatalogOption[];
}

export interface ComparisonSubjectInput {
  label?: string;
  item_ids: number[];
  option_ids: number[];
}

export interface ComparisonSeriesPoint {
  date: string;
  revenue: number;
}

export interface ComparisonSubject {
  label: string;
  revenue: number;
  units: number;
  orders: number;
  aov: number;
  avg_per_day: number;
  max_day: ComparisonSeriesPoint | null;
  min_day: ComparisonSeriesPoint | null;
  series: ComparisonSeriesPoint[];
}

export interface MenuComparison {
  range: { date_from: string; date_to: string; days: number };
  subjects: ComparisonSubject[];
}

// ─── Repeat customers & weekday-hour ────────────────────────────────────────

export interface RepeatCustomerMetrics {
  active_customers: number;
  repeat_customers: number;
  new_customers: number;
  repeat_rate: number;
  avg_days_between_orders: number | null;
}

export interface RetentionCohort {
  month: string;          // YYYY-MM
  acquired: number;
  retained: number;
  retention_rate: number; // %
}

export interface CustomerLifecycleMetrics {
  total_customers: number;
  avg_lifetime_value: number;
  avg_orders_per_customer: number;
  one_time_customers: number;
  repeat_customers: number;
  active_customers: number;   // ordered ≤30d ago
  at_risk_customers: number;  // 31–60d ago
  churned_customers: number;  // >60d ago
  cohorts: RetentionCohort[];
}

export interface WeekdayHourCell {
  dow: number; // 0=Mon … 6=Sun
  hour: number;
  count: number;
}

export interface WeekdayHourMetrics {
  cells: WeekdayHourCell[];
}

// ─── Basket affinity (#4) ───────────────────────────────────────────────────

export interface BasketPair {
  item_a: string;
  item_b: string;
  count: number;        // orders containing both items
  lift: number;         // association strength (>1 = bought together more than chance)
}

export interface BasketAffinityAnalytics {
  total_multi_item_orders: number;
  pairs: BasketPair[];
}

// ─── Revenue targets (#5) ───────────────────────────────────────────────────

export interface RevenueTargetRow {
  branch_id: number;
  branch_name: string;
  year: number;
  month: number;
  target_amount: number;
}

export interface TargetVsActual {
  branch_id: number;
  branch_name: string;
  target_amount: number;
  actual_amount: number;
  attainment_pct: number;    // actual / target %
  pace_pct: number;          // % of month elapsed
  projected_amount: number;  // straight-line end-of-month projection
  on_track: boolean;
}

export interface TargetsVsActualResponse {
  year: number;
  month: number;
  days_in_month: number;
  days_elapsed: number;
  rows: TargetVsActual[];
}

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export const analyticsService = {
  getSalesAnalytics: (filters?: AnalyticsFilters): Promise<SalesAnalytics> => {
    return apiClient.get('/admin/analytics/sales', { params: filters }).then(extractData) as Promise<SalesAnalytics>;
  },

  getOrderAnalytics: (filters?: AnalyticsFilters): Promise<OrderAnalytics> => {
    return apiClient.get('/admin/analytics/orders', { params: filters }).then(extractData) as Promise<OrderAnalytics>;
  },

  getSalesComparison: (filters?: AnalyticsFilters): Promise<SalesComparison> => {
    return apiClient.get('/admin/analytics/sales-comparison', { params: filters }).then(extractData) as Promise<SalesComparison>;
  },

  getRevenueTrend: (filters?: AnalyticsFilters & { bucket?: TrendBucket }): Promise<RevenueTrend> => {
    return apiClient.get('/admin/analytics/revenue-trend', { params: filters }).then(extractData) as Promise<RevenueTrend>;
  },

  getCustomerAnalytics: (filters?: Pick<AnalyticsFilters, 'date_from' | 'date_to'>): Promise<CustomerAnalytics> => {
    return apiClient.get('/admin/analytics/customers', { params: filters }).then(extractData) as Promise<CustomerAnalytics>;
  },

  getOrderSourceAnalytics: (filters?: AnalyticsFilters): Promise<OrderSource[]> => {
    return apiClient.get('/admin/analytics/order-sources', { params: filters }).then(extractData) as Promise<OrderSource[]>;
  },

  getTopItemsAnalytics: (filters?: AnalyticsFilters & { limit?: number }): Promise<TopItem[]> => {
    return apiClient.get('/admin/analytics/top-items', { params: filters }).then(extractData) as Promise<TopItem[]>;
  },

  getBottomItemsAnalytics: (filters?: AnalyticsFilters & { limit?: number }): Promise<BottomItem[]> => {
    return apiClient.get('/admin/analytics/bottom-items', { params: filters }).then(extractData) as Promise<BottomItem[]>;
  },

  getCategoryRevenueAnalytics: (filters?: AnalyticsFilters): Promise<CategoryRevenue[]> => {
    return apiClient.get('/admin/analytics/category-revenue', { params: filters }).then(extractData) as Promise<CategoryRevenue[]>;
  },

  getBranchPerformanceAnalytics: (filters?: AnalyticsFilters): Promise<BranchPerformance[]> => {
    return apiClient.get('/admin/analytics/branch-performance', { params: filters }).then(extractData) as Promise<BranchPerformance[]>;
  },

  getDeliveryPickupAnalytics: (filters?: AnalyticsFilters): Promise<DeliveryPickupAnalytics> => {
    return apiClient.get('/admin/analytics/delivery-pickup', { params: filters }).then(extractData) as Promise<DeliveryPickupAnalytics>;
  },

  getPaymentMethodAnalytics: (filters?: AnalyticsFilters): Promise<PaymentMethod[]> => {
    return apiClient.get('/admin/analytics/payment-methods', { params: filters }).then(extractData) as Promise<PaymentMethod[]>;
  },

  getDiscountUsageAnalytics: (filters?: AnalyticsFilters): Promise<DiscountUsageAnalytics> => {
    return apiClient.get('/admin/analytics/discount-usage', { params: filters }).then(extractData) as Promise<DiscountUsageAnalytics>;
  },

  getCancellationReasonsAnalytics: (filters?: AnalyticsFilters): Promise<CancellationReasonsAnalytics> => {
    return apiClient.get('/admin/analytics/cancellation-reasons', { params: filters }).then(extractData) as Promise<CancellationReasonsAnalytics>;
  },

  getAdminStaffSales: (filters?: AnalyticsFilters): Promise<AdminStaffSalesRow[]> => {
    return apiClient.get('/admin/analytics/staff-sales', { params: filters }).then(extractData) as Promise<AdminStaffSalesRow[]>;
  },

  getFulfillmentAnalytics: (filters?: AnalyticsFilters): Promise<FulfillmentAnalytics> => {
    return apiClient.get('/admin/analytics/fulfillment', { params: filters }).then(extractData) as Promise<FulfillmentAnalytics>;
  },

  getMenuCatalog: (): Promise<MenuCatalogItem[]> => {
    return apiClient.get('/admin/analytics/menu-catalog').then(extractData) as Promise<MenuCatalogItem[]>;
  },

  getMenuComparison: (filters: AnalyticsFilters, subjects: ComparisonSubjectInput[]): Promise<MenuComparison> => {
    return apiClient.post('/admin/analytics/menu-comparison', { ...filters, subjects }).then(extractData) as Promise<MenuComparison>;
  },

  getRepeatCustomerAnalytics: (filters?: AnalyticsFilters): Promise<RepeatCustomerMetrics> => {
    return apiClient.get('/admin/analytics/repeat-customers', { params: filters }).then(extractData) as Promise<RepeatCustomerMetrics>;
  },

  getCustomerLifecycleAnalytics: (filters?: AnalyticsFilters): Promise<CustomerLifecycleMetrics> => {
    return apiClient.get('/admin/analytics/customer-lifecycle', { params: filters }).then(extractData) as Promise<CustomerLifecycleMetrics>;
  },

  getBasketAffinityAnalytics: (filters?: AnalyticsFilters): Promise<BasketAffinityAnalytics> => {
    return apiClient.get('/admin/analytics/basket-affinity', { params: filters }).then(extractData) as Promise<BasketAffinityAnalytics>;
  },

  getRevenueTargets: (params: { year: number; month: number }): Promise<RevenueTargetRow[]> => {
    return apiClient.get('/admin/analytics/revenue-targets', { params }).then(extractData) as Promise<RevenueTargetRow[]>;
  },

  setRevenueTarget: (data: { branch_id: number; year: number; month: number; target_amount: number }): Promise<RevenueTargetRow> => {
    return apiClient.put('/admin/analytics/revenue-targets', data).then(extractData) as Promise<RevenueTargetRow>;
  },

  getTargetsVsActual: (params?: { year?: number; month?: number }): Promise<TargetsVsActualResponse> => {
    return apiClient.get('/admin/analytics/targets-vs-actual', { params }).then(extractData) as Promise<TargetsVsActualResponse>;
  },

  getWeekdayHourAnalytics: (filters?: AnalyticsFilters): Promise<WeekdayHourMetrics> => {
    return apiClient.get('/admin/analytics/weekday-hour', { params: filters }).then(extractData) as Promise<WeekdayHourMetrics>;
  },
};
