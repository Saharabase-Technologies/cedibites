import apiClient from '../client';

export interface PaymentOrder {
  id: number;
  order_number: string;
  order_source: string;
  contact_name: string | null;
  contact_phone: string | null;
  customer: {
    name: string | null;
    phone: string | null;
  };
}

export interface Payment {
  id: number;
  order_id: number;
  amount: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
  order: PaymentOrder | null;
}

export interface PaymentsParams {
  page?: number;
  per_page?: number;
  payment_status?: string;
  payment_method?: string;
  branch_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface PaymentsResponse {
  data: Payment[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface PaymentStats {
  completed: { count: number; total: number };
  pending:   { count: number; total: number };
  no_charge: { count: number; total: number };
}

export interface PaymentStatsParams {
  branch_id?: number;
  date_from?: string;
  date_to?: string;
}

export const paymentService = {
  getStats: async (params?: PaymentStatsParams): Promise<PaymentStats> => {
    const response = await apiClient.get('/admin/payments/stats', { params });
    const raw = response as any;
    return (raw?.data ?? raw) as PaymentStats;
  },

  getPayments: async (params?: PaymentsParams): Promise<PaymentsResponse> => {
    const response = await apiClient.get('/admin/payments', { params });
    const raw = response as any;
    // unwrap nested data.data from success wrapper
    return (raw?.data ?? raw) as PaymentsResponse;
  },

  refund: async (paymentId: number): Promise<Payment> => {
    const response = await apiClient.post(`/admin/payments/${paymentId}/refund`);
    const raw = response as any;
    return (raw?.data ?? raw) as Payment;
  },
};
