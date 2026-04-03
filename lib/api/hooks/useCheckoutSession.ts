import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  checkoutSessionService,
  type CreateCheckoutSessionRequest,
  type RetryPaymentRequest,
  type ChangePaymentMethodRequest,
} from '../services/checkout-session.service';

/** Poll a checkout session's status until it reaches a terminal state. */
export const useCheckoutSessionStatus = (token: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['checkout-session', token],
    queryFn: () => checkoutSessionService.getStatus(token!),
    enabled: !!token,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (!status) return 3000;
      // Stop polling on terminal states
      if (['confirmed', 'failed', 'expired', 'abandoned'].includes(status)) return false;
      return 3000;
    },
  });

  return {
    session: query.data?.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['checkout-session', token] }),
  };
};

/** Create a new online checkout session from the cart. */
export const useCreateCheckoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCheckoutSessionRequest) => checkoutSessionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

/** Abandon an online checkout session. */
export const useAbandonCheckoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => checkoutSessionService.abandon(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-session'] });
    },
  });
};

/** Retry payment on a failed/pending checkout session. */
export const useRetryPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, data }: { token: string; data?: RetryPaymentRequest }) =>
      checkoutSessionService.retryPayment(token, data),
    onSuccess: (_data, { token }) => {
      queryClient.invalidateQueries({ queryKey: ['checkout-session', token] });
    },
  });
};

/** Change payment method on a checkout session. */
export const useChangePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, data }: { token: string; data: ChangePaymentMethodRequest }) =>
      checkoutSessionService.changePaymentMethod(token, data),
    onSuccess: (_data, { token }) => {
      queryClient.invalidateQueries({ queryKey: ['checkout-session', token] });
    },
  });
};

// --- POS Hooks ---

/** List pending POS checkout sessions for a branch. */
export const usePosCheckoutSessions = (params?: { branch_id?: number; status?: string }) => {
  return useQuery({
    queryKey: ['pos-checkout-sessions', params],
    queryFn: () => checkoutSessionService.posIndex(params),
    refetchInterval: 10000, // refresh every 10s
  });
};

/** Create a POS checkout session. */
export const useCreatePosCheckoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkoutSessionService.posCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-checkout-sessions'] });
    },
  });
};

/** Confirm a cash POS session. */
export const useConfirmCash = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, amountPaid }: { token: string; amountPaid: number }) => checkoutSessionService.confirmCash(token, amountPaid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-checkout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

/** Confirm a card POS session. */
export const useConfirmCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, amountPaid }: { token: string; amountPaid: number }) => checkoutSessionService.confirmCard(token, amountPaid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-checkout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
