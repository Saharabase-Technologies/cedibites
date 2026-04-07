'use client';

import { useState } from 'react';
import {
  ArrowCounterClockwiseIcon,
  DeviceMobileIcon,
  MoneyIcon,
  ShoppingCartIcon,
  CaretDownIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react';
import {
  useRetryPayment,
  useChangePaymentMethod,
  useAbandonCheckoutSession,
} from '@/lib/api/hooks/useCheckoutSession';
import type { CheckoutSession } from '@/types/api';

interface PaymentRecoveryActionsProps {
  session: CheckoutSession;
  onOrderCreated?: (orderNumber: string) => void;
  onAbandoned?: () => void;
  /** Hide the abandon/back-to-cart action */
  hideAbandon?: boolean;
}

export default function PaymentRecoveryActions({
  session,
  onOrderCreated,
  onAbandoned,
  hideAbandon = false,
}: PaymentRecoveryActionsProps) {
  const [showChangeNumber, setShowChangeNumber] = useState(false);
  const [newMomoNumber, setNewMomoNumber] = useState(session.momo_number ?? '');
  const [error, setError] = useState<string | null>(null);

  const retry = useRetryPayment();
  const changePayment = useChangePaymentMethod();
  const abandon = useAbandonCheckoutSession();

  const isBusy = retry.isPending || changePayment.isPending || abandon.isPending;

  const handleRetry = async () => {
    setError(null);
    try {
      const result = await retry.mutateAsync({
        token: session.session_token,
        data: showChangeNumber ? { momo_number: newMomoNumber } : undefined,
      });
      setShowChangeNumber(false);
      if (result?.status === 'confirmed' && result?.order?.order_number) {
        onOrderCreated?.(result.order.order_number);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Retry failed. Please try again.');
    }
  };

  const handleSwitchToCash = async () => {
    setError(null);
    try {
      const result = await changePayment.mutateAsync({
        token: session.session_token,
        data: { payment_method: 'cash' },
      });
      if (result?.status === 'confirmed' && result?.order?.order_number) {
        onOrderCreated?.(result.order.order_number);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to switch payment method.');
    }
  };

  const handleAbandon = async () => {
    setError(null);
    try {
      await abandon.mutateAsync(session.session_token);
      onAbandoned?.();
    } catch {
      onAbandoned?.();
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 mt-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Retry / Re-send MoMo prompt */}
      {session.can_retry && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleRetry}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-2xl transition-all disabled:opacity-50"
          >
            {retry.isPending ? (
              <SpinnerGapIcon size={18} className="animate-spin" />
            ) : (
              <ArrowCounterClockwiseIcon weight="bold" size={18} />
            )}
            {showChangeNumber ? 'Send to new number' : 'Retry MoMo Payment'}
          </button>

          {/* Change number toggle */}
          {session.can_change_number && (
            <button
              onClick={() => setShowChangeNumber((v) => !v)}
              className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary-hover transition-colors"
            >
              <DeviceMobileIcon size={16} />
              Change MoMo number
              <CaretDownIcon
                size={14}
                className={`transition-transform ${showChangeNumber ? 'rotate-180' : ''}`}
              />
            </button>
          )}

          {showChangeNumber && (
            <input
              type="tel"
              value={newMomoNumber}
              onChange={(e) => setNewMomoNumber(e.target.value)}
              placeholder="Enter new MoMo number (e.g. 024XXXXXXX)"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-brand-dark text-text-dark dark:text-text-light placeholder:text-neutral-gray focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
        </div>
      )}

      {/* Switch to cash */}
      {session.can_change_payment && session.session_type === 'online' && (
        <button
          onClick={handleSwitchToCash}
          disabled={isBusy}
          className="w-full flex items-center justify-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold py-3.5 rounded-2xl transition-all disabled:opacity-50"
        >
          {changePayment.isPending ? (
            <SpinnerGapIcon size={18} className="animate-spin" />
          ) : (
            <MoneyIcon weight="bold" size={18} />
          )}
          Pay Cash on Delivery Instead
        </button>
      )}

      {/* Back to cart / Abandon */}
      {!hideAbandon && (
        <button
          onClick={handleAbandon}
          disabled={isBusy}
          className="flex items-center justify-center gap-2 text-sm font-semibold text-neutral-gray hover:text-error transition-colors py-2"
        >
          {abandon.isPending ? (
            <SpinnerGapIcon size={16} className="animate-spin" />
          ) : (
            <ShoppingCartIcon size={16} />
          )}
          {abandon.isPending ? 'Cancelling...' : 'Cancel & Back to Cart'}
        </button>
      )}
    </div>
  );
}
