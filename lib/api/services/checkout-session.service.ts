import apiClient from '../client';
import type { CheckoutSession, PaymentMethod, OrderType } from '@/types/api';

export interface CreateCheckoutSessionRequest {
  branch_id: number;
  order_type: OrderType;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  special_instructions?: string;
  payment_method: PaymentMethod;
  momo_number?: string;
  momo_network?: string;
}

export interface RetryPaymentRequest {
  momo_number?: string;
  momo_network?: string;
}

export interface ChangePaymentMethodRequest {
  payment_method: PaymentMethod;
  momo_number?: string;
  momo_network?: string;
}

export const checkoutSessionService = {
  // --- Online (customer) ---

  create: (data: CreateCheckoutSessionRequest): Promise<{ data: CheckoutSession }> => {
    return apiClient.post('/checkout-sessions', data);
  },

  getStatus: (token: string): Promise<{ data: CheckoutSession }> => {
    return apiClient.get(`/checkout-sessions/${token}`);
  },

  abandon: (token: string): Promise<void> => {
    return apiClient.delete(`/checkout-sessions/${token}`);
  },

  retryPayment: (token: string, data?: RetryPaymentRequest): Promise<{ data: CheckoutSession }> => {
    return apiClient.post(`/checkout-sessions/${token}/retry-payment`, data ?? {});
  },

  changePaymentMethod: (token: string, data: ChangePaymentMethodRequest): Promise<{ data: CheckoutSession }> => {
    return apiClient.post(`/checkout-sessions/${token}/change-payment`, data);
  },

  // --- POS ---

  posCreate: (data: {
    branch_id: number;
    items: Array<{
      menu_item_id: number;
      menu_item_option_id?: number;
      quantity: number;
      unit_price: number;
      special_instructions?: string;
    }>;
    fulfillment_type: string;
    contact_name: string;
    contact_phone: string;
    payment_method: PaymentMethod;
    momo_number?: string;
    is_manual_entry?: boolean;
    recorded_at?: string;
    customer_notes?: string;
    discount?: number;
  }): Promise<{ data: CheckoutSession }> => {
    return apiClient.post('/pos/checkout-sessions', data);
  },

  posIndex: (params?: {
    branch_id?: number;
    status?: string;
  }): Promise<{ data: CheckoutSession[] }> => {
    return apiClient.get('/pos/checkout-sessions', { params });
  },

  posGetStatus: (token: string): Promise<{ data: CheckoutSession }> => {
    return apiClient.get(`/pos/checkout-sessions/${token}`);
  },

  confirmCash: (token: string): Promise<{ data: CheckoutSession }> => {
    return apiClient.post(`/pos/checkout-sessions/${token}/confirm-cash`);
  },

  confirmCard: (token: string): Promise<{ data: CheckoutSession }> => {
    return apiClient.post(`/pos/checkout-sessions/${token}/confirm-card`);
  },

  posRetryPayment: (token: string, data?: RetryPaymentRequest): Promise<{ data: CheckoutSession }> => {
    return apiClient.post(`/pos/checkout-sessions/${token}/retry-payment`, data ?? {});
  },

  posChangePayment: (token: string, data: ChangePaymentMethodRequest): Promise<{ data: CheckoutSession }> => {
    return apiClient.post(`/pos/checkout-sessions/${token}/change-payment`, data);
  },

  posAbandon: (token: string): Promise<void> => {
    return apiClient.delete(`/pos/checkout-sessions/${token}`);
  },
};
