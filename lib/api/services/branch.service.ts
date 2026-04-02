import apiClient from '../client';
import type { Branch } from '@/types/api';

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

  getBranchStats: async (id: number): Promise<any> => {
    const response = await apiClient.get(`/manager/branches/${id}/stats`);
    return extractData<any>(response);
  },

  getManagerBranchStats: async (id: number): Promise<any> => {
    const response = await apiClient.get(`/manager/branches/${id}/stats`);
    return extractData<any>(response);
  },

  getBranchTopItems: async (id: number, params?: { date?: string; limit?: number }): Promise<any[]> => {
    const response = await apiClient.get(`/manager/branches/${id}/top-items`, { params });
    return extractData<any[]>(response);
  },

  getBranchRevenueChart: async (id: number, params?: { period?: string }): Promise<any[]> => {
    const response = await apiClient.get(`/manager/branches/${id}/revenue-chart`, { params });
    return extractData<any[]>(response);
  },

  getBranchStaffSales: async (id: number, date: string): Promise<any[]> => {
    const response = await apiClient.get(`/manager/branches/${id}/staff-sales`, { params: { date } });
    return extractData<any[]>(response);
  },
};
