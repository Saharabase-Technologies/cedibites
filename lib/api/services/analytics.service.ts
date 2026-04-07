import apiClient from '../client';

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  branch_id?: number;
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
}

export interface OrdersByHour {
  hour: number;
  count: number;
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
  name: string;
  rev: number;
  orders: number;
  avg: number;
  fulfilment: number;
  cancelled: number;
}

export interface DeliveryPickupAnalytics {
  delivery_pct: number;
  pickup_pct: number;
  delivery_revenue: number;
  pickup_revenue: number;
}

export interface PaymentMethod {
  label: string;
  pct: number;
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
};
