import apiClient from '../client';
import type { Branch } from '@/types/api';

export interface BranchStats {
  total_employees: number;
  active_employees: number;
  total_orders: number;
  today_orders: number;
  month_orders: number;
  today_revenue: number;
  month_revenue: number;
  today_cancelled: number;
  today_cancelled_revenue: number;
}

export interface BranchTopItem {
  name: string;
  size_label: string | null;
  units: number;
  rev: number;
  trend: number;
}

export interface BranchRevenueChartPoint {
  date: string;
  day: string;
  revenue: number;
  percentage?: number;
}

export interface StaffSalesRow {
  employee_id: number;
  staff_name: string;
  total_orders: number;
  momo_total: number;
  momo_count: number;
  cash_total: number;
  cash_count: number;
  no_charge_total: number;
  no_charge_count: number;
  card_total: number;
  card_count: number;
  total_revenue: number;
}

export interface CreateBranchPayload {
  name: string;
  area: string;
  address: string;
  phone: string;
  email?: string;
  latitude: number;
  longitude: number;
  is_active?: boolean;
  operating_hours?: Record<string, {
    is_open: boolean;
    open_time: string | null;
    close_time: string | null;
  }>;
  delivery_settings?: {
    base_delivery_fee: number;
    per_km_fee: number;
    delivery_radius_km: number;
    min_order_value: number;
    estimated_delivery_time?: string;
  };
  order_types?: Record<string, {
    is_enabled: boolean;
    metadata?: any;
  }>;
  payment_methods?: Record<string, {
    is_enabled: boolean;
    metadata?: any;
  }>;
}

export interface UpdateBranchPayload {
  name?: string;
  area?: string;
  address?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  operating_hours?: Record<string, {
    is_open: boolean;
    open_time: string | null;
    close_time: string | null;
  }>;
  delivery_settings?: {
    base_delivery_fee: number;
    per_km_fee: number;
    delivery_radius_km: number;
    min_order_value: number;
    estimated_delivery_time?: string;
  };
  order_types?: Record<string, {
    is_enabled: boolean;
    metadata?: any;
  }>;
  payment_methods?: Record<string, {
    is_enabled: boolean;
    metadata?: any;
  }>;
}

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export const branchService = {
  getBranches: async (): Promise<Branch[]> => {
    const response = await apiClient.get('/branches');
    return extractData<Branch[]>(response);
  },

  getBranch: async (id: number): Promise<Branch> => {
    const response = await apiClient.get(`/branches/${id}`);
    return extractData<Branch>(response);
  },

  createBranch: async (payload: CreateBranchPayload): Promise<Branch> => {
    const response = await apiClient.post('/admin/branches', payload);
    return extractData<Branch>(response);
  },

  updateBranch: async (id: number, payload: UpdateBranchPayload): Promise<Branch> => {
    const response = await apiClient.patch(`/admin/branches/${id}`, payload);
    return extractData<Branch>(response);
  },

  deleteBranch: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/branches/${id}`);
  },

  toggleDailyStatus: async (id: number): Promise<{ message: string; is_open: boolean; day: string }> => {
    const response = await apiClient.patch(`/admin/branches/${id}/toggle-status`);
    return extractData<{ message: string; is_open: boolean; day: string }>(response);
  },

  getBranchStats: async (id: number): Promise<BranchStats> => {
    const response = await apiClient.get(`/manager/branches/${id}/stats`);
    return extractData<BranchStats>(response);
  },

  getManagerBranchStats: async (id: number): Promise<BranchStats> => {
    const response = await apiClient.get(`/manager/branches/${id}/stats`);
    return extractData<BranchStats>(response);
  },

  getBranchTopItems: async (id: number, params?: { date?: string; limit?: number }): Promise<BranchTopItem[]> => {
    const response = await apiClient.get(`/manager/branches/${id}/top-items`, { params });
    return extractData<BranchTopItem[]>(response);
  },

  getBranchRevenueChart: async (id: number, params?: { period?: string }): Promise<BranchRevenueChartPoint[]> => {
    const response = await apiClient.get(`/manager/branches/${id}/revenue-chart`, { params });
    return extractData<BranchRevenueChartPoint[]>(response);
  },

  getBranchStaffSales: async (id: number, date: string): Promise<StaffSalesRow[]> => {
    const response = await apiClient.get(`/manager/branches/${id}/staff-sales`, { params: { date } });
    return extractData<StaffSalesRow[]>(response);
  },
};
