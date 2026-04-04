import apiClient, { PaginatedResponse } from '../client';
import { Order, OrderType, PaymentMethod } from '@/types/api';

export interface CreateOrderRequest {
  branch_id: number;
  order_type: OrderType;
  customer_name: string;
  customer_phone: string;
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  special_instructions?: string;
  payment_method: PaymentMethod;
  momo_number?: string;
  momo_network?: string;
}

export interface OrdersParams {
  status?: string;
  order_type?: OrderType;
  page?: number;
  per_page?: number;
}

export interface EmployeeOrdersParams {
  branch_id?: number;
  staff_id?: string | number;
  status?: string | string[];
  order_type?: string;
  order_source?: string | string[];
  payment_status?: string[];
  payment_method?: string;
  search?: string;
  contact_phone?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export const orderService = {
  /**
   * Get customer's orders (paginated)
   */
  getOrders: (params?: OrdersParams): Promise<PaginatedResponse<Order>> => {
    return apiClient.get('/orders', { params });
  },

  /**
   * Get single order by ID
   */
  getOrder: (id: number): Promise<{ data: Order }> => {
    return apiClient.get(`/orders/${id}`);
  },

  /**
   * Get single order by order number (public, no auth required)
   */
  getOrderByNumber: (orderNumber: string): Promise<{ data: Order }> => {
    return apiClient.get(`/orders/by-number/${orderNumber}`);
  },

  /**
   * Create new order from cart
   */
  createOrder: (data: CreateOrderRequest): Promise<{ data: Order }> => {
    return apiClient.post('/orders', data);
  },

  /**
   * Cancel order with optional reason
   */
  cancelOrder: (id: number, reason?: string): Promise<{ data: Order }> => {
    return apiClient.post(`/orders/${id}/cancel`, { reason: reason ?? null });
  },

  /**
   * Request cancel (staff) — requires admin approval
   */
  requestCancel: (id: number, reason: string): Promise<{ data: Order }> => {
    return apiClient.post(`/employee/orders/${id}/request-cancel`, { reason });
  },

  /**
   * Get employee/admin orders (paginated). Uses staff token.
   */
  getEmployeeOrders: (params?: EmployeeOrdersParams): Promise<PaginatedResponse<Order>> => {
    return apiClient.get('/employee/orders', { params });
  },

  /**
   * Get employee branch order stats. Uses staff token.
   */
  getEmployeeOrderStats: (): Promise<{
    pending_orders: number;
    preparing_orders: number;
    today_orders: number;
    today_revenue: number;
    completed_today: number;
  }> => {
    return apiClient.get('/employee/orders/stats').then((r: unknown) => {
      const d = (r as { data?: unknown })?.data ?? r;
      return d as { pending_orders: number; preparing_orders: number; today_orders: number; today_revenue: number; completed_today: number };
    });
  },

  /**
   * Get employee pending orders. Uses staff token.
   */
  getEmployeePendingOrders: (perPage?: number): Promise<PaginatedResponse<Order>> => {
    return apiClient.get('/employee/orders/pending', { params: { per_page: perPage ?? 10 } });
  },
};
