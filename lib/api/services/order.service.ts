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
   * Get single order by order number
   */
  getOrderByNumber: (orderNumber: string): Promise<{ data: Order }> => {
    return apiClient.get(`/orders/${orderNumber}`);
  },

  /**
   * Create new order from cart
   */
  createOrder: (data: CreateOrderRequest): Promise<{ data: Order }> => {
    return apiClient.post('/orders', data);
  },

  /**
   * Cancel order
   */
  cancelOrder: (id: number): Promise<{ data: Order }> => {
    return apiClient.delete(`/orders/${id}`);
  },
};
