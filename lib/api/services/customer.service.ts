import apiClient, { PaginatedResponse } from '../client';

export interface ApiCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  is_guest: boolean;
  account_type: 'Guest' | 'Registered';
  status: string;
  total_orders: number;
  total_spend: number;
  last_order_at?: string;
  join_date: string;
  addresses: string[];
  most_ordered_item?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomersParams {
  is_guest?: boolean;
  status?: string;
  search?: string;
  sort_by?: string;
  page?: number;
  per_page?: number;
}

export const customerService = {
  getCustomers: (params?: CustomersParams): Promise<PaginatedResponse<ApiCustomer>> => {
    return apiClient.get('/admin/customers', { params });
  },

  getCustomer: (id: number): Promise<{ data: ApiCustomer }> => {
    return apiClient.get(`/admin/customers/${id}`);
  },

  getCustomerOrders: (customerId: number, params?: { status?: string; page?: number }): Promise<PaginatedResponse<{ id: number; order_number: string; branch?: { name: string }; status: string; total_amount: number; created_at: string }>> => {
    return apiClient.get(`/admin/customers/${customerId}/orders`, { params });
  },

  deleteCustomer: (id: number): Promise<void> => {
    return apiClient.delete(`/admin/customers/${id}`);
  },

  suspendCustomer: (id: number): Promise<{ data: ApiCustomer }> => {
    return apiClient.patch(`/admin/customers/${id}/suspend`);
  },

  unsuspendCustomer: (id: number): Promise<{ data: ApiCustomer }> => {
    return apiClient.patch(`/admin/customers/${id}/unsuspend`);
  },

  forceLogoutCustomer: (id: number): Promise<void> => {
    return apiClient.post(`/admin/customers/${id}/force-logout`);
  },
};
