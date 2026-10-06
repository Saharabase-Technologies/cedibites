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
  /** A code the customer typed. The server checks it again and refuses the order if it no longer applies. */
  promo_code?: string;
}

/**
 * A payment a customer made by dialling the branch code, which Hubtel has
 * confirmed. Only the last four digits of the payer's number leave the server.
 */
export interface BranchCodePayment {
  id: number;
  amount: number;
  paid_at: string;
  payer_last_four: string | null;
  network_transaction_id: string | null;
}

/**
 * What the server found for a transaction ID typed from a customer's MoMo
 * message. `ours` is a MoMo prompt the till itself sent; `unavailable` means
 * Hubtel did not answer.
 */
export interface BranchCodePaymentCheck {
  transaction_id: string;
  outcome: 'paid' | 'ours' | 'not_paid' | 'not_found' | 'unavailable';
  amount: number | null;
  paid_at: string | null;
  payer_last_four: string | null;
  /** Known only for a payment already on a branch's list. */
  branch: string | null;
  order_number: string | null;
  /** The first time this ID was checked and found paid, if this is not it. */
  first_checked: { at: string; branch: string | null; by: string | null } | null;
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

  create: (data: CreateCheckoutSessionRequest): Promise<CheckoutSession> => {
    return apiClient.post('/checkout-sessions', data);
  },

  getStatus: (token: string): Promise<CheckoutSession> => {
    return apiClient.get(`/checkout-sessions/${token}`);
  },

  abandon: (token: string): Promise<void> => {
    return apiClient.delete(`/checkout-sessions/${token}`);
  },

  retryPayment: (token: string, data?: RetryPaymentRequest): Promise<CheckoutSession> => {
    return apiClient.post(`/checkout-sessions/${token}/retry-payment`, data ?? {});
  },

  changePaymentMethod: (token: string, data: ChangePaymentMethodRequest): Promise<CheckoutSession> => {
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
    /** Ignored by the server since codes arrived; it works the discount out itself. */
    discount?: number;
    /** A code the cashier typed. */
    promo_code?: string;
    delivery_fee?: number;
    /** Channel the order came in on. Omitted means the till. */
    order_source?: string;
  }): Promise<CheckoutSession> => {
    return apiClient.post('/pos/checkout-sessions', data);
  },

  posIndex: (params?: {
    branch_id?: number;
    status?: string;
  }): Promise<{ data: CheckoutSession[] }> => {
    return apiClient.get('/pos/checkout-sessions', { params });
  },

  posBranchCodePayments: (branchId: number): Promise<{ data: BranchCodePayment[] }> => {
    return apiClient.get('/pos/branch-code-payments', { params: { branch_id: branchId } });
  },

  posCheckBranchCodePayment: (branchId: number, transactionId: string): Promise<{ data: BranchCodePaymentCheck }> => {
    return apiClient.post('/pos/branch-code-payments/check', { branch_id: branchId, transaction_id: transactionId });
  },

  posGetStatus: (token: string): Promise<CheckoutSession> => {
    return apiClient.get(`/pos/checkout-sessions/${token}`);
  },

  confirmCash: (token: string, amountPaid: number): Promise<CheckoutSession> => {
    return apiClient.post(`/pos/checkout-sessions/${token}/confirm-cash`, { amount_paid: amountPaid });
  },

  confirmCard: (token: string, amountPaid: number): Promise<CheckoutSession> => {
    return apiClient.post(`/pos/checkout-sessions/${token}/confirm-card`, { amount_paid: amountPaid });
  },

  posRetryPayment: (token: string, data?: RetryPaymentRequest): Promise<CheckoutSession> => {
    return apiClient.post(`/pos/checkout-sessions/${token}/retry-payment`, data ?? {});
  },

  posChangePayment: (token: string, data: ChangePaymentMethodRequest): Promise<CheckoutSession> => {
    return apiClient.post(`/pos/checkout-sessions/${token}/change-payment`, data);
  },

  posAbandon: (token: string): Promise<void> => {
    return apiClient.post(`/pos/checkout-sessions/${token}/cancel`);
  },
};
