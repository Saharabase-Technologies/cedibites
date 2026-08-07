import { useQuery } from '@tanstack/react-query';
import { paymentService } from '../services/payment.service';
import type { PaymentsParams, PaymentStatsParams } from '../services/payment.service';

export const usePaymentStats = (params?: PaymentStatsParams) => {
  const { data, isLoading } = useQuery({
    queryKey: ['payment-stats', params],
    queryFn: () => paymentService.getStats(params),
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token'),
  });
  return { stats: data, isLoading };
};

export const usePayments = (params?: PaymentsParams) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentService.getPayments(params),
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token'),
  });

  return {
    payments: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error,
    refetch,
  };
};
